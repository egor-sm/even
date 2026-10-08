#include "app/web/arguments.h"

#include "app/plugin/parameters.h"

#include <algorithm>
#include <array>
#include <bit>
#include <string_view>
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

namespace {

// The value whose name the property holds, or the fallback when it is missing or unknown.
template <typename Value, std::size_t Count>
Value namedProperty(const juce::var &object, const char *property,
                    const std::array<std::pair<std::string_view, Value>, Count> &names, Value fallback) {
  const auto name = object.getProperty(property, {}).toString().toStdString();
  for (const auto &[candidate, value] : names)
    if (candidate == name)
      return value;
  return fallback;
}

double numberProperty(const juce::var &object, const char *property, double fallback, double min, double max) {
  const auto value = object.getProperty(property, {});
  return value.isDouble() || value.isInt() || value.isInt64() ? std::clamp(static_cast<double>(value), min, max)
                                                              : fallback;
}

} // namespace

AnalyzerOptions analyzerOptionsArgument(const juce::Array<juce::var> &args, int index) {
  AnalyzerOptions options;
  if (index >= args.size() || !args[index].isObject())
    return options;

  const auto &object = args[index];
  using Kernel = dsp::SmoothingKernel;
  using Width = dsp::SmoothingWidth;
  using LowEnd = dsp::LowEnd;

  options.window = namedProperty<AnalyzerWindow, 2>(
      object, "window", {{{"blackmanHarris", AnalyzerWindow::blackmanHarris}, {"hann", AnalyzerWindow::hann}}},
      options.window);
  const auto windowLength =
      static_cast<unsigned>(numberProperty(object, "windowLength", options.windowLength, 1024.0, 8192.0));
  options.windowLength = static_cast<int>(std::bit_floor(windowLength));
  const auto padding = static_cast<int>(numberProperty(object, "zeroPadding", options.zeroPadding, 1.0, 4.0));
  options.zeroPadding = static_cast<int>(std::bit_floor(static_cast<unsigned>(padding))); // 1, 2 or 4
  options.smoothing.kernel = namedProperty<Kernel, 5>(object, "kernel",
                                                      {{{"roundedBox", Kernel::roundedBox},
                                                        {"box", Kernel::box},
                                                        {"triangle", Kernel::triangle},
                                                        {"hann", Kernel::hann},
                                                        {"gaussian", Kernel::gaussian}}},
                                                      options.smoothing.kernel);
  options.smoothing.width = namedProperty<Width, 3>(
      object, "width",
      {{{"constant", Width::constant}, {"psychoacoustic", Width::psychoacoustic}, {"erb", Width::erb}}},
      options.smoothing.width);
  options.smoothing.octaves = numberProperty(object, "octaves", options.smoothing.octaves, 1.0 / 48.0, 1.0);
  options.smoothing.lowEnd = namedProperty<LowEnd, 3>(object, "lowEnd",
                                                      {{{"linearPower", LowEnd::linearPower},
                                                        {"monotoneDb", LowEnd::monotoneDb},
                                                        {"minimumWidth", LowEnd::minimumWidth}}},
                                                      options.smoothing.lowEnd);
  options.smoothing.minimumBins = numberProperty(object, "minimumBins", options.smoothing.minimumBins, 0.5, 8.0);
  options.averagingMs = numberProperty(object, "averagingMs", options.averagingMs, 0.0, 5000.0);
  options.lowFft = static_cast<bool>(object.getProperty("lowFft", options.lowFft));
  return options;
}

bool boolArgument(const juce::Array<juce::var> &args, int index) {
  return index < args.size() && static_cast<bool>(args[index]);
}

} // namespace even::web
