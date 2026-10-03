#pragma once

#include <array>
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

[[nodiscard]] constexpr bool isCut(FilterShape shape) noexcept {
  return shape == FilterShape::lowCut || shape == FilterShape::highCut;
}

// Supported cut slopes; a slope of N * 6 dB/oct is a Butterworth filter of order N.
inline constexpr std::array cutSlopesDbPerOctave{6, 12, 18, 24, 36, 48};

struct BandParameters {
  FilterShape shape = FilterShape::bell;
  double frequencyHz = 1000.0;
  double gainDb = 0.0; // ignored by shapes without gain
  double q = 0.707;
  int slopeDbPerOctave = 12; // used by cuts only
};

// Clamps the frequency safely below Nyquist (and above a few Hz) and q above zero, and snaps the
// slope to a supported one, so that any user or host value can be designed and processed.
[[nodiscard]] BandParameters sanitize(BandParameters parameters, double sampleRate) noexcept;

} // namespace eqit::dsp
