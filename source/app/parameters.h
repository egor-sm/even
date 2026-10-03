#pragma once

#include "dsp/filter_shape.h"

#include <juce_audio_processors/juce_audio_processors.h>

#include <array>
#include <atomic>
#include <cstdint>

namespace eqit::parameters {

inline constexpr auto mute = "mute";

inline constexpr int numBands = 1;

// Per-band parameter IDs: "band1Frequency" etc., bands numbered from 1.
enum class BandField : std::uint8_t { enabled, shape, frequency, gain, q };
[[nodiscard]] juce::String bandId(int band, BandField field);

// Choice order of the shape parameter; matches dsp::FilterShape.
inline constexpr std::array shapeNames{"Bell", "Low Shelf", "High Shelf", "Low Cut", "High Cut", "Notch", "Band Pass"};

// Ranges. Frequency and q use a true logarithmic mapping (each octave/ratio gets the same slider
// travel); the web UI mirrors it in source/webui/src/juce/parameter-scales.ts.
inline constexpr float minFrequencyHz = 20.0f;
inline constexpr float maxFrequencyHz = 20000.0f;
inline constexpr float maxGainDb = 24.0f;
inline constexpr float minQ = 0.1f;
inline constexpr float maxQ = 40.0f;

[[nodiscard]] juce::AudioProcessorValueTreeState::ParameterLayout createLayout();

// Lock-free view of one band's parameters for the audio thread.
class BandValues {
public:
  BandValues(juce::AudioProcessorValueTreeState &state, int band);

  [[nodiscard]] bool enabled() const noexcept;
  [[nodiscard]] dsp::BandParameters parameters() const noexcept;

private:
  std::atomic<float> &enabledValue;
  std::atomic<float> &shapeValue;
  std::atomic<float> &frequencyValue;
  std::atomic<float> &gainValue;
  std::atomic<float> &qValue;
};

} // namespace eqit::parameters
