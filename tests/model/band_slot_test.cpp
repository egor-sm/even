#include "model/band_slot.h"

#include <catch2/catch_test_macros.hpp>

#include <cmath>

using even::dsp::FilterShape;
using even::model::Bands;
using even::model::BandSlot;

TEST_CASE("firstFreeSlot: the lowest unused slot, none when all are used", "[model][slots]") {
  Bands bands{};
  CHECK(even::model::firstFreeSlot(bands) == 0);

  bands[0].used = true;
  bands[2].used = true;
  CHECK(even::model::firstFreeSlot(bands) == 1);

  for (auto &band : bands)
    band.used = true;
  CHECK_FALSE(even::model::firstFreeSlot(bands).has_value());
}

TEST_CASE("nextSerial: one past the newest used band, free slots do not count", "[model][slots]") {
  Bands bands{};
  CHECK(even::model::nextSerial(bands) == 1);

  bands[5] = {.used = true, .serial = 3};
  bands[1] = {.used = true, .serial = 7};
  bands[2] = {.used = false, .serial = 9};
  CHECK(even::model::nextSerial(bands) == 8);
}

TEST_CASE("newBand: Butterworth q for cuts, no gain for shapes without gain", "[model][slots]") {
  const auto bell = even::model::newBand(FilterShape::bell, 440.0, -3.0, 4);
  CHECK(bell.used);
  CHECK(bell.enabled);
  CHECK(bell.serial == 4);
  CHECK(bell.gainDb == -3.0);
  CHECK(bell.q == even::model::newBandQ);

  const auto cut = even::model::newBand(FilterShape::lowCut, 80.0, 5.0, 1);
  CHECK(cut.gainDb == 0.0);
  CHECK(cut.q == even::model::cutQ);
}

TEST_CASE("withShape: switching to a cut resets q to Butterworth", "[model][slots]") {
  const BandSlot bell{.used = true, .shape = FilterShape::bell, .gainDb = 6.0, .q = 5.2};

  const auto cut = even::model::withShape(bell, FilterShape::highCut);
  CHECK(cut.shape == FilterShape::highCut);
  CHECK(cut.q == even::model::cutQ);

  // Between cuts the q stays: it is the user's resonance.
  const BandSlot resonant{.used = true, .shape = FilterShape::lowCut, .q = 3.0};
  CHECK(even::model::withShape(resonant, FilterShape::highCut).q == 3.0);
}

TEST_CASE("withShape: a shape with gain gets a visible gain when there was none", "[model][slots]") {
  const BandSlot notch{.used = true, .shape = FilterShape::notch, .gainDb = -9.0, .q = 4.0};
  CHECK(even::model::withShape(notch, FilterShape::bell).gainDb == even::model::shapeChangeGainDb);

  const BandSlot flatBell{.used = true, .shape = FilterShape::bell, .gainDb = 0.01};
  CHECK(even::model::withShape(flatBell, FilterShape::highShelf).gainDb == even::model::shapeChangeGainDb);

  // A gain the user set is kept.
  const BandSlot bell{.used = true, .shape = FilterShape::bell, .gainDb = -7.5, .q = 2.0};
  const auto shelf = even::model::withShape(bell, FilterShape::lowShelf);
  CHECK(shelf.gainDb == -7.5);
  CHECK(shelf.q == 2.0);
}

TEST_CASE("isSameBands: any change counts, however small", "[model][slots]") {
  const Bands bands{};
  auto changed = bands;
  CHECK(even::model::isSameBands(bands, changed));

  changed[3].frequencyHz = std::nextafter(changed[3].frequencyHz, 2000.0);
  CHECK_FALSE(even::model::isSameBands(bands, changed));
}
