#pragma once

#include "parameter_relays.h"
#include "plugin_processor.h"
#include "user_settings.h"

#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_gui_extra/juce_gui_extra.h>

#include <optional>

namespace even {

class PluginEditor final : public juce::AudioProcessorEditor, private juce::AsyncUpdater, private juce::Timer {
public:
  explicit PluginEditor(PluginProcessor &processor);
  ~PluginEditor() override;

  void resized() override;

  // The layout is designed for this size; the window is this times the UI scale.
  static constexpr int baseWidth = 1280;
  static constexpr int baseHeight = 760;

private:
  [[nodiscard]] juce::WebBrowserComponent::Options createWebViewOptions();

  // Runs on the message thread after the analyzer produced a frame and hands it to the page.
  void handleAsyncUpdate() override;

  void setAnalyzerActive(bool active);

  void applyScale();

  // Polls the band parameters and the undo history on the message thread and sends them to the
  // page when they change. Polling keeps the audio thread out of it: parameter listeners would be called
  // there during host automation.
  void timerCallback() override;

  PluginProcessor &pluginProcessor;
  juce::SharedResourcePointer<UserSettings> settings;

  // Before the web view: its options take the relays.
  ParameterRelays parameterRelays{pluginProcessor};
  juce::WebBrowserComponent webView;

  std::optional<ResponseState> lastSentResponse;
  std::optional<HistoryState> lastSentHistory;

  JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(PluginEditor)
};

} // namespace even
