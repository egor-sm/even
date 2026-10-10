#pragma once

#include "app/analyzer/sample_history.h"
#include "dsp/spectrum_smoother.h"

#include <juce_audio_basics/juce_audio_basics.h>
#include <juce_dsp/juce_dsp.h>

#include <array>
#include <atomic>
#include <cstddef>
#include <cstdint>
#include <functional>
#include <memory>
#include <mutex>
#include <vector>

namespace even {

// Which spectra the analyzer computes: of the input (pre, before the EQ) and/or the output (post).
enum class AnalyzerMode : std::uint8_t { prePost, post, pre, off };

// Computes the spectra of the most recent input and output on a background thread and reduces
// them to log-spaced, fractional-octave smoothed display points: a Hann window of the FFT size,
// zero-padded twice, smoothed over 1/12 octave (dsp::SpectrumSmoother).
class SpectrumAnalyzer final : private juce::Thread {
public:
  struct Frame {
    std::uint32_t index = 0;
    double sampleRate = 0.0;
    // The FFT size in use (effectiveFftSize): the window length in samples.
    std::uint32_t fftSize = 0;
    // Total number of samples at the end of the analysed window; acts as an audio timestamp.
    std::uint64_t samplePosition = 0;
    // Level in dB per display point (a full-scale sine reads 0 dB before smoothing); empty when
    // the mode leaves that spectrum out.
    std::vector<float> preLevelsDb;
    std::vector<float> postLevelsDb;
  };

  // FFT sizes, i.e. analysis window lengths in samples (the transform itself is zero-padded
  // twice). The largest is only used at high sample rates, where it spans as much time as 8192
  // does at 44.1 or 48 kHz.
  static constexpr std::array fftSizes{1024, 2048, 4096, 8192, 16384};
  static constexpr int defaultFftSize = 4096;
  static constexpr int maxFftSize = fftSizes.back();
  static constexpr double minRateForMaxFftSize = 88200.0;
  static constexpr int zeroPadding = 2;
  static constexpr double smoothingOctaves = 1.0 / 12.0;

  static constexpr int pointCount = 512;
  static constexpr float minHz = 20.0f;
  static constexpr float maxHz = 20000.0f;
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
  // The chosen size; the analyzer uses effectiveFftSize of it.
  void setFftSize(int size) noexcept { chosenFftSize.store(size); }

  // The FFT size the analyzer uses for a chosen one at a sample rate: one of fftSizes, at most
  // 8192 below minRateForMaxFftSize.
  [[nodiscard]] static int effectiveFftSize(int size, double rate) noexcept;

  // Starts the analysis thread (no-op if running); onFrameReady is called on that thread after each frame.
  void start(std::function<void()> onFrameReady);
  void stop();

  // Binary layout (little-endian), 48-byte header: u32 version, u32 index, u32 fftSize (the window
  // length, without zero-padding), u32 pointCount,
  // f32 minHz, f32 maxHz, f64 sampleRate, f64 samplePosition, u32 spectra (bit 0: pre, bit 1: post),
  // u32 reserved; then f32 levelsDb[pointCount] for pre, then for post (each only when present).
  [[nodiscard]] std::vector<std::byte> serializeLatestFrame() const;
  [[nodiscard]] Frame latestFrameCopy() const {
    const std::scoped_lock lock{frameMutex};
    return latestFrame;
  }

private:
  struct Channel {
    // Generous headroom so the audio thread never laps an in-progress copy.
    SampleHistory history{static_cast<std::size_t>(4 * maxFftSize)};
    std::vector<float> levels = std::vector<float>(static_cast<std::size_t>(pointCount));
  };

  void run() override;
  void analyze();
  // Rebuilds the transform for the current FFT size and sample rate (allocates).
  void prepareTransform(int size, double rate);
  void analyzeChannel(Channel &channel);

  Channel input;
  Channel output;
  std::atomic<AnalyzerMode> mode{AnalyzerMode::prePost};
  std::atomic<double> sampleRate{0.0};
  std::uint64_t lastAnalyzedPosition = 0;
  AnalyzerMode lastAnalyzedMode = AnalyzerMode::off;
  std::function<void()> frameReadyCallback;

  std::atomic<int> chosenFftSize{defaultFftSize};

  // Analysis thread only: the transform of windowLength samples, zero-padded.
  int windowLength = 0;
  double preparedRate = 0.0;
  std::unique_ptr<juce::dsp::FFT> fft;
  std::vector<float> window;
  std::vector<float> fftBuffer;
  // Turns squared FFT magnitudes into power: a full-scale sine peaks at 1 (0 dB). Noise per bin
  // depends on the window length, as in any FFT analyzer.
  float powerScale = 1.0f;
  dsp::SpectrumSmoother smoother;
  std::vector<float> pointFrequencies;
  std::vector<float> pointPower;

  mutable std::mutex frameMutex;
  Frame latestFrame;
};

} // namespace even
