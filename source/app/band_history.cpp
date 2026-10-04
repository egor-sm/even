#include "band_history.h"

#include "parameters.h"

namespace even {

BandHistory::BandHistory(juce::AudioProcessorValueTreeState &state, BandSlots &slotsToUse) : slots(slotsToUse) {
  for (int band = 1; band <= parameters::numBands; ++band)
    for (const auto field : {parameters::BandField::used, parameters::BandField::enabled, parameters::BandField::shape,
                             parameters::BandField::frequency, parameters::BandField::gain, parameters::BandField::q,
                             parameters::BandField::slope}) {
      auto *parameter = state.getParameter(parameters::bandId(band, field));
      jassert(parameter != nullptr);
      parameter->addListener(this);
      parameters.add(parameter);
    }

  history.reset(slots.readAll());
}

BandHistory::~BandHistory() {
  cancelPendingUpdate();
  for (auto *parameter : parameters)
    parameter->removeListener(this);
}

bool BandHistory::undo() {
  // Edits whose recording is still pending (or changes made without a gesture) become a step
  // first, so undo goes back to the state before them.
  handleUpdateNowIfNeeded();
  history.commit(slots.readAll());

  const auto previous = history.undo();
  if (previous)
    apply(*previous);
  return previous.has_value();
}

bool BandHistory::redo() {
  handleUpdateNowIfNeeded();

  const auto next = history.redo();
  if (next)
    apply(*next);
  return next.has_value();
}

bool BandHistory::canUndo() const noexcept {
  return history.canUndo();
}

bool BandHistory::canRedo() const noexcept {
  return history.canRedo();
}

void BandHistory::stateReplaced() {
  resetPending.store(true);
  triggerAsyncUpdate();
}

void BandHistory::parameterValueChanged(int /*parameterIndex*/, float /*newValue*/) {}

void BandHistory::parameterGestureChanged(int /*parameterIndex*/, bool gestureIsStarting) {
  if (!gestureIsStarting)
    triggerAsyncUpdate();
}

void BandHistory::handleAsyncUpdate() {
  if (resetPending.exchange(false))
    history.reset(slots.readAll());
  else
    history.commit(slots.readAll());
}

void BandHistory::apply(const model::Bands &bands) {
  for (std::size_t i = 0; i < bands.size(); ++i)
    slots.write(i, bands[i]);

  // Writing the snapshot ends gestures, which would record it as a new step: settle that now, and
  // take the values as read back (they may differ in the last bits) as the current state.
  cancelPendingUpdate();
  history.replaceCurrent(slots.readAll());
}

} // namespace even
