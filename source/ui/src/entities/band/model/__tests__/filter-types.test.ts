import { describe, expect, it } from 'vite-plus/test';

import { formatSlope, typeAt, typeIndex } from '../filter-types';

describe('filter types', () => {
  it('map to the C++ shape indices and back', () => {
    expect(typeIndex('tilt')).toBe(7);
    expect(typeAt(3)).toBe('lcut');
  });

  it('formats cut slopes', () => {
    expect(formatSlope(3)).toBe('24 dB/oct');
  });
});
