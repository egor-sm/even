#include "model/solo.h"

#include <catch2/catch_test_macros.hpp>
#include <catch2/matchers/catch_matchers_floating_point.hpp>

#include <cmath>
#include <numbers>

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
