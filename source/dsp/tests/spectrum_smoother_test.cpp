#include "dsp/spectrum_smoother.h"

#include <catch2/catch_test_macros.hpp>
#include <catch2/matchers/catch_matchers_floating_point.hpp>

#include <algorithm>
#include <cmath>
#include <cstddef>
#include <vector>

using Catch::Matchers::WithinRel;
using even::dsp::SpectrumSmoother;

namespace {

constexpr double sampleRate = 48000.0;
constexpr std::size_t fftSize = 8192;
constexpr std::size_t numBins = fftSize / 2 + 1;
constexpr double binHz = sampleRate / fftSize;
constexpr double twelfth = 1.0 / 12.0;

std::vector<float> logFrequencies(float minHz, float maxHz, std::size_t count) {
  std::vector<float> frequencies(count);
  for (std::size_t i = 0; i < count; ++i)
    frequencies[i] = minHz * std::pow(maxHz / minHz, static_cast<float>(i) / static_cast<float>(count - 1));
  return frequencies;
}

std::vector<float> reduce(const std::vector<float> &binPower, const std::vector<float> &frequencies,
                          double octaves = twelfth) {
  SpectrumSmoother smoother;
  smoother.prepare(frequencies, binHz, binPower.size(), octaves);
  std::vector<float> points(frequencies.size());
  smoother.reduce(binPower, points);
  return points;
}

// Largest second difference of the levels in dB: kinks and steps in an otherwise smooth curve.
double largestKinkDb(const std::vector<float> &points) {
  const auto db = [&](std::size_t i) { return 10.0 * std::log10(static_cast<double>(points[i])); };
  double largest = 0.0;
  for (std::size_t i = 1; i + 1 < points.size(); ++i)
    largest = std::max(largest, std::abs(db(i + 1) - 2.0 * db(i) + db(i - 1)));
  return largest;
}

} // namespace

TEST_CASE("Smoothing keeps a flat spectrum flat") {
  const std::vector<float> flat(numBins, 0.25f);
  for (const auto power : reduce(flat, logFrequencies(20.0f, 20000.0f, 512)))
    REQUIRE_THAT(power, WithinRel(0.25f, 1e-4f));
}

TEST_CASE("Smoothing changes continuously with the display frequency") {
  // A spectrum rising by 1 dB per bin: a band edge rounded to whole bins would make the reduced
  // level jump wherever a bin enters or leaves the band (by about 1 dB).
  std::vector<float> rising(numBins);
  for (std::size_t k = 0; k < numBins; ++k)
    rising[k] = static_cast<float>(std::pow(10.0, 0.1 * static_cast<double>(std::min<std::size_t>(k, 60))));

  // 60-300 Hz: 1/6 octave spans 1-7 bins. Measured: 0.01 dB.
  CHECK(largestKinkDb(reduce(rising, logFrequencies(60.0f, 300.0f, 120), 1.0 / 6.0)) < 0.03);
}

TEST_CASE("Monotone interpolation in dB never overshoots the bins") {
  std::vector<float> peak(numBins, 1e-6f);
  peak[7] = 1.0f; // ~41 Hz
  peak[8] = 0.5f;

  const auto frequencies = logFrequencies(20.0f, 50.0f, 200);
  const auto points = reduce(peak, frequencies);

  for (std::size_t i = 0; i < frequencies.size(); ++i) {
    const auto position = static_cast<double>(frequencies[i]) / binHz;
    const auto below = static_cast<std::size_t>(position);
    const auto low = std::min(peak[below], peak[below + 1]);
    const auto high = std::max(peak[below], peak[below + 1]);
    REQUIRE(points[i] >= low * 0.999f);
    REQUIRE(points[i] <= high * 1.001f);
  }
}

TEST_CASE("Monotone interpolation passes through the bins") {
  std::vector<float> ramp(numBins);
  for (std::size_t k = 0; k < numBins; ++k)
    ramp[k] = static_cast<float>(k + 1);

  const auto bin = static_cast<float>(5.0 * binHz);
  CHECK_THAT(reduce(ramp, {bin})[0], WithinRel(6.0f, 1e-4f));
}
