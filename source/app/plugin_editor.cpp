#include "plugin_editor.h"

#include "build_config.h"
#include "web_resources.h"

#include <optional>
#include <string_view>
#include <utility>

namespace even {

namespace {

// A 1-based band number from the page as a slot index.
std::optional<std::size_t> slotArgument(const juce::Array<juce::var> &args, int index) {
  if (index >= args.size())
    return std::nullopt;
  const auto band = static_cast<int>(args[index]);
  if (band < 1 || band > parameters::numBands)
    return std::nullopt;
  return static_cast<std::size_t>(band - 1);
}

std::optional<dsp::FilterShape> shapeArgument(const juce::Array<juce::var> &args, int index) {
  if (index >= args.size())
    return std::nullopt;
  const auto shape = static_cast<int>(args[index]);
  if (shape < 0 || std::cmp_greater_equal(shape, parameters::shapeNames.size()))
    return std::nullopt;
  return static_cast<dsp::FilterShape>(shape);
}

std::optional<AnalyzerMode> analyzerModeArgument(const juce::Array<juce::var> &args, int index) {
  if (index >= args.size())
    return std::nullopt;

  const auto name = args[index].toString();
  if (name == "prepost")
    return AnalyzerMode::prePost;
  if (name == "post")
    return AnalyzerMode::post;
  if (name == "pre")
    return AnalyzerMode::pre;
  if (name == "off")
    return AnalyzerMode::off;
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
      muteAttachment(*pluginProcessor.getState().getParameter(parameters::mute), muteRelay, nullptr),
      bandAttachments(createBandAttachments()) {
  addAndMakeVisible(webView);

  webView.goToURL(getDevServerUrl().value_or(juce::WebBrowserComponent::getResourceProviderRoot()));

  setResizable(false, false);
  applyScale();

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
          // "prepost", "post", "pre" or "off".
          .withNativeFunction("setAnalyzerMode",
                              [this](const juce::Array<juce::var> &args, const auto &complete) {
                                if (const auto mode = analyzerModeArgument(args, 0))
                                  pluginProcessor.getAnalyzer().setMode(*mode);
                                complete({});
                              })
          .withNativeFunction("requestResponse",
                              [this](const juce::Array<juce::var> &, const auto &complete) {
                                lastSentResponse.reset(); // the next timer tick resends it
                                complete({});
                              })
          // Returns the new band's number, or undefined when every band is in use.
          .withNativeFunction("createBand",
                              [this](const juce::Array<juce::var> &args, const auto &complete) {
                                const auto shape = shapeArgument(args, 0);
                                if (!shape || args.size() < 3) {
                                  complete({});
                                  return;
                                }
                                const auto slot = pluginProcessor.getBandSlots().create(
                                    *shape, static_cast<double>(args[1]), static_cast<double>(args[2]));
                                complete(slot ? juce::var{static_cast<int>(*slot) + 1} : juce::var{});
                              })
          .withNativeFunction("deleteBand",
                              [this](const juce::Array<juce::var> &args, const auto &complete) {
                                if (const auto slot = slotArgument(args, 0))
                                  pluginProcessor.getBandSlots().remove(*slot);
                                complete({});
                              })
          // Changes the shape together with the q and gain adjustments that go with it (model::withShape).
          .withNativeFunction("setBandShape",
                              [this](const juce::Array<juce::var> &args, const auto &complete) {
                                const auto slot = slotArgument(args, 0);
                                const auto shape = shapeArgument(args, 1);
                                if (slot && shape)
                                  pluginProcessor.getBandSlots().setShape(*slot, *shape);
                                complete({});
                              })
          // Each returns {canUndo, canRedo}.
          .withNativeFunction("undo",
                              [this](const juce::Array<juce::var> &, const auto &complete) {
                                pluginProcessor.getBandHistory().undo();
                                complete(historyStateVar());
                              })
          .withNativeFunction("redo",
                              [this](const juce::Array<juce::var> &, const auto &complete) {
                                pluginProcessor.getBandHistory().redo();
                                complete(historyStateVar());
                              })
          .withNativeFunction("getHistoryState", [this](const juce::Array<juce::var> &,
                                                        const auto &complete) { complete(historyStateVar()); })
          // Returns {theme, scale}.
          .withNativeFunction("getSettings",
                              [this](const juce::Array<juce::var> &, const auto &complete) { complete(settingsVar()); })
          // (key, value) with key "theme" ("dark" | "light") or "scale" (percent); returns {theme, scale}.
          .withNativeFunction("setSetting",
                              [this](const juce::Array<juce::var> &args, const auto &complete) {
                                if (args.size() >= 2 && args[0].toString() == "theme") {
                                  settings->setTheme(args[1].toString());
                                } else if (args.size() >= 2 && args[0].toString() == "scale") {
                                  settings->setScalePercent(static_cast<int>(args[1]));
                                  applyScale();
                                }
                                complete(settingsVar());
                              })
          .withNativeFunction("setAnalyzerActive",
                              [this](const juce::Array<juce::var> &args, const auto &complete) {
                                setAnalyzerActive(!args.isEmpty() && static_cast<bool>(args[0]));
                                complete({});
                              })
          .withResourceProvider([this](const juce::String &url) { return getResource(url); }, allowedOrigin);

  for (const auto &relays : bandRelays)
    options = options.withOptionsFrom(relays->used)
                  .withOptionsFrom(relays->enabled)
                  .withOptionsFrom(relays->shape)
                  .withOptionsFrom(relays->frequency)
                  .withOptionsFrom(relays->gain)
                  .withOptionsFrom(relays->q)
                  .withOptionsFrom(relays->slope);

  return options;
}

PluginEditor::BandRelays::BandRelays(int band)
    : used(parameters::bandId(band, parameters::BandField::used)),
      enabled(parameters::bandId(band, parameters::BandField::enabled)),
      shape(parameters::bandId(band, parameters::BandField::shape)),
      frequency(parameters::bandId(band, parameters::BandField::frequency)),
      gain(parameters::bandId(band, parameters::BandField::gain)),
      q(parameters::bandId(band, parameters::BandField::q)),
      slope(parameters::bandId(band, parameters::BandField::slope)) {}

PluginEditor::BandAttachments::BandAttachments(juce::AudioProcessorValueTreeState &state, int band, BandRelays &relays)
    : used(*state.getParameter(parameters::bandId(band, parameters::BandField::used)), relays.used, nullptr),
      enabled(*state.getParameter(parameters::bandId(band, parameters::BandField::enabled)), relays.enabled, nullptr),
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

void PluginEditor::applyScale() {
  const auto percent = settings->scalePercent();
  setSize(baseWidth * percent / 100, baseHeight * percent / 100);
}

juce::var PluginEditor::settingsVar() const {
  auto object = std::make_unique<juce::DynamicObject>();
  object->setProperty("theme", settings->theme());
  object->setProperty("scale", settings->scalePercent());
  return juce::var{object.release()};
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

PluginEditor::HistoryState PluginEditor::getHistoryState() {
  const auto &history = pluginProcessor.getBandHistory();
  return {.canUndo = history.canUndo(), .canRedo = history.canRedo()};
}

juce::var PluginEditor::historyStateVar() {
  const auto state = getHistoryState();
  auto object = std::make_unique<juce::DynamicObject>();
  object->setProperty("canUndo", state.canUndo);
  object->setProperty("canRedo", state.canRedo);
  return juce::var{object.release()};
}

void PluginEditor::timerCallback() {
  if (!webView.isShowing())
    return;

  if (const auto history = getHistoryState(); history != lastSentHistory) {
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
