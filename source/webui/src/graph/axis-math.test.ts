import { describe, expect, it } from 'vite-plus/test';

import {
  dbLines,
  dbStep,
  fitRange,
  frequencyLabels,
  gridLines,
  gridMorph,
  keyAt,
  octavesToQ,
  qToOctaves,
  soloRange,
  wheelRange,
} from '~/graph/axis-math';
import { createMapper, graph } from '~/graph/geometry';

const mapper = createMapper(18);

describe('mapper', () => {
  it('spans 20 Hz – 20 kHz over the plot and ±range over its height', () => {
    expect(mapper.x(20)).toBeCloseTo(graph.left, 9);
    expect(mapper.x(20000)).toBeCloseTo(graph.right, 9);
    expect(mapper.frequencyAt(mapper.x(1234))).toBeCloseTo(1234, 6);
    expect(mapper.y(0)).toBe(327);
    expect(mapper.y(18)).toBe(graph.top);
    expect(mapper.dbAt(mapper.y(-7.5))).toBeCloseTo(-7.5, 9);
    expect(mapper.analyzerY(-6)).toBe(graph.top);
    expect(mapper.analyzerY(-84)).toBe(graph.bottom);
  });
});

describe('grid', () => {
  it('draws the decade grid with the design majors', () => {
    const lines = gridLines(mapper, 'hz');
    expect(lines.major).toHaveLength(8);
    expect(lines.major[0]).toBeCloseTo(mapper.x(50), 9);
  });

  it('draws one line per white key in note mode, C keys major', () => {
    const lines = gridLines(mapper, 'note');
    expect(lines.major).toHaveLength(10); // C1 … C10 within 20 Hz – 20 kHz
    expect(lines.minor.length).toBeGreaterThan(50);
  });

  it('pairs every line with its nearest counterpart for morphing', () => {
    const morph = gridMorph(gridLines(mapper, 'hz'), gridLines(mapper, 'note'));
    expect(morph.major).toHaveLength(8 + 10);
    for (const [from, to] of morph.major) expect(Math.abs(from - to)).toBeLessThan(200);
  });

  it('spaces frequency labels apart and keeps the majors', () => {
    const labels = frequencyLabels(mapper);
    for (let i = 1; i < labels.length; i++) expect(labels[i].x - labels[i - 1].x).toBeGreaterThanOrEqual(52);
    expect(labels.map((label) => label.text)).toEqual(expect.arrayContaining(['50', '100', '1k', '10k']));
  });

  it('picks dB steps that keep about seven labels', () => {
    expect(dbStep(18)).toBe(6);
    expect(dbStep(3)).toBe(1);
    expect(dbStep(36)).toBe(12);
    expect(dbLines(18)).toEqual([-18, -12, -6, 0, 6, 12, 18]);
  });
});

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

describe('bands', () => {
  it('converts q to bandwidth and back', () => {
    expect(qToOctaves(Math.SQRT1_2)).toBeCloseTo(1.9, 1);
    expect(octavesToQ(qToOctaves(5.2))).toBeCloseTo(5.2, 9);
  });

  it('lights the working range of each type', () => {
    expect(soloRange({ type: 'lcut', f: 100, q: 0.71 })).toEqual([20, 100 * Math.SQRT2]);
    expect(soloRange({ type: 'hshelf', f: 8000, q: 0.71 })).toEqual([8000 / Math.SQRT2, 20000]);
    const [low, high] = soloRange({ type: 'bell', f: 1000, q: 4 });
    expect(Math.sqrt(low * high)).toBeCloseTo(1000, 6);
  });

  it('finds the key under a point', () => {
    const middleOfA4 = mapper.noteX(69);
    expect(keyAt(mapper, middleOfA4, 30)).toBe(69);
    expect(keyAt(mapper, mapper.noteX(70), 10)).toBe(70); // black key, upper part
    expect([69, 71]).toContain(keyAt(mapper, mapper.noteX(70), 30)); // below the black keys: a white one
  });
});
