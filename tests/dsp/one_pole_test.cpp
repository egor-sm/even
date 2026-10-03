#include "dsp/one_pole.h"
#include "support/frequency_response.h"

#include <catch2/catch_test_macros.hpp>
#include <catch2/generators/catch_generators.hpp>
#include <catch2/matchers/catch_matchers_floating_point.hpp>

#include <cmath>
#include <complex>

using Catch::Matchers::WithinAbs;
using eqit::dsp::OnePole;

namespace {

constexpr double sampleRate = 48000.0;

double lowpassGainDb(double cutoff, double frequency) {
  OnePole filter;
  filter.setCutoff(cutoff, sampleRate);
  return eqit::test::measureGainDb([&](float x) { return filter.process(x).lowpass; }, frequency, sampleRate);
}

double highpassGainDb(double cutoff, double frequency) {
  OnePole filter;
  filter.setCutoff(cutoff, sampleRate);
  return eqit::test::measureGainDb([&](float x) { return filter.process(x).highpass; }, frequency, sampleRate);
}

} // namespace

TEST_CASE("OnePole: -3 dB exactly at the cutoff, also close to Nyquist (prewarping)", "[dsp][one_pole]") {
  const auto cutoff = GENERATE(30.0, 100.0, 1000.0, 5000.0, 15000.0);

  CHECK_THAT(lowpassGainDb(cutoff, cutoff), WithinAbs(-3.01, 0.02));
  CHECK_THAT(highpassGainDb(cutoff, cutoff), WithinAbs(-3.01, 0.02));
}

TEST_CASE("OnePole: 6 dB/oct slopes of an analog RC filter well below Nyquist", "[dsp][one_pole]") {
  // Kept below ~2 kHz: the bilinear frequency warping is already ~0.1 dB at 3 kHz (fs = 48 kHz).
  constexpr double cutoff = 100.0;

  // Analog 1-pole: |H| = 1 / sqrt(1 + (f / fc)^2) for the lowpass.
  const auto expectedDb = [](double ratio) { return -10.0 * std::log10(1.0 + ratio * ratio); };

  CHECK_THAT(lowpassGainDb(cutoff, cutoff * 8.0), WithinAbs(expectedDb(8.0), 0.05));   // ~ -18.1 dB
  CHECK_THAT(lowpassGainDb(cutoff, cutoff * 16.0), WithinAbs(expectedDb(16.0), 0.05)); // ~ -24.1 dB
  CHECK_THAT(highpassGainDb(cutoff, cutoff / 8.0), WithinAbs(expectedDb(8.0), 0.05));
  CHECK_THAT(lowpassGainDb(cutoff, cutoff / 5.0), WithinAbs(expectedDb(0.2), 0.05)); // ~ -0.17 dB
}

TEST_CASE("OnePole: matches the bilinear-transformed analog response at any frequency", "[dsp][one_pole]") {
  constexpr double cutoff = 3000.0;
  const auto frequency = GENERATE(50.0, 500.0, 2000.0, 3000.0, 8000.0, 16000.0, 22000.0);

  // H_lp(s) = 1 / (s + 1), H_hp(s) = s / (s + 1) with s normalized to the cutoff and warped.
  const auto s = eqit::test::warpedNormalizedS(frequency, cutoff, sampleRate);
  const auto lowpass = eqit::test::toDb(std::abs(1.0 / (s + 1.0)));
  const auto highpass = eqit::test::toDb(std::abs(s / (s + 1.0)));

  CHECK_THAT(lowpassGainDb(cutoff, frequency), WithinAbs(lowpass, 0.05));
  CHECK_THAT(highpassGainDb(cutoff, frequency), WithinAbs(highpass, 0.05));
}

TEST_CASE("OnePole: lowpass + highpass reconstructs the input exactly", "[dsp][one_pole]") {
  OnePole filter;
  filter.setCutoff(1000.0, sampleRate);

  for (int n = 0; n < 1000; ++n) {
    const auto input = static_cast<float>(std::sin(0.05 * n) + 0.3 * std::sin(0.7 * n));
    const auto [lowpass, highpass] = filter.process(input);
    CHECK_THAT(static_cast<double>(lowpass + highpass), WithinAbs(static_cast<double>(input), 1e-6));
  }
}

TEST_CASE("OnePole: stays bounded when the cutoff jumps every sample", "[dsp][one_pole]") {
  // Extreme audio-rate modulation between 20 Hz and 20 kHz. The trapezoidal integrator may
  // overshoot the input range here (it does, up to ~1.6x), but it must not blow up.
  OnePole filter;

  for (int n = 0; n < 48000; ++n) {
    filter.setCutoff(n % 2 == 0 ? 20.0 : 20000.0, sampleRate);
    const auto [lowpass, highpass] = filter.process(n % 100 < 50 ? 1.0f : -1.0f);
    REQUIRE(std::isfinite(lowpass));
    REQUIRE(std::isfinite(highpass));
    REQUIRE(std::abs(lowpass) < 4.0f);
  }
}
