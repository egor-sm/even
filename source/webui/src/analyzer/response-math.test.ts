import { describe, expect, it } from 'vite-plus/test';

import { magnitudeDb, type Section } from './response-math';

// Sections built the way dsp::design() builds them (band_design.cpp), to check the evaluation math.
const sampleRate = 48000;
const warped = (hz: number) => Math.tan((Math.PI * hz) / sampleRate);

const bell = (hz: number, gainDb: number, q: number): Section => {
  const gain = 10 ** (gainDb / 20);
  return { order: 2, g: warped(hz), q: q * Math.sqrt(gain), lowpassMix: 1, bandpassMix: gain, highpassMix: 1 };
};

const lowShelf = (hz: number, gainDb: number, q: number): Section => {
  const gain = 10 ** (gainDb / 20);
  return { order: 2, g: warped(hz) / gain ** 0.25, q, lowpassMix: gain, bandpassMix: Math.sqrt(gain), highpassMix: 1 };
};

const lowCut = (hz: number, q: number): Section => ({
  order: 2,
  g: warped(hz),
  q,
  lowpassMix: 0,
  bandpassMix: 0,
  highpassMix: 1,
});
const notch = (hz: number, q: number): Section => ({
  order: 2,
  g: warped(hz),
  q,
  lowpassMix: 1,
  bandpassMix: 0,
  highpassMix: 1,
});

describe('magnitudeDb', () => {
  it('gives the exact bell gain at its center, also close to Nyquist', () => {
    for (const hz of [100, 1000, 15000])
      for (const gainDb of [-24, -6, 3, 18])
        expect(magnitudeDb([bell(hz, gainDb, 2)], hz, sampleRate)).toBeCloseTo(gainDb, 9);
  });

  it('gives half the shelf gain at the shelf frequency', () => {
    expect(magnitudeDb([lowShelf(300, 12, Math.SQRT1_2)], 300, sampleRate)).toBeCloseTo(6, 9);
    expect(magnitudeDb([lowShelf(300, 12, Math.SQRT1_2)], 5, sampleRate)).toBeCloseTo(12, 1);
  });

  it('gives -3 dB at the cutoff of a q = 0.707 cut', () => {
    expect(magnitudeDb([lowCut(80, Math.SQRT1_2)], 80, sampleRate)).toBeCloseTo(-3.0103, 3);
  });

  it('gives -3 dB at the cutoff and 6 dB/oct far below it for a one-pole cut', () => {
    const onePole: Section = { order: 1, g: warped(2000), q: 1, lowpassMix: 0, bandpassMix: 0, highpassMix: 1 };
    expect(magnitudeDb([onePole], 2000, sampleRate)).toBeCloseTo(-3.0103, 3);
    expect(magnitudeDb([onePole], 40, sampleRate) - magnitudeDb([onePole], 20, sampleRate)).toBeCloseTo(6.02, 2);
  });

  it('adds sections in series in dB', () => {
    const a = bell(200, 6, 1);
    const b = bell(3000, -4, 3);
    for (const hz of [50, 200, 1000, 3000, 12000])
      expect(magnitudeDb([a, b], hz, sampleRate)).toBeCloseTo(
        magnitudeDb([a], hz, sampleRate) + magnitudeDb([b], hz, sampleRate),
        9,
      );
  });

  it('keeps a notch center finite and very deep', () => {
    const db = magnitudeDb([notch(1000, 8)], 1000, sampleRate);
    expect(Number.isFinite(db)).toBe(true);
    expect(db).toBeLessThan(-100);
  });

  it('stays finite above Nyquist', () => {
    expect(Number.isFinite(magnitudeDb([bell(1000, 6, 1)], 30000, sampleRate))).toBe(true);
  });
});
