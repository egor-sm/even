#include "dsp/band_design.h"
#include "dsp/band_response.h"
#include "dsp/section_filter.h"
#include "testing/frequency_response.h"

#include <catch2/catch_test_macros.hpp>
#include <catch2/generators/catch_generators.hpp>
#include <catch2/matchers/catch_matchers_floating_point.hpp>

#include <algorithm>
#include <array>
#include <cmath>
#include <cstddef>
#include <numbers>
#include <vector>

using Catch::Matchers::WithinAbs;
using even::dsp::BandParameters;
using even::dsp::FilterShape;

namespace {

constexpr double sampleRate = 48000.0;

BandParameters band(FilterShape shape, double frequency, double gainDb, double q, int slope = 12) {
  return {.shape = shape, .frequencyHz = frequency, .gainDb = gainDb, .q = q, .slopeDbPerOctave = slope};
}

// Analytic response of the design (what the UI will draw).
double designDb(const BandParameters &parameters, double frequency) {
  return even::dsp::magnitudeDb(even::dsp::design(parameters, sampleRate), frequency, sampleRate);
}

// Response measured by running a sine through the actual filter sections in series.
double measuredDb(const BandParameters &parameters, double frequency) {
  const auto designed = even::dsp::design(parameters, sampleRate);
  std::array<even::dsp::SectionFilter, even::dsp::BandDesign::maxSections> sections{};
  for (std::size_t i = 0; i < designed.count; ++i)
    sections[i].setSection(designed.sections[i]);

  return even::test::measureGainDb(
      [&](float x) {
        for (std::size_t i = 0; i < designed.count; ++i)
          x = sections[i].process(x);
        return x;
      },
      frequency, sampleRate, 1.0);
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
               band(FilterShape::notch, 2000.0, 0.0, 5.0), band(FilterShape::bandPass, 700.0, 0.0, 1.0),
               band(FilterShape::tiltShelf, 1200.0, 9.0, 0.707));
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
  const auto shape = GENERATE(FilterShape::lowShelf, FilterShape::highShelf, FilterShape::tiltShelf);
  const auto q = GENERATE(0.5, 0.707, 2.0);

  for (const auto frequency : logFrequencies(20.0, 23000.0, 60)) {
    const auto boost = designDb(band(shape, 1000.0, 12.0, q), frequency);
    const auto cut = designDb(band(shape, 1000.0, -12.0, q), frequency);
    CHECK_THAT(boost + cut, WithinAbs(0.0, 1e-9));
  }
}

TEST_CASE("Tilt shelf: -gain/2 below, +gain/2 above, unity at the frequency", "[dsp][band][shelf]") {
  const auto gainDb = GENERATE(-12.0, 6.0, 24.0);
  const auto frequency = GENERATE(300.0, 15000.0);
  const auto tilt = band(FilterShape::tiltShelf, frequency, gainDb, 0.707);

  CHECK_THAT(designDb(tilt, frequency), WithinAbs(0.0, 1e-9));
  CHECK_THAT(designDb(tilt, 5.0), WithinAbs(-gainDb / 2.0, 0.05));
  CHECK_THAT(measuredDb(tilt, frequency), WithinAbs(0.0, 0.05));
}

TEST_CASE("Tilt shelf: equals the high shelf of the same gain, lowered by half the gain", "[dsp][band][shelf]") {
  const auto q = GENERATE(0.5, 0.707, 2.0);

  for (const auto frequency : logFrequencies(20.0, 23000.0, 60)) {
    const auto tilt = designDb(band(FilterShape::tiltShelf, 1000.0, 10.0, q), frequency);
    const auto highShelf = designDb(band(FilterShape::highShelf, 1000.0, 10.0, q), frequency);
    CHECK_THAT(tilt, WithinAbs(highShelf - 5.0, 1e-9));
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

TEST_CASE("Cuts: every slope is -3 dB at the cutoff with q = 0.707 (Butterworth)", "[dsp][band][cut]") {
  const auto shape = GENERATE(FilterShape::lowCut, FilterShape::highCut);
  const auto slope = GENERATE(6, 12, 18, 24, 36, 48, 72, 96);
  const auto cutoff = GENERATE(100.0, 2000.0, 12000.0);
  const auto parameters = band(shape, cutoff, 0.0, std::numbers::sqrt2 / 2.0, slope);

  CHECK_THAT(designDb(parameters, cutoff), WithinAbs(-3.0103, 1e-6));
  CHECK_THAT(measuredDb(parameters, cutoff), WithinAbs(-3.0103, 0.05));
}

TEST_CASE("Cuts: the slope far from the cutoff matches the setting", "[dsp][band][cut]") {
  const auto slope = GENERATE(6, 12, 18, 24, 36, 48, 72, 96);
  const auto q = std::numbers::sqrt2 / 2.0;

  // "6 dB/oct" is rounded: doubling the frequency gives 20 * log10(2) = 6.02 dB per order.
  const auto order = slope / 6;
  const auto expected = order * 20.0 * std::log10(2.0);

  // Measure one octave deep in the stop band: low orders approach their asymptote slowly, so go far
  // (up to five octaves), but keep steep slopes above the -300 dB floor of magnitudeDb().
  const auto octaves = [&](int farthest) { return std::min(farthest, 250 / slope - 1); };

  const auto lowCut = band(FilterShape::lowCut, 500.0, 0.0, q, slope);
  const auto lowStart = 500.0 / std::exp2(octaves(5));
  CHECK_THAT(designDb(lowCut, lowStart) - designDb(lowCut, lowStart / 2.0), WithinAbs(expected, 0.01));

  const auto highCut = band(FilterShape::highCut, 50.0, 0.0, q, slope);
  const auto highStart = 50.0 * std::exp2(octaves(3));
  CHECK_THAT(designDb(highCut, highStart) - designDb(highCut, highStart * 2.0), WithinAbs(expected, 0.3));
}

TEST_CASE("Cuts: Butterworth pass band is flat, larger q adds a resonant peak", "[dsp][band][cut]") {
  const auto slope = GENERATE(12, 18, 24, 36, 48, 72, 96);

  auto flatMax = -1e9;
  auto resonantMax = -1e9;
  for (const auto frequency : logFrequencies(20.0, 20000.0, 400)) {
    flatMax =
        std::max(flatMax, designDb(band(FilterShape::lowCut, 200.0, 0.0, std::numbers::sqrt2 / 2.0, slope), frequency));
    resonantMax = std::max(resonantMax, designDb(band(FilterShape::lowCut, 200.0, 0.0, 2.0, slope), frequency));
  }

  CHECK(flatMax <= 1e-9);
  CHECK(resonantMax > 3.0);
}

TEST_CASE("Cuts: 6 dB/oct has no resonance, q is ignored", "[dsp][band][cut]") {
  for (const auto frequency : logFrequencies(20.0, 20000.0, 30))
    CHECK_THAT(designDb(band(FilterShape::lowCut, 300.0, 0.0, 8.0, 6), frequency),
               WithinAbs(designDb(band(FilterShape::lowCut, 300.0, 0.0, 0.707, 6), frequency), 1e-12));
}

TEST_CASE("Cuts: the cascade sounds exactly like the drawn response", "[dsp][band][cut]") {
  const auto slope = GENERATE(6, 18, 48, 96);
  const auto parameters = band(FilterShape::highCut, 1500.0, 0.0, 1.2, slope);
  const auto frequency = GENERATE(300.0, 1500.0, 2400.0);

  CHECK_THAT(measuredDb(parameters, frequency), WithinAbs(designDb(parameters, frequency), 0.05));
}

TEST_CASE("Cuts: the steepest slope at the highest q is stable", "[dsp][band][cut]") {
  // 96 dB/oct with q = 30: the most resonant section gets q of about 430 and rings for a while,
  // but its impulse response must decay and stay finite.
  const auto shape = GENERATE(FilterShape::lowCut, FilterShape::highCut);
  const auto cutoff = GENERATE(30.0, 1000.0, 18000.0);
  const auto designed = even::dsp::design(band(shape, cutoff, 0.0, 30.0, 96), sampleRate);

  std::array<even::dsp::SectionFilter, even::dsp::BandDesign::maxSections> sections{};
  for (std::size_t i = 0; i < designed.count; ++i)
    sections[i].setSection(designed.sections[i]);

  const auto length = static_cast<std::size_t>(20.0 * sampleRate);
  const auto tail = static_cast<std::size_t>(0.1 * sampleRate);
  auto peak = 0.0;
  auto tailPeak = 0.0;
  for (std::size_t n = 0; n < length; ++n) {
    auto x = n == 0 ? 1.0f : 0.0f;
    for (std::size_t i = 0; i < designed.count; ++i)
      x = sections[i].process(x);

    REQUIRE(std::isfinite(x));
    peak = std::max(peak, static_cast<double>(std::abs(x)));
    if (n >= length - tail)
      tailPeak = std::max(tailPeak, static_cast<double>(std::abs(x)));
  }

  CHECK(peak < 10.0);
  CHECK(tailPeak < 1e-6);
}

TEST_CASE("sanitize: snaps the slope to a supported one", "[dsp][band][cut]") {
  CHECK(even::dsp::sanitize(band(FilterShape::lowCut, 100.0, 0.0, 1.0, 30), sampleRate).slopeDbPerOctave == 24);
  CHECK(even::dsp::sanitize(band(FilterShape::lowCut, 100.0, 0.0, 1.0, 60), sampleRate).slopeDbPerOctave == 48);
  CHECK(even::dsp::sanitize(band(FilterShape::lowCut, 100.0, 0.0, 1.0, 200), sampleRate).slopeDbPerOctave == 96);
  CHECK(even::dsp::sanitize(band(FilterShape::lowCut, 100.0, 0.0, 1.0, 0), sampleRate).slopeDbPerOctave == 6);
}
