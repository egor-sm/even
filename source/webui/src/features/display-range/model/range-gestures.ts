import { bandsStore, selectionStore } from '~/entities/band';
import { maxRange, minRange, viewportStore } from '~/entities/viewport';
import { clamp, type Point, startGesture } from '~/shared/lib';

import { fitRange, wheelRange } from '../lib/range';

/** Dragging the dB axis: twice the range per 160 px downwards. */
export const rangeDown = (start: Point): void => {
  const from = viewportStore.get().range;
  selectionStore.set({ typeMenu: null });
  startGesture(
    { kind: 'range' },
    {
      move: (point) => {
        const range = clamp(Math.round(from * 2 ** ((point.y - start.y) / 160)), minRange, maxRange);
        if (range !== viewportStore.get().range) viewportStore.set({ range });
      },
      end: () => undefined,
    },
  );
};

export const rangeWheel = (up: boolean): void => viewportStore.set(({ range }) => ({ range: wheelRange(range, up) }));

export const fitRangeToBands = (): void => viewportStore.set({ range: fitRange(bandsStore.get().bands) });
