#pragma once

#include "app/analyzer/spectrum_analyzer.h"

#include <juce_data_structures/juce_data_structures.h>

#include <array>
#include <optional>

namespace even {

// The analyzer as the user set it up: which spectra, and how the page draws them.
struct AnalyzerSettings {
  static constexpr std::array rangesDb{60, 70, 80, 90, 100, 110, 120};
  static constexpr std::array decaysDbPerSecond{15, 30, 60, 120, 240};
  static constexpr std::array tiltsDbPerOctave{0.0, 3.0, 4.5, 6.0};

  AnalyzerMode mode = AnalyzerMode::prePost;
  // dB drawn over the plot height, down from 0 dB at the top.
  int rangeDb = 120;
  // The chosen size: kept as chosen, the analyzer may use a smaller one (effectiveFftSize).
  int fftSize = SpectrumAnalyzer::defaultFftSize;
  // How fast the curve falls after a peak.
  int decayDbPerSecond = 30;
  // Slope of the spectrum around 1 kHz.
  double tiltDbPerOctave = 4.5;
};

// Hands the analysis part of the settings (the mode and the FFT size) to the analyzer.
inline void applyAnalyzerSettings(SpectrumAnalyzer &analyzer, const AnalyzerSettings &settings) {
  analyzer.setMode(settings.mode);
  analyzer.setFftSize(settings.fftSize);
}

// "prepost", "post", "pre" or "off".
[[nodiscard]] juce::String analyzerModeName(AnalyzerMode mode);
[[nodiscard]] std::optional<AnalyzerMode> analyzerModeNamed(const juce::String &name);

// Preferences of the user rather than of a project (theme, UI scale, the analyzer), shared by
// every instance of the plugin and kept in ~/Library/Application Support/Even. Message thread
// only; share one instance per process with juce::SharedResourcePointer.
class UserSettings {
public:
  static constexpr std::array scalesPercent{75, 100, 125, 150, 175, 200};
  static constexpr int defaultScalePercent = 100;

  UserSettings();
  // Kept in another file (tests).
  explicit UserSettings(const juce::File &file);

  // "dark" or "light".
  [[nodiscard]] juce::String theme() const;
  void setTheme(const juce::String &theme);

  // One of scalesPercent.
  [[nodiscard]] int scalePercent() const;
  void setScalePercent(int percent);

  // Values are snapped to the nearest allowed one when read and written.
  [[nodiscard]] AnalyzerSettings analyzer() const;
  void setAnalyzer(const AnalyzerSettings &settings);

private:
  juce::PropertiesFile file;
};

} // namespace even
