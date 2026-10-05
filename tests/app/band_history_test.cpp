#include "app/plugin/plugin_processor.h"
#include "support/message_loop.h"

#include <catch2/catch_test_macros.hpp>

using even::PluginProcessor;
using even::dsp::FilterShape;

namespace {

juce::RangedAudioParameter &frequencyOf(PluginProcessor &processor, int band) {
  auto *parameter =
      processor.getState().getParameter(even::parameters::bandId(band, even::parameters::BandField::frequency));
  REQUIRE(parameter != nullptr);
  return *parameter;
}

// A drag in the UI: one gesture around the value changes.
void drag(juce::RangedAudioParameter &parameter, float value) {
  parameter.beginChangeGesture();
  parameter.setValueNotifyingHost(parameter.convertTo0to1(value));
  parameter.endChangeGesture();
}

} // namespace

TEST_CASE("BandHistory: a band command is one step to undo and redo", "[app][history]") {
  PluginProcessor processor;
  auto &history = processor.getBandHistory();
  CHECK_FALSE(history.state().canUndo);

  REQUIRE(processor.getBandSlots().create(FilterShape::bell, 1000.0, 3.0) == 0);

  CHECK(history.undo());
  CHECK_FALSE(processor.getBandSlots().read(0).used);
  CHECK_FALSE(history.state().canUndo);
  CHECK(history.state().canRedo);

  CHECK(history.redo());
  CHECK(processor.getBandSlots().read(0).used);
  CHECK(static_cast<float>(processor.getBandSlots().read(0).frequencyHz) == 1000.0f);
  CHECK_FALSE(history.state().canRedo);
}

TEST_CASE("BandHistory: a drag is undone to the value before it", "[app][history]") {
  PluginProcessor processor;
  REQUIRE(processor.getBandSlots().create(FilterShape::bell, 1000.0, 3.0) == 0);
  even::test::settleMessages();

  drag(frequencyOf(processor, 1), 2500.0f);
  CHECK(processor.getBandHistory().undo());
  CHECK(static_cast<float>(processor.getBandSlots().read(0).frequencyHz) == 1000.0f);
}

TEST_CASE("BandHistory: changes without a gesture become a step before undo", "[app][history]") {
  PluginProcessor processor;
  REQUIRE(processor.getBandSlots().create(FilterShape::bell, 1000.0, 3.0) == 0);
  even::test::settleMessages();
  auto &frequency = frequencyOf(processor, 1);

  // Host automation: no gesture.
  frequency.setValueNotifyingHost(frequency.convertTo0to1(4000.0f));
  CHECK(processor.getBandHistory().undo());
  CHECK(static_cast<float>(processor.getBandSlots().read(0).frequencyHz) == 1000.0f);
}

TEST_CASE("BandHistory: loading a state starts a new history", "[app][history]") {
  PluginProcessor processor;
  REQUIRE(processor.getBandSlots().create(FilterShape::bell, 1000.0, 3.0) == 0);

  juce::MemoryBlock saved;
  processor.getStateInformation(saved);
  processor.setStateInformation(saved.getData(), static_cast<int>(saved.getSize()));

  CHECK_FALSE(processor.getBandHistory().undo());
  CHECK(processor.getBandSlots().read(0).used);
}
