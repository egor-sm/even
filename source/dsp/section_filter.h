#pragma once

#include "dsp/band_design.h"
#include "dsp/one_pole.h"
#include "dsp/svf.h"

namespace even::dsp {

// Filters one channel through one designed Section: a one-pole filter (order 1) or an SVF
// (order 2), with the outputs mixed by the section's weights.
class SectionFilter {
public:
  // rampSamples > 0 moves the output weights linearly to the new values over that many samples.
  // The weights scale the outputs directly, so a step in them is an audible click; the filter
  // coefficients themselves tolerate steps.
  void setSection(const Section &section, int rampSamples = 0) noexcept {
    if (section.order != order) {
      order = section.order;
      reset();
    }

    if (order == 1)
      onePole.setCoefficient(section.g);
    else
      svf.setCoefficients(section.g, section.q);

    const Weights next{
        .lowpass = static_cast<float>(section.lowpassMix),
        // Weighs the unity-gain bandpass; one-pole sections have no bandpass output.
        .bandpass = order == 1 ? 0.0f : static_cast<float>(section.bandpassMix / section.q),
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

  void reset() noexcept {
    onePole.reset();
    svf.reset();
  }

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

    if (order == 1) {
      const auto [lowpass, highpass] = onePole.process(input);
      return weights.lowpass * lowpass + weights.highpass * highpass;
    }

    const auto [lowpass, bandpass, highpass] = svf.process(input);
    return weights.lowpass * lowpass + weights.bandpass * bandpass + weights.highpass * highpass;
  }

private:
  struct Weights {
    float lowpass = 1.0f;
    float bandpass = 1.0f;
    float highpass = 1.0f;
  };

  int order = 2;
  OnePole onePole;
  Svf svf;
  Weights weights;
  Weights increment;
  Weights rampTarget;
  int rampRemaining = 0;
};

} // namespace even::dsp
