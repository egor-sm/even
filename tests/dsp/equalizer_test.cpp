#include "dsp/band_design.h"
#include "dsp/band_response.h"
#include "dsp/equalizer.h"

#include <catch2/catch_test_macros.hpp>
#include <catch2/generators/catch_generators.hpp>
#include <catch2/matchers/catch_matchers_floating_point.hpp>

#include <array>
#include <cmath>
#include <numbers>
#include <vector>

using Catch::Matchers::WithinAbs;
using eqit::dsp::BandParameters;
using eqit::dsp::Equalizer;
using eqit::dsp::FilterShape;

namespace {

constexpr double sampleRate = 48000.0;
constexpr int blockSize = 512;

std::vector<float> sine(double frequency, int numSamples) {
  std::vector<float> signal(static_cast<std::size_t>(numSamples));
  for (std::size_t n = 0; n < signal.size(); ++n)
    signal[n] =
        0.25f * static_cast<float>(std::sin(2.0 * std::numbers::pi * frequency * static_cast<double>(n) / sampleRate));
  return signal;
}

void process(Equalizer &equalizer, std::vector<float> &signal) {
  for (std::size_t start = 0; start < signal.size(); start += blockSize) {
    auto *channel = signal.data() + start;
    equalizer.process(&channel, 1, static_cast<int>(std::min<std::size_t>(blockSize, signal.size() - start)));
  }
}

double gainDb(const std::vector<float> &input, const std::vector<float> &output, std::size_t from) {
  double in = 0.0;
  double out = 0.0;
  for (std::size_t n = from; n < input.size(); ++n) {
    const auto x = static_cast<double>(input[n]);
    const auto y = static_cast<double>(output[n]);
    in += x * x;
    out += y * y;
  }
  return 10.0 * std::log10(out / in);
}

} // namespace

TEST_CASE("Equalizer: bands in series add up in dB", "[dsp][equalizer]") {
  const std::array<BandParameters, 4> bands{{
      {.shape = FilterShape::lowCut, .frequencyHz = 60.0, .gainDb = 0.0, .q = 0.707, .slopeDbPerOctave = 24},
      {.shape = FilterShape::bell, .frequencyHz = 400.0, .gainDb = -6.0, .q = 1.5},
      {.shape = FilterShape::bell, .frequencyHz = 2500.0, .gainDb = 4.0, .q = 0.8},
      {.shape = FilterShape::highShelf, .frequencyHz = 8000.0, .gainDb = 3.0, .q = 0.707},
  }};
  const auto frequency = GENERATE(50.0, 400.0, 1200.0, 2500.0, 12000.0);

  Equalizer equalizer;
  // Spread over non-adjacent slots to check that any slot works.
  for (std::size_t i = 0; i < bands.size(); ++i)
    equalizer.setBand(i * 3, bands[i], true);
  equalizer.prepare(sampleRate);

  auto expected = 0.0;
  for (const auto &band : bands)
    expected += eqit::dsp::magnitudeDb(eqit::dsp::design(band, sampleRate), frequency, sampleRate);

  const auto input = sine(frequency, 48000);
  auto output = input;
  process(equalizer, output);

  CHECK_THAT(gainDb(input, output, 24000), WithinAbs(expected, 0.05));
}

TEST_CASE("Equalizer: with every band switched off it is bit-transparent", "[dsp][equalizer]") {
  Equalizer equalizer;
  for (std::size_t i = 0; i < Equalizer::maxBands; ++i)
    equalizer.setBand(i, {.shape = FilterShape::bell, .frequencyHz = 1000.0, .gainDb = 12.0, .q = 1.0}, false);
  equalizer.prepare(sampleRate);

  const auto input = sine(1000.0, 9600);
  auto output = input;
  process(equalizer, output);

  CHECK(output == input);
}
