#pragma once

#include <cstdint>

namespace eqit::dsp {

// Band shapes, named as in common parametric EQs.
enum class FilterShape : std::uint8_t {
  bell,      // boost/cut around the frequency; q sets the width at half the gain (in dB)
  lowShelf,  // boost/cut below the frequency; the frequency is the half-gain point
  highShelf, // boost/cut above the frequency; the frequency is the half-gain point
  lowCut,    // removes everything below the frequency (highpass)
  highCut,   // removes everything above the frequency (lowpass)
  notch,     // removes a narrow band around the frequency
  bandPass,  // keeps only a band around the frequency
};

[[nodiscard]] constexpr bool usesGain(FilterShape shape) noexcept {
  return shape == FilterShape::bell || shape == FilterShape::lowShelf || shape == FilterShape::highShelf;
}

struct BandParameters {
  FilterShape shape = FilterShape::bell;
  double frequencyHz = 1000.0;
  double gainDb = 0.0; // ignored by shapes without gain
  double q = 0.707;
};

} // namespace eqit::dsp
