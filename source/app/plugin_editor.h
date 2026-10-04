#pragma once

#include "plugin_processor.h"
#include "user_settings.h"

#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_gui_extra/juce_gui_extra.h>

#include <array>
#include <memory>
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
  [[nodiscard]] std::optional<juce::WebBrowserComponent::Resource> getResource(const juce::String &url) const;

  // Runs on the message thread after the analyzer produced a frame and hands it to the page.
  void handleAsyncUpdate() override;

  void setAnalyzerActive(bool active);

  void applyScale();
  [[nodiscard]] juce::var settingsVar() const;

  // Polls the band parameters on the message thread and sends the EQ response curves to the page
  // when they change. Polling keeps the audio thread out of it: parameter listeners would be called
  // there during host automation.
  void timerCallback() override;

  // Web relays of one band, named after the parameter IDs. Relays are neither copyable nor movable.
  struct BandRelays {
    explicit BandRelays(int band);

    juce::WebToggleButtonRelay used;
    juce::WebToggleButtonRelay enabled;
    juce::WebComboBoxRelay shape;
    juce::WebSliderRelay frequency;
    juce::WebSliderRelay gain;
    juce::WebSliderRelay q;
    juce::WebComboBoxRelay slope;
  };

  // Keeps a band's parameters and its relays in sync in both directions.
  struct BandAttachments {
    BandAttachments(juce::AudioProcessorValueTreeState &state, int band, BandRelays &relays);

    juce::WebToggleButtonParameterAttachment used;
    juce::WebToggleButtonParameterAttachment enabled;
    juce::WebComboBoxParameterAttachment shape;
    juce::WebSliderParameterAttachment frequency;
    juce::WebSliderParameterAttachment gain;
    juce::WebSliderParameterAttachment q;
    juce::WebComboBoxParameterAttachment slope;
  };

  using BandRelayArray = std::array<std::unique_ptr<BandRelays>, parameters::numBands>;
  using BandAttachmentArray = std::array<std::unique_ptr<BandAttachments>, parameters::numBands>;

  [[nodiscard]] static BandRelayArray createBandRelays();
  [[nodiscard]] BandAttachmentArray createBandAttachments();

  PluginProcessor &pluginProcessor;
  juce::SharedResourcePointer<UserSettings> settings;

  // Relays must outlive the web view and be constructed before it.
  juce::WebToggleButtonRelay muteRelay{parameters::mute};
  BandRelayArray bandRelays = createBandRelays();

  juce::WebBrowserComponent webView;

  juce::WebToggleButtonParameterAttachment muteAttachment;
  BandAttachmentArray bandAttachments;

  std::optional<ResponseState> lastSentResponse;

  struct HistoryState {
    bool canUndo = false;
    bool canRedo = false;
    bool operator==(const HistoryState &) const = default;
  };
  [[nodiscard]] HistoryState getHistoryState();
  [[nodiscard]] juce::var historyStateVar();
  std::optional<HistoryState> lastSentHistory;

  JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(PluginEditor)
};

} // namespace even
