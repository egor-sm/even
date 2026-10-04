import { createStore } from '~/shared/lib';

import type { AxisMode } from '../lib/axis-math';

export type ViewportState = {
  axis: AxisMode;
  /** Display range ±dB (target); view.range follows it smoothly. */
  range: number;
  /** Animated view: displayed range, and the Hz → notes morph progress 0…1. */
  view: { range: number; morph: number };
  /** Note highlighted on the frequency axis (key hover or drag, snapping), MIDI. */
  hotKey: number | null;
};

export const defaultRange = 18;

export const viewportStore = createStore<ViewportState>({
  axis: 'hz',
  range: defaultRange,
  view: { range: defaultRange, morph: 0 },
  hotKey: null,
});
