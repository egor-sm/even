import { describe, expect, it } from 'vite-plus/test';

import { bridgeNormalised, bridgeScaled } from './slider-values';

describe('JUCE bridge slider values', () => {
  it('delivers the requested value in parameter units, whatever the C++ mapping', () => {
    const frequency = { start: 20, end: 20000, skew: 1 }; // log range in C++ shows up as skew 1
    for (const hz of [20, 108, 1000, 5000, 20000])
      expect(bridgeScaled(bridgeNormalised(hz, frequency), frequency)).toBeCloseTo(hz, 9);
  });

  it('round-trips with a skewed range too', () => {
    const skewed = { start: 0.1, end: 10, skew: 0.3 };
    for (const value of [0.1, 0.5, 2, 10])
      expect(bridgeScaled(bridgeNormalised(value, skewed), skewed)).toBeCloseTo(value, 9);
  });

  it('is linear in parameter units for skew 1 (not logarithmic)', () => {
    // The bug this guards against: a log-normalised 0.25 sent as-is means ~5 kHz, not ~112 Hz.
    expect(bridgeScaled(0.25, { start: 20, end: 20000, skew: 1 })).toBeCloseTo(5015, 6);
  });
});
