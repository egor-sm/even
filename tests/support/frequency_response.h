#pragma once

#include <cmath>
#include <complex>
#include <concepts>
#include <cstddef>
#include <numbers>

namespace even::test {

// Gain in dB of a single-channel processor at `frequency`, measured by feeding a sine.
// The first `settleSeconds` let the filter reach its steady state and are not measured.
template <std::invocable<float> Process>
double measureGainDb(Process process, double frequency, double sampleRate, double settleSeconds = 0.5,
                     double measureSeconds = 0.5) {
  const auto settle = static_cast<std::size_t>(settleSeconds * sampleRate);
  const auto measure = static_cast<std::size_t>(measureSeconds * sampleRate);
  const auto omega = 2.0 * std::numbers::pi * frequency / sampleRate;

  double inputEnergy = 0.0;
  double outputEnergy = 0.0;

  for (std::size_t n = 0; n < settle + measure; ++n) {
    const auto input = std::sin(omega * static_cast<double>(n));
    const auto output = static_cast<double>(process(static_cast<float>(input)));

    if (n >= settle) {
      inputEnergy += input * input;
      outputEnergy += output * output;
    }
  }

  return 10.0 * std::log10(outputEnergy / inputEnergy);
}

// Maps a digital frequency to the analog one it corresponds to under the bilinear transform
// with prewarping at `cutoff` (w_a T / 2 = tan(w_d T / 2)): returns s / wc on the imaginary axis.
inline std::complex<double> warpedNormalizedS(double frequency, double cutoff, double sampleRate) {
  const auto pi = std::numbers::pi;
  return {0.0, std::tan(pi * frequency / sampleRate) / std::tan(pi * cutoff / sampleRate)};
}

inline double toDb(double magnitude) {
  return 20.0 * std::log10(magnitude);
}

} // namespace even::test
