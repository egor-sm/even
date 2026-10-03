#pragma once

#include "dsp/band_design.h"

namespace eqit::dsp {

// Exact magnitude response of a designed band at `frequencyHz`, in dB. Evaluates each section's
// transfer function at the bilinear-warped frequency; this is also what the UI draws.
[[nodiscard]] double magnitudeDb(const BandDesign &design, double frequencyHz, double sampleRate) noexcept;

} // namespace eqit::dsp
