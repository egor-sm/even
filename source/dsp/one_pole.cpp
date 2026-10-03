#include "dsp/one_pole.h"

#include <cassert>
#include <cmath>
#include <numbers>

namespace eqit::dsp {

void OnePole::setCutoff(double cutoffHz, double sampleRate) noexcept {
  assert(cutoffHz > 0.0 && cutoffHz < sampleRate / 2.0);

  const auto g = std::tan(std::numbers::pi * cutoffHz / sampleRate);
  gain = static_cast<float>(g / (1.0 + g));
}

} // namespace eqit::dsp
