#include "app/web/native_functions.h"

#include "app/web/arguments.h"
#include "app/web/messages.h"

#include <utility>
#include <vector>

namespace even::web {

namespace {

using Arguments = juce::Array<juce::var>;

// Every native function here completes at once with its result (undefined for a void var).
using Call = std::function<juce::var(const Arguments &)>;

void setSetting(PluginProcessor &processor, UserSettings &settings, const EditorActions &actions,
                const juce::String &key, const juce::var &value) {
  if (key == "theme") {
    settings.setTheme(value.toString());
    return;
  }
  if (key == "scale") {
    settings.setScalePercent(static_cast<int>(value));
    actions.applyScale();
    return;
  }

  auto analyzer = settings.analyzer();
  if (key == "analyzer.mode")
    analyzer.mode = analyzerModeNamed(value.toString()).value_or(analyzer.mode);
  else if (key == "analyzer.range")
    analyzer.rangeDb = static_cast<int>(value);
  else if (key == "analyzer.fftSize")
    analyzer.fftSize = static_cast<int>(value);
  else if (key == "analyzer.decay")
    analyzer.decayDbPerSecond = static_cast<int>(value);
  else if (key == "analyzer.tilt")
    analyzer.tiltDbPerOctave = static_cast<double>(value);
  else
    return;
  settings.setAnalyzer(analyzer);
  applyAnalyzerSettings(processor.getAnalyzer(), settings.analyzer());
}

std::vector<std::pair<const char *, Call>> nativeFunctions(PluginProcessor &processor, UserSettings &settings,
                                                           const EditorActions &actions) {
  return {
      {"getPluginInfo", [&processor](const Arguments &) { return pluginInfo(processor); }},
      // Replaces the input with a test signal (debug aid for the analyzer).
      {"setTestSignal",
       [&processor](const Arguments &args) {
         processor.setTestSignalEnabled(boolArgument(args, 0));
         return juce::var{};
       }},
      {"setAnalyzerActive",
       [actions](const Arguments &args) {
         actions.setAnalyzerActive(boolArgument(args, 0));
         return juce::var{};
       }},
      {"requestResponse",
       [actions](const Arguments &) {
         actions.resendResponse();
         return juce::var{};
       }},
      // (shape, frequencyHz, gainDb) => the new band's number, or undefined when every band is in use.
      {"createBand",
       [&processor](const Arguments &args) {
         const auto shape = shapeArgument(args, 0);
         if (!shape || args.size() < 3)
           return juce::var{};
         const auto slot =
             processor.getBandSlots().create(*shape, static_cast<double>(args[1]), static_cast<double>(args[2]));
         return slot ? juce::var{static_cast<int>(*slot) + 1} : juce::var{};
       }},
      {"deleteBand",
       [&processor](const Arguments &args) {
         if (const auto slot = slotArgument(args, 0))
           processor.getBandSlots().remove(*slot);
         return juce::var{};
       }},
      // (band, shape): changes the shape together with the q and gain adjustments that go with it
      // (model::withShape).
      {"setBandShape",
       [&processor](const Arguments &args) {
         const auto slot = slotArgument(args, 0);
         const auto shape = shapeArgument(args, 1);
         if (slot && shape)
           processor.getBandSlots().setShape(*slot, *shape);
         return juce::var{};
       }},
      // (band, shape) => the sections the band would have with that shape (as setBandShape would
      // make it): the page previews the change as a ghost curve.
      {"previewBand",
       [&processor](const Arguments &args) {
         const auto slot = slotArgument(args, 0);
         const auto shape = shapeArgument(args, 1);
         if (!slot || !shape)
           return juce::var{};
         const auto state = processor.getResponseState();
         const auto band = model::withShape(state.bands[*slot], *shape);
         return sections(model::designBand(band, state.drawingSampleRate()).design);
       }},
      // (band) solos it; anything else (0, null) ends solo.
      {"setSolo",
       [&processor](const Arguments &args) {
         processor.setSoloBand(slotArgument(args, 0));
         return juce::var{};
       }},
      // Each history function returns {canUndo, canRedo}.
      {"undo",
       [&processor](const Arguments &) {
         processor.getBandHistory().undo();
         return historyState(processor.getBandHistory().state());
       }},
      {"redo",
       [&processor](const Arguments &) {
         processor.getBandHistory().redo();
         return historyState(processor.getBandHistory().state());
       }},
      {"getHistoryState", [&processor](const Arguments &) { return historyState(processor.getBandHistory().state()); }},
      // Returns the settings (web::settings).
      {"getSettings", [&settings](const Arguments &) { return web::settings(settings); }},
      // (key, value) with key "theme" ("dark" | "light"), "scale" (percent) or one of the analyzer's:
      // "analyzer.mode", "analyzer.range", "analyzer.fftSize", "analyzer.decay", "analyzer.tilt".
      // Returns the settings.
      {"setSetting",
       [&processor, &settings, actions](const Arguments &args) {
         if (args.size() >= 2)
           setSetting(processor, settings, actions, args[0].toString(), args[1]);
         return web::settings(settings);
       }},
  };
}

} // namespace

juce::WebBrowserComponent::Options withNativeFunctions(juce::WebBrowserComponent::Options options,
                                                       PluginProcessor &processor, UserSettings &settings,
                                                       const EditorActions &actions) {
  for (auto &[name, function] : nativeFunctions(processor, settings, actions))
    options = options.withNativeFunction(
        name, [call = std::move(function)](const Arguments &args,
                                           const juce::WebBrowserComponent::NativeFunctionCompletion &complete) {
          complete(call(args));
        });
  return options;
}

} // namespace even::web
