#pragma once

#include "plugin_processor.h"

#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_gui_extra/juce_gui_extra.h>

namespace eqit {

class PluginEditor final : public juce::AudioProcessorEditor {
public:
  explicit PluginEditor(PluginProcessor &processor);

  void resized() override;

private:
  [[nodiscard]] juce::WebBrowserComponent::Options createWebViewOptions();

  PluginProcessor &pluginProcessor;

  // Relays must outlive the web view and be constructed before it.
  juce::WebToggleButtonRelay muteRelay{parameter_ids::mute};

  juce::WebBrowserComponent webView;

  juce::WebToggleButtonParameterAttachment muteAttachment;

  JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(PluginEditor)
};

} // namespace eqit
