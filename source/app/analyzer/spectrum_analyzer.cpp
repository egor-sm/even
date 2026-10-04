#include "spectrum_analyzer.h"

#include <algorithm>
#include <cmath>
#include <cstring>
#include <span>

namespace even {

namespace {

constexpr std::uint32_t preFlag = 1;
constexpr std::uint32_t postFlag = 2;

template <typename T>
void appendBytes(std::vector<std::byte> &bytes, const T &value) {
  const auto offset = bytes.size();
  bytes.resize(offset + sizeof(T));
  std::memcpy(bytes.data() + offset, &value, sizeof(T));
}

void appendLevels(std::vector<std::byte> &bytes, const std::vector<float> &levels) {
  const auto offset = bytes.size();
  const auto size = levels.size() * sizeof(float);
  bytes.resize(offset + size);
  std::memcpy(bytes.data() + offset, levels.data(), size);
}

bool includesPre(AnalyzerMode mode) noexcept {
  return mode == AnalyzerMode::prePost || mode == AnalyzerMode::pre;
}

bool includesPost(AnalyzerMode mode) noexcept {
  return mode == AnalyzerMode::prePost || mode == AnalyzerMode::post;
}

void pushMonoSum(SampleHistory &history, const juce::AudioBuffer<float> &buffer) noexcept {
  const auto numChannels = buffer.getNumChannels();

  if (numChannels == 0)
    return;

  const auto *left = buffer.getReadPointer(0);
  const auto *right = buffer.getReadPointer(numChannels > 1 ? 1 : 0);

  history.write(buffer.getNumSamples(), [left, right](int i) { return 0.5f * (left[i] + right[i]); });
}

} // namespace

SpectrumAnalyzer::SpectrumAnalyzer() : juce::Thread("Spectrum analyzer") {
  pointFrequencies.resize(pointCount);

  for (int i = 0; i < pointCount; ++i)
    pointFrequencies[static_cast<std::size_t>(i)] =
        minHz * std::pow(maxHz / minHz, static_cast<float>(i) / static_cast<float>(pointCount - 1));
}

SpectrumAnalyzer::~SpectrumAnalyzer() {
  stop();
}

void SpectrumAnalyzer::prepare(double newSampleRate) {
  sampleRate.store(newSampleRate);
}

void SpectrumAnalyzer::pushInput(const juce::AudioBuffer<float> &buffer) noexcept {
  pushMonoSum(input.history, buffer);
}

void SpectrumAnalyzer::pushOutput(const juce::AudioBuffer<float> &buffer) noexcept {
  pushMonoSum(output.history, buffer);
}

void SpectrumAnalyzer::start(std::function<void()> onFrameReady) {
  if (isThreadRunning())
    return;

  frameReadyCallback = std::move(onFrameReady);
  startThread(juce::Thread::Priority::normal);
}

void SpectrumAnalyzer::stop() {
  stopThread(1000);
  frameReadyCallback = nullptr;
}

std::vector<std::byte> SpectrumAnalyzer::serializeLatestFrame() const {
  constexpr std::uint32_t formatVersion = 3;

  const std::scoped_lock lock{frameMutex};

  const auto &pre = latestFrame.preLevelsDb;
  const auto &post = latestFrame.postLevelsDb;
  const auto spectra = (pre.empty() ? 0 : preFlag) | (post.empty() ? 0 : postFlag);

  std::vector<std::byte> bytes;
  bytes.reserve(48 + (pre.size() + post.size()) * sizeof(float));

  appendBytes(bytes, formatVersion);
  appendBytes(bytes, latestFrame.index);
  appendBytes(bytes, static_cast<std::uint32_t>(fftSize));
  appendBytes(bytes, static_cast<std::uint32_t>(pointCount));
  appendBytes(bytes, minHz);
  appendBytes(bytes, maxHz);
  appendBytes(bytes, latestFrame.sampleRate);
  appendBytes(bytes, static_cast<double>(latestFrame.samplePosition));
  appendBytes(bytes, spectra);
  appendBytes(bytes, std::uint32_t{0});
  appendLevels(bytes, pre);
  appendLevels(bytes, post);

  return bytes;
}

void SpectrumAnalyzer::run() {
  while (!threadShouldExit()) {
    analyze();
    wait(analysisIntervalMs);
  }
}

void SpectrumAnalyzer::analyze() {
  const auto rate = sampleRate.load();

  if (rate <= 0.0)
    return;

  const auto currentMode = mode.load();
  // Input and output are written in the same audio blocks: either position tells the time.
  const auto position = output.history.position();

  // Nothing new since the last frame (e.g. audio is stopped, or the analyzer is off and the page
  // has already been told so).
  if (currentMode == lastAnalyzedMode && (position == lastAnalyzedPosition || currentMode == AnalyzerMode::off))
    return;

  lastAnalyzedMode = currentMode;
  lastAnalyzedPosition = position;

  const auto pre = includesPre(currentMode);
  const auto post = includesPost(currentMode);
  if (pre)
    analyzeChannel(input, rate);
  if (post)
    analyzeChannel(output, rate);

  {
    const std::scoped_lock lock{frameMutex};

    if (pre)
      latestFrame.preLevelsDb = input.levels;
    else
      latestFrame.preLevelsDb.clear();

    if (post)
      latestFrame.postLevelsDb = output.levels;
    else
      latestFrame.postLevelsDb.clear();

    ++latestFrame.index;
    latestFrame.sampleRate = rate;
    latestFrame.samplePosition = position;
  }

  if (frameReadyCallback)
    frameReadyCallback();
}

void SpectrumAnalyzer::analyzeChannel(Channel &channel, double rate) {
  const std::span samples{fftBuffer};
  channel.history.readLatest(samples.first(fftSize));

  std::ranges::fill(samples.subspan(fftSize), 0.0f);
  window.multiplyWithWindowingTable(fftBuffer.data(), static_cast<std::size_t>(fftSize));
  fft.performFrequencyOnlyForwardTransform(fftBuffer.data(), true);

  reduceToDisplayPoints(rate, channel.levels);
}

void SpectrumAnalyzer::reduceToDisplayPoints(double rate, std::vector<float> &levels) {
  // The window is normalised to unit mean, so 2 / N maps a full-scale sine to amplitude 1.0.
  constexpr auto scale = 2.0f / static_cast<float>(fftSize);

  const std::span magnitudes = std::span{fftBuffer}.first(numBins);
  std::ranges::transform(magnitudes, magnitudes.begin(), [](float magnitude) { return magnitude * scale; });

  for (std::size_t k = 0; k < magnitudes.size(); ++k)
    powerPrefix[k + 1] = powerPrefix[k] + static_cast<double>(magnitudes[k]) * magnitudes[k];

  const auto binHz = rate / fftSize;
  const auto halfBand = std::pow(2.0, 1.0 / (2.0 * octaveFraction));
  const auto lastBin = static_cast<double>(numBins - 1);

  for (std::size_t i = 0; i < pointFrequencies.size(); ++i) {
    const auto frequency = static_cast<double>(pointFrequencies[i]);
    const auto low = frequency / halfBand / binHz;
    const auto high = frequency * halfBand / binHz;

    double power = 0.0;

    if (high - low >= 1.0) {
      // Wide band: mean power over the covered bins.
      const auto first = static_cast<std::size_t>(std::max(0.0, std::round(low)));
      const auto last = static_cast<std::size_t>(std::min(lastBin, std::round(high)));

      if (last >= first)
        power = (powerPrefix[last + 1] - powerPrefix[first]) / static_cast<double>(last - first + 1);
    } else {
      // Narrower than a bin (low frequencies): interpolate between neighbouring bins.
      const auto position = std::min(frequency / binHz, lastBin - 1e-6);
      const auto bin = static_cast<std::size_t>(position);
      const auto fraction = position - static_cast<double>(bin);
      const auto lower = static_cast<double>(magnitudes[bin]) * magnitudes[bin];
      const auto upper = static_cast<double>(magnitudes[bin + 1]) * magnitudes[bin + 1];
      power = lower + (upper - lower) * fraction;
    }

    levels[i] = std::max(static_cast<float>(10.0 * std::log10(power + 1e-20)), floorDb);
  }
}

} // namespace even
