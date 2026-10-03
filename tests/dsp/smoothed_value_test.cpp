#include "dsp/smoothed_value.h"

#include <catch2/catch_test_macros.hpp>
#include <catch2/matchers/catch_matchers_floating_point.hpp>

#include <cmath>
#include <numbers>

using Catch::Matchers::WithinAbs;
using Catch::Matchers::WithinRel;
using eqit::dsp::SmoothedValue;

namespace {

constexpr double sampleRate = 48000.0;
constexpr double settleMs = 50.0;
constexpr int settleSamples = 2400; // 50 ms

SmoothedValue makeSmoother(SmoothedValue::Scale scale, double from, double to) {
  SmoothedValue value;
  value.prepare(sampleRate, settleMs, scale);
  value.setCurrentAndTarget(from);
  value.setTarget(to);
  return value;
}

} // namespace

TEST_CASE("SmoothedValue: covers 99% of a jump within the settle time", "[dsp][smoothing]") {
  auto value = makeSmoother(SmoothedValue::Scale::linear, 0.0, 10.0);

  for (int i = 0; i < settleSamples / 32; ++i)
    value.advance(32);

  CHECK_THAT(value.value(), WithinAbs(9.9, 0.01));
}

TEST_CASE("SmoothedValue: the result does not depend on the step size", "[dsp][smoothing]") {
  auto bySample = makeSmoother(SmoothedValue::Scale::linear, -24.0, 12.0);
  auto byBlock = makeSmoother(SmoothedValue::Scale::linear, -24.0, 12.0);

  for (int i = 0; i < 640; ++i)
    bySample.advance(1);
  for (int i = 0; i < 20; ++i)
    byBlock.advance(32);

  CHECK_THAT(bySample.value(), WithinAbs(byBlock.value(), 1e-9));
}

TEST_CASE("SmoothedValue: logarithmic scale moves by equal ratios", "[dsp][smoothing]") {
  // Half of the way (in the smoothing domain) is reached after ln(2) time constants.
  const auto halfwaySamples = static_cast<int>(std::round(settleSamples / std::log(100.0) * std::numbers::ln2));

  auto logarithmic = makeSmoother(SmoothedValue::Scale::logarithmic, 100.0, 10000.0);
  auto linear = makeSmoother(SmoothedValue::Scale::linear, 100.0, 10000.0);
  logarithmic.advance(halfwaySamples);
  linear.advance(halfwaySamples);

  // halfwaySamples is rounded to whole samples, hence the 0.5% tolerance.
  CHECK_THAT(logarithmic.value(), WithinRel(1000.0, 0.005)); // geometric middle of 100 and 10000
  CHECK_THAT(linear.value(), WithinRel(5050.0, 0.005));      // arithmetic middle
}

TEST_CASE("SmoothedValue: settles exactly and reports it", "[dsp][smoothing]") {
  auto value = makeSmoother(SmoothedValue::Scale::logarithmic, 50.0, 400.0);
  CHECK(value.isSmoothing());

  for (int i = 0; i < 100; ++i)
    value.advance(settleSamples);

  CHECK_FALSE(value.isSmoothing());
  CHECK_THAT(value.value(), WithinRel(400.0, 1e-9));
}
