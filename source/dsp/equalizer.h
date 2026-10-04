#pragma once

#include "dsp/band.h"
#include "dsp/filter_shape.h"

#include <array>
#include <cstddef>

namespace even::dsp {

// The full EQ: bands in series. Switched-off bands pass the signal through untouched and cost
// almost nothing. Processing is allocation-free.
class Equalizer {
public:
  static constexpr std::size_t maxBands = 12;

  void prepare(double sampleRate) noexcept;

  // Desired state of band `index` (0-based); reached smoothly by process().
  void setBand(std::size_t index, const BandParameters &parameters, bool enabled) noexcept;

  // In-place processing of up to Band::maxChannels channels.
  void process(float *const *channels, int numChannels, int numSamples) noexcept;

private:
  std::array<Band, maxBands> bands{};
};

} // namespace even::dsp
