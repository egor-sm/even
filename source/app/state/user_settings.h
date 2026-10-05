#pragma once

#include <juce_data_structures/juce_data_structures.h>

#include <array>

namespace even {

// Preferences of the user rather than of a project (theme, UI scale), shared by every instance of
// the plugin and kept in ~/Library/Application Support/Even. Message thread only; share one
// instance per process with juce::SharedResourcePointer.
class UserSettings {
public:
  static constexpr std::array scalesPercent{75, 100, 125, 150, 175, 200};
  static constexpr int defaultScalePercent = 100;

  UserSettings();

  // "dark" or "light".
  [[nodiscard]] juce::String theme() const;
  void setTheme(const juce::String &theme);

  // One of scalesPercent.
  [[nodiscard]] int scalePercent() const;
  void setScalePercent(int percent);

private:
  juce::PropertiesFile file;
};

} // namespace even
