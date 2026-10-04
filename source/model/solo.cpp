#include "model/solo.h"

#include <algorithm>
#include <cmath>
#include <numbers>

namespace even::model {

namespace {

// Bandwidth in octaves between the half-gain points of a bell with this q.
double octaves(double q) noexcept {
  return 2.0 / std::numbers::ln2 * std::asinh(1.0 / (2.0 * q));
}

} // namespace

FrequencyRange soloRange(dsp::FilterShape shape, double frequencyHz, double q) noexcept {
  using enum dsp::FilterShape;
  const auto f = frequencyHz;

  switch (shape) {
  case lowCut:
  case lowShelf:
    return {.lowHz = soloMinHz, .highHz = std::min(soloMaxHz, f * std::numbers::sqrt2)};
  case highCut:
  case highShelf:
    return {.lowHz = std::max(soloMinHz, f / std::numbers::sqrt2), .highHz = soloMaxHz};
  case tiltShelf:
    return {.lowHz = std::max(soloMinHz, f / 8.0), .highHz = std::min(soloMaxHz, f * 8.0)};
  case bell:
  case notch:
  case bandPass:
    break;
  }

  const auto half = std::clamp(octaves(q) * 0.75, 0.2, 3.0);
  return {.lowHz = std::max(soloMinHz, f / std::exp2(half)), .highHz = std::min(soloMaxHz, f * std::exp2(half))};
}

} // namespace even::model
