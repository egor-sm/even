import { describe, expect, it } from 'vite-plus/test';

import { fitRange, wheelRange } from './range';

describe('range', () => {
  it('fits the largest enabled gain with headroom', () => {
    expect(fitRange([{ type: 'bell', g: -7.5, on: true }])).toBe(12);
    expect(fitRange([{ type: 'bell', g: 20, on: false }])).toBe(3);
    expect(fitRange([{ type: 'lcut', g: 20, on: true }])).toBe(3);
  });

  it('steps by 1 dB up to ±12 and by 3 dB above', () => {
    expect(wheelRange(6, false)).toBe(7);
    expect(wheelRange(12, false)).toBe(15);
    expect(wheelRange(12, true)).toBe(11);
    expect(wheelRange(36, false)).toBe(36);
  });
});
