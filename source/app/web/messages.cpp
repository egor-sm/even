#include "app/web/messages.h"

#include <memory>

namespace even::web {

juce::var pluginInfo(const juce::AudioProcessor &processor) {
  auto info = std::make_unique<juce::DynamicObject>();
  info->setProperty("name", processor.getName());
  info->setProperty("version", JucePlugin_VersionString);
  info->setProperty("juceVersion", juce::SystemStats::getJUCEVersion());
  info->setProperty("wrapper", juce::AudioProcessor::getWrapperTypeDescription(processor.wrapperType));
  return juce::var{info.release()};
}

juce::var sections(const dsp::BandDesign &design) {
  juce::Array<juce::var> result;
  for (std::size_t i = 0; i < design.count; ++i) {
    const auto &section = design.sections[i];
    auto object = std::make_unique<juce::DynamicObject>();
    object->setProperty("order", section.order);
    object->setProperty("g", section.g);
    object->setProperty("q", section.q);
    object->setProperty("lowpassMix", section.lowpassMix);
    object->setProperty("bandpassMix", section.bandpassMix);
    object->setProperty("highpassMix", section.highpassMix);
    result.add(juce::var{object.release()});
  }
  return result;
}

juce::var settings(const UserSettings &settings) {
  auto object = std::make_unique<juce::DynamicObject>();
  object->setProperty("theme", settings.theme());
  object->setProperty("scale", settings.scalePercent());
  return juce::var{object.release()};
}

juce::var historyState(const HistoryState &state) {
  auto object = std::make_unique<juce::DynamicObject>();
  object->setProperty("canUndo", state.canUndo);
  object->setProperty("canRedo", state.canRedo);
  return juce::var{object.release()};
}

} // namespace even::web
