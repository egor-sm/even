#include "plugin_editor.h"

#include "build_config.h"
#include "web/native_functions.h"
#include "web_resources.h"

#include <optional>
#include <string_view>
#include <utility>

namespace even {

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
    : AudioProcessorEditor(processorToUse), pluginProcessor(processorToUse), webView(createWebViewOptions()) {
  parameterRelays.attach();
  addAndMakeVisible(webView);

  webView.goToURL(getDevServerUrl().value_or(juce::WebBrowserComponent::getResourceProviderRoot()));

  setResizable(false, false);
  applyScale();

  setAnalyzerActive(true);
  startTimerHz(60);
}

PluginEditor::~PluginEditor() {
  // Solo is a way of listening while editing: it ends with the editor.
  pluginProcessor.setSoloBand(std::nullopt);
  // Stop the analyzer first so no new updates are triggered while tearing down.
  pluginProcessor.getAnalyzer().stop();
  cancelPendingUpdate();
  stopTimer();
}

void PluginEditor::resized() {
  webView.setBounds(getLocalBounds());
}

juce::WebBrowserComponent::Options PluginEditor::createWebViewOptions() {
  using Options = juce::WebBrowserComponent::Options;

  // Lets the dev server page fetch backend resources (e.g. live data) from the resource provider.
  const auto allowedOrigin =
      getDevServerUrl().transform([](const juce::String &url) { return juce::URL{url}.getOrigin(); });

  auto options = Options{}
                     .withBackend(Options::Backend::webview2)
                     .withWinWebView2Options(Options::WinWebView2{}.withUserDataFolder(
                         juce::File::getSpecialLocation(juce::File::tempDirectory)))
                     .withNativeIntegrationEnabled()
                     .withResourceProvider(findWebUiResource, allowedOrigin);

  options = web::withNativeFunctions(std::move(options), pluginProcessor, *settings,
                                     {
                                         .resendResponse = [this] { lastSentResponse.reset(); },
                                         .applyScale = [this] { applyScale(); },
                                         .setAnalyzerActive = [this](bool active) { setAnalyzerActive(active); },
                                     });
  return parameterRelays.addTo(std::move(options));
}

void PluginEditor::applyScale() {
  const auto percent = settings->scalePercent();
  setSize(baseWidth * percent / 100, baseHeight * percent / 100);
}

void PluginEditor::setAnalyzerActive(bool active) {
  auto &analyzer = pluginProcessor.getAnalyzer();

  if (active) {
    analyzer.start([this] { triggerAsyncUpdate(); });
  } else {
    analyzer.stop();
    cancelPendingUpdate();
  }
}

void PluginEditor::handleAsyncUpdate() {
  if (!webView.isShowing())
    return;

  // One evaluateJavascript per frame: a single IPC round trip and no JSON encoding of the payload.
  // Base64 needs no escaping inside a JS string literal.
  const auto bytes = pluginProcessor.getAnalyzer().serializeLatestFrame();
  webView.evaluateJavascript("window.evenOnAnalyzerFrame?.(" + juce::String{juce::Time::currentTimeMillis()} + ",'" +
                             juce::Base64::toBase64(bytes.data(), bytes.size()) + "')");
}

void PluginEditor::timerCallback() {
  if (!webView.isShowing())
    return;

  if (const auto history = pluginProcessor.getBandHistory().state(); history != lastSentHistory) {
    webView.evaluateJavascript("window.evenOnHistory?.(" + juce::String{history.canUndo ? "true" : "false"} + "," +
                               juce::String{history.canRedo ? "true" : "false"} + ")");
    lastSentHistory = history;
  }

  const auto state = pluginProcessor.getResponseState();
  if (lastSentResponse && isSameResponse(state, *lastSentResponse))
    return;

  const auto bytes = serializeResponse(state);
  webView.evaluateJavascript("window.evenOnResponse?.('" + juce::Base64::toBase64(bytes.data(), bytes.size()) + "')");
  lastSentResponse = state;
}

} // namespace even
