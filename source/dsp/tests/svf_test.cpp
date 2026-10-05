#include "dsp/svf.h"
#include "testing/frequency_response.h"

#include <catch2/catch_test_macros.hpp>
#include <catch2/generators/catch_generators.hpp>
#include <catch2/matchers/catch_matchers_floating_point.hpp>

#include <cmath>
#include <complex>

using Catch::Matchers::WithinAbs;
using even::dsp::Svf;

namespace {

constexpr double sampleRate = 48000.0;

using Output = float (*)(const Svf::Outputs &);

constexpr Output lowpass = [](const Svf::Outputs &o) { return o.lowpass; };
constexpr Output bandpass = [](const Svf::Outputs &o) { return o.bandpass; };
constexpr Output highpass = [](const Svf::Outputs &o) { return o.highpass; };

double gainDb(Output output, double cutoff, double q, double frequency) {
  Svf filter;
  filter.setParameters(cutoff, q, sampleRate);
  // High q rings for a while: give the filter time to settle before measuring.
  return even::test::measureGainDb([&](float x) { return output(filter.process(x)); }, frequency, sampleRate, 1.0);
}

} // namespace

TEST_CASE("Svf: matches the bilinear-transformed analog response", "[dsp][svf]") {
  constexpr double cutoff = 2000.0;
  const auto q = GENERATE(0.5, 0.707, 2.0, 8.0);
  const auto frequency = GENERATE(40.0, 400.0, 1500.0, 2000.0, 2600.0, 9000.0, 20000.0);

  const auto s = even::test::warpedNormalizedS(frequency, cutoff, sampleRate);
  const auto denominator = s * s + s / q + 1.0;

  CHECK_THAT(gainDb(lowpass, cutoff, q, frequency), WithinAbs(even::test::toDb(std::abs(1.0 / denominator)), 0.05));
  CHECK_THAT(gainDb(bandpass, cutoff, q, frequency), WithinAbs(even::test::toDb(std::abs(s / denominator)), 0.05));
  CHECK_THAT(gainDb(highpass, cutoff, q, frequency), WithinAbs(even::test::toDb(std::abs(s * s / denominator)), 0.05));
}

TEST_CASE("Svf: gain at the cutoff equals q (the resonance)", "[dsp][svf]") {
  const auto cutoff = GENERATE(100.0, 1000.0, 12000.0);
  const auto q = GENERATE(0.707, 1.0, 5.0);
  const auto expected = even::test::toDb(q); // 0.707 -> -3 dB, 5 -> +14 dB

  CHECK_THAT(gainDb(lowpass, cutoff, q, cutoff), WithinAbs(expected, 0.05));
  CHECK_THAT(gainDb(bandpass, cutoff, q, cutoff), WithinAbs(expected, 0.05));
  CHECK_THAT(gainDb(highpass, cutoff, q, cutoff), WithinAbs(expected, 0.05));
}

TEST_CASE("Svf: slopes are 12 dB/oct for lowpass/highpass and 6 dB/oct for bandpass", "[dsp][svf]") {
  constexpr double cutoff = 100.0;
  constexpr double q = 0.707;

  // One octave step far from the cutoff, still well below Nyquist.
  CHECK_THAT(gainDb(lowpass, cutoff, q, 1600.0) - gainDb(lowpass, cutoff, q, 800.0), WithinAbs(-12.0, 0.1));
  CHECK_THAT(gainDb(highpass, cutoff, q, 6.25) - gainDb(highpass, cutoff, q, 12.5), WithinAbs(-12.0, 0.1));
  CHECK_THAT(gainDb(bandpass, cutoff, q, 1600.0) - gainDb(bandpass, cutoff, q, 800.0), WithinAbs(-6.0, 0.1));
}

TEST_CASE("Svf: lowpass + 2R * bandpass + highpass reconstructs the input", "[dsp][svf]") {
  Svf filter;
  filter.setParameters(700.0, 3.0, sampleRate);

  for (int n = 0; n < 1000; ++n) {
    const auto input = static_cast<float>(std::sin(0.05 * n) + 0.3 * std::sin(0.9 * n));
    const auto o = filter.process(input);
    const auto sum = o.lowpass + filter.damping() * o.bandpass + o.highpass;
    CHECK_THAT(static_cast<double>(sum), WithinAbs(static_cast<double>(input), 1e-5));
  }
}

TEST_CASE("Svf: impulse response decays (stable for any cutoff and q)", "[dsp][svf]") {
  const auto cutoff = GENERATE(20.0, 1000.0, 23000.0);
  const auto q = GENERATE(0.1, 0.707, 20.0);

  Svf filter;
  filter.setParameters(cutoff, q, sampleRate);

  auto energyAtEnd = 0.0;
  for (int n = 0; n < 5 * 48000; ++n) {
    const auto o = filter.process(n == 0 ? 1.0f : 0.0f);
    if (n >= 5 * 48000 - 1000)
      energyAtEnd += static_cast<double>(o.lowpass * o.lowpass + o.highpass * o.highpass);
  }

  CHECK(energyAtEnd < 1e-12);
}

TEST_CASE("Svf: stays bounded when cutoff and q jump every sample", "[dsp][svf]") {
  Svf filter;

  for (int n = 0; n < 48000; ++n) {
    filter.setParameters(n % 2 == 0 ? 20.0 : 20000.0, n % 3 == 0 ? 0.1 : 10.0, sampleRate);
    const auto o = filter.process(n % 100 < 50 ? 1.0f : -1.0f);
    REQUIRE(std::isfinite(o.lowpass));
    REQUIRE(std::isfinite(o.bandpass));
    REQUIRE(std::isfinite(o.highpass));
    REQUIRE(std::abs(o.lowpass) < 100.0f);
  }
}
