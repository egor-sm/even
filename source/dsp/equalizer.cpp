#include "dsp/equalizer.h"

#include <cassert>

namespace even::dsp {

void Equalizer::prepare(double sampleRate) noexcept {
  for (auto &band : bands)
    band.prepare(sampleRate);
}

void Equalizer::setBand(std::size_t index, const BandParameters &parameters, bool enabled) noexcept {
  assert(index < bands.size());
  bands[index].setTarget(parameters, enabled);
}

void Equalizer::process(float *const *channels, int numChannels, int numSamples) noexcept {
  for (auto &band : bands)
    band.process(channels, numChannels, numSamples);
}

} // namespace even::dsp
