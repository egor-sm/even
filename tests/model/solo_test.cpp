#include "model/solo.h"
#include "support/frequency_response.h"

#include <catch2/catch_test_macros.hpp>
#include <catch2/matchers/catch_matchers_floating_point.hpp>

#include <cmath>
#include <numbers>
#include <optional>

using Catch::Matchers::WithinAbs;
using Catch::Matchers::WithinRel;
using even::dsp::FilterShape;

TEST_CASE("soloRange: edges reach to the end of the spectrum", "[model][solo]") {
  const auto low = even::model::soloRange(FilterShape::lowCut, 100.0, 0.707);
  CHECK(low.lowHz == 20.0);
  CHECK_THAT(low.highHz, WithinRel(100.0 * std::numbers::sqrt2, 1e-12));

  const auto high = even::model::soloRange(FilterShape::highShelf, 8000.0, 0.707);
  CHECK_THAT(high.lowHz, WithinRel(8000.0 / std::numbers::sqrt2, 1e-12));
  CHECK(high.highHz == 20000.0);
}

TEST_CASE("soloRange: bells span 0.75 of their bandwidth each side, within 0.2 to 3 octaves", "[model][solo]") {
  const auto narrow = even::model::soloRange(FilterShape::bell, 1000.0, 40.0);
  CHECK_THAT(std::log2(narrow.highHz / 1000.0), WithinAbs(0.2, 1e-12));

  const auto q1 = even::model::soloRange(FilterShape::notch, 1000.0, 1.0);
  const auto bandwidth = 2.0 / std::numbers::ln2 * std::asinh(0.5);
  CHECK_THAT(std::log2(q1.highHz / 1000.0), WithinAbs(0.75 * bandwidth, 1e-12));
  CHECK_THAT(std::sqrt(q1.lowHz * q1.highHz), WithinRel(1000.0, 1e-12));

  const auto wide = even::model::soloRange(FilterShape::bandPass, 1000.0, 0.1);
  CHECK_THAT(std::log2(wide.highHz / 1000.0), WithinAbs(3.0, 1e-12));
}

TEST_CASE("soloRange: tilt shelves span three octaves each side, clamped to 20 Hz – 20 kHz", "[model][solo]") {
  const auto tilt = even::model::soloRange(FilterShape::tiltShelf, 1000.0, 0.707);
  CHECK(tilt.lowHz == 125.0);
  CHECK(tilt.highHz == 8000.0);

  const auto clamped = even::model::soloRange(FilterShape::tiltShelf, 50.0, 0.707);
  CHECK(clamped.lowHz == 20.0);
}

namespace {

constexpr double sampleRate = 48000.0;

// Gain in dB of the solo filter aimed at `band`, measured at `frequency`.
double soloGainDb(const std::optional<even::dsp::BandParameters> &band, double frequency) {
  even::model::SoloFilter solo;
  solo.prepare(sampleRate);
  solo.setTarget(band);
  return even::test::measureGainDb(
      [&](float input) {
        auto *channel = &input;
        solo.process(&channel, 1, 1);
        return input;
      },
      frequency, sampleRate);
}

} // namespace

TEST_CASE("SoloFilter: without a band the signal passes through", "[model][solo]") {
  CHECK_THAT(soloGainDb(std::nullopt, 50.0), WithinAbs(0.0, 0.01));
  CHECK_THAT(soloGainDb(std::nullopt, 15000.0), WithinAbs(0.0, 0.01));
}

TEST_CASE("SoloFilter: a bell keeps its range and cuts the rest", "[model][solo]") {
  const even::dsp::BandParameters bell{.shape = FilterShape::bell, .frequencyHz = 1000.0, .gainDb = 6.0, .q = 1.0};
  CHECK(soloGainDb(bell, 1000.0) > -1.0);
  CHECK(soloGainDb(bell, 100.0) < -30.0);
  CHECK(soloGainDb(bell, 10000.0) < -30.0);
}

TEST_CASE("SoloFilter: a range reaching the end of the spectrum leaves that side open", "[model][solo]") {
  const even::dsp::BandParameters lowCut{.shape = FilterShape::lowCut, .frequencyHz = 200.0, .q = 0.707};
  CHECK_THAT(soloGainDb(lowCut, 30.0), WithinAbs(0.0, 0.1));
  CHECK(soloGainDb(lowCut, 5000.0) < -30.0);
}
