#pragma once

#include <juce_core/juce_core.h>

#include <atomic>
#include <cstdint>
#include <span>
#include <vector>

namespace even {

// Keeps the most recent samples written by a single producer (the audio thread).
// Readers copy the latest window at any time without blocking the producer.
class SampleHistory {
public:
  explicit SampleHistory(std::size_t capacity) : samples(capacity), mask(capacity - 1) {
    jassert(juce::isPowerOfTwo(capacity));
  }

  // Audio thread: wait-free, no allocations.
  template <typename SampleAt>
  void write(int numSamples, SampleAt sampleAt) noexcept {
    const auto start = writePosition.load(std::memory_order_relaxed);

    for (int i = 0; i < numSamples; ++i)
      samples[(start + static_cast<std::uint64_t>(i)) & mask].store(sampleAt(i), std::memory_order_relaxed);

    writePosition.store(start + static_cast<std::uint64_t>(numSamples), std::memory_order_release);
  }

  // Total number of samples written so far.
  [[nodiscard]] std::uint64_t position() const noexcept { return writePosition.load(std::memory_order_acquire); }

  // Copies the last destination.size() samples (zero-padded before the first write).
  // Returns the total number of samples written at the time of the copy.
  // The capacity must leave enough headroom for the producer not to lap the copy.
  std::uint64_t readLatest(std::span<float> destination) const noexcept {
    const auto end = writePosition.load(std::memory_order_acquire);
    const auto count = destination.size();

    for (std::size_t i = 0; i < count; ++i)
      destination[i] = end + i >= count ? samples[(end + i - count) & mask].load(std::memory_order_relaxed) : 0.0f;

    return end;
  }

private:
  std::vector<std::atomic<float>> samples;
  std::uint64_t mask;
  std::atomic<std::uint64_t> writePosition{0};
};

} // namespace even
