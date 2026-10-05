#include "parameters.h"

#include <cmath>
#include <utility>

namespace even::parameters {

namespace {

// start * (end / start)^x: equal slider travel per octave (or per ratio, for q).
juce::NormalisableRange<float> logarithmicRange(float start, float end) {
  return {start, end,
          [](float rangeStart, float rangeEnd, float normalised) {
            return rangeStart * std::pow(rangeEnd / rangeStart, normalised);
          },
          [](float rangeStart, float rangeEnd, float value) {
            return std::log(value / rangeStart) / std::log(rangeEnd / rangeStart);
          }};
}

juce::String formatFrequency(float hz) {
  return hz >= 1000.0f ? juce::String{hz / 1000.0f, 2} + " kHz" : juce::String{hz, 1} + " Hz";
}

// Display name of a band field; without spaces it is the end of the parameter ID.
juce::String fieldName(BandField field) {
  switch (field) {
  case BandField::used:
    return "Used";
  case BandField::enabled:
    return "Enabled";
  case BandField::shape:
    return "Shape";
  case BandField::frequency:
    return "Frequency";
  case BandField::gain:
    return "Gain";
  case BandField::q:
    return "Q";
  case BandField::slope:
    return "Slope";
  }
  return {};
}

juce::StringArray choices(const auto &names) {
  juce::StringArray result;
  for (const auto *name : names)
    result.add(name);
  return result;
}

std::unique_ptr<juce::RangedAudioParameter> createBandParameter(int band, BandField field) {
  const juce::ParameterID id{bandId(band, field), 1};
  const auto name = "Band " + juce::String{band} + " " + fieldName(field);

  switch (field) {
  case BandField::used:
    return std::make_unique<juce::AudioParameterBool>(id, name, false);
  case BandField::enabled:
    return std::make_unique<juce::AudioParameterBool>(id, name, true);
  case BandField::shape:
    return std::make_unique<juce::AudioParameterChoice>(id, name, choices(shapeNames), 0);
  case BandField::frequency:
    return std::make_unique<juce::AudioParameterFloat>(
        id, name, logarithmicRange(minFrequencyHz, maxFrequencyHz), defaultFrequencyHz(band),
        juce::AudioParameterFloatAttributes{}.withStringFromValueFunction(
            [](float value, int) { return formatFrequency(value); }));
  case BandField::gain:
    return std::make_unique<juce::AudioParameterFloat>(id, name,
                                                       juce::NormalisableRange<float>{-maxGainDb, maxGainDb, 0.01f},
                                                       0.0f, juce::AudioParameterFloatAttributes{}.withLabel("dB"));
  case BandField::q:
    return std::make_unique<juce::AudioParameterFloat>(id, name, logarithmicRange(minQ, maxQ),
                                                       static_cast<float>(model::newBandQ));
  case BandField::slope:
    return std::make_unique<juce::AudioParameterChoice>(id, name, choices(slopeNames), defaultSlopeIndex);
  }
  return {};
}

} // namespace

juce::String bandId(int band, BandField field) {
  return "band" + juce::String{band} + fieldName(field).removeCharacters(" ");
}

juce::AudioProcessorValueTreeState::ParameterLayout createLayout() {
  juce::AudioProcessorValueTreeState::ParameterLayout layout;

  layout.add(std::make_unique<juce::AudioParameterBool>(juce::ParameterID{mute, 1}, "Mute", false));

  for (int band = 1; band <= numBands; ++band)
    for (const auto field : bandFields)
      layout.add(createBandParameter(band, field));

  return layout;
}

float defaultFrequencyHz(int band) {
  constexpr float lowest = 40.0f;
  constexpr float highest = 12000.0f;
  return lowest * std::pow(highest / lowest, static_cast<float>(band - 1) / static_cast<float>(numBands - 1));
}

std::array<BandValues, numBands> BandValues::all(juce::AudioProcessorValueTreeState &state) {
  return [&]<std::size_t... Index>(std::index_sequence<Index...>) {
    return std::array<BandValues, numBands>{BandValues{state, static_cast<int>(Index) + 1}...};
  }(std::make_index_sequence<numBands>{});
}

BandValues::BandValues(juce::AudioProcessorValueTreeState &state, int band) {
  for (const auto field : bandFields) {
    values[field] = state.getRawParameterValue(bandId(band, field));
    jassert(values[field] != nullptr);
  }
}

bool BandValues::active() const noexcept {
  return used() && enabled();
}

bool BandValues::used() const noexcept {
  return load(BandField::used) >= 0.5f;
}

bool BandValues::enabled() const noexcept {
  return load(BandField::enabled) >= 0.5f;
}

dsp::BandParameters BandValues::parameters() const noexcept {
  const auto shapeIndex = static_cast<int>(load(BandField::shape));
  const auto slopeIndex =
      juce::jlimit(0, static_cast<int>(dsp::cutSlopesDbPerOctave.size()) - 1, static_cast<int>(load(BandField::slope)));

  return {
      .shape = static_cast<dsp::FilterShape>(juce::jlimit(0, static_cast<int>(shapeNames.size()) - 1, shapeIndex)),
      .frequencyHz = static_cast<double>(load(BandField::frequency)),
      .gainDb = static_cast<double>(load(BandField::gain)),
      .q = static_cast<double>(load(BandField::q)),
      .slopeDbPerOctave = dsp::cutSlopesDbPerOctave[static_cast<std::size_t>(slopeIndex)],
  };
}

} // namespace even::parameters
