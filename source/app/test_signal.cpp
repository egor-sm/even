#include "test_signal.h"

#include <cmath>
#include <numbers>

namespace even {

void TestSignal::prepare(double newSampleRate) {
  sampleRate = newSampleRate;
}

void TestSignal::render(juce::AudioBuffer<float> &buffer) noexcept {
  constexpr auto sineGain = 0.25f;  // -12 dBFS
  constexpr auto noiseGain = 0.06f; // about -24 dBFS RMS

  const auto sweepRatio = sweepEndHz / sweepStartHz;
  const auto progressStep = 1.0 / (sweepSeconds * sampleRate);

  for (int i = 0; i < buffer.getNumSamples(); ++i) {
    const auto frequency = sweepStartHz * std::pow(sweepRatio, sweepProgress);
    phase = std::fmod(phase + 2.0 * std::numbers::pi * frequency / sampleRate, 2.0 * std::numbers::pi);
    sweepProgress = std::fmod(sweepProgress + progressStep, 1.0);

    const auto sample = sineGain * static_cast<float>(std::sin(phase)) + noiseGain * nextPinkNoise();

    for (int channel = 0; channel < buffer.getNumChannels(); ++channel)
      buffer.setSample(channel, i, sample);
  }
}

// Paul Kellet's refined pink noise filter.
float TestSignal::nextPinkNoise() noexcept {
  const auto white = random.nextFloat() * 2.0f - 1.0f;
  auto &b = pinkState;

  b[0] = 0.99886f * b[0] + white * 0.0555179f;
  b[1] = 0.99332f * b[1] + white * 0.0750759f;
  b[2] = 0.96900f * b[2] + white * 0.1538520f;
  b[3] = 0.86650f * b[3] + white * 0.3104856f;
  b[4] = 0.55000f * b[4] + white * 0.5329522f;
  b[5] = -0.7616f * b[5] - white * 0.0168980f;

  const auto pink = b[0] + b[1] + b[2] + b[3] + b[4] + b[5] + b[6] + white * 0.5362f;
  b[6] = white * 0.115926f;

  return pink * 0.11f;
}

} // namespace even
