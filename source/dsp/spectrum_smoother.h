#pragma once

#include <cstddef>
#include <cstdint>
#include <span>
#include <vector>

namespace even::dsp {

// Reduces a power spectrum (linearly spaced bins) to power at display frequencies, with
// fractional-octave smoothing: a Hann kernel on a log-frequency axis (half amplitude at ±w/2,
// support ±w), each bin weighed by the kernel's area over it, so the result changes continuously
// with the display frequency. Where the kernel is narrower than a bin (the low end), a monotone
// cubic (Steffen) through the bins' levels in dB. prepare() precomputes the weights of every
// display point (allocates); reduce() only reads them.
class SpectrumSmoother {
public:
  // binHz: bin spacing (sample rate / FFT size). octaves: the smoothing width. Requires numBins >= 2.
  void prepare(std::span<const float> pointFrequencies, double binHz, std::size_t numBins, double octaves);

  // binPower.size() must be the prepared numBins and pointPower.size() the number of points.
  void reduce(std::span<const float> binPower, std::span<float> pointPower) const noexcept;

private:
  enum class Kind : std::uint8_t { weighted, interpolated };

  struct Point {
    Kind kind = Kind::weighted;
    std::size_t first = 0;  // weighted: the first bin; interpolated: the bin below the frequency
    std::size_t count = 0;  // weighted: number of weights
    std::size_t offset = 0; // weighted: index of the first weight in `weights`
    float fraction = 0.0f;  // interpolated: position between `first` and the next bin
  };

  std::vector<Point> points;
  std::vector<float> weights;
};

} // namespace even::dsp
