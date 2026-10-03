#pragma once

#include "dsp/filter_shape.h"
#include "parameters.h"

#include <array>
#include <cstddef>
#include <vector>

namespace eqit {

struct BandState {
  bool enabled = false;
  dsp::BandParameters parameters;
};

// Everything the EQ response curve depends on; resent to the UI whenever it changes.
struct ResponseState {
  double sampleRate = 0.0;
  std::array<BandState, parameters::numBands> bands{};
};

// Exact (bitwise) comparison: any change at all, however small, must redraw the curve.
[[nodiscard]] bool isSameResponse(const ResponseState &a, const ResponseState &b) noexcept;

// Packs the designed sections of all enabled bands for the UI, which evaluates and draws
// H(s) = (lowpassMix + bandpassMix * s / q + highpassMix * s^2) / (s^2 + s / q + 1),
// s = j * tan(pi * f / sampleRate) / g, per section (see dsp::Section).
// Layout (little-endian, 8-byte aligned):
//   header, 16 bytes:  u32 version, u32 bandCount, f64 sampleRate
//   per enabled band:  u32 band (1-based), u32 shape, u32 sectionCount, u32 reserved,
//                      f64 frequencyHz, f64 gainDb (0 for shapes without gain), f64 q,
//                      sectionCount x {f64 g, f64 q, f64 lowpassMix, f64 bandpassMix, f64 highpassMix}
[[nodiscard]] std::vector<std::byte> serializeResponse(const ResponseState &state);

} // namespace eqit
