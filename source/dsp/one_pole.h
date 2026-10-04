#pragma once

namespace even::dsp {

// First-order (6 dB/oct) filter built with the topology-preserving transform (TPT):
// the analog RC lowpass dy/dt = wc * (x - y) with its integrator replaced by a trapezoidal one
// and the zero-delay feedback solved per sample.
//
// One instance processes one channel and produces lowpass and highpass outputs at once.
class OnePole {
public:
  struct Outputs {
    float lowpass;
    float highpass;
  };

  // Prewarped so the -3 dB point lands exactly on cutoffHz despite the bilinear frequency warping.
  // Requires 0 < cutoffHz < sampleRate / 2.
  void setCutoff(double cutoffHz, double sampleRate) noexcept;

  // Low-level form: `prewarped` is g = tan(pi * cutoff / sampleRate). Requires prewarped > 0.
  void setCoefficient(double prewarped) noexcept;

  void reset() noexcept { state = 0.0f; }

  [[nodiscard]] Outputs process(float input) noexcept {
    const auto v = (input - state) * gain;
    const auto lowpass = v + state;
    state = lowpass + v;
    return {.lowpass = lowpass, .highpass = input - lowpass};
  }

private:
  float gain = 0.0f;  // G = g / (1 + g), where g = tan(pi * cutoff / sampleRate)
  float state = 0.0f; // the trapezoidal integrator's memory
};

} // namespace even::dsp
