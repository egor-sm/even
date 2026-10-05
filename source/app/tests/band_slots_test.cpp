#include "app/plugin/plugin_processor.h"

#include <catch2/catch_test_macros.hpp>
#include <catch2/matchers/catch_matchers_floating_point.hpp>

using Catch::Matchers::WithinAbs;

using even::PluginProcessor;
using even::dsp::FilterShape;

TEST_CASE("BandSlots: create takes the first free slot with growing serials", "[app][slots]") {
  PluginProcessor processor;
  auto &slots = processor.getBandSlots();

  CHECK(slots.create(FilterShape::bell, 1000.0, 3.0) == 0);
  CHECK(slots.create(FilterShape::highShelf, 8000.0, -2.0) == 1);

  const auto first = slots.read(0);
  CHECK(first.used);
  CHECK(first.shape == FilterShape::bell);
  // Stored as float parameters, read back through their normalised ranges.
  CHECK_THAT(first.frequencyHz, WithinAbs(1000.0, 1e-3));
  CHECK_THAT(first.gainDb, WithinAbs(3.0, 1e-3));
  CHECK(first.serial == 1);
  CHECK(slots.read(1).serial == 2);

  slots.remove(0);
  CHECK_FALSE(slots.read(0).used);
  CHECK(slots.read(0).serial == 0);
  CHECK(slots.create(FilterShape::notch, 500.0, 0.0) == 0);
  CHECK(slots.read(0).serial == 3);
}

TEST_CASE("BandSlots: create fails when every slot is used", "[app][slots]") {
  PluginProcessor processor;
  auto &slots = processor.getBandSlots();

  for (std::size_t i = 0; i < even::model::numBands; ++i)
    REQUIRE(slots.create(FilterShape::bell, 1000.0, 0.0) == i);
  CHECK_FALSE(slots.create(FilterShape::bell, 1000.0, 0.0).has_value());
}

TEST_CASE("BandSlots: a shape change applies the model's adjustments", "[app][slots]") {
  PluginProcessor processor;
  auto &slots = processor.getBandSlots();
  REQUIRE(slots.create(FilterShape::bell, 1000.0, 0.0) == 0);

  slots.setShape(0, FilterShape::lowCut);
  const auto band = slots.read(0);
  CHECK(band.shape == FilterShape::lowCut);
  CHECK_THAT(band.q, WithinAbs(even::model::cutQ, 1e-6));
}

TEST_CASE("BandSlots: serials are saved with the state", "[app][slots]") {
  PluginProcessor source;
  REQUIRE(source.getBandSlots().create(FilterShape::bell, 1000.0, 0.0) == 0);
  REQUIRE(source.getBandSlots().create(FilterShape::bell, 2000.0, 0.0) == 1);
  source.getBandSlots().remove(0);

  juce::MemoryBlock saved;
  source.getStateInformation(saved);

  PluginProcessor loaded;
  loaded.setStateInformation(saved.getData(), static_cast<int>(saved.getSize()));
  CHECK_FALSE(loaded.getBandSlots().read(0).used);
  CHECK(loaded.getBandSlots().read(1).used);
  CHECK(loaded.getBandSlots().read(1).serial == 2);
}
