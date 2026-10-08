const sign = (value: number): number => (value > 0 ? 1 : value < 0 ? -1 : 0);

/**
 * Resamples a polyline (x, y pairs with increasing x) along a monotone cubic through its points,
 * with `subdivisions` segments between neighbours. Steffen's slopes (as d3.curveMonotoneX) never
 * overshoot: between two points the curve stays within their values, so noise does not ring.
 * Writes into `out` when it has the right length; returns the result.
 */
export const monotoneCurve = (
  points: Float32Array,
  subdivisions: number,
  out?: Float32Array<ArrayBuffer>,
): Float32Array<ArrayBuffer> => {
  const count = points.length / 2;
  const length = count < 2 ? points.length : 2 * ((count - 1) * subdivisions + 1);
  const result = out?.length === length ? out : new Float32Array(length);
  if (count < 2) {
    result.set(points);
    return result;
  }

  const x = (i: number) => points[2 * i];
  const y = (i: number) => points[2 * i + 1];
  const secant = (i: number) => (y(i + 1) - y(i)) / (x(i + 1) - x(i) || 1);

  // Slope at each point: one-sided at the ends, Steffen's in between.
  const slope = (i: number): number => {
    if (i === 0) return secant(0);
    if (i === count - 1) return secant(count - 2);
    const left = secant(i - 1);
    const right = secant(i);
    const hLeft = x(i) - x(i - 1);
    const hRight = x(i + 1) - x(i);
    const parabola = (left * hRight + right * hLeft) / (hLeft + hRight || 1);
    return (sign(left) + sign(right)) * Math.min(Math.abs(left), Math.abs(right), 0.5 * Math.abs(parabola));
  };

  let mStart = slope(0);
  let o = 0;
  for (let i = 0; i < count - 1; i++) {
    const mEnd = slope(i + 1);
    const h = x(i + 1) - x(i);
    const y0 = y(i);
    const y1 = y(i + 1);
    for (let s = 0; s < subdivisions; s++) {
      const t = s / subdivisions;
      const t2 = t * t;
      const t3 = t2 * t;
      result[o++] = x(i) + t * h;
      result[o++] =
        (2 * t3 - 3 * t2 + 1) * y0 + (t3 - 2 * t2 + t) * h * mStart + (-2 * t3 + 3 * t2) * y1 + (t3 - t2) * h * mEnd;
    }
    mStart = mEnd;
  }
  result[o++] = x(count - 1);
  result[o] = y(count - 1);
  return result;
};
