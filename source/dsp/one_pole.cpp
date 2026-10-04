#include "dsp/one_pole.h"

#include <cassert>
#include <cmath>
#include <numbers>

namespace even::dsp {

void OnePole::setCutoff(double cutoffHz, double sampleRate) noexcept {
  assert(cutoffHz > 0.0 && cutoffHz < sampleRate / 2.0);

  setCoefficient(std::tan(std::numbers::pi * cutoffHz / sampleRate));
}

void OnePole::setCoefficient(double prewarped) noexcept {
  assert(prewarped > 0.0);
  gain = static_cast<float>(prewarped / (1.0 + prewarped));
}

} // namespace even::dsp
