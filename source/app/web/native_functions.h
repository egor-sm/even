#pragma once

#include "app/plugin/plugin_processor.h"
#include "app/state/user_settings.h"

#include <juce_gui_extra/juce_gui_extra.h>

#include <functional>

namespace even::web {

// What the page's native functions ask of the editor.
struct EditorActions {
  // Sends the response curves again on the next tick.
  std::function<void()> resendResponse;
  // Resizes the window to the UI scale in the settings.
  std::function<void()> applyScale;
  std::function<void(bool)> setAnalyzerActive;
};

// Registers the functions the page calls by name (see the UI's shared/api/native.ts). Message thread.
[[nodiscard]] juce::WebBrowserComponent::Options withNativeFunctions(juce::WebBrowserComponent::Options options,
                                                                     PluginProcessor &processor, UserSettings &settings,
                                                                     const EditorActions &actions);

} // namespace even::web
