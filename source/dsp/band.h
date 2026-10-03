#pragma once

#include "dsp/band_design.h"
#include "dsp/filter_shape.h"
#include "dsp/section_filter.h"
#include "dsp/smoothed_value.h"

#include <array>

namespace eqit::dsp {

// One EQ band ready for real-time use: smooths parameter changes, recomputes coefficients every
// few samples, and crossfades when the shape or cut slope changes or the band is switched on/off
// (those change the filter structure and cannot be smoothed). Processing is allocation-free.
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
  // A filter structure (shape, slope, on/off) with its own filter memory; two of them exist to
  // crossfade between structures.
  struct Voice {
    FilterShape shape = FilterShape::bell;
    int slopeDbPerOctave = 12;
    bool enabled = false;
    std::size_t sectionCount = 0;
    std::array<std::array<SectionFilter, BandDesign::maxSections>, maxChannels> sections{};

    [[nodiscard]] bool hasStructureOf(const BandParameters &parameters, bool isEnabled) const noexcept {
      return enabled == isEnabled && shape == parameters.shape &&
             (!isCut(shape) || slopeDbPerOctave == parameters.slopeDbPerOctave);
    }

    // The band's sections in series.
    [[nodiscard]] float process(int channel, float input) noexcept {
      if (!enabled)
        return input;

      auto &cascade = sections[static_cast<std::size_t>(channel)];
      for (std::size_t i = 0; i < sectionCount; ++i)
        input = cascade[i].process(input);
      return input;
    }
  };

  void startCrossfadeIfNeeded() noexcept;
  // The voice's structure with the current (smoothed) frequency, gain and q.
  [[nodiscard]] BandParameters currentParameters(const Voice &voice) const noexcept;
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
