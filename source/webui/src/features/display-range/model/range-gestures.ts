import { useBandsStore, useSelectionStore } from '~/entities/band';
import { maxRange, minRange, useViewportStore } from '~/entities/viewport';
import { clamp, type Point, startGesture } from '~/shared/lib';

import { fitRange, wheelRange } from '../lib/range';

/** Dragging the dB axis: twice the range per 160 px downwards. */
export const rangeDown = (start: Point): void => {
  const from = useViewportStore.getState().range;
  useSelectionStore.setState({ typeMenu: null });
  startGesture(
    { kind: 'range' },
    {
      move: (point) => {
        const range = clamp(Math.round(from * 2 ** ((point.y - start.y) / 160)), minRange, maxRange);
        if (range !== useViewportStore.getState().range) useViewportStore.setState({ range });
      },
      end: () => undefined,
    },
  );
};

export const rangeWheel = (up: boolean): void =>
  useViewportStore.setState(({ range }) => ({ range: wheelRange(range, up) }));

export const fitRangeToBands = (): void =>
  useViewportStore.setState({ range: fitRange(useBandsStore.getState().bands) });
