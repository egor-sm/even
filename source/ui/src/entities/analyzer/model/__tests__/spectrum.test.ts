import { describe, expect, it } from 'vite-plus/test';

import { Spectrum } from '../spectrum';

const options = { slopeDbPerOctave: 0, attackSeconds: 0.01, decayDbPerSecond: 120 };

describe('Spectrum', () => {
  it('applies a new tilt to the levels it already has', () => {
    const spectrum = new Spectrum(options);
    spectrum.setLevels(new Float32Array([-40, -40, -40]), 500, 2000);
    spectrum.tick(10);
    expect(Array.from(spectrum.display)).toEqual([-40, -40, -40]);

    // 500 Hz is an octave below 1 kHz, 2 kHz an octave above.
    spectrum.setOptions({ ...options, slopeDbPerOctave: 3 });
    spectrum.tick(10);
    expect(spectrum.display[0]).toBeCloseTo(-43, 5);
    expect(spectrum.display[1]).toBeCloseTo(-40, 5);
    expect(spectrum.display[2]).toBeCloseTo(-37, 5);
  });
});
