import { describe, expect, it } from 'vite-plus/test';

import { createMapper, keyDot } from '~/entities/viewport';
import { midiToFrequency } from '~/shared/lib';

import { bandKeyDot } from '../band-key-dot';

const mapper = createMapper(1);
// From C#4, a black key, to E4, a white one, over D4 and D#4.
const glide = { from: midiToFrequency(61), f: midiToFrequency(64) };
const start = keyDot(mapper, glide.from);
const end = keyDot(mapper, glide.f);

describe('band key dot', () => {
  it("sits on the band's key while the band doesn't glide", () => {
    const f = midiToFrequency(62);
    expect(bandKeyDot(mapper, f, null)).toEqual(keyDot(mapper, f));
  });

  it('moves from the key the band left to the clicked key as the glide goes on', () => {
    expect(bandKeyDot(mapper, glide.from, glide)).toEqual({ x: start.x, y: start.y });
    const done = bandKeyDot(mapper, glide.f, glide);
    expect(done.x).toBeCloseTo(end.x, 9);
    expect(done.y).toBeCloseTo(end.y, 9);
    // Halfway in log frequency is halfway along the line.
    const half = bandKeyDot(mapper, midiToFrequency(62.5), glide);
    expect(half.x).toBeCloseTo((start.x + end.x) / 2, 9);
    expect(half.y).toBeCloseTo((start.y + end.y) / 2, 9);
  });

  it('goes straight, without hopping onto the keys on the way', () => {
    const dots = Array.from({ length: 13 }, (_, i) => bandKeyDot(mapper, midiToFrequency(61 + i / 4), glide));
    // Rightwards and down from the black keys' row to the white keys' row, never back up.
    for (let i = 1; i < dots.length; i++) {
      expect(dots[i].x).toBeGreaterThan(dots[i - 1].x);
      expect(dots[i].y).toBeGreaterThan(dots[i - 1].y);
    }
  });
});
