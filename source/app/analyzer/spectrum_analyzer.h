#pragma once

#include "app/analyzer/sample_history.h"
#include "dsp/spectrum_smoother.h"

#include <juce_audio_basics/juce_audio_basics.h>
#include <juce_dsp/juce_dsp.h>

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

enum class AnalyzerWindow : std::uint8_t { blackmanHarris, hann };

// How the spectra are computed and smoothed, switchable at run time. The defaults: light smoothing
// (1/12 octave Hann kernel) on a 4096-sample Hann window, zero-padded twice, with a monotone cubic in
// dB at the low end, no averaging over time.
struct AnalyzerOptions {
  AnalyzerWindow window = AnalyzerWindow::hann;
  int windowLength = 4096; // samples of the main transform: 1024, 2048, 4096 or 8192
  int zeroPadding = 2;     // FFT size per window length: 1, 2 or 4
  dsp::SmoothingOptions smoothing{.kernel = dsp::SmoothingKernel::hann,
                                  .width = dsp::SmoothingWidth::constant,
                                  .octaves = 1.0 / 12.0,
                                  .lowEnd = dsp::LowEnd::monotoneDb,
                                  .minimumBins = 1.0};
  double averagingMs = 0.0; // time constant of an exponential average of the power; 0: none
  bool lowFft = false;      // a 4x longer window for the low end, crossfaded in over 120-240 Hz
};

// Computes the spectra of the most recent input and output on a background thread and reduces
// them to log-spaced, fractional-octave smoothed display points.
class SpectrumAnalyzer final : private juce::Thread {
public:
  struct Frame {
    std::uint32_t index = 0;
    double sampleRate = 0.0;
    // Samples of the main transform's window (the FFT is longer with zero-padding).
    std::uint32_t windowLength = 0;
    // Total number of samples at the end of the analysed window; acts as an audio timestamp.
    std::uint64_t samplePosition = 0;
    // Level in dB per display point (a full-scale sine reads 0 dB before smoothing); empty when
    // the mode leaves that spectrum out.
    std::vector<float> preLevelsDb;
    std::vector<float> postLevelsDb;
  };

  // Longest window of the main transform (the FFT is longer with zero-padding).
  static constexpr int fftOrder = 13;
  static constexpr int fftSize = 1 << fftOrder;
  // Window length of the optional low-end transform.
  static constexpr int lowFftSize = 4 * fftSize;
  static constexpr float lowCrossoverStartHz = 120.0f;
  static constexpr float lowCrossoverEndHz = 240.0f;

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
  void setOptions(const AnalyzerOptions &newOptions);

  // Starts the analysis thread (no-op if running); onFrameReady is called on that thread after each frame.
  void start(std::function<void()> onFrameReady);
  void stop();

  // Binary layout (little-endian), 48-byte header: u32 version, u32 index, u32 fftSize (the window
  // length, without zero-padding), u32 pointCount,
  // f32 minHz, f32 maxHz, f64 sampleRate, f64 samplePosition, u32 spectra (bit 0: pre, bit 1: post),
  // u32 reserved; then f32 levelsDb[pointCount] for pre, then for post (each only when present).
  [[nodiscard]] std::vector<std::byte> serializeLatestFrame() const;

private:
  struct Channel {
    // Generous headroom so the audio thread never laps an in-progress copy.
    SampleHistory history{static_cast<std::size_t>(4 * lowFftSize)};
    std::vector<float> levels = std::vector<float>(static_cast<std::size_t>(pointCount));
    std::vector<double> averagePower = std::vector<double>(static_cast<std::size_t>(pointCount));
    bool averageValid = false;
  };

  // One windowed FFT of the latest samples, reduced to power at the display points.
  struct Transform {
    int windowLength = 0;
    std::unique_ptr<juce::dsp::FFT> fft;
    std::vector<float> window;
    std::vector<float> buffer;
    // Turns squared FFT magnitudes into power: a full-scale sine peaks at 1 (0 dB). Noise per bin
    // depends on the window and its length, as in any FFT analyzer.
    float powerScale = 1.0f;
    dsp::SpectrumSmoother smoother;
  };

  void run() override;
  void analyze();
  void applyOptions(double rate);
  void prepareTransform(Transform &transform, int windowLength, int fftLength, double rate) const;
  void transformLatest(Transform &transform, const SampleHistory &history, std::span<float> destination);
  void analyzeChannel(Channel &channel, double secondsSinceLast);

  Channel input;
  Channel output;
  std::atomic<AnalyzerMode> mode{AnalyzerMode::prePost};
  std::atomic<double> sampleRate{0.0};
  std::uint64_t lastAnalyzedPosition = 0;
  AnalyzerMode lastAnalyzedMode = AnalyzerMode::off;
  std::function<void()> frameReadyCallback;

  std::mutex optionsMutex;
  AnalyzerOptions pendingOptions;
  std::atomic<bool> optionsChanged{true};

  // Analysis thread only.
  AnalyzerOptions options;
  double preparedRate = 0.0;
  Transform mainTransform;
  Transform lowTransform;
  std::vector<float> pointFrequencies;
  std::vector<float> lowWeights; // share of the low-end transform per display point
  std::vector<float> pointPower;
  std::vector<float> lowPointPower;

  mutable std::mutex frameMutex;
  Frame latestFrame;
};

} // namespace even
