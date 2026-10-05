#include "model/edit_history.h"

#include <catch2/catch_test_macros.hpp>

#include <cstddef>
#include <optional>

using even::model::Bands;
using even::model::EditHistory;

namespace {

// Distinct states: band 1 at a different frequency each.
Bands state(double frequencyHz) {
  Bands bands{};
  bands[0] = {.used = true, .frequencyHz = frequencyHz};
  return bands;
}

double frequencyOf(const Bands &bands) {
  return bands[0].frequencyHz;
}

// The frequency of an undo or redo result; -1 when there was no step.
double frequencyOf(const std::optional<Bands> &bands) {
  return bands ? frequencyOf(*bands) : -1.0;
}

} // namespace

TEST_CASE("EditHistory: undo and redo walk through the committed states", "[model][history]") {
  EditHistory history;
  history.reset(state(100.0));
  CHECK_FALSE(history.canUndo());
  CHECK_FALSE(history.canRedo());

  CHECK(history.commit(state(200.0)));
  CHECK(history.commit(state(300.0)));

  CHECK(frequencyOf(history.undo()) == 200.0);
  CHECK(frequencyOf(history.undo()) == 100.0);
  CHECK_FALSE(history.undo().has_value());

  CHECK(frequencyOf(history.redo()) == 200.0);
  CHECK(frequencyOf(history.redo()) == 300.0);
  CHECK_FALSE(history.redo().has_value());
}

TEST_CASE("EditHistory: an unchanged state is not a step", "[model][history]") {
  EditHistory history;
  history.reset(state(100.0));

  CHECK_FALSE(history.commit(state(100.0)));
  CHECK_FALSE(history.canUndo());
}

TEST_CASE("EditHistory: a new edit after undo drops the redo steps", "[model][history]") {
  EditHistory history;
  history.reset(state(100.0));
  history.commit(state(200.0));
  history.commit(state(300.0));

  (void)history.undo();
  CHECK(history.canRedo());

  history.commit(state(250.0));
  CHECK_FALSE(history.canRedo());
  CHECK(frequencyOf(history.undo()) == 200.0);
}

TEST_CASE("EditHistory: replaceCurrent keeps the steps around it", "[model][history]") {
  EditHistory history;
  history.reset(state(100.0));
  history.commit(state(200.0));
  history.commit(state(300.0));
  (void)history.undo();

  // The values read back after applying the undo differ slightly: still the same step.
  history.replaceCurrent(state(200.001));
  CHECK_FALSE(history.commit(state(200.001)));
  CHECK(history.canRedo());
  CHECK(frequencyOf(history.undo()) == 100.0);
}

TEST_CASE("EditHistory: keeps at most maxUndoSteps steps, dropping the oldest", "[model][history]") {
  EditHistory history;
  history.reset(state(0.0));
  for (std::size_t i = 1; i <= EditHistory::maxUndoSteps + 10; ++i)
    history.commit(state(static_cast<double>(i)));

  std::size_t undoSteps = 0;
  auto oldest = 0.0;
  while (const auto previous = history.undo()) {
    ++undoSteps;
    oldest = frequencyOf(*previous);
  }

  CHECK(undoSteps == EditHistory::maxUndoSteps);
  CHECK(oldest == 10.0);
}

TEST_CASE("EditHistory: reset forgets every step", "[model][history]") {
  EditHistory history;
  history.reset(state(100.0));
  history.commit(state(200.0));

  history.reset(state(500.0));
  CHECK_FALSE(history.canUndo());
  CHECK_FALSE(history.canRedo());
}
