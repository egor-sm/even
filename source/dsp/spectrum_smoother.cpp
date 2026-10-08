#include "dsp/spectrum_smoother.h"

#include <algorithm>
#include <cmath>
#include <limits>
#include <numbers>

namespace even::dsp {

namespace {

// Full width at half maximum of a Gaussian in sigmas: 2 sqrt(2 ln 2).
constexpr double gaussianFwhm = 2.3548200450309493;
constexpr double gaussianTruncation = 3.0; // in sigmas

// Width in octaves of a band of bandwidthHz centred (geometrically) on frequency.
double octavesForBandwidth(double bandwidthHz, double frequency) noexcept {
  return 2.0 * std::asinh(bandwidthHz / (2.0 * frequency)) / std::numbers::ln2;
}

// Half of the kernel's support in octaves.
double supportOctaves(SmoothingKernel kernel, double width) noexcept {
  switch (kernel) {
  case SmoothingKernel::roundedBox:
  case SmoothingKernel::box:
    return width / 2.0;
  case SmoothingKernel::triangle:
  case SmoothingKernel::hann:
    return width;
  case SmoothingKernel::gaussian:
    return gaussianTruncation * width / gaussianFwhm;
  }
  return width;
}

// The kernel's cumulative area from its left end to x octaves from the centre, normalised to 1.
double kernelArea(SmoothingKernel kernel, double width, double x) noexcept {
  switch (kernel) {
  case SmoothingKernel::roundedBox:
  case SmoothingKernel::box:
    return std::clamp((x + width / 2.0) / width, 0.0, 1.0);
  case SmoothingKernel::triangle: {
    const auto u = std::clamp(x / width, -1.0, 1.0);
    return u < 0.0 ? (1.0 + u) * (1.0 + u) / 2.0 : 1.0 - (1.0 - u) * (1.0 - u) / 2.0;
  }
  case SmoothingKernel::hann: {
    const auto u = std::clamp(x / width, -1.0, 1.0);
    return (u + 1.0) / 2.0 + std::sin(std::numbers::pi * u) / (2.0 * std::numbers::pi);
  }
  case SmoothingKernel::gaussian: {
    const auto sigma = width / gaussianFwhm;
    const auto edge = std::erf(gaussianTruncation / std::numbers::sqrt2);
    const auto clamped = std::clamp(x, -gaussianTruncation * sigma, gaussianTruncation * sigma);
    return (std::erf(clamped / (sigma * std::numbers::sqrt2)) + edge) / (2.0 * edge);
  }
  }
  return 0.0;
}

// Steffen's slope at a point between secants a (left) and b (right) on a uniform grid: never
// overshoots, so the curve stays monotone between the points.
double steffenSlope(double a, double b) noexcept {
  if (a * b <= 0.0)
    return 0.0;
  const auto sign = a > 0.0 ? 1.0 : -1.0;
  return 2.0 * sign * std::min({std::abs(a), std::abs(b), 0.25 * std::abs(a + b)});
}

double toDb(float power) noexcept {
  return 10.0 * std::log10(static_cast<double>(power) + 1e-20);
}

} // namespace

double SpectrumSmoother::octavesAt(double frequency, const SmoothingOptions &options) noexcept {
  switch (options.width) {
  case SmoothingWidth::constant:
    return options.octaves;
  case SmoothingWidth::psychoacoustic: {
    const auto wide = std::max(1.0 / 3.0, options.octaves);
    const auto t = std::clamp(std::log10(frequency / 100.0), 0.0, 1.0);
    return wide + (options.octaves - wide) * t;
  }
  case SmoothingWidth::erb:
    return octavesForBandwidth(24.673 + 0.107939 * frequency, frequency);
  }
  return options.octaves;
}

void SpectrumSmoother::prepare(std::span<const float> pointFrequencies, double binHz, std::size_t numBins,
                               double resolutionHz, const SmoothingOptions &options) {
  points.assign(pointFrequencies.size(), Point{});
  weights.clear();

  const auto lastBin = numBins - 1;

  for (std::size_t i = 0; i < pointFrequencies.size(); ++i) {
    auto &point = points[i];
    const auto frequency = static_cast<double>(pointFrequencies[i]);
    auto width = octavesAt(frequency, options);

    if (options.lowEnd == LowEnd::minimumWidth)
      width = std::max(width, octavesForBandwidth(options.minimumBins * resolutionHz, frequency));

    // Narrower than a bin: interpolate between the neighbouring bins.
    const auto widthHz = frequency * (std::exp2(width / 2.0) - std::exp2(-width / 2.0));
    if (options.lowEnd != LowEnd::minimumWidth && widthHz < binHz) {
      const auto position = std::min(frequency / binHz, static_cast<double>(lastBin) - 1e-6);
      point.kind = options.lowEnd == LowEnd::monotoneDb ? Kind::monotone : Kind::linear;
      point.first = static_cast<std::size_t>(position);
      point.fraction = static_cast<float>(position - static_cast<double>(point.first));
      continue;
    }

    point.kind = Kind::weighted;
    point.offset = weights.size();

    if (options.kernel == SmoothingKernel::roundedBox) {
      const auto low = frequency * std::exp2(-width / 2.0) / binHz;
      const auto high = frequency * std::exp2(width / 2.0) / binHz;
      const auto first = static_cast<std::size_t>(std::max(0.0, std::round(low)));
      const auto last = std::min(lastBin, static_cast<std::size_t>(std::round(high)));
      point.first = std::min(first, last);
      point.count = last - point.first + 1;
      weights.insert(weights.end(), point.count, 1.0f / static_cast<float>(point.count));
      continue;
    }

    // Each bin covers [(k - 1/2) binHz, (k + 1/2) binHz] and weighs the kernel's area over it.
    const auto support = supportOctaves(options.kernel, width);
    const auto lowBin = std::floor(frequency * std::exp2(-support) / binHz - 0.5);
    const auto highBin = std::ceil(frequency * std::exp2(support) / binHz + 0.5);
    const auto first = static_cast<std::size_t>(std::max(0.0, lowBin));
    const auto last = std::min(lastBin, static_cast<std::size_t>(std::max(0.0, highBin)));

    const auto octavesTo = [&](double hz) {
      return hz <= 0.0 ? -std::numeric_limits<double>::infinity() : std::log2(hz / frequency);
    };

    double total = 0.0;
    for (auto k = first; k <= last; ++k) {
      const auto lowEdge = (static_cast<double>(k) - 0.5) * binHz;
      const auto highEdge = (static_cast<double>(k) + 0.5) * binHz;
      const auto weight = kernelArea(options.kernel, width, octavesTo(highEdge)) -
                          kernelArea(options.kernel, width, octavesTo(lowEdge));
      weights.push_back(static_cast<float>(weight));
      total += weight;
    }

    point.first = first;
    point.count = last - first + 1;

    if (total <= 0.0) {
      weights.resize(point.offset);
      const auto position = std::min(frequency / binHz, static_cast<double>(lastBin) - 1e-6);
      point = Point{.kind = Kind::linear,
                    .first = static_cast<std::size_t>(position),
                    .fraction = static_cast<float>(position - std::floor(position))};
      continue;
    }

    for (auto k = point.offset; k < weights.size(); ++k)
      weights[k] = static_cast<float>(static_cast<double>(weights[k]) / total);
  }
}

void SpectrumSmoother::reduce(std::span<const float> binPower, std::span<float> pointPower) const noexcept {
  const auto lastBin = binPower.size() - 1;

  for (std::size_t i = 0; i < points.size() && i < pointPower.size(); ++i) {
    const auto &point = points[i];

    switch (point.kind) {
    case Kind::weighted: {
      double power = 0.0;
      for (std::size_t k = 0; k < point.count; ++k)
        power += static_cast<double>(weights[point.offset + k]) * static_cast<double>(binPower[point.first + k]);
      pointPower[i] = static_cast<float>(power);
      break;
    }
    case Kind::linear: {
      const auto lower = binPower[point.first];
      const auto upper = binPower[point.first + 1];
      pointPower[i] = lower + (upper - lower) * point.fraction;
      break;
    }
    case Kind::monotone: {
      // Cubic Hermite in dB between bins k and k + 1 with Steffen's slopes.
      const auto k = point.first;
      const auto y0 = toDb(binPower[k == 0 ? 0 : k - 1]);
      const auto y1 = toDb(binPower[k]);
      const auto y2 = toDb(binPower[k + 1]);
      const auto y3 = toDb(binPower[std::min(k + 2, lastBin)]);
      const auto m1 = steffenSlope(y1 - y0, y2 - y1);
      const auto m2 = steffenSlope(y2 - y1, y3 - y2);
      const auto t = static_cast<double>(point.fraction);
      const auto t2 = t * t;
      const auto t3 = t2 * t;
      const auto db = (2 * t3 - 3 * t2 + 1) * y1 + (t3 - 2 * t2 + t) * m1 + (-2 * t3 + 3 * t2) * y2 + (t3 - t2) * m2;
      pointPower[i] = static_cast<float>(std::pow(10.0, db / 10.0));
      break;
    }
    }
  }
}

} // namespace even::dsp
