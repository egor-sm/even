#pragma once

#include <juce_audio_basics/juce_audio_basics.h>

#include <array>

namespace eqit {

// Debug signal for the analyzer: pink noise plus a logarithmic 20 Hz - 20 kHz sine sweep.
class TestSignal {
public:
  void prepare(double newSampleRate);

  // Audio thread: replaces the buffer contents, no allocations.
  void render(juce::AudioBuffer<float> &buffer) noexcept;

private:
  [[nodiscard]] float nextPinkNoise() noexcept;

  static constexpr double sweepSeconds = 10.0;
  static constexpr double sweepStartHz = 20.0;
  static constexpr double sweepEndHz = 20000.0;

  double sampleRate = 44100.0;
  double sweepProgress = 0.0;
  double phase = 0.0;

  juce::Random random;
  std::array<float, 7> pinkState{};
};

} // namespace eqit
