#include "app/state/user_settings.h"

#include <catch2/catch_test_macros.hpp>

#include <optional>

using even::AnalyzerMode;
using even::UserSettings;

namespace {

// Settings in a file of their own, deleted afterwards.
class TemporarySettings {
public:
  TemporarySettings() : file(juce::File::createTempFile(".settings")) {}
  ~TemporarySettings() { file.deleteFile(); }

  TemporarySettings(const TemporarySettings &) = delete;
  TemporarySettings &operator=(const TemporarySettings &) = delete;

  [[nodiscard]] UserSettings open() const { return UserSettings{file}; }

private:
  juce::File file;
};

} // namespace

TEST_CASE("user settings: the analyzer starts at the defaults", "[app][settings]") {
  const TemporarySettings temporary;
  const auto analyzer = temporary.open().analyzer();

  CHECK(analyzer.mode == AnalyzerMode::prePost);
  CHECK(analyzer.rangeDb == 120);
  CHECK(analyzer.fftSize == 4096);
  CHECK(analyzer.decayDbPerSecond == 30);
  CHECK(juce::exactlyEqual(analyzer.tiltDbPerOctave, 4.5));
}

TEST_CASE("user settings: the analyzer is kept across instances", "[app][settings]") {
  const TemporarySettings temporary;
  temporary.open().setAnalyzer(
      {.mode = AnalyzerMode::off, .rangeDb = 70, .fftSize = 16384, .decayDbPerSecond = 15, .tiltDbPerOctave = 3.0});

  const auto analyzer = temporary.open().analyzer();
  CHECK(analyzer.mode == AnalyzerMode::off);
  CHECK(analyzer.rangeDb == 70);
  CHECK(analyzer.fftSize == 16384); // kept as chosen, whatever the sample rate
  CHECK(analyzer.decayDbPerSecond == 15);
  CHECK(juce::exactlyEqual(analyzer.tiltDbPerOctave, 3.0));
}

TEST_CASE("user settings: analyzer values snap to the allowed ones", "[app][settings]") {
  const TemporarySettings temporary;
  auto settings = temporary.open();
  settings.setAnalyzer({.rangeDb = 84, .fftSize = 2500, .decayDbPerSecond = 1000, .tiltDbPerOctave = 4.0});

  const auto analyzer = settings.analyzer();
  CHECK(analyzer.rangeDb == 80);
  CHECK(analyzer.fftSize == 2048);
  CHECK(analyzer.decayDbPerSecond == 240);
  CHECK(juce::exactlyEqual(analyzer.tiltDbPerOctave, 4.5));
}

TEST_CASE("user settings: analyzer modes by name", "[app][settings]") {
  for (const auto mode : {AnalyzerMode::prePost, AnalyzerMode::post, AnalyzerMode::pre, AnalyzerMode::off})
    CHECK(even::analyzerModeNamed(even::analyzerModeName(mode)) == mode);
  CHECK(even::analyzerModeNamed("both") == std::nullopt);
}
