#include "app/state/user_settings.h"

#include <algorithm>
#include <cstdlib>

namespace even {

namespace {

constexpr auto themeKey = "theme";
constexpr auto scaleKey = "scale";
constexpr auto darkTheme = "dark";
constexpr auto lightTheme = "light";

juce::PropertiesFile::Options fileOptions() {
  juce::PropertiesFile::Options options;
  options.applicationName = "Even";
  options.folderName = "Even";
  options.filenameSuffix = ".settings";
  options.osxLibrarySubFolder = "Application Support";
  options.storageFormat = juce::PropertiesFile::storeAsXML;
  return options;
}

// The supported scale closest to `percent`.
int snapScale(int percent) {
  return *std::ranges::min_element(UserSettings::scalesPercent, {},
                                   [percent](int scale) { return std::abs(scale - percent); });
}

} // namespace

UserSettings::UserSettings() : file(fileOptions()) {}

juce::String UserSettings::theme() const {
  return file.getValue(themeKey) == lightTheme ? lightTheme : darkTheme;
}

void UserSettings::setTheme(const juce::String &theme) {
  file.setValue(themeKey, theme == lightTheme ? lightTheme : darkTheme);
}

int UserSettings::scalePercent() const {
  return snapScale(file.getIntValue(scaleKey, defaultScalePercent));
}

void UserSettings::setScalePercent(int percent) {
  file.setValue(scaleKey, snapScale(percent));
}

} // namespace even
