#pragma once

#include "sample_history.h"

#include <juce_audio_basics/juce_audio_basics.h>
#include <juce_dsp/juce_dsp.h>

#include <atomic>
#include <cstddef>
#include <cstdint>
#include <functional>
#include <mutex>
#include <vector>

namespace even {

// Computes the spectrum of the most recent input on a background thread and reduces it to
// log-spaced, fractional-octave smoothed display points.
class SpectrumAnalyzer final : private juce::Thread {
public:
  struct Frame {
    std::uint32_t index = 0;
    double sampleRate = 0.0;
    // Total number of input samples at the end of the analysed window; acts as an audio timestamp.
    std::uint64_t samplePosition = 0;
    // Level in dB per display point (a full-scale sine reads 0 dB before smoothing).
    std::vector<float> levelsDb;
  };

  static constexpr int fftOrder = 13;
  static constexpr int fftSize = 1 << fftOrder;
  static constexpr int numBins = fftSize / 2 + 1;

  static constexpr int pointCount = 512;
  static constexpr float minHz = 20.0f;
  static constexpr float maxHz = 20000.0f;
  static constexpr double octaveFraction = 6.0; // 1/6 octave smoothing
  static constexpr float floorDb = -150.0f;
  static constexpr int analysisIntervalMs = 16; // ~60 frames per second

  SpectrumAnalyzer();
  ~SpectrumAnalyzer() override;

  void prepare(double newSampleRate);

  // Audio thread: wait-free, no allocations.
  void pushMonoSum(const juce::AudioBuffer<float> &buffer) noexcept;

  // Starts the analysis thread (no-op if running); onFrameReady is called on that thread after each frame.
  void start(std::function<void()> onFrameReady);
  void stop();

  // Binary layout (little-endian), 40-byte header: u32 version, u32 index, u32 fftSize, u32 pointCount,
  // f32 minHz, f32 maxHz, f64 sampleRate, f64 samplePosition; then f32 levelsDb[pointCount].
  [[nodiscard]] std::vector<std::byte> serializeLatestFrame() const;

private:
  void run() override;
  void analyze();
  void reduceToDisplayPoints(double rate);

  // Generous headroom so the audio thread never laps an in-progress copy.
  SampleHistory history{static_cast<std::size_t>(4 * fftSize)};
  std::atomic<double> sampleRate{0.0};
  std::uint64_t lastAnalyzedPosition = 0;
  std::function<void()> frameReadyCallback;

  juce::dsp::FFT fft{fftOrder};
  juce::dsp::WindowingFunction<float> window{static_cast<std::size_t>(fftSize),
                                             juce::dsp::WindowingFunction<float>::blackmanHarris, true};
  std::vector<float> fftBuffer = std::vector<float>(static_cast<std::size_t>(2 * fftSize));
  std::vector<double> powerPrefix = std::vector<double>(static_cast<std::size_t>(numBins + 1));
  std::vector<float> pointFrequencies;
  std::vector<float> pointLevels = std::vector<float>(static_cast<std::size_t>(pointCount));

  mutable std::mutex frameMutex;
  Frame latestFrame;
};

} // namespace even
