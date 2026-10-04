import type { AnalyzerMode } from '~/shared/api';
import { createStore } from '~/shared/lib';
import type { FilterType } from '~/entities/band';

export type ScrubField = 'f' | 'g' | 'q';

/** The pointer gesture in progress. Coordinates are in graph units (1280 × 664 at any UI scale). */
export type Drag =
  | { kind: 'node'; slot: number; startX: number; startY: number; offsetX: number; offsetY: number; moved: boolean }
  | { kind: 'q'; slot: number }
  | { kind: 'scrub'; slot: number; field: ScrubField; startX: number; startValue: number }
  | { kind: 'range'; startY: number; startRange: number }
  | { kind: 'keys'; slot: number; midi: number };

export type UiState = {
  /** Type under the pointer in the type strip or picker: previewed as the ghost curve. */
  hoverType: FilterType | null;
  drag: Drag | null;
  /** Pointer over the empty graph (graph units), for the crosshair. */
  cursor: { x: number; y: number } | null;

  analyzerMode: AnalyzerMode;
  analyzerMenu: boolean;

  theme: 'dark' | 'light';
  /** UI scale in percent (the window is 1280 × 760 times this). */
  scale: number;
  canUndo: boolean;
  canRedo: boolean;
  devPanel: boolean;
};

export const uiStore = createStore<UiState>({
  hoverType: null,
  drag: null,
  cursor: null,
  analyzerMode: 'prepost',
  analyzerMenu: false,
  theme: 'dark',
  scale: 100,
  canUndo: false,
  canRedo: false,
  devPanel: import.meta.env.DEV,
});
