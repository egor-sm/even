#include "model/solo.h"

#include "model/band_slot.h"

#include <algorithm>
#include <cmath>
#include <numbers>

namespace even::model {

namespace {

// Bandwidth in octaves between the half-gain points of a bell with this q.
double octaves(double q) noexcept {
  return 2.0 / std::numbers::ln2 * std::asinh(1.0 / (2.0 * q));
}

constexpr int soloSlopeDbPerOctave = 24;

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

void SoloFilter::prepare(double sampleRate) noexcept {
  lowCut.prepare(sampleRate);
  highCut.prepare(sampleRate);
}

void SoloFilter::setTarget(const std::optional<dsp::BandParameters> &band) noexcept {
  dsp::BandParameters low{
      .shape = dsp::FilterShape::lowCut, .frequencyHz = soloMinHz, .q = cutQ, .slopeDbPerOctave = soloSlopeDbPerOctave};
  dsp::BandParameters high{.shape = dsp::FilterShape::highCut,
                           .frequencyHz = soloMaxHz,
                           .q = cutQ,
                           .slopeDbPerOctave = soloSlopeDbPerOctave};
  auto lowOn = false;
  auto highOn = false;

  if (band) {
    const auto range = soloRange(band->shape, band->frequencyHz, band->q);
    // A range reaching an end of the spectrum needs no filter on that side.
    lowOn = range.lowHz > soloMinHz * 1.01;
    highOn = range.highHz < soloMaxHz * 0.99;
    low.frequencyHz = range.lowHz;
    high.frequencyHz = range.highHz;
  }

  lowCut.setTarget(low, lowOn);
  highCut.setTarget(high, highOn);
}

void SoloFilter::process(float *const *channels, int numChannels, int numSamples) noexcept {
  lowCut.process(channels, numChannels, numSamples);
  highCut.process(channels, numChannels, numSamples);
}

} // namespace even::model
