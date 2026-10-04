#include "plugin_editor.h"

#include "build_config.h"
#include "web_resources.h"

#include <optional>
#include <string_view>

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
    : AudioProcessorEditor(processorToUse), pluginProcessor(processorToUse), webView(createWebViewOptions()),
      muteAttachment(*pluginProcessor.getState().getParameter(parameters::mute), muteRelay, nullptr),
      bandAttachments(createBandAttachments()) {
  addAndMakeVisible(webView);

  webView.goToURL(getDevServerUrl().value_or(juce::WebBrowserComponent::getResourceProviderRoot()));

  setResizable(true, true);
  setResizeLimits(480, 320, 2400, 1600);
  setSize(960, 540);

  setAnalyzerActive(true);
  startTimerHz(60);
}

PluginEditor::~PluginEditor() {
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

  auto options =
      Options{}
          .withBackend(Options::Backend::webview2)
          .withWinWebView2Options(
              Options::WinWebView2{}.withUserDataFolder(juce::File::getSpecialLocation(juce::File::tempDirectory)))
          .withNativeIntegrationEnabled()
          .withOptionsFrom(muteRelay)
          .withNativeFunction("getPluginInfo",
                              [this](const juce::Array<juce::var> &, const auto &complete) {
                                auto info = std::make_unique<juce::DynamicObject>();
                                info->setProperty("name", pluginProcessor.getName());
                                info->setProperty("version", JucePlugin_VersionString);
                                info->setProperty("juceVersion", juce::SystemStats::getJUCEVersion());
                                info->setProperty("wrapper", juce::AudioProcessor::getWrapperTypeDescription(
                                                                 pluginProcessor.wrapperType));
                                complete(juce::var{info.release()});
                              })
          .withNativeFunction("setTestSignal",
                              [this](const juce::Array<juce::var> &args, const auto &complete) {
                                pluginProcessor.setTestSignalEnabled(!args.isEmpty() && static_cast<bool>(args[0]));
                                complete({});
                              })
          .withNativeFunction("setAnalyzerSource",
                              [this](const juce::Array<juce::var> &args, const auto &complete) {
                                pluginProcessor.setAnalyzeOutput(!args.isEmpty() && args[0].toString() == "output");
                                complete({});
                              })
          .withNativeFunction("requestResponse",
                              [this](const juce::Array<juce::var> &, const auto &complete) {
                                lastSentResponse.reset(); // the next timer tick resends it
                                complete({});
                              })
          .withNativeFunction("setAnalyzerActive",
                              [this](const juce::Array<juce::var> &args, const auto &complete) {
                                setAnalyzerActive(!args.isEmpty() && static_cast<bool>(args[0]));
                                complete({});
                              })
          .withResourceProvider([this](const juce::String &url) { return getResource(url); }, allowedOrigin);

  for (const auto &relays : bandRelays)
    options = options.withOptionsFrom(relays->enabled)
                  .withOptionsFrom(relays->shape)
                  .withOptionsFrom(relays->frequency)
                  .withOptionsFrom(relays->gain)
                  .withOptionsFrom(relays->q)
                  .withOptionsFrom(relays->slope);

  return options;
}

PluginEditor::BandRelays::BandRelays(int band)
    : enabled(parameters::bandId(band, parameters::BandField::enabled)),
      shape(parameters::bandId(band, parameters::BandField::shape)),
      frequency(parameters::bandId(band, parameters::BandField::frequency)),
      gain(parameters::bandId(band, parameters::BandField::gain)),
      q(parameters::bandId(band, parameters::BandField::q)),
      slope(parameters::bandId(band, parameters::BandField::slope)) {}

PluginEditor::BandAttachments::BandAttachments(juce::AudioProcessorValueTreeState &state, int band, BandRelays &relays)
    : enabled(*state.getParameter(parameters::bandId(band, parameters::BandField::enabled)), relays.enabled, nullptr),
      shape(*state.getParameter(parameters::bandId(band, parameters::BandField::shape)), relays.shape, nullptr),
      frequency(*state.getParameter(parameters::bandId(band, parameters::BandField::frequency)), relays.frequency,
                nullptr),
      gain(*state.getParameter(parameters::bandId(band, parameters::BandField::gain)), relays.gain, nullptr),
      q(*state.getParameter(parameters::bandId(band, parameters::BandField::q)), relays.q, nullptr),
      slope(*state.getParameter(parameters::bandId(band, parameters::BandField::slope)), relays.slope, nullptr) {}

PluginEditor::BandRelayArray PluginEditor::createBandRelays() {
  BandRelayArray relays;
  for (std::size_t i = 0; i < relays.size(); ++i)
    relays[i] = std::make_unique<BandRelays>(static_cast<int>(i) + 1);
  return relays;
}

PluginEditor::BandAttachmentArray PluginEditor::createBandAttachments() {
  BandAttachmentArray attachments;
  for (std::size_t i = 0; i < attachments.size(); ++i)
    attachments[i] =
        std::make_unique<BandAttachments>(pluginProcessor.getState(), static_cast<int>(i) + 1, *bandRelays[i]);
  return attachments;
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
  webView.evaluateJavascript("window.evenOnAnalyzerFrame?.(" + juce::String{juce::Time::currentTimeMillis()} + ",'" +
                             juce::Base64::toBase64(bytes.data(), bytes.size()) + "')");
}

void PluginEditor::timerCallback() {
  if (!webView.isShowing())
    return;

  const auto state = pluginProcessor.getResponseState();
  if (lastSentResponse && isSameResponse(state, *lastSentResponse))
    return;

  const auto bytes = serializeResponse(state);
  webView.evaluateJavascript("window.evenOnResponse?.('" + juce::Base64::toBase64(bytes.data(), bytes.size()) + "')");
  lastSentResponse = state;
}

} // namespace even
