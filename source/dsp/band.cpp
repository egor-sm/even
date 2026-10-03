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
    voice.slopeDbPerOctave = target.slopeDbPerOctave;
    voice.enabled = targetEnabled;
    for (auto &cascade : voice.sections)
      for (auto &section : cascade)
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

    // A switched-off band that is not fading costs nothing beyond the smoothing above.
    if (!active.enabled && crossfadeRemaining == 0)
      continue;

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

  if (crossfadeRemaining > 0 || active.hasStructureOf(target, targetEnabled))
    return;

  // The new structure starts from the current filter memory when it has the same layout of
  // sections, so shapes that share SVF settings (e.g. low cut -> notch at 12 dB/oct) switch without
  // any transient at all. A different layout (slope change) or a band switched on starts clean.
  auto &next = voices[static_cast<std::size_t>(1 - activeVoice)];
  next.sections = active.sections;
  next.shape = target.shape;
  next.slopeDbPerOctave = target.slopeDbPerOctave;
  next.enabled = targetEnabled;

  const auto sameLayout = active.enabled && design(currentParameters(next), sampleRate).count == active.sectionCount;
  if (!sameLayout)
    for (auto &cascade : next.sections)
      for (auto &section : cascade)
        section.reset();

  activeVoice = 1 - activeVoice;
  crossfadeRemaining = crossfadeLength;
}

BandParameters Band::currentParameters(const Voice &voice) const noexcept {
  return {.shape = voice.shape,
          .frequencyHz = frequency.value(),
          .gainDb = gain.value(),
          .q = q.value(),
          .slopeDbPerOctave = voice.slopeDbPerOctave};
}

void Band::updateCoefficients(Voice &voice, int rampSamples) noexcept {
  if (!voice.enabled)
    return;

  const auto designed = design(currentParameters(voice), sampleRate);
  voice.sectionCount = designed.count;

  for (auto &cascade : voice.sections)
    for (std::size_t i = 0; i < designed.count; ++i)
      cascade[i].setSection(designed.sections[i], rampSamples);
}

} // namespace eqit::dsp
