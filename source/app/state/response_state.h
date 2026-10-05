#pragma once

#include "model/band_slot.h"

namespace even {

// Everything the EQ response curve depends on; resent to the UI whenever it changes.
struct ResponseState {
  double sampleRate = 0.0;
  model::Bands bands{};

  // The sample rate to draw with: before the host prepares the processor there is none yet, and
  // any typical one draws fine.
  [[nodiscard]] double drawingSampleRate() const noexcept { return sampleRate > 0.0 ? sampleRate : 48000.0; }
};

// Exact (bitwise) comparison: any change at all, however small, must redraw the curve.
[[nodiscard]] bool isSameResponse(const ResponseState &a, const ResponseState &b) noexcept;

} // namespace even
