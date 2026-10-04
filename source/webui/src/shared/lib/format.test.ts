import { describe, expect, it } from 'vite-plus/test';

import {
  formatAxisDb,
  formatAxisFrequency,
  formatFrequency,
  formatGain,
  formatNote,
  frequencyToMidi,
  isBlackKey,
  midiToFrequency,
  noteName,
} from './format';

describe('formatting', () => {
  it('formats frequencies with units and adaptive precision', () => {
    expect(formatFrequency(182.4)).toBe('182 Hz');
    expect(formatFrequency(1250)).toBe('1.25 kHz');
    expect(formatFrequency(12500)).toBe('12.5 kHz');
  });

  it('formats gains with a typographic minus and no sign for zero', () => {
    expect(formatGain(2.5)).toBe('+2.5 dB');
    expect(formatGain(-7.5)).toBe('−7.5 dB');
    expect(formatGain(0.01)).toBe('0.0 dB');
  });

  it('formats slopes and axis labels', () => {
    expect(formatAxisFrequency(2000)).toBe('2k');
    expect(formatAxisFrequency(50)).toBe('50');
    expect(formatAxisDb(-6)).toBe('−6');
    expect(formatAxisDb(6)).toBe('+6');
  });
});

describe('notes', () => {
  it('maps A4 to 440 Hz and back', () => {
    expect(frequencyToMidi(440)).toBe(69);
    expect(midiToFrequency(81)).toBeCloseTo(880, 9);
    expect(noteName(69)).toBe('A4');
    expect(noteName(60)).toBe('C4');
  });

  it('names a frequency by its nearest note and cents', () => {
    expect(formatNote(440)).toBe('A4');
    expect(formatNote(182)).toBe('F#3 −28c');
  });

  it('knows the black keys', () => {
    expect([60, 61, 62, 63, 64, 65, 66].map(isBlackKey)).toEqual([false, true, false, true, false, false, true]);
  });
});
