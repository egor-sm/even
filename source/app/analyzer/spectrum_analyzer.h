#pragma once

#include "app/analyzer/sample_history.h"

#include <juce_audio_basics/juce_audio_basics.h>
#include <juce_dsp/juce_dsp.h>

#include <atomic>
#include <cstddef>
#include <cstdint>
#include <functional>
#include <mutex>
#include <vector>

namespace even {

// Which spectra the analyzer computes: of the input (pre, before the EQ) and/or the output (post).
enum class AnalyzerMode : std::uint8_t { prePost, post, pre, off };

// Computes the spectra of the most recent input and output on a background thread and reduces
// them to log-spaced, fractional-octave smoothed display points.
class SpectrumAnalyzer final : private juce::Thread {
public:
  struct Frame {
    std::uint32_t index = 0;
    double sampleRate = 0.0;
    // Total number of samples at the end of the analysed window; acts as an audio timestamp.
    std::uint64_t samplePosition = 0;
    // Level in dB per display point (a full-scale sine reads 0 dB before smoothing); empty when
    // the mode leaves that spectrum out.
    std::vector<float> preLevelsDb;
    std::vector<float> postLevelsDb;
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

  // Audio thread: wait-free, no allocations. Both are always recorded (it is cheap), so switching
  // the mode shows the right signal at once.
  void pushInput(const juce::AudioBuffer<float> &buffer) noexcept;
  void pushOutput(const juce::AudioBuffer<float> &buffer) noexcept;

  // Any thread.
  void setMode(AnalyzerMode newMode) noexcept { mode.store(newMode); }

  // Starts the analysis thread (no-op if running); onFrameReady is called on that thread after each frame.
  void start(std::function<void()> onFrameReady);
  void stop();

  // Binary layout (little-endian), 48-byte header: u32 version, u32 index, u32 fftSize, u32 pointCount,
  // f32 minHz, f32 maxHz, f64 sampleRate, f64 samplePosition, u32 spectra (bit 0: pre, bit 1: post),
  // u32 reserved; then f32 levelsDb[pointCount] for pre, then for post (each only when present).
  [[nodiscard]] std::vector<std::byte> serializeLatestFrame() const;

private:
  struct Channel {
    // Generous headroom so the audio thread never laps an in-progress copy.
    SampleHistory history{static_cast<std::size_t>(4 * fftSize)};
    std::vector<float> levels = std::vector<float>(static_cast<std::size_t>(pointCount));
  };

  void run() override;
  void analyze();
  void analyzeChannel(Channel &channel, double rate);
  void reduceToDisplayPoints(double rate, std::vector<float> &levels);

  Channel input;
  Channel output;
  std::atomic<AnalyzerMode> mode{AnalyzerMode::prePost};
  std::atomic<double> sampleRate{0.0};
  std::uint64_t lastAnalyzedPosition = 0;
  AnalyzerMode lastAnalyzedMode = AnalyzerMode::off;
  std::function<void()> frameReadyCallback;

  juce::dsp::FFT fft{fftOrder};
  juce::dsp::WindowingFunction<float> window{static_cast<std::size_t>(fftSize),
                                             juce::dsp::WindowingFunction<float>::blackmanHarris, true};
  std::vector<float> fftBuffer = std::vector<float>(static_cast<std::size_t>(2 * fftSize));
  std::vector<double> powerPrefix = std::vector<double>(static_cast<std::size_t>(numBins + 1));
  std::vector<float> pointFrequencies;

  mutable std::mutex frameMutex;
  Frame latestFrame;
};

} // namespace even
