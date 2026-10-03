#include "dsp/band.h"
#include "dsp/band_design.h"
#include "dsp/band_response.h"
#include "dsp/section_filter.h"

#include <catch2/catch_test_macros.hpp>
#include <catch2/generators/catch_generators.hpp>
#include <catch2/matchers/catch_matchers_floating_point.hpp>

#include <algorithm>
#include <cmath>
#include <numbers>
#include <vector>

using Catch::Matchers::WithinAbs;
using eqit::dsp::Band;
using eqit::dsp::BandParameters;
using eqit::dsp::FilterShape;

namespace {

constexpr double sampleRate = 48000.0;
constexpr int blockSize = 256;

BandParameters band(FilterShape shape, double frequency, double gainDb, double q, int slope = 12) {
  return {.shape = shape, .frequencyHz = frequency, .gainDb = gainDb, .q = q, .slopeDbPerOctave = slope};
}

std::vector<float> sine(double frequency, int numSamples, float amplitude = 0.5f) {
  std::vector<float> signal(static_cast<std::size_t>(numSamples));
  for (std::size_t n = 0; n < signal.size(); ++n)
    signal[n] = amplitude *
                static_cast<float>(std::sin(2.0 * std::numbers::pi * frequency * static_cast<double>(n) / sampleRate));
  return signal;
}

// Runs a mono signal through the band in host-sized blocks; `onBlock(blockIndex)` may change targets.
template <typename OnBlock>
void runBlocks(Band &band, std::vector<float> &signal, OnBlock onBlock) {
  for (std::size_t start = 0, block = 0; start < signal.size(); start += blockSize, ++block) {
    onBlock(block);
    auto *channel = signal.data() + start;
    band.process(&channel, 1, static_cast<int>(std::min<std::size_t>(blockSize, signal.size() - start)));
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

// Largest second difference |y[n+1] - 2y[n] + y[n-1]|: small for smooth signals, spikes on clicks.
double maxSecondDifference(const std::vector<float> &signal, std::size_t from, std::size_t to) {
  double result = 0.0;
  for (std::size_t n = std::max<std::size_t>(from, 1); n + 1 < to; ++n)
    result = std::max(result, std::abs(static_cast<double>(signal[n + 1]) - 2.0 * static_cast<double>(signal[n]) +
                                       static_cast<double>(signal[n - 1])));
  return result;
}

} // namespace

TEST_CASE("Band: with steady parameters it sounds exactly like the design", "[dsp][band]") {
  const auto parameters =
      GENERATE(band(FilterShape::bell, 1000.0, 9.0, 1.5), band(FilterShape::lowShelf, 300.0, -8.0, 0.707),
               band(FilterShape::highCut, 4000.0, 0.0, 0.707), band(FilterShape::lowCut, 600.0, 0.0, 0.707, 48));
  const auto frequency = GENERATE(150.0, 1000.0, 7000.0);

  Band filter;
  filter.setTarget(parameters, true);
  filter.prepare(sampleRate);

  const auto input = sine(frequency, 48000);
  auto output = input;
  runBlocks(filter, output, [](std::size_t) {});

  const auto expected = eqit::dsp::magnitudeDb(eqit::dsp::design(parameters, sampleRate), frequency, sampleRate);
  CHECK_THAT(gainDb(input, output, 24000), WithinAbs(expected, 0.05));
}

TEST_CASE("Band: a disabled band passes the signal through untouched", "[dsp][band]") {
  Band filter;
  filter.setTarget(band(FilterShape::bell, 1000.0, 12.0, 1.0), false);
  filter.prepare(sampleRate);

  const auto input = sine(1000.0, 4800);
  auto output = input;
  runBlocks(filter, output, [](std::size_t) {});

  CHECK(output == input);
}

TEST_CASE("Band: parameter smoothing reaches the new target", "[dsp][band]") {
  Band filter;
  filter.setTarget(band(FilterShape::bell, 500.0, 0.0, 1.0), true);
  filter.prepare(sampleRate);

  const auto target = band(FilterShape::bell, 2000.0, 12.0, 3.0);
  const auto input = sine(2000.0, 48000);
  auto output = input;
  runBlocks(filter, output, [&](std::size_t block) {
    if (block == 4)
      filter.setTarget(target, true);
  });

  // Well after the 50 ms settle time the response matches the target design.
  CHECK_THAT(gainDb(input, output, 24000), WithinAbs(12.0, 0.05));
}

TEST_CASE("Band: abrupt changes do not click", "[dsp][band]") {
  struct Change {
    const char *name;
    BandParameters from;
    bool fromEnabled;
    BandParameters to;
    bool toEnabled;
  };

  const auto change = GENERATE(
      // Smoothing: a gain jump on a narrow bell and a frequency jump across the signal.
      Change{"gain jump", band(FilterShape::bell, 1000.0, -18.0, 4.0), true, band(FilterShape::bell, 1000.0, 18.0, 4.0),
             true},
      Change{"frequency jump", band(FilterShape::bell, 200.0, 12.0, 2.0), true,
             band(FilterShape::bell, 5000.0, 12.0, 2.0), true},
      // Crossfade: a shape change and switching on/off.
      Change{"shape change", band(FilterShape::lowShelf, 1000.0, 12.0, 1.0), true,
             band(FilterShape::bell, 1000.0, -12.0, 1.0), true},
      // Crossfade: a slope change alters the number of sections.
      Change{"slope change", band(FilterShape::lowCut, 300.0, 0.0, 0.707, 12), true,
             band(FilterShape::lowCut, 300.0, 0.0, 0.707, 48), true},
      Change{"switch on", band(FilterShape::notch, 1000.0, 0.0, 2.0), false, band(FilterShape::notch, 1000.0, 0.0, 2.0),
             true},
      Change{"switch off", band(FilterShape::highCut, 300.0, 0.0, 0.707), true,
             band(FilterShape::highCut, 300.0, 0.0, 0.707), false});
  INFO(change.name);

  constexpr std::size_t changeBlock = 40;
  constexpr auto changeAt = changeBlock * blockSize;

  Band filter;
  filter.setTarget(change.from, change.fromEnabled);
  filter.prepare(sampleRate);

  auto output = sine(1000.0, 24000);
  runBlocks(filter, output, [&](std::size_t block) {
    if (block == changeBlock)
      filter.setTarget(change.to, change.toEnabled);
  });

  // A 1 kHz sine of amplitude 0.5 boosted by up to 18 dB has a second difference of at most
  // ~0.5 * 8 * (2 pi 1000 / 48000)^2 ~ 0.07; a click is an order of magnitude larger.
  CHECK(maxSecondDifference(output, changeAt - 2000, changeAt + 4000) < 0.1);
}

TEST_CASE("Band: the click test does catch an unsmoothed change", "[dsp][band]") {
  // Sanity check of the measurement: switching coefficients abruptly must fail it.
  eqit::dsp::SectionFilter section;
  section.setSection(eqit::dsp::design(band(FilterShape::bell, 1000.0, -18.0, 4.0), sampleRate).sections[0]);

  auto output = sine(1000.0, 24000);
  for (std::size_t n = 0; n < output.size(); ++n) {
    if (n == 10240)
      section.setSection(eqit::dsp::design(band(FilterShape::bell, 1000.0, 18.0, 4.0), sampleRate).sections[0]);
    output[n] = section.process(output[n]);
  }

  CHECK(maxSecondDifference(output, 8240, 14240) > 0.5);
}

TEST_CASE("Band: frequency is clamped below Nyquist", "[dsp][band]") {
  Band filter;
  filter.setTarget(band(FilterShape::bell, 30000.0, 6.0, 1.0), true);
  filter.prepare(sampleRate);

  auto output = sine(1000.0, 4800);
  runBlocks(filter, output, [](std::size_t) {});

  CHECK(std::ranges::all_of(output, [](float sample) { return std::isfinite(sample); }));
}
