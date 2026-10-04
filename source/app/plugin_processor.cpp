#include "plugin_processor.h"

#include "model/solo.h"
#include "plugin_editor.h"

#include <algorithm>

namespace even {

PluginProcessor::PluginProcessor()
    : AudioProcessor(BusesProperties()
                         .withInput("Input", juce::AudioChannelSet::stereo(), true)
                         .withOutput("Output", juce::AudioChannelSet::stereo(), true)),
      state(*this, nullptr, "state", parameters::createLayout()),
      muteValue(*state.getRawParameterValue(parameters::mute)), bandValues(parameters::BandValues::all(state)) {}

void PluginProcessor::prepareToPlay(double sampleRate, int /*samplesPerBlock*/) {
  analyzer.prepare(sampleRate);
  testSignal.prepare(sampleRate);

  updateBandTargets();
  equalizer.prepare(sampleRate);

  updateSoloTargets();
  soloLowCut.prepare(sampleRate);
  soloHighCut.prepare(sampleRate);
}

void PluginProcessor::releaseResources() {}

bool PluginProcessor::isBusesLayoutSupported(const BusesLayout &layouts) const {
  const auto &output = layouts.getMainOutputChannelSet();
  return (output == juce::AudioChannelSet::mono() || output == juce::AudioChannelSet::stereo()) &&
         output == layouts.getMainInputChannelSet();
}

void PluginProcessor::processBlock(juce::AudioBuffer<float> &buffer, juce::MidiBuffer & /*midi*/) {
  const juce::ScopedNoDenormals noDenormals;

  for (auto channel = getTotalNumInputChannels(); channel < getTotalNumOutputChannels(); ++channel)
    buffer.clear(channel, 0, buffer.getNumSamples());

  if (testSignalEnabled.load(std::memory_order_relaxed))
    testSignal.render(buffer);

  analyzer.pushInput(buffer);

  updateBandTargets();
  equalizer.process(buffer.getArrayOfWritePointers(), buffer.getNumChannels(), buffer.getNumSamples());

  updateSoloTargets();
  soloLowCut.process(buffer.getArrayOfWritePointers(), buffer.getNumChannels(), buffer.getNumSamples());
  soloHighCut.process(buffer.getArrayOfWritePointers(), buffer.getNumChannels(), buffer.getNumSamples());

  analyzer.pushOutput(buffer);

  if (muteValue.load(std::memory_order_relaxed) >= 0.5f)
    buffer.clear();
}

void PluginProcessor::updateBandTargets() noexcept {
  for (std::size_t i = 0; i < bandValues.size(); ++i)
    equalizer.setBand(i, bandValues[i].parameters(), bandValues[i].active());
}

void PluginProcessor::updateSoloTargets() noexcept {
  constexpr auto slopeDbPerOctave = 24;
  dsp::BandParameters low{.shape = dsp::FilterShape::lowCut,
                          .frequencyHz = model::soloMinHz,
                          .q = model::cutQ,
                          .slopeDbPerOctave = slopeDbPerOctave};
  dsp::BandParameters high{.shape = dsp::FilterShape::highCut,
                           .frequencyHz = model::soloMaxHz,
                           .q = model::cutQ,
                           .slopeDbPerOctave = slopeDbPerOctave};
  auto lowOn = false;
  auto highOn = false;

  const auto slot = soloSlot.load(std::memory_order_relaxed);
  if (slot >= 0 && slot < parameters::numBands && bandValues[static_cast<std::size_t>(slot)].used()) {
    const auto band = bandValues[static_cast<std::size_t>(slot)].parameters();
    const auto range = model::soloRange(band.shape, band.frequencyHz, band.q);
    // A range reaching an end of the spectrum needs no filter on that side.
    lowOn = range.lowHz > model::soloMinHz * 1.01;
    highOn = range.highHz < model::soloMaxHz * 0.99;
    low.frequencyHz = range.lowHz;
    high.frequencyHz = range.highHz;
  }

  soloLowCut.setTarget(low, lowOn);
  soloHighCut.setTarget(high, highOn);
}

ResponseState PluginProcessor::getResponseState() const {
  return {.sampleRate = getSampleRate(), .bands = bandSlots.readAll()};
}

juce::AudioProcessorEditor *PluginProcessor::createEditor() {
  return new PluginEditor(*this);
}

void PluginProcessor::getStateInformation(juce::MemoryBlock &destData) {
  if (const auto xml = state.copyState().createXml())
    copyXmlToBinary(*xml, destData);
}

void PluginProcessor::setStateInformation(const void *data, int sizeInBytes) {
  if (const auto xml = getXmlFromBinary(data, sizeInBytes); xml && xml->hasTagName(state.state.getType())) {
    state.replaceState(juce::ValueTree::fromXml(*xml));
    bandHistory.stateReplaced();
  }
}

} // namespace even

juce::AudioProcessor *JUCE_CALLTYPE createPluginFilter() {
  return new even::PluginProcessor();
}
