#include "dsp/band_design.h"

#include <algorithm>
#include <cassert>
#include <cmath>
#include <numbers>

namespace eqit::dsp {

namespace {

Section mix(double g, double q, double lowpass, double bandpass, double highpass) noexcept {
  return {.g = g, .q = q, .lowpassMix = lowpass, .bandpassMix = bandpass, .highpassMix = highpass};
}

Section designSection(const BandParameters &parameters, double sampleRate) noexcept {
  const auto [shape, frequencyHz, gainDb, q] = parameters;

  // Prewarp the user-facing frequency so it lands exactly where requested even close to Nyquist;
  // shelves then shift the SVF cutoff relative to it in the analog domain.
  const auto warped = std::tan(std::numbers::pi * frequencyHz / sampleRate);

  const auto gain = std::pow(10.0, gainDb / 20.0);       // G
  const auto sqrtGain = std::pow(10.0, gainDb / 40.0);   // sqrt(G): half the gain in dB
  const auto fourthRoot = std::pow(10.0, gainDb / 80.0); // G^(1/4)

  switch (shape) {
  case FilterShape::bell:
    // input + (G - 1) * unity bandpass, with q scaled by sqrt(G) so that boosts and cuts are
    // mirror images and q keeps its meaning (bandwidth at half the gain in dB).
    return mix(warped, q * sqrtGain, 1.0, gain, 1.0);
  case FilterShape::lowShelf:
    // Gain G below, 1 above, sqrt(G) at the frequency; the SVF cutoff sits at f / G^(1/4).
    return mix(warped / fourthRoot, q, gain, sqrtGain, 1.0);
  case FilterShape::highShelf:
    return mix(warped * fourthRoot, q, 1.0, sqrtGain, gain);
  case FilterShape::lowCut:
    return mix(warped, q, 0.0, 0.0, 1.0);
  case FilterShape::highCut:
    return mix(warped, q, 1.0, 0.0, 0.0);
  case FilterShape::notch:
    return mix(warped, q, 1.0, 0.0, 1.0);
  case FilterShape::bandPass:
    return mix(warped, q, 0.0, 1.0, 0.0);
  }

  return mix(warped, q, 1.0, 1.0, 1.0); // unreachable: all-pass-through identity
}

} // namespace

BandParameters sanitize(BandParameters parameters, double sampleRate) noexcept {
  constexpr double minFrequencyHz = 10.0;
  constexpr double maxFrequencyRatio = 0.49; // of the sample rate
  constexpr double minQ = 0.01;

  parameters.frequencyHz = std::clamp(parameters.frequencyHz, minFrequencyHz, maxFrequencyRatio * sampleRate);
  parameters.q = std::max(parameters.q, minQ);
  return parameters;
}

BandDesign design(const BandParameters &parameters, double sampleRate) noexcept {
  assert(parameters.frequencyHz > 0.0 && parameters.frequencyHz < sampleRate / 2.0);
  assert(parameters.q > 0.0);

  BandDesign result;
  result.sections[0] = designSection(parameters, sampleRate);
  result.count = 1;
  return result;
}

} // namespace eqit::dsp
