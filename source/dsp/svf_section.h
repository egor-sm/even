#pragma once

#include "dsp/band_design.h"
#include "dsp/svf.h"

namespace eqit::dsp {

// An SVF configured from a designed Section: filters one channel and mixes the outputs.
class SvfSection {
public:
  // rampSamples > 0 moves the output weights linearly to the new values over that many samples.
  // The weights scale the outputs directly, so a step in them is an audible click; the SVF
  // coefficients themselves tolerate steps.
  void setSection(const Section &section, int rampSamples = 0) noexcept {
    filter.setCoefficients(section.g, section.q);

    const Weights next{
        .lowpass = static_cast<float>(section.lowpassMix),
        .bandpass = static_cast<float>(section.bandpassMix / section.q), // weighs the unity-gain bandpass
        .highpass = static_cast<float>(section.highpassMix),
    };

    if (rampSamples <= 0) {
      weights = next;
      rampRemaining = 0;
      return;
    }

    const auto steps = static_cast<float>(rampSamples);
    increment = {.lowpass = (next.lowpass - weights.lowpass) / steps,
                 .bandpass = (next.bandpass - weights.bandpass) / steps,
                 .highpass = (next.highpass - weights.highpass) / steps};
    rampTarget = next;
    rampRemaining = rampSamples;
  }

  void reset() noexcept { filter.reset(); }

  [[nodiscard]] float process(float input) noexcept {
    if (rampRemaining > 0) {
      if (--rampRemaining == 0) {
        weights = rampTarget; // land exactly, without accumulated rounding
      } else {
        weights.lowpass += increment.lowpass;
        weights.bandpass += increment.bandpass;
        weights.highpass += increment.highpass;
      }
    }

    const auto [lowpass, bandpass, highpass] = filter.process(input);
    return weights.lowpass * lowpass + weights.bandpass * bandpass + weights.highpass * highpass;
  }

private:
  struct Weights {
    float lowpass = 1.0f;
    float bandpass = 1.0f;
    float highpass = 1.0f;
  };

  Svf filter;
  Weights weights;
  Weights increment;
  Weights rampTarget;
  int rampRemaining = 0;
};

} // namespace eqit::dsp
