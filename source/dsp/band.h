#pragma once

#include "dsp/band_design.h"
#include "dsp/filter_shape.h"
#include "dsp/smoothed_value.h"
#include "dsp/svf_section.h"

#include <array>

namespace eqit::dsp {

// One EQ band ready for real-time use: smooths parameter changes, recomputes coefficients every
// few samples, and crossfades when the shape changes or the band is switched on/off (those cannot
// be smoothed). Processing is allocation-free.
class Band {
public:
  static constexpr int maxChannels = 2;
  static constexpr int updateInterval = 32; // samples between coefficient updates
  static constexpr double smoothingMs = 50.0;
  static constexpr double crossfadeMs = 20.0;

  void prepare(double sampleRate) noexcept;

  // Desired state; reached smoothly by process(). Frequency is clamped below Nyquist.
  void setTarget(const BandParameters &parameters, bool enabled) noexcept;

  // In-place processing of up to maxChannels channels.
  void process(float *const *channels, int numChannels, int numSamples) noexcept;

private:
  // A shape + on/off state with its own filter memory; two of them exist to crossfade.
  struct Voice {
    FilterShape shape = FilterShape::bell;
    bool enabled = false;
    std::array<SvfSection, maxChannels> sections{};

    [[nodiscard]] float process(int channel, float input) noexcept {
      return enabled ? sections[static_cast<std::size_t>(channel)].process(input) : input;
    }
  };

  void startCrossfadeIfNeeded() noexcept;
  // rampSamples: how long the output weights take to reach the new values (0 = jump).
  void updateCoefficients(Voice &voice, int rampSamples) noexcept;

  double sampleRate = 48000.0;

  BandParameters target{};
  bool targetEnabled = false;

  SmoothedValue frequency;
  SmoothedValue gain;
  SmoothedValue q;

  std::array<Voice, 2> voices{};
  int activeVoice = 0;
  int crossfadeLength = 1;    // samples
  int crossfadeRemaining = 0; // > 0 while fading from the other voice into the active one
};

} // namespace eqit::dsp
