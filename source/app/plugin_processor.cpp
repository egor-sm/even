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
      demoQValue(*state.getRawParameterValue(parameter_ids::demoQ)) {}

juce::AudioProcessorValueTreeState::ParameterLayout PluginProcessor::createParameterLayout() {
  juce::AudioProcessorValueTreeState::ParameterLayout layout;
  layout.add(std::make_unique<juce::AudioParameterBool>(juce::ParameterID{parameter_ids::mute, 1}, "Mute", false));

  juce::NormalisableRange<float> qRange{0.1f, 10.0f};
  qRange.setSkewForCentre(1.0f); // half of the slider covers 0.1-1, the other half 1-10
  layout.add(std::make_unique<juce::AudioParameterFloat>(juce::ParameterID{parameter_ids::demoQ, 1}, "Demo Q", qRange,
                                                         0.707f));
  return layout;
}

void PluginProcessor::prepareToPlay(double sampleRate, int /*samplesPerBlock*/) {
  analyzer.prepare(sampleRate);
  testSignal.prepare(sampleRate);

  for (auto &filter : demoOnePoles) {
    filter.setCutoff(demoCutoffHz, sampleRate);
    filter.reset();
  }

  for (auto &filter : demoSvfs)
    filter.reset();
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

  if (const auto filter = demoFilter.load(std::memory_order_relaxed); filter != DemoFilter::off)
    processDemoFilter(buffer, filter);

  if (showOutput)
    analyzer.pushMonoSum(buffer);

  if (muteValue.load(std::memory_order_relaxed) >= 0.5f)
    buffer.clear();
}

void PluginProcessor::processDemoFilter(juce::AudioBuffer<float> &buffer, DemoFilter filter) noexcept {
  const auto numChannels = std::min(buffer.getNumChannels(), 2);
  const auto q = static_cast<double>(demoQValue.load(std::memory_order_relaxed));

  // No smoothing yet: q changes apply once per block (step 4 adds parameter smoothing).
  for (auto &svf : demoSvfs)
    svf.setParameters(demoCutoffHz, q, getSampleRate());

  for (int channel = 0; channel < numChannels; ++channel) {
    auto &onePole = demoOnePoles[static_cast<std::size_t>(channel)];
    auto &svf = demoSvfs[static_cast<std::size_t>(channel)];
    auto *samples = buffer.getWritePointer(channel);

    for (int i = 0; i < buffer.getNumSamples(); ++i) {
      const auto input = samples[i];

      // Low Cut removes the lows (highpass output), High Cut removes the highs (lowpass output).
      switch (filter) {
      case DemoFilter::lowCut6:
        samples[i] = onePole.process(input).highpass;
        break;
      case DemoFilter::highCut6:
        samples[i] = onePole.process(input).lowpass;
        break;
      case DemoFilter::lowCut12:
        samples[i] = svf.process(input).highpass;
        break;
      case DemoFilter::highCut12:
        samples[i] = svf.process(input).lowpass;
        break;
      case DemoFilter::bandPass:
        samples[i] = svf.damping() * svf.process(input).bandpass; // unity gain at the cutoff
        break;
      case DemoFilter::off:
        break;
      }
    }
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
