#include "dsp/band_design.h"
#include "dsp/band_response.h"
#include "dsp/svf_section.h"
#include "support/frequency_response.h"

#include <catch2/catch_test_macros.hpp>
#include <catch2/generators/catch_generators.hpp>
#include <catch2/matchers/catch_matchers_floating_point.hpp>

#include <cmath>
#include <cstddef>
#include <numbers>
#include <vector>

using Catch::Matchers::WithinAbs;
using eqit::dsp::BandParameters;
using eqit::dsp::FilterShape;

namespace {

constexpr double sampleRate = 48000.0;

BandParameters band(FilterShape shape, double frequency, double gainDb, double q) {
  return {.shape = shape, .frequencyHz = frequency, .gainDb = gainDb, .q = q};
}

// Analytic response of the design (what the UI will draw).
double designDb(const BandParameters &parameters, double frequency) {
  return eqit::dsp::magnitudeDb(eqit::dsp::design(parameters, sampleRate), frequency, sampleRate);
}

// Response measured by running a sine through the actual filter.
double measuredDb(const BandParameters &parameters, double frequency) {
  eqit::dsp::SvfSection section;
  section.setSection(eqit::dsp::design(parameters, sampleRate).sections[0]);
  return eqit::test::measureGainDb([&](float x) { return section.process(x); }, frequency, sampleRate, 1.0);
}

std::vector<double> logFrequencies(double from, double to, int count) {
  std::vector<double> result;
  result.reserve(static_cast<std::size_t>(count));
  for (int i = 0; i < count; ++i)
    result.push_back(from * std::pow(to / from, i / (count - 1.0)));
  return result;
}

} // namespace

TEST_CASE("Band: the filter sounds exactly like the drawn response", "[dsp][band]") {
  const auto parameters =
      GENERATE(band(FilterShape::bell, 1000.0, 9.0, 1.5), band(FilterShape::bell, 300.0, -15.0, 4.0),
               band(FilterShape::lowShelf, 200.0, 6.0, 0.707), band(FilterShape::highShelf, 5000.0, -10.0, 1.2),
               band(FilterShape::lowCut, 80.0, 0.0, 0.707), band(FilterShape::highCut, 9000.0, 0.0, 2.0),
               band(FilterShape::notch, 2000.0, 0.0, 5.0), band(FilterShape::bandPass, 700.0, 0.0, 1.0));
  const auto frequency = GENERATE(31.0, 250.0, 1700.0, 6100.0, 17000.0);

  CHECK_THAT(measuredDb(parameters, frequency), WithinAbs(designDb(parameters, frequency), 0.05));
}

TEST_CASE("Bell: exact gain at the center, also close to Nyquist", "[dsp][band][bell]") {
  const auto frequency = GENERATE(100.0, 1000.0, 15000.0);
  const auto gainDb = GENERATE(-24.0, -12.0, -3.0, 3.0, 12.0, 24.0);
  const auto parameters = band(FilterShape::bell, frequency, gainDb, 1.0);

  CHECK_THAT(designDb(parameters, frequency), WithinAbs(gainDb, 1e-9));
  CHECK_THAT(measuredDb(parameters, frequency), WithinAbs(gainDb, 0.05));
}

TEST_CASE("Bell: a cut is the exact mirror of the same boost", "[dsp][band][bell]") {
  const auto q = GENERATE(0.3, 1.0, 6.0);

  for (const auto frequency : logFrequencies(20.0, 23000.0, 60)) {
    const auto boost = designDb(band(FilterShape::bell, 2000.0, 10.0, q), frequency);
    const auto cut = designDb(band(FilterShape::bell, 2000.0, -10.0, q), frequency);
    CHECK_THAT(boost + cut, WithinAbs(0.0, 1e-9));
  }
}

TEST_CASE("Bell: q is the bandwidth at half the gain, independent of the gain", "[dsp][band][bell]") {
  // Well below Nyquist the response is analog-like: 1/q = 2 * sinh(ln(2) / 2 * N), N in octaves.
  constexpr double center = 200.0;
  const auto q = GENERATE(0.5, 1.0, 3.0);
  const auto gainDb = GENERATE(-18.0, 6.0, 12.0);
  const auto expectedOctaves = 2.0 * std::asinh(1.0 / (2.0 * q)) / std::numbers::ln2;

  // Bisection for the upper half-gain point in log frequency.
  auto low = center;
  auto high = center * 16.0;
  const auto halfGainReached = [&](double frequency) {
    const auto db = designDb(band(FilterShape::bell, center, gainDb, q), frequency);
    return gainDb > 0.0 ? db < gainDb / 2.0 : db > gainDb / 2.0;
  };
  for (int i = 0; i < 100; ++i) {
    const auto middle = std::sqrt(low * high);
    (halfGainReached(middle) ? high : low) = middle;
  }

  // The response is symmetric in log frequency, so the bandwidth is twice the upper half-width.
  const auto octaves = 2.0 * std::log2(high / center);
  CHECK_THAT(octaves, WithinAbs(expectedOctaves, 0.01));
}

TEST_CASE("Shelves: full gain on the shelf, half the gain at the frequency, unity elsewhere", "[dsp][band][shelf]") {
  const auto gainDb = GENERATE(-12.0, 6.0, 18.0);
  const auto frequency = GENERATE(300.0, 15000.0);

  const auto low = band(FilterShape::lowShelf, frequency, gainDb, 0.707);
  const auto high = band(FilterShape::highShelf, frequency, gainDb, 0.707);

  CHECK_THAT(designDb(low, frequency), WithinAbs(gainDb / 2.0, 1e-9));
  CHECK_THAT(designDb(high, frequency), WithinAbs(gainDb / 2.0, 1e-9));
  CHECK_THAT(designDb(low, 5.0), WithinAbs(gainDb, 0.05));
  CHECK_THAT(designDb(high, 5.0), WithinAbs(0.0, 0.05));
  CHECK_THAT(measuredDb(low, frequency), WithinAbs(gainDb / 2.0, 0.05));
}

TEST_CASE("Shelves: a cut is the exact mirror of the same boost", "[dsp][band][shelf]") {
  const auto shape = GENERATE(FilterShape::lowShelf, FilterShape::highShelf);
  const auto q = GENERATE(0.5, 0.707, 2.0);

  for (const auto frequency : logFrequencies(20.0, 23000.0, 60)) {
    const auto boost = designDb(band(shape, 1000.0, 12.0, q), frequency);
    const auto cut = designDb(band(shape, 1000.0, -12.0, q), frequency);
    CHECK_THAT(boost + cut, WithinAbs(0.0, 1e-9));
  }
}

TEST_CASE("Shelves: q = 0.707 has no overshoot, larger q overshoots", "[dsp][band][shelf]") {
  auto maxDb = -1e9;
  auto minDb = 1e9;
  auto maxDbResonant = -1e9;

  for (const auto frequency : logFrequencies(20.0, 20000.0, 400)) {
    const auto db = designDb(band(FilterShape::lowShelf, 1000.0, 12.0, 0.707), frequency);
    maxDb = std::max(maxDb, db);
    minDb = std::min(minDb, db);
    maxDbResonant = std::max(maxDbResonant, designDb(band(FilterShape::lowShelf, 1000.0, 12.0, 2.0), frequency));
  }

  CHECK(maxDb <= 12.0 + 1e-6);
  CHECK(minDb >= -1e-6);
  CHECK(maxDbResonant > 12.5);
}

TEST_CASE("Notch: removes the center frequency and leaves the rest", "[dsp][band][notch]") {
  const auto parameters = band(FilterShape::notch, 1000.0, 0.0, 4.0);

  CHECK(measuredDb(parameters, 1000.0) < -60.0);
  CHECK_THAT(designDb(parameters, 100.0), WithinAbs(0.0, 0.05));
  CHECK_THAT(designDb(parameters, 10000.0), WithinAbs(0.0, 0.05));
}

TEST_CASE("Cuts and band pass: -3 dB at the frequency for q = 0.707, unity in the pass band", "[dsp][band][cut]") {
  CHECK_THAT(designDb(band(FilterShape::lowCut, 100.0, 0.0, 0.707), 100.0), WithinAbs(-3.01, 0.01));
  CHECK_THAT(designDb(band(FilterShape::highCut, 8000.0, 0.0, 0.707), 8000.0), WithinAbs(-3.01, 0.01));
  CHECK_THAT(designDb(band(FilterShape::lowCut, 100.0, 0.0, 0.707), 5000.0), WithinAbs(0.0, 0.01));
  CHECK_THAT(designDb(band(FilterShape::bandPass, 700.0, 0.0, 2.0), 700.0), WithinAbs(0.0, 1e-9));
}

TEST_CASE("Shapes without gain ignore the gain parameter", "[dsp][band]") {
  const auto shape = GENERATE(FilterShape::lowCut, FilterShape::highCut, FilterShape::notch, FilterShape::bandPass);

  for (const auto frequency : logFrequencies(20.0, 20000.0, 30))
    CHECK_THAT(designDb(band(shape, 1000.0, 12.0, 1.0), frequency),
               WithinAbs(designDb(band(shape, 1000.0, 0.0, 1.0), frequency), 1e-12));
}
