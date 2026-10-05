#pragma once

#include "app/analyzer/spectrum_analyzer.h"
#include "app/debug/test_signal.h"
#include "app/plugin/parameters.h"
#include "app/state/band_history.h"
#include "app/state/band_slots.h"
#include "app/state/response_state.h"
#include "dsp/equalizer.h"
#include "model/solo.h"

#include <juce_audio_processors/juce_audio_processors.h>

#include <array>
#include <atomic>
#include <optional>

namespace even {

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
  // Band edits that change several parameters at once (message thread).
  [[nodiscard]] BandSlots &getBandSlots() { return bandSlots; }
  [[nodiscard]] BandHistory &getBandHistory() { return bandHistory; }

  // Replaces the input with a test signal (debug aid for the analyzer).
  void setTestSignalEnabled(bool enabled) { testSignalEnabled.store(enabled); }

  // Solo: only the frequency range the band works on is heard (model::soloRange); nullopt ends it.
  // Not saved with the project. Any thread.
  void setSoloBand(std::optional<std::size_t> slot) noexcept {
    soloSlot.store(slot ? static_cast<int>(*slot) : -1, std::memory_order_relaxed);
  }

  // Current band settings (target values), e.g. for drawing the EQ response. Message thread.
  [[nodiscard]] ResponseState getResponseState() const;

private:
  // Reads the band parameters (lock-free) and hands them to the equalizer as targets.
  void updateBandTargets() noexcept;
  // Points the solo filter at the soloed band, or ends solo.
  void updateSoloTarget() noexcept;

  juce::AudioProcessorValueTreeState state;
  BandSlots bandSlots{state};
  BandHistory bandHistory{state, bandSlots};
  std::atomic<float> &muteValue;
  std::array<parameters::BandValues, parameters::numBands> bandValues;
  dsp::Equalizer equalizer;

  std::atomic<int> soloSlot{-1};
  model::SoloFilter solo;
  static_assert(parameters::numBands <= dsp::Equalizer::maxBands);

  SpectrumAnalyzer analyzer;
  TestSignal testSignal;
  std::atomic<bool> testSignalEnabled{false};

  JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(PluginProcessor)
};

} // namespace even
