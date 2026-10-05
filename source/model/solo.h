#pragma once

#include "dsp/band.h"
#include "dsp/filter_shape.h"

#include <optional>

namespace even::model {

inline constexpr double soloMinHz = 20.0;
inline constexpr double soloMaxHz = 20000.0;

struct FrequencyRange {
  double lowHz;
  double highHz;
};

// The frequency range a band works on: what solo lets through, and what the UI lights. Bells, notches
// and band passes: the centre ± 0.75 of the bandwidth (0.2 to 3 octaves each side); low cuts and low
// shelves: up to half an octave above the frequency; high ones: from half an octave below; tilt
// shelves: three octaves each side.
[[nodiscard]] FrequencyRange soloRange(dsp::FilterShape shape, double frequencyHz, double q) noexcept;

// Plays only the solo range of a band: a low cut and a high cut (24 dB/oct) at its ends, faded in
// and out like bands. Without a band it passes the signal through. Allocation-free.
class SoloFilter {
public:
  void prepare(double sampleRate) noexcept;

  // The band to solo, or nullopt to end solo; reached smoothly by process().
  void setTarget(const std::optional<dsp::BandParameters> &band) noexcept;

  // In-place processing of up to dsp::Band::maxChannels channels.
  void process(float *const *channels, int numChannels, int numSamples) noexcept;

private:
  dsp::Band lowCut;
  dsp::Band highCut;
};

} // namespace even::model
