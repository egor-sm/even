#include "app/analyzer/spectrum_analyzer.h"

#include <algorithm>
#include <cmath>
#include <cstring>
#include <numeric>
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
  for (std::size_t i = 0; i < pointFrequencies.size(); ++i)
    pointFrequencies[i] = minHz * std::pow(maxHz / minHz, static_cast<float>(i) / static_cast<float>(pointCount - 1));

  pointPower.resize(pointCount);
}

SpectrumAnalyzer::~SpectrumAnalyzer() {
  stop();
}

void SpectrumAnalyzer::prepare(double newSampleRate) {
  sampleRate.store(newSampleRate);
}

int SpectrumAnalyzer::effectiveFftSize(int size, double rate) noexcept {
  const auto nearest = *std::ranges::min_element(fftSizes, {}, [size](int candidate) {
    return std::abs(std::log2(static_cast<double>(candidate) / std::max(size, 1)));
  });
  return nearest == maxFftSize && rate < minRateForMaxFftSize ? maxFftSize / 2 : nearest;
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
  appendBytes(bytes, latestFrame.fftSize);
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

  // A new FFT size or sample rate: rebuild the transform and show the result even without new audio.
  const auto size = effectiveFftSize(chosenFftSize.load(), rate);
  const auto rebuilt = size != windowLength || !juce::exactlyEqual(rate, preparedRate);
  if (rebuilt)
    prepareTransform(size, rate);

  const auto currentMode = mode.load();
  // Input and output are written in the same audio blocks: either position tells the time.
  const auto position = output.history.position();

  // Nothing new since the last frame (e.g. audio is stopped, or the analyzer is off and the page
  // has already been told so).
  if (!rebuilt && currentMode == lastAnalyzedMode &&
      (position == lastAnalyzedPosition || currentMode == AnalyzerMode::off))
    return;

  lastAnalyzedMode = currentMode;
  lastAnalyzedPosition = position;

  const auto pre = includesPre(currentMode);
  const auto post = includesPost(currentMode);
  if (pre)
    analyzeChannel(input);
  if (post)
    analyzeChannel(output);

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
    latestFrame.fftSize = static_cast<std::uint32_t>(windowLength);
    latestFrame.samplePosition = position;
  }

  if (frameReadyCallback)
    frameReadyCallback();
}

void SpectrumAnalyzer::prepareTransform(int size, double rate) {
  const auto fftLength = zeroPadding * size;
  windowLength = size;
  preparedRate = rate;

  fft = std::make_unique<juce::dsp::FFT>(juce::roundToInt(std::log2(fftLength)));
  window.resize(static_cast<std::size_t>(size));
  juce::dsp::WindowingFunction<float>::fillWindowingTables(window.data(), window.size(),
                                                           juce::dsp::WindowingFunction<float>::hann, false);
  fftBuffer.assign(2 * static_cast<std::size_t>(fftLength), 0.0f);

  // The window's sum is its gain for a sine: 2 / sum maps a full-scale sine to magnitude 1.
  const auto sum = std::accumulate(window.begin(), window.end(), 0.0);
  powerScale = static_cast<float>(4.0 / (sum * sum));

  smoother.prepare(pointFrequencies, rate / fftLength, static_cast<std::size_t>(fftLength) / 2 + 1, smoothingOctaves);
}

void SpectrumAnalyzer::analyzeChannel(Channel &channel) {
  const std::span samples{fftBuffer};
  const auto length = static_cast<std::size_t>(windowLength);
  const auto fftLength = static_cast<std::size_t>(fft->getSize());

  channel.history.readLatest(samples.first(length));
  std::ranges::fill(samples.subspan(length), 0.0f);
  for (std::size_t i = 0; i < length; ++i)
    samples[i] *= window[i];

  fft->performFrequencyOnlyForwardTransform(fftBuffer.data(), true);

  const auto power = samples.first(fftLength / 2 + 1);
  std::ranges::transform(power, power.begin(), [this](float magnitude) { return magnitude * magnitude * powerScale; });

  smoother.reduce(power, pointPower);
  std::ranges::transform(pointPower, channel.levels.begin(), [](float value) {
    return std::max(static_cast<float>(10.0 * std::log10(static_cast<double>(value) + 1e-20)), floorDb);
  });
}

} // namespace even
