#include "model/band_slot.h"

#include <algorithm>
#include <bit>
#include <cmath>

namespace even::model {

namespace {

bool sameBits(double a, double b) noexcept {
  return std::bit_cast<std::uint64_t>(a) == std::bit_cast<std::uint64_t>(b);
}

// Below this a gain reads as 0.0 dB in the UI.
constexpr double noGainDb = 0.05;

} // namespace

dsp::BandParameters toParameters(const BandSlot &band) noexcept {
  const auto lastSlope = static_cast<int>(dsp::cutSlopesDbPerOctave.size()) - 1;
  return {
      .shape = band.shape,
      .frequencyHz = band.frequencyHz,
      .gainDb = band.gainDb,
      .q = band.q,
      .slopeDbPerOctave =
          dsp::cutSlopesDbPerOctave[static_cast<std::size_t>(std::clamp(band.slopeIndex, 0, lastSlope))],
  };
}

DesignedBand designBand(const BandSlot &band, double sampleRate) noexcept {
  const auto parameters = dsp::sanitize(toParameters(band), sampleRate);
  return {.parameters = parameters, .design = dsp::design(parameters, sampleRate)};
}

bool isSameSlot(const BandSlot &a, const BandSlot &b) noexcept {
  return a.used == b.used && a.enabled == b.enabled && a.shape == b.shape && sameBits(a.frequencyHz, b.frequencyHz) &&
         sameBits(a.gainDb, b.gainDb) && sameBits(a.q, b.q) && a.slopeIndex == b.slopeIndex && a.serial == b.serial;
}

bool isSameBands(const Bands &a, const Bands &b) noexcept {
  return std::ranges::equal(a, b, isSameSlot);
}

std::optional<std::size_t> firstFreeSlot(const Bands &bands) noexcept {
  for (std::size_t i = 0; i < bands.size(); ++i)
    if (!bands[i].used)
      return i;
  return std::nullopt;
}

std::uint32_t nextSerial(const Bands &bands) noexcept {
  std::uint32_t newest = 0;
  for (const auto &band : bands)
    if (band.used)
      newest = std::max(newest, band.serial);
  return newest + 1;
}

BandSlot newBand(dsp::FilterShape shape, double frequencyHz, double gainDb, std::uint32_t serial) noexcept {
  return {
      .used = true,
      .enabled = true,
      .shape = shape,
      .frequencyHz = frequencyHz,
      .gainDb = dsp::usesGain(shape) ? gainDb : 0.0,
      .q = dsp::isCut(shape) ? cutQ : newBandQ,
      .slopeIndex = defaultSlopeIndex,
      .serial = serial,
  };
}

BandSlot withShape(BandSlot band, dsp::FilterShape shape) noexcept {
  if (dsp::isCut(shape) && !dsp::isCut(band.shape))
    band.q = cutQ;

  if (dsp::usesGain(shape) && (!dsp::usesGain(band.shape) || std::abs(band.gainDb) < noGainDb))
    band.gainDb = shapeChangeGainDb;

  band.shape = shape;
  return band;
}

} // namespace even::model
