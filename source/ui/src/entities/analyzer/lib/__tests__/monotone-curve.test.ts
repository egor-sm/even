import { describe, expect, it } from 'vite-plus/test';

import { monotoneCurve } from '../monotone-curve';

const pairs = (ys: number[]) => Float32Array.from(ys.flatMap((y, i) => [i * 2, y]));

describe('monotoneCurve', () => {
  it('passes through every point', () => {
    const points = pairs([0, 3, 1, 4, 1, 5]);
    const curve = monotoneCurve(points, 4);

    expect(curve.length).toBe(2 * (5 * 4 + 1));
    for (let i = 0; i < 6; i++) {
      expect(curve[8 * i]).toBeCloseTo(points[2 * i]);
      expect(curve[8 * i + 1]).toBeCloseTo(points[2 * i + 1]);
    }
  });

  it('stays between neighbouring points on noisy data', () => {
    const ys = [0, 10, -5, 7, 7, 2, 20, -3];
    const curve = monotoneCurve(pairs(ys), 8);

    for (let i = 0; i < ys.length - 1; i++) {
      const low = Math.min(ys[i], ys[i + 1]);
      const high = Math.max(ys[i], ys[i + 1]);
      for (let s = 0; s <= 8; s++) {
        const y = curve[2 * (8 * i + s) + 1];
        expect(y).toBeGreaterThanOrEqual(low - 1e-4);
        expect(y).toBeLessThanOrEqual(high + 1e-4);
      }
    }
  });

  it('reuses the output array of the right length', () => {
    const points = pairs([1, 2, 3]);
    const out = new Float32Array(2 * (2 * 3 + 1));
    expect(monotoneCurve(points, 3, out)).toBe(out);
  });

  it('keeps a single point as it is', () => {
    expect(Array.from(monotoneCurve(pairs([4]), 4))).toEqual([0, 4]);
  });
});
