#pragma once

#include "model/band_slot.h"

#include <cstddef>
#include <deque>
#include <optional>

namespace even::model {

// Undo and redo over snapshots of all band slots. The owner commits a snapshot after every
// finished edit; undo() and redo() return the snapshot to apply. Only committed states are
// remembered, so changes made without an edit (host automation) are not undo steps of their own.
class EditHistory {
public:
  static constexpr std::size_t maxUndoSteps = 100;

  // Forgets everything; `current` becomes the only state (e.g. after loading a project).
  void reset(const Bands &current);

  // Records `current` as a new step if it differs from the current state. Clears the redo steps.
  // Returns whether a step was added.
  bool commit(const Bands &current);

  // Replaces the current state without adding a step: after applying a snapshot, the values read
  // back from the parameters may differ in the last bits from the snapshot.
  void replaceCurrent(const Bands &current);

  [[nodiscard]] std::optional<Bands> undo();
  [[nodiscard]] std::optional<Bands> redo();

  [[nodiscard]] bool canUndo() const noexcept;
  [[nodiscard]] bool canRedo() const noexcept;

private:
  std::deque<Bands> states{Bands{}};
  std::size_t position = 0; // index of the current state in `states`
};

} // namespace even::model
