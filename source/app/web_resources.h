#pragma once

#include <juce_gui_extra/juce_gui_extra.h>

#include <optional>

namespace even {

// Serves files of the bundled web UI (source/webui) to the WebBrowserComponent.
[[nodiscard]] std::optional<juce::WebBrowserComponent::Resource> findWebUiResource(const juce::String &url);

} // namespace even
