#pragma once

#include <cstddef>
#include <cstdint>
#include <span>
#include <vector>

namespace even::dsp {

// Shape of the frequency smoothing kernel on a log-frequency axis. Every shape but roundedBox
// weighs each bin by the kernel's area over the bin, so the result changes continuously with the
// display frequency. Widths are matched by area: each kernel averages as much as a box of the
// nominal width.
enum class SmoothingKernel : std::uint8_t {
  roundedBox, // a box of the nominal width with its edges rounded to whole bins (the original analyzer)
  box,        // the same box, edge bins weighed by their overlap
  triangle,   // support ±w
  hann,       // half amplitude at ±w/2, support ±w
  gaussian,   // FWHM w (sigma ≈ 0.425 w), truncated at ±3 sigma
};

// How the smoothing width changes with frequency.
enum class SmoothingWidth : std::uint8_t {
  constant,       // the nominal width everywhere
  psychoacoustic, // at least 1/3 octave up to 100 Hz, narrowing to the nominal width at 1 kHz (REW "Psy")
  erb,            // one equivalent rectangular bandwidth (Glasberg & Moore); ignores the nominal width
};

// What happens where the kernel is narrower than a bin, i.e. at the low end.
enum class LowEnd : std::uint8_t {
  linearPower, // power interpolated linearly between the neighbouring bins (the original analyzer)
  monotoneDb,  // a monotone cubic (Steffen) through the bins' levels in dB
  minimumWidth // the kernel widened to at least minimumBins of the window's resolution, never interpolated
};

struct SmoothingOptions {
  SmoothingKernel kernel = SmoothingKernel::roundedBox;
  SmoothingWidth width = SmoothingWidth::constant;
  double octaves = 1.0 / 6.0; // the nominal width
  LowEnd lowEnd = LowEnd::linearPower;
  double minimumBins = 2.0;
};

// Reduces a power spectrum (linearly spaced bins) to power at display frequencies, with
// fractional-octave smoothing. prepare() precomputes the weights of every display point
// (allocates); reduce() only reads them.
class SpectrumSmoother {
public:
  // binHz: bin spacing (sample rate / FFT size). resolutionHz: sample rate / window length, the
  // unit of minimumBins (wider than binHz when the FFT is zero-padded). Requires numBins >= 2.
  void prepare(std::span<const float> pointFrequencies, double binHz, std::size_t numBins, double resolutionHz,
               const SmoothingOptions &options);

  // binPower.size() must be the prepared numBins and pointPower.size() the number of points.
  void reduce(std::span<const float> binPower, std::span<float> pointPower) const noexcept;

  // The smoothing width in octaves at a frequency (before any widening at the low end).
  [[nodiscard]] static double octavesAt(double frequency, const SmoothingOptions &options) noexcept;

private:
  enum class Kind : std::uint8_t { weighted, linear, monotone };

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
