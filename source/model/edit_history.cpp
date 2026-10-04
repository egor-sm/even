#include "model/edit_history.h"

#include <iterator>

namespace even::model {

void EditHistory::reset(const Bands &current) {
  states.assign(1, current);
  position = 0;
}

bool EditHistory::commit(const Bands &current) {
  if (isSameBands(states[position], current))
    return false;

  states.erase(std::next(states.begin(), static_cast<std::ptrdiff_t>(position) + 1), states.end());
  states.push_back(current);

  if (states.size() > maxUndoSteps + 1)
    states.pop_front();

  position = states.size() - 1;
  return true;
}

void EditHistory::replaceCurrent(const Bands &current) {
  states[position] = current;
}

std::optional<Bands> EditHistory::undo() {
  if (!canUndo())
    return std::nullopt;
  return states[--position];
}

std::optional<Bands> EditHistory::redo() {
  if (!canRedo())
    return std::nullopt;
  return states[++position];
}

bool EditHistory::canUndo() const noexcept {
  return position > 0;
}

bool EditHistory::canRedo() const noexcept {
  return position + 1 < states.size();
}

} // namespace even::model
