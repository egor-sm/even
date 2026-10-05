import { describe, expect, it } from 'vite-plus/test';

import { octavesToQ, qToOctaves } from '../bandwidth';

describe('bandwidth', () => {
  it('converts q to bandwidth and back', () => {
    expect(qToOctaves(Math.SQRT1_2)).toBeCloseTo(1.9, 1);
    expect(octavesToQ(qToOctaves(5.2))).toBeCloseTo(5.2, 9);
  });
});
