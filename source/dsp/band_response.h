#pragma once

#include "dsp/band_design.h"

namespace even::dsp {

// Exact magnitude response of a designed band at `frequencyHz`, in dB (floored at -300 dB).
// Evaluates each section's transfer function at the bilinear-warped frequency.
// Requires 0 < frequencyHz < sampleRate / 2.
[[nodiscard]] double magnitudeDb(const BandDesign &design, double frequencyHz, double sampleRate) noexcept;

} // namespace even::dsp
