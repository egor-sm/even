#include "app/web/arguments.h"

#include "app/plugin/parameters.h"

#include <utility>

namespace even::web {

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

bool boolArgument(const juce::Array<juce::var> &args, int index) {
  return index < args.size() && static_cast<bool>(args[index]);
}

} // namespace even::web
