#pragma once

namespace eqit::dsp {

// Second-order (12 dB/oct) state-variable filter built with the topology-preserving transform:
// two trapezoidal integrators in a loop with the bandpass output fed back through 2R (damping),
// the zero-delay feedback solved per sample.
//
// One instance processes one channel and produces lowpass, bandpass and highpass at once:
//   H_lp(s) = 1 / (s^2 + 2Rs + 1),  H_bp(s) = s / (...),  H_hp(s) = s^2 / (...)
// with s normalized to the cutoff. The outputs satisfy lowpass + 2R * bandpass + highpass = input,
// which lets EQ shapes (bell, shelves, notch) be built by mixing them.
class Svf {
public:
  struct Outputs {
    float lowpass;
    float bandpass; // peak gain Q at the cutoff; multiply by damping() for unity gain
    float highpass;
  };

  // q = 1 / (2R): 0.707 is a flat (Butterworth) response, larger values add a resonant peak of
  // height q at the cutoff. Requires 0 < cutoffHz < sampleRate / 2 and q > 0.
  void setParameters(double cutoffHz, double q, double sampleRate) noexcept;

  void reset() noexcept { state1 = state2 = 0.0f; }

  // 2R = 1 / q: scales the bandpass output to unity gain at the cutoff.
  [[nodiscard]] float damping() const noexcept { return twoR; }

  [[nodiscard]] Outputs process(float input) noexcept {
    const auto highpass = (input - (twoR + g) * state1 - state2) * feedbackScale;
    const auto v1 = g * highpass;
    const auto bandpass = v1 + state1;
    state1 = bandpass + v1;
    const auto v2 = g * bandpass;
    const auto lowpass = v2 + state2;
    state2 = lowpass + v2;
    return {.lowpass = lowpass, .bandpass = bandpass, .highpass = highpass};
  }

private:
  float g = 0.0f;             // tan(pi * cutoff / sampleRate): prewarped integrator gain
  float twoR = 1.0f;          // 2R = 1 / q
  float feedbackScale = 1.0f; // 1 / (1 + 2R g + g^2): solves the zero-delay feedback
  float state1 = 0.0f;        // first (bandpass) integrator memory
  float state2 = 0.0f;        // second (lowpass) integrator memory
};

} // namespace eqit::dsp
