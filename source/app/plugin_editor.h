#pragma once

#include "plugin_processor.h"

#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_gui_extra/juce_gui_extra.h>

#include <optional>

namespace eqit {

class PluginEditor final : public juce::AudioProcessorEditor, private juce::AsyncUpdater {
public:
  explicit PluginEditor(PluginProcessor &processor);
  ~PluginEditor() override;

  void resized() override;

private:
  [[nodiscard]] juce::WebBrowserComponent::Options createWebViewOptions();
  [[nodiscard]] std::optional<juce::WebBrowserComponent::Resource> getResource(const juce::String &url) const;

  // Runs on the message thread after the analyzer produced a frame and hands it to the page.
  void handleAsyncUpdate() override;

  void setAnalyzerActive(bool active);

  PluginProcessor &pluginProcessor;

  // Relays must outlive the web view and be constructed before it.
  juce::WebToggleButtonRelay muteRelay{parameter_ids::mute};
  juce::WebSliderRelay demoQRelay{parameter_ids::demoQ};

  juce::WebBrowserComponent webView;

  juce::WebToggleButtonParameterAttachment muteAttachment;
  juce::WebSliderParameterAttachment demoQAttachment;

  JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(PluginEditor)
};

} // namespace eqit
