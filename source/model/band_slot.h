#pragma once

#include "dsp/band_design.h"
#include "dsp/filter_shape.h"

#include <array>
#include <cstddef>
#include <cstdint>
#include <optional>

namespace even::model {

// Bands live in a fixed set of slots: hosts automate a fixed list of parameters, so creating and
// deleting a band takes and frees a slot instead of adding and removing parameters.
inline constexpr std::size_t numBands = 12;

inline constexpr int defaultSlopeIndex = 1; // 12 dB/oct, index into dsp::cutSlopesDbPerOctave

// Q of a new band, and of any band switched to a cut (Butterworth: flat, -3 dB at the frequency).
inline constexpr double newBandQ = 1.0;
inline constexpr double cutQ = 0.7071067811865476; // 1 / sqrt(2)

// Gain given to a band switched to a shape with gain when it had none, so the change is visible.
inline constexpr double shapeChangeGainDb = 4.0;

// One slot as the user edits it.
struct BandSlot {
  bool used = false;   // the band exists and is shown on the graph
  bool enabled = true; // false: bypassed, the band is shown but does not process
  dsp::FilterShape shape = dsp::FilterShape::bell;
  double frequencyHz = 1000.0;
  double gainDb = 0.0;
  double q = newBandQ;
  int slopeIndex = defaultSlopeIndex;
  // Creation order of used bands, from 1 (0 for a free slot); the UI derives the band color from it.
  std::uint32_t serial = 0;
};

using Bands = std::array<BandSlot, numBands>;

// The DSP parameters of the band (the slope index clamped to the supported slopes).
[[nodiscard]] dsp::BandParameters toParameters(const BandSlot &band) noexcept;

// The band as it plays at a sample rate: its sanitized parameters and the designed sections.
struct DesignedBand {
  dsp::BandParameters parameters;
  dsp::BandDesign design;
};
[[nodiscard]] DesignedBand designBand(const BandSlot &band, double sampleRate) noexcept;

// Exact (bitwise for the numbers) comparison: tells whether an edit changed anything at all.
[[nodiscard]] bool isSameSlot(const BandSlot &a, const BandSlot &b) noexcept;
[[nodiscard]] bool isSameBands(const Bands &a, const Bands &b) noexcept;

[[nodiscard]] std::optional<std::size_t> firstFreeSlot(const Bands &bands) noexcept;

// The serial for a band created now: one past the newest used band.
[[nodiscard]] std::uint32_t nextSerial(const Bands &bands) noexcept;

// A new band at the given point; the gain is ignored by shapes without gain.
[[nodiscard]] BandSlot newBand(dsp::FilterShape shape, double frequencyHz, double gainDb,
                               std::uint32_t serial) noexcept;

// The band with another shape. A switch to a cut resets q to Butterworth; a switch to a shape with
// gain from one without it (or with no gain set) gives it a small gain, so the change shows.
[[nodiscard]] BandSlot withShape(BandSlot band, dsp::FilterShape shape) noexcept;

} // namespace even::model
