#include "app/web/response_packet.h"

#include <catch2/catch_test_macros.hpp>
#include <catch2/matchers/catch_matchers_floating_point.hpp>

#include <cstdint>
#include <cstring>

using Catch::Matchers::WithinULP;
using even::ResponseState;
using even::dsp::FilterShape;

namespace {

template <typename T>
T readAt(const std::vector<std::byte> &bytes, std::size_t offset) {
  REQUIRE(offset + sizeof(T) <= bytes.size());
  T value{};
  std::memcpy(&value, bytes.data() + offset, sizeof(T));
  return value;
}

constexpr std::size_t headerSize = 16;
constexpr std::size_t bandHeaderSize = 6 * 4 + 3 * 8;
constexpr std::size_t sectionSize = 2 * 4 + 5 * 8;

} // namespace

TEST_CASE("serializeResponse: header and the used bands with their sections", "[app][packet]") {
  ResponseState state{.sampleRate = 44100.0};
  state.bands[2] = {.used = true,
                    .enabled = false,
                    .shape = FilterShape::highCut,
                    .frequencyHz = 5000.0,
                    .gainDb = 6.0,
                    .slopeIndex = 3,
                    .serial = 7};

  const auto bytes = even::serializeResponse(state);
  const auto sections = even::model::designBand(state.bands[2], 44100.0).design.count;
  REQUIRE(bytes.size() == headerSize + bandHeaderSize + sections * sectionSize);

  CHECK(readAt<std::uint32_t>(bytes, 0) == 5); // version
  CHECK(readAt<std::uint32_t>(bytes, 4) == 1); // band count
  CHECK(readAt<double>(bytes, 8) == 44100.0);

  const auto band = headerSize;
  CHECK(readAt<std::uint32_t>(bytes, band) == 3); // 1-based slot
  CHECK(readAt<std::uint32_t>(bytes, band + 4) == static_cast<std::uint32_t>(FilterShape::highCut));
  CHECK(readAt<std::uint32_t>(bytes, band + 8) == sections);
  CHECK(readAt<std::uint32_t>(bytes, band + 12) == 0); // flags: bypassed
  CHECK(readAt<std::uint32_t>(bytes, band + 16) == 7); // serial
  CHECK(readAt<std::uint32_t>(bytes, band + 20) == 3); // slope index
  CHECK(readAt<double>(bytes, band + 24) == 5000.0);
  CHECK(readAt<double>(bytes, band + 32) == 0.0); // cuts have no gain
}

TEST_CASE("serializeResponse: no sample rate yet draws at the fallback rate", "[app][packet]") {
  const auto bytes = even::serializeResponse(ResponseState{});
  CHECK(readAt<std::uint32_t>(bytes, 4) == 0);
  CHECK_THAT(readAt<double>(bytes, 8), WithinULP(ResponseState{}.drawingSampleRate(), 0));
}
