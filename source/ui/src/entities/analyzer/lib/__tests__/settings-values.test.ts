import { describe, expect, it } from 'vite-plus/test';

import {
  defaultAnalyzerSettings,
  effectiveFftSize,
  fftSizesAt,
  isTuningAtDefaults,
  rangeLabels,
  stepRange,
} from '../settings-values';

describe('FFT size', () => {
  it('offers 16384 only from 88.2 kHz up', () => {
    expect(fftSizesAt(44100)).toEqual([1024, 2048, 4096, 8192]);
    expect(fftSizesAt(48000)).toEqual([1024, 2048, 4096, 8192]);
    expect(fftSizesAt(88200)).toEqual([1024, 2048, 4096, 8192, 16384]);
    expect(fftSizesAt(96000)).toEqual([1024, 2048, 4096, 8192, 16384]);
  });

  it('falls back from 16384 to 8192 below 88.2 kHz, keeping the others', () => {
    expect(effectiveFftSize(16384, 48000)).toBe(8192);
    expect(effectiveFftSize(16384, 96000)).toBe(16384);
    expect(effectiveFftSize(4096, 48000)).toBe(4096);
    expect(effectiveFftSize(1024, 192000)).toBe(1024);
  });
});

describe('range', () => {
  it('steps by 10 dB within 60…120', () => {
    expect(stepRange(120, -1)).toBe(110);
    expect(stepRange(90, 2)).toBe(110);
    expect(stepRange(60, -1)).toBe(60);
    expect(stepRange(120, 3)).toBe(120);
    expect(stepRange(60, 100)).toBe(120);
  });

  it('labels every 10 dB up to 70, else every 20', () => {
    expect(rangeLabels(120)).toEqual([0, -20, -40, -60, -80, -100, -120]);
    expect(rangeLabels(60)).toEqual([0, -10, -20, -30, -40, -50, -60]);
    expect(rangeLabels(70)).toEqual([0, -10, -20, -30, -40, -50, -60, -70]);
    expect(rangeLabels(90)).toEqual([0, -20, -40, -60, -80]);
  });
});

describe('defaults', () => {
  it('counts the FFT size, decay and tilt, not the mode or the range', () => {
    expect(isTuningAtDefaults(defaultAnalyzerSettings)).toBe(true);
    expect(isTuningAtDefaults({ ...defaultAnalyzerSettings, mode: 'off', range: 60 })).toBe(true);
    expect(isTuningAtDefaults({ ...defaultAnalyzerSettings, fftSize: 8192 })).toBe(false);
    expect(isTuningAtDefaults({ ...defaultAnalyzerSettings, decay: 15 })).toBe(false);
    expect(isTuningAtDefaults({ ...defaultAnalyzerSettings, tilt: 0 })).toBe(false);
  });
});
