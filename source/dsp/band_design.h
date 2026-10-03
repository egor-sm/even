#pragma once

#include "dsp/filter_shape.h"

#include <array>
#include <cstddef>

namespace eqit::dsp {

// One second-order section: SVF coefficients plus the weights of its outputs.
// The section's transfer function, with s normalized so that s = j at the SVF cutoff:
//   H(s) = (lowpassMix + bandpassMix * s / q + highpassMix * s^2) / (s^2 + s / q + 1)
// where bandpassMix weighs the unity-gain bandpass (bandpass / q).
struct Section {
  double g = 1.0; // prewarped integrator gain, tan(pi * cutoff / sampleRate)
  double q = 0.707;
  double lowpassMix = 1.0;
  double bandpassMix = 1.0;
  double highpassMix = 1.0;
};

struct BandDesign {
  static constexpr std::size_t maxSections = 4;

  std::array<Section, maxSections> sections{};
  std::size_t count = 0;
};

// Maps user-facing band parameters to filter sections. Pure function, safe on the audio thread.
// Requires 0 < frequencyHz < sampleRate / 2 and q > 0.
[[nodiscard]] BandDesign design(const BandParameters &parameters, double sampleRate) noexcept;

} // namespace eqit::dsp
