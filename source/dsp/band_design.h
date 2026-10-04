#pragma once

#include "dsp/filter_shape.h"

#include <array>
#include <cstddef>

namespace even::dsp {

// One filter section: coefficients plus the weights of its outputs. With s normalized so that
// s = j at the section's cutoff, its transfer function is
//   order 2 (SVF):      H(s) = (lowpassMix + bandpassMix * s / q + highpassMix * s^2) / (s^2 + s / q + 1)
//   order 1 (one-pole): H(s) = (lowpassMix + highpassMix * s) / (s + 1)          (q, bandpassMix unused)
// where bandpassMix weighs the unity-gain bandpass (bandpass / q).
struct Section {
  int order = 2;
  double g = 1.0; // prewarped integrator gain, tan(pi * cutoff / sampleRate)
  double q = 0.707;
  double lowpassMix = 1.0;
  double bandpassMix = 1.0;
  double highpassMix = 1.0;
};

struct BandDesign {
  // 48 dB/oct cuts: four second-order sections.
  static constexpr std::size_t maxSections = 4;

  std::array<Section, maxSections> sections{};
  std::size_t count = 0;
};

// Maps user-facing band parameters to filter sections. Pure function, safe on the audio thread.
// Requires sanitized parameters (see sanitize()): 0 < frequencyHz < sampleRate / 2, q > 0 and a
// supported cut slope.
[[nodiscard]] BandDesign design(const BandParameters &parameters, double sampleRate) noexcept;

} // namespace even::dsp
