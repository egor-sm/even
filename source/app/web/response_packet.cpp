#include "app/web/response_packet.h"

#include <algorithm>
#include <cstdint>
#include <cstring>

namespace even {

namespace {

constexpr std::uint32_t formatVersion = 5;
constexpr std::uint32_t enabledFlag = 1;

template <typename T>
void appendBytes(std::vector<std::byte> &bytes, const T &value) {
  const auto offset = bytes.size();
  bytes.resize(offset + sizeof(T));
  std::memcpy(bytes.data() + offset, &value, sizeof(T));
}

} // namespace

std::vector<std::byte> serializeResponse(const ResponseState &state) {
  const auto sampleRate = state.drawingSampleRate();

  const auto usedBands = static_cast<std::uint32_t>(
      std::ranges::count_if(state.bands, [](const model::BandSlot &band) { return band.used; }));

  std::vector<std::byte> bytes;
  appendBytes(bytes, formatVersion);
  appendBytes(bytes, usedBands);
  appendBytes(bytes, sampleRate);

  for (std::size_t i = 0; i < state.bands.size(); ++i) {
    const auto &band = state.bands[i];
    if (!band.used)
      continue;

    const auto [parameters, design] = model::designBand(band, sampleRate);

    appendBytes(bytes, static_cast<std::uint32_t>(i + 1));
    appendBytes(bytes, static_cast<std::uint32_t>(parameters.shape));
    appendBytes(bytes, static_cast<std::uint32_t>(design.count));
    appendBytes(bytes, band.enabled ? enabledFlag : std::uint32_t{0});
    appendBytes(bytes, band.serial);
    appendBytes(bytes, static_cast<std::uint32_t>(band.slopeIndex));
    appendBytes(bytes, parameters.frequencyHz);
    appendBytes(bytes, dsp::usesGain(parameters.shape) ? parameters.gainDb : 0.0);
    appendBytes(bytes, parameters.q);

    for (std::size_t s = 0; s < design.count; ++s) {
      const auto &section = design.sections[s];
      appendBytes(bytes, static_cast<std::uint32_t>(section.order));
      appendBytes(bytes, std::uint32_t{0});
      appendBytes(bytes, section.g);
      appendBytes(bytes, section.q);
      appendBytes(bytes, section.lowpassMix);
      appendBytes(bytes, section.bandpassMix);
      appendBytes(bytes, section.highpassMix);
    }
  }

  return bytes;
}

} // namespace even
