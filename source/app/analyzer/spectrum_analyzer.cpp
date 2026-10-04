#include "spectrum_analyzer.h"

#include <algorithm>
#include <cmath>
#include <cstring>
#include <span>

namespace even {

namespace {

template <typename T>
void appendBytes(std::vector<std::byte> &bytes, const T &value) {
  const auto offset = bytes.size();
  bytes.resize(offset + sizeof(T));
  std::memcpy(bytes.data() + offset, &value, sizeof(T));
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

void SpectrumAnalyzer::pushMonoSum(const juce::AudioBuffer<float> &buffer) noexcept {
  const auto numChannels = buffer.getNumChannels();

  if (numChannels == 0)
    return;

  const auto *left = buffer.getReadPointer(0);
  const auto *right = buffer.getReadPointer(numChannels > 1 ? 1 : 0);

  history.write(buffer.getNumSamples(), [left, right](int i) { return 0.5f * (left[i] + right[i]); });
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
  constexpr std::uint32_t formatVersion = 2;

  const std::scoped_lock lock{frameMutex};

  const auto levelsBytes = latestFrame.levelsDb.size() * sizeof(float);

  std::vector<std::byte> bytes;
  bytes.reserve(40 + levelsBytes);

  appendBytes(bytes, formatVersion);
  appendBytes(bytes, latestFrame.index);
  appendBytes(bytes, static_cast<std::uint32_t>(fftSize));
  appendBytes(bytes, static_cast<std::uint32_t>(latestFrame.levelsDb.size()));
  appendBytes(bytes, minHz);
  appendBytes(bytes, maxHz);
  appendBytes(bytes, latestFrame.sampleRate);
  appendBytes(bytes, static_cast<double>(latestFrame.samplePosition));

  const auto offset = bytes.size();
  bytes.resize(offset + levelsBytes);
  std::memcpy(bytes.data() + offset, latestFrame.levelsDb.data(), levelsBytes);

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

  const std::span samples{fftBuffer};
  const auto position = history.readLatest(samples.first(fftSize));

  // Nothing new since the last frame (e.g. audio is stopped).
  if (position == lastAnalyzedPosition)
    return;

  lastAnalyzedPosition = position;

  std::ranges::fill(samples.subspan(fftSize), 0.0f);
  window.multiplyWithWindowingTable(fftBuffer.data(), static_cast<std::size_t>(fftSize));
  fft.performFrequencyOnlyForwardTransform(fftBuffer.data(), true);

  reduceToDisplayPoints(rate);

  {
    const std::scoped_lock lock{frameMutex};

    latestFrame.levelsDb = pointLevels;

    ++latestFrame.index;
    latestFrame.sampleRate = rate;
    latestFrame.samplePosition = position;
  }

  if (frameReadyCallback)
    frameReadyCallback();
}

void SpectrumAnalyzer::reduceToDisplayPoints(double rate) {
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

    pointLevels[i] = std::max(static_cast<float>(10.0 * std::log10(power + 1e-20)), floorDb);
  }
}

} // namespace even
