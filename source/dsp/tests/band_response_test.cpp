#include "dsp/band_design.h"
#include "dsp/band_response.h"

#include <catch2/catch_test_macros.hpp>

#include <cmath>

using even::dsp::BandParameters;
using even::dsp::FilterShape;

TEST_CASE("magnitudeDb: a notch center is finite (floored) instead of -infinity", "[dsp][response]") {
  constexpr double sampleRate = 48000.0;
  const BandParameters notch{.shape = FilterShape::notch, .frequencyHz = 1000.0, .gainDb = 0.0, .q = 8.0};
  const auto db = even::dsp::magnitudeDb(even::dsp::design(notch, sampleRate), 1000.0, sampleRate);

  CHECK(std::isfinite(db));
  CHECK(db < -100.0);
}

TEST_CASE("sanitize: keeps the frequency below Nyquist and q positive", "[dsp][response]") {
  const BandParameters parameters{.shape = FilterShape::bell, .frequencyHz = 30000.0, .gainDb = 0.0, .q = -1.0};
  const auto sanitized = even::dsp::sanitize(parameters, 44100.0);

  CHECK(sanitized.frequencyHz < 22050.0);
  CHECK(sanitized.q > 0.0);
}
