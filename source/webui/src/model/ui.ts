import type { AnalyzerMode } from '~/shared/api';
import type { AxisMode } from '~/graph/axis-math';
import { createStore } from '~/shared/lib';
import type { Band } from '~/model/bands';
import type { FilterType } from '~/model/filter-types';

export type ScrubField = 'f' | 'g' | 'q';

/** The pointer gesture in progress. Coordinates are in graph units (1280 × 664 at any UI scale). */
export type Drag =
  | { kind: 'node'; slot: number; startX: number; startY: number; offsetX: number; offsetY: number; moved: boolean }
  | { kind: 'q'; slot: number }
  | { kind: 'scrub'; slot: number; field: ScrubField; startX: number; startValue: number }
  | { kind: 'range'; startY: number; startRange: number }
  | { kind: 'keys'; slot: number; midi: number };

/** Values of a band being edited, ahead of the response coming back from C++. */
export type BandPreview = { slot: number } & Partial<Pick<Band, 'f' | 'g' | 'q' | 'slope'>>;

export type UiState = {
  /** Slot of the selected band. */
  selected: number | null;
  /** Slot of the soloed band. */
  solo: number | null;
  /** Type under the pointer in the type strip or picker: previewed as the ghost curve. */
  hoverType: FilterType | null;
  /** The type strip above the selected node is expanded. */
  strip: boolean;
  /** The type picker of the dock is open. */
  picker: boolean;
  drag: Drag | null;
  preview: BandPreview | null;
  /** Keep the preview until the next EQ response: it still has the values from before the edit. */
  previewUntilResponse: boolean;
  /** Pointer over the empty graph (graph units), for the crosshair. */
  cursor: { x: number; y: number } | null;
  /** Key highlighted on the keyboard (hover, drag or snapping), MIDI note. */
  hotKey: number | null;

  axis: AxisMode;
  /** Display range ±dB (target); view.range follows it smoothly. */
  range: number;
  /** Animated view: displayed range, and the Hz → notes morph progress 0…1. */
  view: { range: number; morph: number };

  analyzerMode: AnalyzerMode;
  analyzerMenu: boolean;

  theme: 'dark' | 'light';
  /** UI scale in percent (the window is 1280 × 760 times this). */
  scale: number;
  canUndo: boolean;
  canRedo: boolean;
  devPanel: boolean;
};

export const defaultRange = 18;

export const uiStore = createStore<UiState>({
  selected: null,
  solo: null,
  hoverType: null,
  strip: false,
  picker: false,
  drag: null,
  preview: null,
  previewUntilResponse: false,
  cursor: null,
  hotKey: null,
  axis: 'hz',
  range: defaultRange,
  view: { range: defaultRange, morph: 0 },
  analyzerMode: 'prepost',
  analyzerMenu: false,
  theme: 'dark',
  scale: 100,
  canUndo: false,
  canRedo: false,
  devPanel: import.meta.env.DEV,
});

/** The band with the values being edited applied. */
export const withPreview = (band: Band, preview: BandPreview | null): Band =>
  preview?.slot === band.slot ? { ...band, ...preview } : band;
