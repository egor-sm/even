#pragma once

#include "dsp/filter_shape.h"
#include "model/band_slot.h"
#include "parameters.h"

#include <juce_audio_processors/juce_audio_processors.h>

#include <array>
#include <cstddef>
#include <cstdint>
#include <optional>

namespace even {

// The band slots of the plugin state: the band parameters plus each slot's serial (creation
// order), which is not a parameter and lives in the state tree. Edits are host gestures, so hosts
// record them as automation. Message thread only.
class BandSlots {
public:
  explicit BandSlots(juce::AudioProcessorValueTreeState &state);

  [[nodiscard]] model::BandSlot read(std::size_t slot) const;
  [[nodiscard]] model::Bands readAll() const;

  // Writes the fields that differ from the current values.
  void write(std::size_t slot, const model::BandSlot &band);

  // Takes the first free slot for a new band; nullopt when every slot is used.
  std::optional<std::size_t> create(dsp::FilterShape shape, double frequencyHz, double gainDb);
  void remove(std::size_t slot);
  void setShape(std::size_t slot, dsp::FilterShape shape);

private:
  struct Parameters {
    juce::RangedAudioParameter *used;
    juce::RangedAudioParameter *enabled;
    juce::RangedAudioParameter *shape;
    juce::RangedAudioParameter *frequency;
    juce::RangedAudioParameter *gain;
    juce::RangedAudioParameter *q;
    juce::RangedAudioParameter *slope;
  };

  [[nodiscard]] juce::ValueTree slotTree(std::size_t slot);
  [[nodiscard]] std::uint32_t serial(std::size_t slot) const;

  juce::AudioProcessorValueTreeState &state;
  std::array<Parameters, parameters::numBands> slotParameters{};
};

} // namespace even
