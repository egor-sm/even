import { describe, expect, it } from 'vite-plus/test';

import { createMapper } from '~/entities/viewport';

import { qHandlePoint } from '../q-handle-point';

const mapper = createMapper(18);

/** Both handles of a band, read back from where they are drawn: x and the frequency there. */
const handles = (band: { f: number; q: number }) =>
  ([-1, 1] as const).map((side) => {
    const { x } = qHandlePoint(band, side, mapper);
    return { x, hz: mapper.frequencyAt(x) };
  });

describe('Q handles', () => {
  it('sit at the edges of the band: f at their geometric centre, f / q the width between them', () => {
    for (const band of [
      { f: 1000, q: 1 },
      { f: 120, q: 4 },
      { f: 6000, q: 0.5 },
    ]) {
      const [lower, upper] = handles(band);
      expect(Math.sqrt(lower.hz * upper.hz)).toBeCloseTo(band.f, 6);
      expect(upper.hz - lower.hz).toBeCloseTo(band.f / band.q, 6);
    }
  });

  it('stay on the 0 dB line at any display range', () => {
    for (const range of [3, 18, 36]) {
      const zoomed = createMapper(range);
      for (const side of [-1, 1] as const) expect(qHandlePoint({ f: 1000, q: 2 }, side, zoomed).y).toBe(zoomed.zeroY);
    }
  });

  it('keep 18 px from the node of a narrow band', () => {
    const [lower, upper] = handles({ f: 1000, q: 30 });
    expect(lower.x).toBeCloseTo(mapper.x(1000) - 18, 9);
    expect(upper.x).toBeCloseTo(mapper.x(1000) + 18, 9);
  });

  it('keep the edges of a wide band within 20 Hz to 20 kHz', () => {
    expect(handles({ f: 15000, q: 0.5 })[1].hz).toBeCloseTo(20000, 6);
    expect(handles({ f: 30, q: 0.3 })[0].hz).toBeCloseTo(20, 6);
  });
});
