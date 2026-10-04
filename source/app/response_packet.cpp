#include "response_packet.h"

#include "dsp/band_design.h"

#include <algorithm>
#include <bit>
#include <cstdint>
#include <cstring>

namespace even {

namespace {

constexpr std::uint32_t formatVersion = 3;

bool sameBits(double a, double b) noexcept {
  return std::bit_cast<std::uint64_t>(a) == std::bit_cast<std::uint64_t>(b);
}

template <typename T>
void appendBytes(std::vector<std::byte> &bytes, const T &value) {
  const auto offset = bytes.size();
  bytes.resize(offset + sizeof(T));
  std::memcpy(bytes.data() + offset, &value, sizeof(T));
}

} // namespace

bool isSameResponse(const ResponseState &a, const ResponseState &b) noexcept {
  return sameBits(a.sampleRate, b.sampleRate) &&
         std::ranges::equal(a.bands, b.bands, [](const BandState &x, const BandState &y) {
           const auto &p = x.parameters;
           const auto &q = y.parameters;
           return x.enabled == y.enabled && p.shape == q.shape && sameBits(p.frequencyHz, q.frequencyHz) &&
                  sameBits(p.gainDb, q.gainDb) && sameBits(p.q, q.q) && p.slopeDbPerOctave == q.slopeDbPerOctave;
         });
}

std::vector<std::byte> serializeResponse(const ResponseState &state) {
  // Before the host prepares the processor there is no sample rate yet; any typical one draws fine.
  const auto sampleRate = state.sampleRate > 0.0 ? state.sampleRate : 48000.0;

  const auto enabledBands = static_cast<std::uint32_t>(
      std::ranges::count_if(state.bands, [](const BandState &band) { return band.enabled; }));

  std::vector<std::byte> bytes;
  appendBytes(bytes, formatVersion);
  appendBytes(bytes, enabledBands);
  appendBytes(bytes, sampleRate);

  for (std::size_t i = 0; i < state.bands.size(); ++i) {
    const auto &[enabled, rawParameters] = state.bands[i];
    if (!enabled)
      continue;

    const auto parameters = dsp::sanitize(rawParameters, sampleRate);
    const auto design = dsp::design(parameters, sampleRate);

    appendBytes(bytes, static_cast<std::uint32_t>(i + 1));
    appendBytes(bytes, static_cast<std::uint32_t>(parameters.shape));
    appendBytes(bytes, static_cast<std::uint32_t>(design.count));
    appendBytes(bytes, std::uint32_t{0});
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
