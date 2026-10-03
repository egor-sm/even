#include "dsp/band.h"

#include <algorithm>
#include <cmath>

namespace eqit::dsp {

void Band::prepare(double newSampleRate) noexcept {
  sampleRate = newSampleRate;

  frequency.prepare(sampleRate, smoothingMs, SmoothedValue::Scale::logarithmic);
  gain.prepare(sampleRate, smoothingMs, SmoothedValue::Scale::linear);
  q.prepare(sampleRate, smoothingMs, SmoothedValue::Scale::logarithmic);

  // Start exactly at the target: no smoothing or crossfade right after (re)initialisation.
  setTarget(target, targetEnabled);
  frequency.setCurrentAndTarget(target.frequencyHz);
  gain.setCurrentAndTarget(target.gainDb);
  q.setCurrentAndTarget(target.q);

  crossfadeLength = std::max(1, static_cast<int>(crossfadeMs / 1000.0 * sampleRate));
  crossfadeRemaining = 0;

  for (auto &voice : voices) {
    voice.shape = target.shape;
    voice.enabled = targetEnabled;
    for (auto &section : voice.sections)
      section.reset();
    updateCoefficients(voice, 0);
  }
}

void Band::setTarget(const BandParameters &parameters, bool enabled) noexcept {
  target = sanitize(parameters, sampleRate);
  targetEnabled = enabled;

  frequency.setTarget(target.frequencyHz);
  gain.setTarget(target.gainDb);
  q.setTarget(target.q);
}

void Band::process(float *const *channels, int numChannels, int numSamples) noexcept {
  numChannels = std::min(numChannels, maxChannels);

  for (int start = 0; start < numSamples; start += updateInterval) {
    const auto count = std::min(updateInterval, numSamples - start);

    frequency.advance(count);
    gain.advance(count);
    q.advance(count);

    startCrossfadeIfNeeded();

    auto &active = voices[static_cast<std::size_t>(activeVoice)];
    auto &fading = voices[static_cast<std::size_t>(1 - activeVoice)];

    updateCoefficients(active, count);
    if (crossfadeRemaining > 0)
      updateCoefficients(fading, count);

    for (int channel = 0; channel < numChannels; ++channel) {
      auto *samples = channels[channel] + start;

      if (crossfadeRemaining == 0) {
        for (int i = 0; i < count; ++i)
          samples[i] = active.process(channel, samples[i]);
        continue;
      }

      // Linear crossfade: both voices filter the same input, so their outputs are correlated.
      for (int i = 0; i < count; ++i) {
        const auto remaining = std::max(crossfadeRemaining - i, 0);
        const auto fadeIn = 1.0f - static_cast<float>(remaining) / static_cast<float>(crossfadeLength);
        const auto input = samples[i];
        samples[i] = fadeIn * active.process(channel, input) + (1.0f - fadeIn) * fading.process(channel, input);
      }
    }

    crossfadeRemaining = std::max(crossfadeRemaining - count, 0);
  }
}

void Band::startCrossfadeIfNeeded() noexcept {
  const auto &active = voices[static_cast<std::size_t>(activeVoice)];

  if (crossfadeRemaining > 0 || (active.shape == target.shape && active.enabled == targetEnabled))
    return;

  // The new state starts from the current filter memory when it was running, so shapes that share
  // the same SVF settings (e.g. low cut -> notch) switch without any transient at all.
  auto &next = voices[static_cast<std::size_t>(1 - activeVoice)];
  next.sections = active.sections;
  next.shape = target.shape;
  next.enabled = targetEnabled;

  if (!active.enabled)
    for (auto &section : next.sections)
      section.reset();

  activeVoice = 1 - activeVoice;
  crossfadeRemaining = crossfadeLength;
}

void Band::updateCoefficients(Voice &voice, int rampSamples) noexcept {
  if (!voice.enabled)
    return;

  const BandParameters current{
      .shape = voice.shape, .frequencyHz = frequency.value(), .gainDb = gain.value(), .q = q.value()};
  const auto section = design(current, sampleRate).sections[0];

  for (auto &channelSection : voice.sections)
    channelSection.setSection(section, rampSamples);
}

} // namespace eqit::dsp
