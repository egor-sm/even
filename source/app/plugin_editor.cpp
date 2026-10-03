#include "plugin_editor.h"

#include "build_config.h"
#include "web_resources.h"

#include <optional>
#include <string_view>

namespace eqit {

namespace {

std::optional<juce::String> getDevServerUrl() {
  constexpr auto url = build_config::webUiDevServerUrl;

  if constexpr (url.empty())
    return std::nullopt;
  else
    return juce::String{url.data(), url.size()};
}

} // namespace

PluginEditor::PluginEditor(PluginProcessor &processorToUse)
    : AudioProcessorEditor(processorToUse), pluginProcessor(processorToUse), webView(createWebViewOptions()),
      muteAttachment(*pluginProcessor.getState().getParameter(parameter_ids::mute), muteRelay, nullptr) {
  addAndMakeVisible(webView);

  webView.goToURL(getDevServerUrl().value_or(juce::WebBrowserComponent::getResourceProviderRoot()));

  setResizable(true, true);
  setResizeLimits(360, 240, 1600, 1200);
  setSize(480, 320);
}

void PluginEditor::resized() {
  webView.setBounds(getLocalBounds());
}

juce::WebBrowserComponent::Options PluginEditor::createWebViewOptions() {
  using Options = juce::WebBrowserComponent::Options;

  // Lets the dev server page fetch backend resources (e.g. live data) from the resource provider.
  const auto allowedOrigin =
      getDevServerUrl().transform([](const juce::String &url) { return juce::URL{url}.getOrigin(); });

  return Options{}
      .withBackend(Options::Backend::webview2)
      .withWinWebView2Options(
          Options::WinWebView2{}.withUserDataFolder(juce::File::getSpecialLocation(juce::File::tempDirectory)))
      .withNativeIntegrationEnabled()
      .withOptionsFrom(muteRelay)
      .withNativeFunction(
          "getPluginInfo",
          [this](const juce::Array<juce::var> &, const auto &complete) {
            auto info = std::make_unique<juce::DynamicObject>();
            info->setProperty("name", pluginProcessor.getName());
            info->setProperty("version", JucePlugin_VersionString);
            info->setProperty("juceVersion", juce::SystemStats::getJUCEVersion());
            info->setProperty("wrapper", juce::AudioProcessor::getWrapperTypeDescription(pluginProcessor.wrapperType));
            complete(juce::var{info.release()});
          })
      .withResourceProvider([](const juce::String &url) { return findWebUiResource(url); }, allowedOrigin);
}

} // namespace eqit
