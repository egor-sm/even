#include "plugin_processor.h"

#include "plugin_editor.h"

namespace eqit {

PluginProcessor::PluginProcessor()
    : AudioProcessor(BusesProperties()
                         .withInput("Input", juce::AudioChannelSet::stereo(), true)
                         .withOutput("Output", juce::AudioChannelSet::stereo(), true)),
      state(*this, nullptr, "state", createParameterLayout()),
      muteValue(*state.getRawParameterValue(parameter_ids::mute)) {}

juce::AudioProcessorValueTreeState::ParameterLayout PluginProcessor::createParameterLayout() {
  juce::AudioProcessorValueTreeState::ParameterLayout layout;
  layout.add(std::make_unique<juce::AudioParameterBool>(juce::ParameterID{parameter_ids::mute, 1}, "Mute", false));
  return layout;
}

void PluginProcessor::prepareToPlay(double sampleRate, int /*samplesPerBlock*/) {
  analyzer.prepare(sampleRate);
  testSignal.prepare(sampleRate);
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

  // The analyzer shows the input spectrum, before any processing.
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
