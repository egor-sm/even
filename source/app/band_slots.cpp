#include "band_slots.h"

#include <utility>

namespace even {

namespace {

constexpr auto slotsType = "slots";
constexpr auto slotType = "slot";
constexpr auto serialProperty = "serial";

juce::RangedAudioParameter &parameter(juce::AudioProcessorValueTreeState &state, int band,
                                      parameters::BandField field) {
  auto *result = state.getParameter(parameters::bandId(band, field));
  jassert(result != nullptr);
  return *result;
}

float valueOf(const juce::RangedAudioParameter *parameter) {
  return parameter->convertFrom0to1(parameter->getValue());
}

// One complete host gesture per change, skipped when the value is already there.
void set(juce::RangedAudioParameter *parameter, float value) {
  const auto normalised = parameter->convertTo0to1(value);
  if (juce::exactlyEqual(parameter->getValue(), normalised))
    return;

  parameter->beginChangeGesture();
  parameter->setValueNotifyingHost(normalised);
  parameter->endChangeGesture();
}

float boolValue(bool value) {
  return value ? 1.0f : 0.0f;
}

} // namespace

BandSlots::BandSlots(juce::AudioProcessorValueTreeState &stateToUse) : state(stateToUse) {
  for (std::size_t i = 0; i < slotParameters.size(); ++i) {
    const auto band = static_cast<int>(i) + 1;
    using enum parameters::BandField;
    slotParameters[i] = {
        .used = &parameter(state, band, used),
        .enabled = &parameter(state, band, enabled),
        .shape = &parameter(state, band, shape),
        .frequency = &parameter(state, band, frequency),
        .gain = &parameter(state, band, gain),
        .q = &parameter(state, band, q),
        .slope = &parameter(state, band, slope),
    };
  }
}

model::BandSlot BandSlots::read(std::size_t slot) const {
  const auto &p = slotParameters.at(slot);
  return {
      .used = valueOf(p.used) >= 0.5f,
      .enabled = valueOf(p.enabled) >= 0.5f,
      .shape = static_cast<dsp::FilterShape>(juce::roundToInt(valueOf(p.shape))),
      .frequencyHz = static_cast<double>(valueOf(p.frequency)),
      .gainDb = static_cast<double>(valueOf(p.gain)),
      .q = static_cast<double>(valueOf(p.q)),
      .slopeIndex = juce::roundToInt(valueOf(p.slope)),
      .serial = serial(slot),
  };
}

model::Bands BandSlots::readAll() const {
  model::Bands result;
  for (std::size_t i = 0; i < result.size(); ++i)
    result[i] = read(i);
  return result;
}

void BandSlots::write(std::size_t slot, const model::BandSlot &band) {
  const auto &p = slotParameters.at(slot);
  set(p.shape, static_cast<float>(band.shape));
  set(p.frequency, static_cast<float>(band.frequencyHz));
  set(p.gain, static_cast<float>(band.gainDb));
  set(p.q, static_cast<float>(band.q));
  set(p.slope, static_cast<float>(band.slopeIndex));
  set(p.enabled, boolValue(band.enabled));
  // Last, so the band appears (or disappears) with its final settings.
  set(p.used, boolValue(band.used));

  slotTree(slot).setProperty(serialProperty, static_cast<juce::int64>(band.serial), nullptr);
}

std::optional<std::size_t> BandSlots::create(dsp::FilterShape shape, double frequencyHz, double gainDb) {
  const auto bands = readAll();
  const auto slot = model::firstFreeSlot(bands);
  if (slot)
    write(*slot, model::newBand(shape, frequencyHz, gainDb, model::nextSerial(bands)));
  return slot;
}

void BandSlots::remove(std::size_t slot) {
  auto band = read(slot);
  band.used = false;
  band.serial = 0;
  write(slot, band);
}

void BandSlots::setShape(std::size_t slot, dsp::FilterShape shape) {
  write(slot, model::withShape(read(slot), shape));
}

juce::ValueTree BandSlots::slotTree(std::size_t slot) {
  // Looked up every time: loading a state replaces the whole tree.
  auto slots = state.state.getOrCreateChildWithName(slotsType, nullptr);
  while (std::cmp_less_equal(slots.getNumChildren(), slot))
    slots.appendChild(juce::ValueTree{slotType}, nullptr);
  return slots.getChild(static_cast<int>(slot));
}

std::uint32_t BandSlots::serial(std::size_t slot) const {
  // A missing node (a state saved without serials) reads as an invalid tree: serial 0.
  const auto tree = state.state.getChildWithName(slotsType).getChild(static_cast<int>(slot));
  return static_cast<std::uint32_t>(static_cast<juce::int64>(tree.getProperty(serialProperty, 0)));
}

} // namespace even
