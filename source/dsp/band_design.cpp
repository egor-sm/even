#include "dsp/band_design.h"

#include <algorithm>
#include <cassert>
#include <cmath>
#include <numbers>

namespace even::dsp {

namespace {

Section mix(double g, double q, double lowpass, double bandpass, double highpass) noexcept {
  return {.order = 2, .g = g, .q = q, .lowpassMix = lowpass, .bandpassMix = bandpass, .highpassMix = highpass};
}

// Single-section shapes; the cuts are handled by designCut().
Section designSection(const BandParameters &parameters, double warped) noexcept {
  const auto gain = std::pow(10.0, parameters.gainDb / 20.0);       // G
  const auto sqrtGain = std::pow(10.0, parameters.gainDb / 40.0);   // sqrt(G): half the gain in dB
  const auto fourthRoot = std::pow(10.0, parameters.gainDb / 80.0); // G^(1/4)
  const auto q = parameters.q;

  switch (parameters.shape) {
  case FilterShape::bell:
    // input + (G - 1) * unity bandpass, with q scaled by sqrt(G) so that boosts and cuts are
    // mirror images and q keeps its meaning (bandwidth at half the gain in dB).
    return mix(warped, q * sqrtGain, 1.0, gain, 1.0);
  case FilterShape::lowShelf:
    // Gain G below, 1 above, sqrt(G) at the frequency; the SVF cutoff sits at f / G^(1/4).
    return mix(warped / fourthRoot, q, gain, sqrtGain, 1.0);
  case FilterShape::highShelf:
    return mix(warped * fourthRoot, q, 1.0, sqrtGain, gain);
  case FilterShape::tiltShelf:
    // The high shelf scaled by 1 / sqrt(G): 1 / sqrt(G) below, sqrt(G) above, unity at the frequency.
    return mix(warped * fourthRoot, q, 1.0 / sqrtGain, 1.0, sqrtGain);
  case FilterShape::notch:
    return mix(warped, q, 1.0, 0.0, 1.0);
  case FilterShape::bandPass:
    return mix(warped, q, 0.0, 1.0, 0.0);
  case FilterShape::lowCut:
  case FilterShape::highCut:
    break;
  }

  return mix(warped, q, 1.0, 1.0, 1.0); // unreachable for valid input: pass-through
}

// Butterworth cut of order N = slope / 6: its poles are spread evenly over a half circle, which
// gives the flattest pass band and exactly -3 dB at the cutoff. Each conjugate pole pair is an SVF;
// an odd order adds a one-pole section. The user's q scales the most resonant section relative to
// Butterworth (0.707), adding a peak at the knee above it and softening the knee below it.
BandDesign designCut(const BandParameters &parameters, double warped) noexcept {
  // Two sections per maxSections pair: order 16 (96 dB/oct) at most, whatever the caller passes.
  const auto order = std::clamp(parameters.slopeDbPerOctave / 6, 1, static_cast<int>(2 * BandDesign::maxSections));
  assert(order * 6 == parameters.slopeDbPerOctave && "slope must be sanitized");
  const auto highpass = parameters.shape == FilterShape::lowCut;
  const auto lowpassMix = highpass ? 0.0 : 1.0;
  const auto highpassMix = highpass ? 1.0 : 0.0;
  const auto resonance = parameters.q * std::numbers::sqrt2; // q / 0.707

  BandDesign result;

  if (order % 2 == 1)
    result.sections[result.count++] = {
        .order = 1, .g = warped, .q = 1.0, .lowpassMix = lowpassMix, .bandpassMix = 0.0, .highpassMix = highpassMix};

  const auto pairs = order / 2;
  for (int k = 1; k <= pairs; ++k) {
    // Angle of the k-th pole pair from the real axis.
    const auto angle = order % 2 == 0 ? std::numbers::pi * (2.0 * k - 1.0) / (2.0 * order)
                                      : std::numbers::pi * k / static_cast<double>(order);
    auto sectionQ = 1.0 / (2.0 * std::cos(angle));

    if (k == pairs)
      sectionQ *= resonance; // the last pair is the most resonant one

    result.sections[result.count++] = mix(warped, sectionQ, lowpassMix, 0.0, highpassMix);
  }

  return result;
}

} // namespace

BandParameters sanitize(BandParameters parameters, double sampleRate) noexcept {
  constexpr double minFrequencyHz = 10.0;
  constexpr double maxFrequencyRatio = 0.49; // of the sample rate
  constexpr double minQ = 0.01;

  parameters.frequencyHz = std::clamp(parameters.frequencyHz, minFrequencyHz, maxFrequencyRatio * sampleRate);
  parameters.q = std::max(parameters.q, minQ);

  // Snap to the nearest supported slope.
  parameters.slopeDbPerOctave = *std::ranges::min_element(
      cutSlopesDbPerOctave, {}, [&](int slope) { return std::abs(slope - parameters.slopeDbPerOctave); });

  return parameters;
}

BandDesign design(const BandParameters &parameters, double sampleRate) noexcept {
  assert(parameters.frequencyHz > 0.0 && parameters.frequencyHz < sampleRate / 2.0);
  assert(parameters.q > 0.0);

  // Prewarp the user-facing frequency so it lands exactly where requested even close to Nyquist;
  // shelves then shift the SVF cutoff relative to it in the analog domain.
  const auto warped = std::tan(std::numbers::pi * parameters.frequencyHz / sampleRate);

  if (isCut(parameters.shape))
    return designCut(parameters, warped);

  BandDesign result;
  result.sections[0] = designSection(parameters, warped);
  result.count = 1;
  return result;
}

} // namespace even::dsp
