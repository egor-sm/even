#include "dsp/spectrum_smoother.h"

#include <algorithm>
#include <cmath>
#include <limits>
#include <numbers>

namespace even::dsp {

namespace {

// The Hann kernel's cumulative area from its left end to x octaves from the centre, normalised to
// 1. The width is matched by area: the kernel averages as much as a box of that width.
double kernelArea(double width, double x) noexcept {
  const auto u = std::clamp(x / width, -1.0, 1.0);
  return (u + 1.0) / 2.0 + std::sin(std::numbers::pi * u) / (2.0 * std::numbers::pi);
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

void SpectrumSmoother::prepare(std::span<const float> pointFrequencies, double binHz, std::size_t numBins,
                               double octaves) {
  points.assign(pointFrequencies.size(), Point{});
  weights.clear();

  const auto lastBin = numBins - 1;

  for (std::size_t i = 0; i < pointFrequencies.size(); ++i) {
    auto &point = points[i];
    const auto frequency = static_cast<double>(pointFrequencies[i]);

    const auto interpolate = [&] {
      const auto position = std::min(frequency / binHz, static_cast<double>(lastBin) - 1e-6);
      point = Point{.kind = Kind::interpolated,
                    .first = static_cast<std::size_t>(position),
                    .fraction = static_cast<float>(position - std::floor(position))};
    };

    // Narrower than a bin: interpolate between the neighbouring bins.
    const auto widthHz = frequency * (std::exp2(octaves / 2.0) - std::exp2(-octaves / 2.0));
    if (widthHz < binHz) {
      interpolate();
      continue;
    }

    // Each bin covers [(k - 1/2) binHz, (k + 1/2) binHz] and weighs the kernel's area over it.
    const auto lowBin = std::floor(frequency * std::exp2(-octaves) / binHz - 0.5);
    const auto highBin = std::ceil(frequency * std::exp2(octaves) / binHz + 0.5);
    const auto first = static_cast<std::size_t>(std::max(0.0, lowBin));
    const auto last = std::min(lastBin, static_cast<std::size_t>(std::max(0.0, highBin)));

    const auto octavesTo = [&](double hz) {
      return hz <= 0.0 ? -std::numeric_limits<double>::infinity() : std::log2(hz / frequency);
    };

    point.offset = weights.size();
    double total = 0.0;
    for (auto k = first; k <= last; ++k) {
      const auto lowEdge = (static_cast<double>(k) - 0.5) * binHz;
      const auto highEdge = (static_cast<double>(k) + 0.5) * binHz;
      const auto weight = kernelArea(octaves, octavesTo(highEdge)) - kernelArea(octaves, octavesTo(lowEdge));
      weights.push_back(static_cast<float>(weight));
      total += weight;
    }

    if (total <= 0.0) {
      weights.resize(point.offset);
      interpolate();
      continue;
    }

    point.first = first;
    point.count = last - first + 1;
    for (auto k = point.offset; k < weights.size(); ++k)
      weights[k] = static_cast<float>(static_cast<double>(weights[k]) / total);
  }
}

void SpectrumSmoother::reduce(std::span<const float> binPower, std::span<float> pointPower) const noexcept {
  const auto lastBin = binPower.size() - 1;

  for (std::size_t i = 0; i < points.size() && i < pointPower.size(); ++i) {
    const auto &point = points[i];

    if (point.kind == Kind::weighted) {
      double power = 0.0;
      for (std::size_t k = 0; k < point.count; ++k)
        power += static_cast<double>(weights[point.offset + k]) * static_cast<double>(binPower[point.first + k]);
      pointPower[i] = static_cast<float>(power);
      continue;
    }

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
  }
}

} // namespace even::dsp
