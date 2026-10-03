#include "plugin_processor.h"

#include "plugin_editor.h"

#include <algorithm>

namespace eqit {

PluginProcessor::PluginProcessor()
    : AudioProcessor(BusesProperties()
                         .withInput("Input", juce::AudioChannelSet::stereo(), true)
                         .withOutput("Output", juce::AudioChannelSet::stereo(), true)),
      state(*this, nullptr, "state", parameters::createLayout()),
      muteValue(*state.getRawParameterValue(parameters::mute)), bandValues{parameters::BandValues{state, 1}} {}

void PluginProcessor::prepareToPlay(double sampleRate, int /*samplesPerBlock*/) {
  analyzer.prepare(sampleRate);
  testSignal.prepare(sampleRate);

  for (std::size_t i = 0; i < bands.size(); ++i) {
    bands[i].setTarget(bandValues[i].parameters(), bandValues[i].enabled());
    bands[i].prepare(sampleRate);
  }
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

  const auto showOutput = analyzeOutput.load(std::memory_order_relaxed);

  if (!showOutput)
    analyzer.pushMonoSum(buffer);

  for (std::size_t i = 0; i < bands.size(); ++i) {
    bands[i].setTarget(bandValues[i].parameters(), bandValues[i].enabled());
    bands[i].process(buffer.getArrayOfWritePointers(), buffer.getNumChannels(), buffer.getNumSamples());
  }

  if (showOutput)
    analyzer.pushMonoSum(buffer);

  if (muteValue.load(std::memory_order_relaxed) >= 0.5f)
    buffer.clear();
}

juce::AudioProcessorEditor *PluginProcessor::createEditor() {
  return new PluginEditor(*this);
}

void PluginProcessor::getStateInformation(juce::MemoryBlock &destData) {
  if (const auto xml = state.copyState().createXml())
    copyXmlToBinary(*xml, destData);
}

void PluginProcessor::setStateInformation(const void *data, int sizeInBytes) {
  if (const auto xml = getXmlFromBinary(data, sizeInBytes); xml && xml->hasTagName(state.state.getType()))
    state.replaceState(juce::ValueTree::fromXml(*xml));
}

} // namespace eqit

juce::AudioProcessor *JUCE_CALLTYPE createPluginFilter() {
  return new eqit::PluginProcessor();
}
