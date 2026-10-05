#include "app/state/response_state.h"

#include <bit>
#include <cstdint>

namespace even {

bool isSameResponse(const ResponseState &a, const ResponseState &b) noexcept {
  return std::bit_cast<std::uint64_t>(a.sampleRate) == std::bit_cast<std::uint64_t>(b.sampleRate) &&
         model::isSameBands(a.bands, b.bands);
}

} // namespace even
