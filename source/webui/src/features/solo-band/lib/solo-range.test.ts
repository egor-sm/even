import { describe, expect, it } from 'vite-plus/test';

import { soloRange } from './solo-range';

describe('solo range', () => {
  it('lights the working range of each type', () => {
    expect(soloRange({ type: 'lcut', f: 100, q: 0.71 })).toEqual([20, 100 * Math.SQRT2]);
    expect(soloRange({ type: 'hshelf', f: 8000, q: 0.71 })).toEqual([8000 / Math.SQRT2, 20000]);
    const [low, high] = soloRange({ type: 'bell', f: 1000, q: 4 });
    expect(Math.sqrt(low * high)).toBeCloseTo(1000, 6);
  });
});
