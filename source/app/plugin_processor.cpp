#include "plugin_processor.h"

#include "plugin_editor.h"

#include <algorithm>

namespace eqit {

PluginProcessor::PluginProcessor()
    : AudioProcessor(BusesProperties()
                         .withInput("Input", juce::AudioChannelSet::stereo(), true)
                         .withOutput("Output", juce::AudioChannelSet::stereo(), true)),
      state(*this, nullptr, "state", createParameterLayout()),
      muteValue(*state.getRawParameterValue(parameter_ids::mute)),
      demoQValue(*state.getRawParameterValue(parameter_ids::demoQ)),
      demoGainValue(*state.getRawParameterValue(parameter_ids::demoGain)) {}

juce::AudioProcessorValueTreeState::ParameterLayout PluginProcessor::createParameterLayout() {
  juce::AudioProcessorValueTreeState::ParameterLayout layout;
  layout.add(std::make_unique<juce::AudioParameterBool>(juce::ParameterID{parameter_ids::mute, 1}, "Mute", false));

  juce::NormalisableRange<float> qRange{0.1f, 10.0f};
  qRange.setSkewForCentre(1.0f); // half of the slider covers 0.1-1, the other half 1-10
  layout.add(std::make_unique<juce::AudioParameterFloat>(juce::ParameterID{parameter_ids::demoQ, 1}, "Demo Q", qRange,
                                                         0.707f));
  layout.add(std::make_unique<juce::AudioParameterFloat>(juce::ParameterID{parameter_ids::demoGain, 1}, "Demo Gain",
                                                         juce::NormalisableRange<float>{-24.0f, 24.0f}, 0.0f));
  return layout;
}

void PluginProcessor::prepareToPlay(double sampleRate, int /*samplesPerBlock*/) {
  analyzer.prepare(sampleRate);
  testSignal.prepare(sampleRate);

  for (auto &section : demoSections)
    section.reset();
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

  if (demoEnabled.load(std::memory_order_relaxed))
    processDemoBand(buffer, demoShape.load(std::memory_order_relaxed));

  if (showOutput)
    analyzer.pushMonoSum(buffer);

  if (muteValue.load(std::memory_order_relaxed) >= 0.5f)
    buffer.clear();
}

void PluginProcessor::setDemoShape(std::optional<dsp::FilterShape> shape) {
  if (shape)
    demoShape.store(*shape);

  demoEnabled.store(shape.has_value());
}

void PluginProcessor::processDemoBand(juce::AudioBuffer<float> &buffer, dsp::FilterShape shape) noexcept {
  const dsp::BandParameters parameters{
      .shape = shape,
      .frequencyHz = demoCutoffHz,
      .gainDb = static_cast<double>(demoGainValue.load(std::memory_order_relaxed)),
      .q = static_cast<double>(demoQValue.load(std::memory_order_relaxed)),
  };

  // No smoothing yet: parameter changes apply once per block (step 4 adds parameter smoothing).
  const auto design = dsp::design(parameters, getSampleRate());
  const auto numChannels = std::min(buffer.getNumChannels(), static_cast<int>(demoSections.size()));

  for (int channel = 0; channel < numChannels; ++channel) {
    auto &section = demoSections[static_cast<std::size_t>(channel)];
    section.setSection(design.sections[0]);

    auto *samples = buffer.getWritePointer(channel);
    for (int i = 0; i < buffer.getNumSamples(); ++i)
      samples[i] = section.process(samples[i]);
  }
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
