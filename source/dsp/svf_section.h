#pragma once

#include "dsp/band_design.h"
#include "dsp/svf.h"

namespace eqit::dsp {

// An SVF configured from a designed Section: filters one channel and mixes the outputs.
class SvfSection {
public:
  void setSection(const Section &section) noexcept {
    filter.setCoefficients(section.g, section.q);
    lowpassMix = static_cast<float>(section.lowpassMix);
    bandpassMix = static_cast<float>(section.bandpassMix / section.q); // weighs the unity-gain bandpass
    highpassMix = static_cast<float>(section.highpassMix);
  }

  void reset() noexcept { filter.reset(); }

  [[nodiscard]] float process(float input) noexcept {
    const auto [lowpass, bandpass, highpass] = filter.process(input);
    return lowpassMix * lowpass + bandpassMix * bandpass + highpassMix * highpass;
  }

private:
  Svf filter;
  float lowpassMix = 1.0f;
  float bandpassMix = 1.0f;
  float highpassMix = 1.0f;
};

} // namespace eqit::dsp
