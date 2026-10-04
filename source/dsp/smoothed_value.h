#pragma once

#include <cmath>
#include <cstdint>

namespace even::dsp {

// Exponential (one-pole) smoothing of a control value towards a target, advanced in steps of
// several samples. On each step the value covers the same fraction of the remaining distance,
// which keeps continuous changes (a dragged control) smooth.
//
// Logarithmic scale smooths in the log domain: frequency and q move by equal ratios per unit of
// time, so 100 -> 200 Hz takes as long as 1000 -> 2000 Hz.
class SmoothedValue {
public:
  enum class Scale : std::uint8_t { linear, logarithmic };

  // settleMs: time to cover 99% of a jump. Requires sampleRate > 0, settleMs > 0.
  void prepare(double sampleRate, double settleMs, Scale newScale) noexcept {
    scale = newScale;
    samplesPerTimeConstant = settleMs / 1000.0 * sampleRate / std::log(100.0);
  }

  // Jumps straight to the value (no smoothing).
  void setCurrentAndTarget(double value) noexcept { current = target = toDomain(value); }

  void setTarget(double value) noexcept { target = toDomain(value); }

  // Advances by numSamples and returns the new current value.
  double advance(int numSamples) noexcept {
    if (isSmoothing()) {
      current += (target - current) * (1.0 - std::exp(-numSamples / samplesPerTimeConstant));

      if (!isSmoothing())
        current = target; // land exactly
    }

    return value();
  }

  [[nodiscard]] double value() const noexcept { return fromDomain(current); }
  [[nodiscard]] bool isSmoothing() const noexcept { return std::abs(target - current) > settledThreshold; }

private:
  [[nodiscard]] double toDomain(double value) const noexcept {
    return scale == Scale::logarithmic ? std::log(value) : value;
  }

  [[nodiscard]] double fromDomain(double value) const noexcept {
    return scale == Scale::logarithmic ? std::exp(value) : value;
  }

  // Below this distance (in the smoothing domain) the value counts as settled.
  static constexpr double settledThreshold = 1e-9;

  Scale scale = Scale::linear;
  double samplesPerTimeConstant = 1.0;
  double current = 0.0; // in the smoothing domain (log for logarithmic scale)
  double target = 0.0;
};

} // namespace even::dsp
