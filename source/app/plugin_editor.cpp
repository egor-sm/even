#include "plugin_editor.h"

#include "build_config.h"
#include "web_resources.h"

#include <array>
#include <optional>
#include <string_view>
#include <utility>

namespace eqit {

namespace {

// Shape names shared with the web UI; anything else (e.g. "off") means no shape.
std::optional<dsp::FilterShape> parseFilterShape(const juce::String &name) {
  using enum dsp::FilterShape;

  static const std::array<std::pair<const char *, dsp::FilterShape>, 7> shapes{{
      {"bell", bell},
      {"lowShelf", lowShelf},
      {"highShelf", highShelf},
      {"lowCut", lowCut},
      {"highCut", highCut},
      {"notch", notch},
      {"bandPass", bandPass},
  }};

  for (const auto &[shapeName, shape] : shapes)
    if (name == shapeName)
      return shape;

  return std::nullopt;
}

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
      muteAttachment(*pluginProcessor.getState().getParameter(parameter_ids::mute), muteRelay, nullptr),
      demoQAttachment(*pluginProcessor.getState().getParameter(parameter_ids::demoQ), demoQRelay, nullptr),
      demoGainAttachment(*pluginProcessor.getState().getParameter(parameter_ids::demoGain), demoGainRelay, nullptr) {
  addAndMakeVisible(webView);

  webView.goToURL(getDevServerUrl().value_or(juce::WebBrowserComponent::getResourceProviderRoot()));

  setResizable(true, true);
  setResizeLimits(480, 320, 2400, 1600);
  setSize(960, 540);

  setAnalyzerActive(true);
}

PluginEditor::~PluginEditor() {
  // Stop the analyzer first so no new updates are triggered while tearing down.
  pluginProcessor.getAnalyzer().stop();
  cancelPendingUpdate();
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
      .withOptionsFrom(demoQRelay)
      .withOptionsFrom(demoGainRelay)
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
      .withNativeFunction("setTestSignal",
                          [this](const juce::Array<juce::var> &args, const auto &complete) {
                            pluginProcessor.setTestSignalEnabled(!args.isEmpty() && static_cast<bool>(args[0]));
                            complete({});
                          })
      .withNativeFunction("setDemoShape",
                          [this](const juce::Array<juce::var> &args, const auto &complete) {
                            const auto name = args.isEmpty() ? juce::String{} : args[0].toString();
                            pluginProcessor.setDemoShape(parseFilterShape(name));
                            complete({});
                          })
      .withNativeFunction("setAnalyzerSource",
                          [this](const juce::Array<juce::var> &args, const auto &complete) {
                            pluginProcessor.setAnalyzeOutput(!args.isEmpty() && args[0].toString() == "output");
                            complete({});
                          })
      .withNativeFunction("setAnalyzerActive",
                          [this](const juce::Array<juce::var> &args, const auto &complete) {
                            setAnalyzerActive(!args.isEmpty() && static_cast<bool>(args[0]));
                            complete({});
                          })
      .withResourceProvider([this](const juce::String &url) { return getResource(url); }, allowedOrigin);
}

std::optional<juce::WebBrowserComponent::Resource> PluginEditor::getResource(const juce::String &url) const {
  // WebView2 passes the query string along; WKWebView does not.
  return findWebUiResource(url.upToFirstOccurrenceOf("?", false, false));
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
  webView.evaluateJavascript("window.eqitOnAnalyzerFrame?.(" + juce::String{juce::Time::currentTimeMillis()} + ",'" +
                             juce::Base64::toBase64(bytes.data(), bytes.size()) + "')");
}

} // namespace eqit
