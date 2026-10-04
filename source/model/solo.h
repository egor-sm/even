#pragma once

#include "dsp/filter_shape.h"

namespace even::model {

inline constexpr double soloMinHz = 20.0;
inline constexpr double soloMaxHz = 20000.0;

struct FrequencyRange {
  double lowHz;
  double highHz;
};

// The frequency range a band works on: what solo lets through, and what the UI lights. Bells, notches
// and band passes: the centre ± 0.75 of the bandwidth (0.2 to 3 octaves each side); low cuts and low
// shelves: up to half an octave above the frequency; high ones: from half an octave below; tilt
// shelves: three octaves each side.
[[nodiscard]] FrequencyRange soloRange(dsp::FilterShape shape, double frequencyHz, double q) noexcept;

} // namespace even::model
