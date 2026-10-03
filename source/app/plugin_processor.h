#pragma once

#include "analyzer/spectrum_analyzer.h"
#include "dsp/one_pole.h"
#include "test_signal.h"

#include <juce_audio_processors/juce_audio_processors.h>

#include <array>
#include <atomic>
#include <cstdint>

namespace eqit {

namespace parameter_ids {
inline constexpr auto mute = "mute";
} // namespace parameter_ids

class PluginProcessor final : public juce::AudioProcessor {
public:
  PluginProcessor();

  void prepareToPlay(double sampleRate, int samplesPerBlock) override;
  void releaseResources() override;
  bool isBusesLayoutSupported(const BusesLayout &layouts) const override;
  void processBlock(juce::AudioBuffer<float> &buffer, juce::MidiBuffer &midi) override;

  juce::AudioProcessorEditor *createEditor() override;
  bool hasEditor() const override { return true; }

  const juce::String getName() const override { return JucePlugin_Name; }
  bool acceptsMidi() const override { return false; }
  bool producesMidi() const override { return false; }
  bool isMidiEffect() const override { return false; }
  double getTailLengthSeconds() const override { return 0.0; }

  int getNumPrograms() override { return 1; }
  int getCurrentProgram() override { return 0; }
  void setCurrentProgram(int /*index*/) override {}
  const juce::String getProgramName(int /*index*/) override { return {}; }
  void changeProgramName(int /*index*/, const juce::String & /*newName*/) override {}

  void getStateInformation(juce::MemoryBlock &destData) override;
  void setStateInformation(const void *data, int sizeInBytes) override;

  [[nodiscard]] juce::AudioProcessorValueTreeState &getState() { return state; }
  [[nodiscard]] SpectrumAnalyzer &getAnalyzer() { return analyzer; }

  // Replaces the input with a test signal (debug aid for the analyzer).
  void setTestSignalEnabled(bool enabled) { testSignalEnabled.store(enabled); }

  // Temporary scaffolding for the DSP learning steps: a fixed 1 kHz one-pole filter.
  enum class DemoFilter : std::uint8_t { off, lowCut, highCut };
  void setDemoFilter(DemoFilter filter) { demoFilter.store(filter); }

  // Whether the analyzer shows the input (before processing) or the output.
  void setAnalyzeOutput(bool output) { analyzeOutput.store(output); }

private:
  [[nodiscard]] static juce::AudioProcessorValueTreeState::ParameterLayout createParameterLayout();

  juce::AudioProcessorValueTreeState state;
  std::atomic<float> &muteValue;

  SpectrumAnalyzer analyzer;
  TestSignal testSignal;
  std::atomic<bool> testSignalEnabled{false};

  static constexpr double demoCutoffHz = 1000.0;
  std::array<dsp::OnePole, 2> demoFilters;
  std::atomic<DemoFilter> demoFilter{DemoFilter::off};
  std::atomic<bool> analyzeOutput{false};

  JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(PluginProcessor)
};

} // namespace eqit
