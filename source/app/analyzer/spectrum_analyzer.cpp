#include "app/analyzer/spectrum_analyzer.h"

#include <algorithm>
#include <cmath>
#include <cstring>
#include <numbers>
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

std::vector<float> windowTable(AnalyzerWindow window, int length) {
  using Windowing = juce::dsp::WindowingFunction<float>;
  std::vector<float> table(static_cast<std::size_t>(length));
  Windowing::fillWindowingTables(table.data(), table.size(),
                                 window == AnalyzerWindow::hann ? Windowing::hann : Windowing::blackmanHarris, false);
  return table;
}

} // namespace

SpectrumAnalyzer::SpectrumAnalyzer() : juce::Thread("Spectrum analyzer") {
  pointFrequencies.resize(pointCount);
  lowWeights.resize(pointCount);

  for (std::size_t i = 0; i < pointFrequencies.size(); ++i) {
    const auto frequency = minHz * std::pow(maxHz / minHz, static_cast<float>(i) / static_cast<float>(pointCount - 1));
    pointFrequencies[i] = frequency;

    // Raised cosine over the crossover octave in log frequency.
    const auto t = std::clamp(
        std::log2(frequency / lowCrossoverStartHz) / std::log2(lowCrossoverEndHz / lowCrossoverStartHz), 0.0f, 1.0f);
    lowWeights[i] = 0.5f * (1.0f + std::cos(std::numbers::pi_v<float> * t));
  }

  pointPower.resize(pointCount);
  lowPointPower.resize(pointCount);
}

SpectrumAnalyzer::~SpectrumAnalyzer() {
  stop();
}

void SpectrumAnalyzer::prepare(double newSampleRate) {
  sampleRate.store(newSampleRate);
}

void SpectrumAnalyzer::setOptions(const AnalyzerOptions &newOptions) {
  const std::scoped_lock lock{optionsMutex};
  pendingOptions = newOptions;
  optionsChanged.store(true);
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
  appendBytes(bytes, latestFrame.windowLength);
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

  // New options or sample rate: rebuild the transforms and show the result even without new audio.
  auto rebuilt = false;
  if (optionsChanged.exchange(false) || !juce::exactlyEqual(rate, preparedRate)) {
    applyOptions(rate);
    rebuilt = true;
  }

  const auto currentMode = mode.load();
  // Input and output are written in the same audio blocks: either position tells the time.
  const auto position = output.history.position();

  // Nothing new since the last frame (e.g. audio is stopped, or the analyzer is off and the page
  // has already been told so).
  if (!rebuilt && currentMode == lastAnalyzedMode &&
      (position == lastAnalyzedPosition || currentMode == AnalyzerMode::off))
    return;

  const auto secondsSinceLast =
      position > lastAnalyzedPosition ? static_cast<double>(position - lastAnalyzedPosition) / rate : 0.0;
  lastAnalyzedMode = currentMode;
  lastAnalyzedPosition = position;

  const auto pre = includesPre(currentMode);
  const auto post = includesPost(currentMode);
  if (pre)
    analyzeChannel(input, secondsSinceLast);
  else
    input.averageValid = false;
  if (post)
    analyzeChannel(output, secondsSinceLast);
  else
    output.averageValid = false;

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
    latestFrame.windowLength = static_cast<std::uint32_t>(options.windowLength);
    latestFrame.samplePosition = position;
  }

  if (frameReadyCallback)
    frameReadyCallback();
}

void SpectrumAnalyzer::applyOptions(double rate) {
  {
    const std::scoped_lock lock{optionsMutex};
    options = pendingOptions;
  }
  preparedRate = rate;

  prepareTransform(mainTransform, options.windowLength, options.windowLength * options.zeroPadding, rate);
  if (options.lowFft)
    prepareTransform(lowTransform, lowFftSize, lowFftSize, rate);

  input.averageValid = false;
  output.averageValid = false;
}

void SpectrumAnalyzer::prepareTransform(Transform &transform, int windowLength, int fftLength, double rate) const {
  const auto order = juce::roundToInt(std::log2(fftLength));
  const auto numBins = static_cast<std::size_t>(fftLength) / 2 + 1;

  transform.windowLength = windowLength;
  transform.fft = std::make_unique<juce::dsp::FFT>(order);
  transform.window = windowTable(options.window, windowLength);
  transform.buffer.assign(2 * static_cast<std::size_t>(fftLength), 0.0f);

  // The window's sum is its gain for a sine: 2 / sum maps a full-scale sine to magnitude 1.
  const auto sum = std::accumulate(transform.window.begin(), transform.window.end(), 0.0);
  transform.powerScale = static_cast<float>(4.0 / (sum * sum));

  transform.smoother.prepare(pointFrequencies, rate / fftLength, numBins, rate / windowLength, options.smoothing);
}

void SpectrumAnalyzer::transformLatest(Transform &transform, const SampleHistory &history,
                                       std::span<float> destination) {
  const std::span samples{transform.buffer};
  const auto windowLength = static_cast<std::size_t>(transform.windowLength);
  const auto fftLength = static_cast<std::size_t>(transform.fft->getSize());

  history.readLatest(samples.first(windowLength));
  std::ranges::fill(samples.subspan(windowLength), 0.0f);
  for (std::size_t i = 0; i < windowLength; ++i)
    samples[i] *= transform.window[i];

  transform.fft->performFrequencyOnlyForwardTransform(transform.buffer.data(), true);

  const auto power = samples.first(fftLength / 2 + 1);
  std::ranges::transform(power, power.begin(),
                         [scale = transform.powerScale](float magnitude) { return magnitude * magnitude * scale; });

  transform.smoother.reduce(power, destination);
}

void SpectrumAnalyzer::analyzeChannel(Channel &channel, double secondsSinceLast) {
  transformLatest(mainTransform, channel.history, pointPower);

  if (options.lowFft) {
    transformLatest(lowTransform, channel.history, lowPointPower);
    for (std::size_t i = 0; i < pointPower.size(); ++i)
      pointPower[i] += (lowPointPower[i] - pointPower[i]) * lowWeights[i];
  }

  // Exponential average of the power over the audio time between frames; starts afresh after a
  // gap (stopped audio, the spectrum switched off) or new options.
  constexpr double maxGapSeconds = 0.5;
  const auto averaging = options.averagingMs > 0.0 && channel.averageValid && secondsSinceLast < maxGapSeconds;
  const auto keep = averaging ? std::exp(-secondsSinceLast * 1000.0 / options.averagingMs) : 0.0;

  for (std::size_t i = 0; i < pointPower.size(); ++i) {
    auto &average = channel.averagePower[i];
    average = keep * average + (1.0 - keep) * static_cast<double>(pointPower[i]);
    channel.levels[i] = std::max(static_cast<float>(10.0 * std::log10(average + 1e-20)), floorDb);
  }
  channel.averageValid = true;
}

} // namespace even
