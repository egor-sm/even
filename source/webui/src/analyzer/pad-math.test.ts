import { describe, expect, it } from 'vite-plus/test';

import { linearToNormalised, logarithmicFromNormalised, logarithmicToNormalised } from '../juce/parameter-scales';
import { findNode, pointToValue, valueToPoint } from './pad-math';
import { defaultRange, SpectrumScale } from './scale';

const scale = new SpectrumScale(defaultRange, 1000, 480);

describe('pad coordinates', () => {
  it('maps the graph corners to the range ends', () => {
    expect(pointToValue(scale, { x: 0, y: 0 })).toEqual({ frequencyHz: 20, gainDb: 24 });
    const bottomRight = pointToValue(scale, { x: 1000, y: 480 });
    expect(bottomRight.frequencyHz).toBeCloseTo(20000, 6);
    expect(bottomRight.gainDb).toBeCloseTo(-24, 9);
  });

  it('puts 0 dB in the middle and frequencies on a log scale', () => {
    const middle = pointToValue(scale, { x: 500, y: 240 });
    expect(middle.gainDb).toBeCloseTo(0, 9);
    expect(middle.frequencyHz).toBeCloseTo(Math.sqrt(20 * 20000), 6); // geometric middle
  });

  it('round-trips between values and points', () => {
    for (const value of [
      { frequencyHz: 63, gainDb: -7.5 },
      { frequencyHz: 1000, gainDb: 0 },
      { frequencyHz: 15000, gainDb: 18 },
    ]) {
      const back = pointToValue(scale, valueToPoint(scale, value));
      expect(back.frequencyHz).toBeCloseTo(value.frequencyHz, 6);
      expect(back.gainDb).toBeCloseTo(value.gainDb, 9);
    }
  });

  it('clamps positions outside the graph to the parameter ranges', () => {
    expect(pointToValue(scale, { x: -50, y: -50 })).toEqual({ frequencyHz: 20, gainDb: 24 });
    const value = pointToValue(scale, { x: 2000, y: 2000 });
    expect(value.frequencyHz).toBe(20000);
    expect(value.gainDb).toBe(-24);
  });
});

describe('parameter normalisation', () => {
  it('matches the C++ logarithmic range and clamps', () => {
    expect(logarithmicToNormalised(20, 20, 20000)).toBe(0);
    expect(logarithmicToNormalised(20000, 20, 20000)).toBe(1);
    expect(logarithmicToNormalised(Math.sqrt(20 * 20000), 20, 20000)).toBeCloseTo(0.5, 12);
    expect(logarithmicFromNormalised(logarithmicToNormalised(440, 20, 20000), 20, 20000)).toBeCloseTo(440, 9);
    expect(logarithmicToNormalised(5, 20, 20000)).toBe(0);
    expect(logarithmicToNormalised(0, 0, 1)).toBe(0); // bridge defaults before the real range arrives
    expect(linearToNormalised(0, -24, 24)).toBe(0.5);
    expect(linearToNormalised(30, -24, 24)).toBe(1);
  });
});

describe('findNode', () => {
  const nodes = [
    { band: 1, x: 100, y: 100 },
    { band: 2, x: 106, y: 100 },
    { band: 3, x: 500, y: 300 },
  ];

  it('finds the closest node within the radius', () => {
    expect(findNode(nodes, { x: 497, y: 302 }, 12, 0)).toBe(3);
    expect(findNode(nodes, { x: 105, y: 100 }, 12, 0)).toBe(2);
    expect(findNode(nodes, { x: 300, y: 300 }, 12, 0)).toBeNull();
  });

  it('prefers the selected band when nodes overlap', () => {
    expect(findNode(nodes, { x: 105, y: 100 }, 12, 1)).toBe(1);
  });
});
