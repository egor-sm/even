#include "dsp/band_response.h"

#include <cmath>
#include <complex>
#include <numbers>

namespace eqit::dsp {

double magnitudeDb(const BandDesign &design, double frequencyHz, double sampleRate) noexcept {
  const auto warped = std::tan(std::numbers::pi * frequencyHz / sampleRate);
  auto magnitude = 1.0;

  for (std::size_t i = 0; i < design.count; ++i) {
    const auto &section = design.sections[i];
    const std::complex<double> s{0.0, warped / section.g};

    const auto numerator = section.lowpassMix + section.bandpassMix * s / section.q + section.highpassMix * s * s;
    const auto denominator = s * s + s / section.q + 1.0;
    magnitude *= std::abs(numerator / denominator);
  }

  return 20.0 * std::log10(magnitude);
}

} // namespace eqit::dsp
