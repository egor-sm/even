#include "app/analyzer/spectrum_analyzer.h"

#include <catch2/catch_test_macros.hpp>
#include <catch2/generators/catch_generators.hpp>
#include <catch2/matchers/catch_matchers_floating_point.hpp>

#include <algorithm>
#include <cmath>
#include <cstddef>
#include <numbers>
#include <utility>
#include <vector>

using Catch::Matchers::WithinAbs;
using even::SpectrumAnalyzer;

namespace {

// Feeds a full-scale sine to both spectra.
void pushSine(SpectrumAnalyzer &analyzer, float frequency, double rate) {
  juce::AudioBuffer<float> buffer{1, 4 * SpectrumAnalyzer::maxFftSize};
  for (int i = 0; i < buffer.getNumSamples(); ++i)
    buffer.setSample(0, i,
                     static_cast<float>(std::sin(2.0 * std::numbers::pi * static_cast<double>(frequency) * i / rate)));
  analyzer.pushInput(buffer);
  analyzer.pushOutput(buffer);
}

// The first frame analysed with the FFT size (the analyzer rebuilds and sends one at once).
SpectrumAnalyzer::Frame frameWithFftSize(SpectrumAnalyzer &analyzer, int size) {
  juce::WaitableEvent frameReady;
  analyzer.start([&frameReady] { frameReady.signal(); });
  for (int attempt = 0; attempt < 50; ++attempt) {
    frameReady.wait(100);
    if (const auto frame = analyzer.latestFrameCopy(); std::cmp_equal(frame.fftSize, size)) {
      analyzer.stop();
      return frame;
    }
  }
  analyzer.stop();
  FAIL("no frame with FFT size " << size);
  return {};
}

// The highest level of the display points between two frequencies.
float peakDb(const std::vector<float> &levels, float lowHz, float highHz) {
  auto peak = SpectrumAnalyzer::floorDb;
  for (std::size_t i = 0; i < levels.size(); ++i) {
    const auto frequency =
        SpectrumAnalyzer::minHz * std::pow(SpectrumAnalyzer::maxHz / SpectrumAnalyzer::minHz,
                                           static_cast<float>(i) / static_cast<float>(levels.size() - 1));
    if (frequency >= lowHz && frequency <= highHz)
      peak = std::max(peak, levels[i]);
  }
  return peak;
}

} // namespace

TEST_CASE("analyzer: the largest FFT size needs a high sample rate", "[app][analyzer]") {
  CHECK(SpectrumAnalyzer::effectiveFftSize(16384, 44100.0) == 8192);
  CHECK(SpectrumAnalyzer::effectiveFftSize(16384, 48000.0) == 8192);
  CHECK(SpectrumAnalyzer::effectiveFftSize(16384, 88200.0) == 16384);
  CHECK(SpectrumAnalyzer::effectiveFftSize(16384, 96000.0) == 16384);
  CHECK(SpectrumAnalyzer::effectiveFftSize(4096, 192000.0) == 4096);
  CHECK(SpectrumAnalyzer::effectiveFftSize(1024, 44100.0) == 1024);
  // Anything else snaps to the nearest size.
  CHECK(SpectrumAnalyzer::effectiveFftSize(2500, 48000.0) == 2048);
  CHECK(SpectrumAnalyzer::effectiveFftSize(0, 48000.0) == 1024);
  CHECK(SpectrumAnalyzer::effectiveFftSize(1 << 20, 96000.0) == 16384);
}

TEST_CASE("analyzer: a full-scale sine reads 0 dB at the low end", "[app][analyzer]") {
  // Where the smoothing is narrower than a bin (below ~17 bins of the FFT), yet far enough from 0 Hz
  // for the window's main lobe not to meet its mirror image. Higher up, the smoothing spreads a
  // sine's peak (with 8192 at 100 Hz: -0.7 dB).
  constexpr auto rate = 48000.0;
  const auto [size, frequency] = GENERATE(std::pair{1024, 250.0f}, std::pair{4096, 60.0f}, std::pair{8192, 40.0f});
  INFO("FFT size " << size << ", " << frequency << " Hz");

  SpectrumAnalyzer analyzer;
  analyzer.prepare(rate);
  analyzer.setFftSize(size);
  pushSine(analyzer, frequency, rate);

  const auto frame = frameWithFftSize(analyzer, size);
  REQUIRE(frame.preLevelsDb.size() == SpectrumAnalyzer::pointCount);
  CHECK_THAT(peakDb(frame.preLevelsDb, frequency * 0.9f, frequency * 1.1f), WithinAbs(0.0, 0.2));
  CHECK_THAT(peakDb(frame.postLevelsDb, frequency * 0.9f, frequency * 1.1f), WithinAbs(0.0, 0.2));
  // Far from the sine: the window's sidelobes are far down.
  CHECK(peakDb(frame.preLevelsDb, 2000.0f, 20000.0f) < -60.0f);
}

TEST_CASE("analyzer: switching the FFT size", "[app][analyzer]") {
  SpectrumAnalyzer analyzer;
  analyzer.prepare(48000.0);
  pushSine(analyzer, 100.0f, 48000.0);

  CHECK(juce::exactlyEqual(frameWithFftSize(analyzer, 4096).sampleRate, 48000.0)); // the default

  analyzer.setFftSize(1024);
  CHECK(frameWithFftSize(analyzer, 1024).fftSize == 1024);

  // 16384 falls back to 8192 at 48 kHz, and is used at 96 kHz.
  analyzer.setFftSize(16384);
  CHECK(frameWithFftSize(analyzer, 8192).fftSize == 8192);
  analyzer.prepare(96000.0);
  CHECK(frameWithFftSize(analyzer, 16384).fftSize == 16384);
}
