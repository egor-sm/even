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

std::atomic<float> &rawValue(juce::AudioProcessorValueTreeState &state, const juce::String &id) {
  auto *value = state.getRawParameterValue(id);
  jassert(value != nullptr);
  return *value;
}

} // namespace

juce::String bandId(int band, BandField field) {
  auto prefix = "band" + juce::String{band};

  switch (field) {
  case BandField::used:
    return prefix + "Used";
  case BandField::enabled:
    return prefix + "Enabled";
  case BandField::shape:
    return prefix + "Shape";
  case BandField::frequency:
    return prefix + "Frequency";
  case BandField::gain:
    return prefix + "Gain";
  case BandField::q:
    return prefix + "Q";
  case BandField::slope:
    return prefix + "Slope";
  }

  return prefix;
}

juce::AudioProcessorValueTreeState::ParameterLayout createLayout() {
  juce::AudioProcessorValueTreeState::ParameterLayout layout;

  layout.add(std::make_unique<juce::AudioParameterBool>(juce::ParameterID{mute, 1}, "Mute", false));

  juce::StringArray shapes;
  for (const auto *name : shapeNames)
    shapes.add(name);

  juce::StringArray slopes;
  for (const auto *name : slopeNames)
    slopes.add(name);

  for (int band = 1; band <= numBands; ++band) {
    const auto name = [band](const char *field) { return "Band " + juce::String{band} + " " + field; };
    const auto id = [band](BandField field) { return juce::ParameterID{bandId(band, field), 1}; };

    layout.add(std::make_unique<juce::AudioParameterBool>(id(BandField::used), name("Used"), false));
    layout.add(std::make_unique<juce::AudioParameterBool>(id(BandField::enabled), name("Enabled"), true));
    layout.add(std::make_unique<juce::AudioParameterChoice>(id(BandField::shape), name("Shape"), shapes, 0));
    layout.add(std::make_unique<juce::AudioParameterFloat>(
        id(BandField::frequency), name("Frequency"), logarithmicRange(minFrequencyHz, maxFrequencyHz),
        defaultFrequencyHz(band),
        juce::AudioParameterFloatAttributes{}.withStringFromValueFunction(
            [](float value, int) { return formatFrequency(value); })));
    layout.add(std::make_unique<juce::AudioParameterFloat>(
        id(BandField::gain), name("Gain"), juce::NormalisableRange<float>{-maxGainDb, maxGainDb, 0.01f}, 0.0f,
        juce::AudioParameterFloatAttributes{}.withLabel("dB")));
    layout.add(
        std::make_unique<juce::AudioParameterFloat>(id(BandField::q), name("Q"), logarithmicRange(minQ, maxQ), 1.0f));
    layout.add(
        std::make_unique<juce::AudioParameterChoice>(id(BandField::slope), name("Slope"), slopes, defaultSlopeIndex));
  }

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

BandValues::BandValues(juce::AudioProcessorValueTreeState &state, int band)
    : usedValue(rawValue(state, bandId(band, BandField::used))),
      enabledValue(rawValue(state, bandId(band, BandField::enabled))),
      shapeValue(rawValue(state, bandId(band, BandField::shape))),
      frequencyValue(rawValue(state, bandId(band, BandField::frequency))),
      gainValue(rawValue(state, bandId(band, BandField::gain))), qValue(rawValue(state, bandId(band, BandField::q))),
      slopeValue(rawValue(state, bandId(band, BandField::slope))) {}

bool BandValues::active() const noexcept {
  return used() && enabled();
}

bool BandValues::used() const noexcept {
  return usedValue.load(std::memory_order_relaxed) >= 0.5f;
}

bool BandValues::enabled() const noexcept {
  return enabledValue.load(std::memory_order_relaxed) >= 0.5f;
}

dsp::BandParameters BandValues::parameters() const noexcept {
  const auto shapeIndex = static_cast<int>(shapeValue.load(std::memory_order_relaxed));
  const auto slopeIndex = juce::jlimit(0, static_cast<int>(dsp::cutSlopesDbPerOctave.size()) - 1,
                                       static_cast<int>(slopeValue.load(std::memory_order_relaxed)));

  return {
      .shape = static_cast<dsp::FilterShape>(juce::jlimit(0, static_cast<int>(shapeNames.size()) - 1, shapeIndex)),
      .frequencyHz = static_cast<double>(frequencyValue.load(std::memory_order_relaxed)),
      .gainDb = static_cast<double>(gainValue.load(std::memory_order_relaxed)),
      .q = static_cast<double>(qValue.load(std::memory_order_relaxed)),
      .slopeDbPerOctave = dsp::cutSlopesDbPerOctave[static_cast<std::size_t>(slopeIndex)],
  };
}

} // namespace even::parameters
