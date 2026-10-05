#pragma once

#include "band_slots.h"
#include "model/edit_history.h"

#include <juce_audio_processors/juce_audio_processors.h>

#include <atomic>

namespace even {

struct HistoryState {
  bool canUndo = false;
  bool canRedo = false;
  bool operator==(const HistoryState &) const = default;
};

// Undo and redo of band edits. A step is recorded when an edit gesture on a band parameter ends:
// a drag in the UI, or a band command (create, delete, shape change), whose several parameter
// gestures are coalesced into one step because recording runs asynchronously on the message
// thread. Host automation brings no gestures and so adds no steps.
class BandHistory final : private juce::AudioProcessorParameter::Listener, private juce::AsyncUpdater {
public:
  BandHistory(juce::AudioProcessorValueTreeState &state, BandSlots &slots);
  ~BandHistory() override;

  BandHistory(const BandHistory &) = delete;
  BandHistory &operator=(const BandHistory &) = delete;
  BandHistory(BandHistory &&) = delete;
  BandHistory &operator=(BandHistory &&) = delete;

  // Message thread. Return whether there was a step to undo or redo.
  bool undo();
  bool redo();

  [[nodiscard]] HistoryState state() const noexcept;

  // After a project (state) was loaded: starts a new history from it. Any thread.
  void stateReplaced();

private:
  void parameterValueChanged(int parameterIndex, float newValue) override;
  void parameterGestureChanged(int parameterIndex, bool gestureIsStarting) override;
  void handleAsyncUpdate() override;

  void apply(const model::Bands &bands);

  juce::Array<juce::AudioProcessorParameter *> parameters;
  BandSlots &slots;
  model::EditHistory history;
  std::atomic<bool> resetPending{false};
};

} // namespace even
