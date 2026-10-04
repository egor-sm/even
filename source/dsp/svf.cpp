#include "dsp/svf.h"

#include <cassert>
#include <cmath>
#include <numbers>

namespace even::dsp {

void Svf::setParameters(double cutoffHz, double q, double sampleRate) noexcept {
  assert(cutoffHz > 0.0 && cutoffHz < sampleRate / 2.0);
  setCoefficients(std::tan(std::numbers::pi * cutoffHz / sampleRate), q);
}

void Svf::setCoefficients(double prewarped, double q) noexcept {
  assert(prewarped > 0.0);
  assert(q > 0.0);

  const auto damping = 1.0 / q;

  g = static_cast<float>(prewarped);
  twoR = static_cast<float>(damping);
  feedbackScale = static_cast<float>(1.0 / (1.0 + damping * prewarped + prewarped * prewarped));
}

} // namespace even::dsp
