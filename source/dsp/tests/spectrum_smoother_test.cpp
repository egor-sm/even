#include "dsp/spectrum_smoother.h"

#include <catch2/catch_test_macros.hpp>
#include <catch2/generators/catch_generators.hpp>
#include <catch2/matchers/catch_matchers_floating_point.hpp>

#include <algorithm>
#include <cmath>
#include <cstddef>
#include <vector>

using Catch::Matchers::WithinAbs;
using Catch::Matchers::WithinRel;
using even::dsp::LowEnd;
using even::dsp::SmoothingKernel;
using even::dsp::SmoothingOptions;
using even::dsp::SmoothingWidth;
using even::dsp::SpectrumSmoother;

namespace {

constexpr double sampleRate = 48000.0;
constexpr std::size_t fftSize = 8192;
constexpr std::size_t numBins = fftSize / 2 + 1;
constexpr double binHz = sampleRate / fftSize;

std::vector<float> logFrequencies(float minHz, float maxHz, std::size_t count) {
  std::vector<float> frequencies(count);
  for (std::size_t i = 0; i < count; ++i)
    frequencies[i] = minHz * std::pow(maxHz / minHz, static_cast<float>(i) / static_cast<float>(count - 1));
  return frequencies;
}

std::vector<float> reduce(const std::vector<float> &binPower, const std::vector<float> &frequencies,
                          const SmoothingOptions &options) {
  SpectrumSmoother smoother;
  smoother.prepare(frequencies, binHz, binPower.size(), binHz, options);
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

TEST_CASE("Every kernel keeps a flat spectrum flat") {
  const auto kernel = GENERATE(SmoothingKernel::roundedBox, SmoothingKernel::box, SmoothingKernel::triangle,
                               SmoothingKernel::hann, SmoothingKernel::gaussian);
  const auto lowEnd = GENERATE(LowEnd::linearPower, LowEnd::monotoneDb, LowEnd::minimumWidth);
  const auto width = GENERATE(SmoothingWidth::constant, SmoothingWidth::psychoacoustic, SmoothingWidth::erb);

  const std::vector<float> flat(numBins, 0.25f);
  const auto points = reduce(flat, logFrequencies(20.0f, 20000.0f, 512),
                             {.kernel = kernel, .width = width, .octaves = 1.0 / 6.0, .lowEnd = lowEnd});

  for (const auto power : points)
    REQUIRE_THAT(power, WithinRel(0.25f, 1e-4f));
}

TEST_CASE("Weighted kernels change smoothly with the display frequency, the rounded box in steps") {
  // A spectrum rising by 1 dB per bin: wherever a bin enters or leaves the band at once, the
  // reduced level jumps.
  std::vector<float> rising(numBins);
  for (std::size_t k = 0; k < numBins; ++k)
    rising[k] = static_cast<float>(std::pow(10.0, 0.1 * static_cast<double>(std::min<std::size_t>(k, 60))));

  // 60-300 Hz: 1/6 octave spans 1-7 bins.
  const auto frequencies = logFrequencies(60.0f, 300.0f, 120);
  const auto kinks = [&](SmoothingKernel kernel) {
    return largestKinkDb(reduce(rising, frequencies, {.kernel = kernel}));
  };

  // Measured: rounded box 1 dB, box 0.14 dB (kinks where an edge crosses a bin), smooth kernels 0.01 dB.
  CHECK(kinks(SmoothingKernel::roundedBox) > 0.5);
  CHECK(kinks(SmoothingKernel::box) < 0.2);
  CHECK(kinks(SmoothingKernel::triangle) < 0.03);
  CHECK(kinks(SmoothingKernel::hann) < 0.03);
  CHECK(kinks(SmoothingKernel::gaussian) < 0.03);
}

TEST_CASE("A box with partial edge weights averages exactly its nominal band") {
  // Power equal to the bin's index; each bin k covers [k - 1/2, k + 1/2] in bins and weighs the
  // octaves of the band it covers.
  std::vector<float> ramp(numBins);
  for (std::size_t k = 0; k < numBins; ++k)
    ramp[k] = static_cast<float>(k);

  const auto frequency = GENERATE(100.0f, 1000.0f, 7000.0f);
  const auto points = reduce(ramp, {frequency}, {.kernel = SmoothingKernel::box, .octaves = 1.0 / 6.0});

  const auto low = static_cast<double>(frequency) * std::exp2(-1.0 / 12.0) / binHz;
  const auto high = static_cast<double>(frequency) * std::exp2(1.0 / 12.0) / binHz;
  double sum = 0.0;
  for (auto bin = std::lround(low); bin <= std::lround(high); ++bin) {
    const auto k = static_cast<double>(bin);
    sum += k * std::log2(std::min(high, k + 0.5) / std::max(low, k - 0.5));
  }

  REQUIRE_THAT(points[0], WithinRel(sum / std::log2(high / low), 1e-5));
}

TEST_CASE("Monotone interpolation in dB never overshoots the bins") {
  std::vector<float> peak(numBins, 1e-6f);
  peak[7] = 1.0f; // ~41 Hz
  peak[8] = 0.5f;

  const auto frequencies = logFrequencies(20.0f, 50.0f, 200);
  const auto points = reduce(peak, frequencies, {.kernel = SmoothingKernel::hann, .lowEnd = LowEnd::monotoneDb});

  for (std::size_t i = 0; i < frequencies.size(); ++i) {
    const auto position = static_cast<double>(frequencies[i]) / binHz;
    const auto below = static_cast<std::size_t>(position);
    const auto low = std::min(peak[below], peak[below + 1]);
    const auto high = std::max(peak[below], peak[below + 1]);
    REQUIRE(points[i] >= low * 0.999f);
    REQUIRE(points[i] <= high * 1.001f);
  }
}

TEST_CASE("Minimum width averages at least that many bins at the low end") {
  std::vector<float> alternating(numBins);
  for (std::size_t k = 0; k < numBins; ++k)
    alternating[k] = k % 2 == 0 ? 1.0f : 0.0f;

  // Interpolation follows the alternation; a kernel of four bins evens it out.
  const auto frequencies = logFrequencies(20.0f, 60.0f, 100);
  const auto interpolated = reduce(alternating, frequencies, {.kernel = SmoothingKernel::hann});
  const auto widened = reduce(alternating, frequencies,
                              {.kernel = SmoothingKernel::hann, .lowEnd = LowEnd::minimumWidth, .minimumBins = 4.0});

  const auto [interpolatedMin, interpolatedMax] = std::ranges::minmax(interpolated);
  const auto [widenedMin, widenedMax] = std::ranges::minmax(widened);
  CHECK(interpolatedMax - interpolatedMin > 0.9f);
  CHECK(widenedMax - widenedMin < 0.1f);
}

TEST_CASE("Smoothing widths") {
  const SmoothingOptions sixth{.octaves = 1.0 / 6.0};
  CHECK_THAT(SpectrumSmoother::octavesAt(50.0, sixth), WithinAbs(1.0 / 6.0, 1e-12));

  const SmoothingOptions psychoacoustic{.width = SmoothingWidth::psychoacoustic, .octaves = 1.0 / 6.0};
  CHECK_THAT(SpectrumSmoother::octavesAt(50.0, psychoacoustic), WithinAbs(1.0 / 3.0, 1e-12));
  CHECK_THAT(SpectrumSmoother::octavesAt(5000.0, psychoacoustic), WithinAbs(1.0 / 6.0, 1e-12));

  // ERB: about an octave at 50 Hz, about 1/6 octave at 5 kHz.
  const SmoothingOptions erb{.width = SmoothingWidth::erb};
  CHECK_THAT(SpectrumSmoother::octavesAt(50.0, erb), WithinAbs(0.855, 0.01));
  CHECK_THAT(SpectrumSmoother::octavesAt(5000.0, erb), WithinAbs(0.163, 0.002));
}
