import { type Band, bandsStore, createBand, findBand, selectionStore, setPreview, withPreview } from '~/entities/band';
import { createMapper, keyAt, viewportStore } from '~/entities/viewport';
import { bandParameters } from '~/shared/api';
import { midiToFrequency, type Point, startGesture } from '~/shared/lib';

const glideMs = 180;
let glide = 0;

/** Moves a band to a frequency in 180 ms (one gesture), easing out; a newer move cancels it. */
const glideFrequency = (band: Band, to: number): void => {
  const token = ++glide;
  const from = band.f;
  const startedAt = performance.now();
  bandParameters.begin(band.slot, ['frequency']);

  const step = () => {
    if (token !== glide) {
      bandParameters.end(band.slot, ['frequency']);
      return;
    }
    const k = Math.min(1, (performance.now() - startedAt) / glideMs);
    const f = from * (to / from) ** (1 - (1 - k) ** 3);
    setPreview({ slot: band.slot, f }, true);
    bandParameters.set(band.slot, 'frequency', f);
    if (k < 1) requestAnimationFrame(step);
    else bandParameters.end(band.slot, ['frequency']);
  };
  requestAnimationFrame(step);
};

/** The key under a point of the keyboard (graph x, y from the keyboard's top). */
export const keyUnder = (point: Point, keyboardY: number): number =>
  keyAt(createMapper(viewportStore.get().view.range), point.x, keyboardY);

/**
 * Click on a key: the selected band glides to that note, and dragging along the keys moves it by
 * semitones; with Alt, or without a selection, a new band on that note.
 */
export const keyDown = (midi: number, altKey: boolean): void => {
  const { selected, preview } = selectionStore.get();
  const found = findBand(bandsStore.get().bands, selected);
  viewportStore.set({ hotKey: midi });

  if (altKey || found === undefined) {
    createBand('bell', midiToFrequency(midi), 0);
    return;
  }

  const band = withPreview(found, preview);
  selectionStore.set({ typeMenu: null });
  glideFrequency(band, midiToFrequency(midi));

  let current = midi;
  startGesture(
    { kind: 'keys', slot: band.slot },
    {
      move: (point) => {
        // Along the white keys' row, so the pointer's height does not matter.
        const next = keyUnder(point, 32);
        if (next === current) return;
        current = next;
        glide++;
        const f = midiToFrequency(next);
        setPreview({ slot: band.slot, f }, true);
        viewportStore.set({ hotKey: next });
        bandParameters.begin(band.slot, ['frequency']);
        bandParameters.set(band.slot, 'frequency', f);
        bandParameters.end(band.slot, ['frequency']);
      },
      end: () => viewportStore.set({ hotKey: null }),
    },
  );
};
