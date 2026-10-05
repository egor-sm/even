import { create } from 'zustand';

import type { Band } from './bands';

/** Values of a band being edited, ahead of the response coming back from C++. */
export type BandPreview = { slot: number } & Partial<Pick<Band, 'f' | 'g' | 'q' | 'slope'>>;

/** Which type control of the selected band is open: the strip above its node or the dock's picker. */
export type TypeMenu = 'strip' | 'picker' | null;

export type SelectionState = {
  /** Slot of the selected band. */
  selected: number | null;
  /** Slot of the soloed band. */
  solo: number | null;
  typeMenu: TypeMenu;
  preview: BandPreview | null;
  /** Keep the preview until the next EQ response: it still has the values from before the edit. */
  previewUntilResponse: boolean;
};

export const useSelectionStore = create<SelectionState>()(() => ({
  selected: null,
  solo: null,
  typeMenu: null,
  preview: null,
  previewUntilResponse: false,
}));

/** Selects a band (or nothing); type menus close. */
export const selectBand = (slot: number | null, typeMenu: TypeMenu = null): void =>
  useSelectionStore.setState({ selected: slot, typeMenu });

/** Shows edited values at once; C++ confirms them with the next response. */
export const setPreview = (preview: BandPreview, untilResponse = false): void =>
  useSelectionStore.setState({ preview, previewUntilResponse: untilResponse });

/** The band with the values being edited applied. */
export const withPreview = (band: Band, preview: BandPreview | null): Band =>
  preview?.slot === band.slot ? { ...band, ...preview } : band;
