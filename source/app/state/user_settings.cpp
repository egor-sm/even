#include "app/state/user_settings.h"

#include <algorithm>
#include <cmath>
#include <cstdlib>
#include <utility>

namespace even {

namespace {

constexpr auto themeKey = "theme";
constexpr auto scaleKey = "scale";
constexpr auto darkTheme = "dark";
constexpr auto lightTheme = "light";

constexpr auto analyzerModeKey = "analyzer.mode";
constexpr auto analyzerRangeKey = "analyzer.range";
constexpr auto analyzerFftSizeKey = "analyzer.fftSize";
constexpr auto analyzerDecayKey = "analyzer.decay";
constexpr auto analyzerTiltKey = "analyzer.tilt";

constexpr std::array analyzerModeNames{
    std::pair{AnalyzerMode::prePost, "prepost"},
    std::pair{AnalyzerMode::post, "post"},
    std::pair{AnalyzerMode::pre, "pre"},
    std::pair{AnalyzerMode::off, "off"},
};

juce::PropertiesFile::Options fileOptions() {
  juce::PropertiesFile::Options options;
  options.applicationName = "Even";
  options.folderName = "Even";
  options.filenameSuffix = ".settings";
  options.osxLibrarySubFolder = "Application Support";
  options.storageFormat = juce::PropertiesFile::storeAsXML;
  return options;
}

// The allowed value closest to `value`.
template <typename Value, std::size_t Count>
Value nearest(const std::array<Value, Count> &allowed, double value) {
  return *std::ranges::min_element(
      allowed, {}, [value](Value candidate) { return std::abs(static_cast<double>(candidate) - value); });
}

// The same, measured in octaves: for sizes and rates that double from one to the next.
template <typename Value, std::size_t Count>
Value nearestInOctaves(const std::array<Value, Count> &allowed, double value) {
  return *std::ranges::min_element(allowed, {}, [value](Value candidate) {
    return std::abs(std::log2(static_cast<double>(candidate) / std::max(value, 1e-9)));
  });
}

AnalyzerSettings snapped(const AnalyzerSettings &settings) {
  return {
      .mode = settings.mode,
      .rangeDb = nearest(AnalyzerSettings::rangesDb, settings.rangeDb),
      .fftSize = nearestInOctaves(SpectrumAnalyzer::fftSizes, settings.fftSize),
      .decayDbPerSecond = nearestInOctaves(AnalyzerSettings::decaysDbPerSecond, settings.decayDbPerSecond),
      .tiltDbPerOctave = nearest(AnalyzerSettings::tiltsDbPerOctave, settings.tiltDbPerOctave),
  };
}

} // namespace

juce::String analyzerModeName(AnalyzerMode mode) {
  for (const auto &[value, name] : analyzerModeNames)
    if (value == mode)
      return name;
  return analyzerModeNames.front().second;
}

std::optional<AnalyzerMode> analyzerModeNamed(const juce::String &name) {
  for (const auto &[value, candidate] : analyzerModeNames)
    if (name == candidate)
      return value;
  return std::nullopt;
}

UserSettings::UserSettings() : file(fileOptions()) {}

UserSettings::UserSettings(const juce::File &settingsFile) : file(settingsFile, fileOptions()) {}

juce::String UserSettings::theme() const {
  return file.getValue(themeKey) == lightTheme ? lightTheme : darkTheme;
}

void UserSettings::setTheme(const juce::String &theme) {
  file.setValue(themeKey, theme == lightTheme ? lightTheme : darkTheme);
}

int UserSettings::scalePercent() const {
  return nearest(scalesPercent, file.getIntValue(scaleKey, defaultScalePercent));
}

void UserSettings::setScalePercent(int percent) {
  file.setValue(scaleKey, nearest(scalesPercent, percent));
}

AnalyzerSettings UserSettings::analyzer() const {
  const AnalyzerSettings defaults;
  return snapped({
      .mode = analyzerModeNamed(file.getValue(analyzerModeKey)).value_or(defaults.mode),
      .rangeDb = file.getIntValue(analyzerRangeKey, defaults.rangeDb),
      .fftSize = file.getIntValue(analyzerFftSizeKey, defaults.fftSize),
      .decayDbPerSecond = file.getIntValue(analyzerDecayKey, defaults.decayDbPerSecond),
      .tiltDbPerOctave = file.getDoubleValue(analyzerTiltKey, defaults.tiltDbPerOctave),
  });
}

void UserSettings::setAnalyzer(const AnalyzerSettings &settings) {
  const auto value = snapped(settings);
  file.setValue(analyzerModeKey, analyzerModeName(value.mode));
  file.setValue(analyzerRangeKey, value.rangeDb);
  file.setValue(analyzerFftSizeKey, value.fftSize);
  file.setValue(analyzerDecayKey, value.decayDbPerSecond);
  file.setValue(analyzerTiltKey, value.tiltDbPerOctave);
}

} // namespace even
