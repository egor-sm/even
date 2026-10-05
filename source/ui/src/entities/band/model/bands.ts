import { create } from 'zustand';

import type { EqResponse, Section } from '~/shared/api';

import { type FilterType, typeAt } from './filter-types';
import { useSelectionStore } from './selection';

/** A band as the UI shows it; the values live in C++ (plugin parameters) and arrive with the EQ response. */
export type Band = {
  /** Parameter slot, 1-based: how C++ addresses the band. */
  slot: number;
  /** Creation order, from 1. */
  serial: number;
  /** Band color 1…8, by creation order. */
  color: number;
  type: FilterType;
  f: number;
  /** 0 for types without gain. */
  g: number;
  q: number;
  /** Index into the cut slopes. */
  slope: number;
  /** False when bypassed. */
  on: boolean;
  sections: Section[];
};

export type BandsState = {
  sampleRate: number;
  /** Used bands in creation order. */
  bands: readonly Band[];
};

export const useBandsStore = create<BandsState>()(() => ({ sampleRate: 48000, bands: [] }));

export const bandColorVar = (color: number): string => `var(--band-${color})`;

export const bandsFromResponse = (response: EqResponse): BandsState => ({
  sampleRate: response.sampleRate,
  bands: response.bands
    .map((band): Band => ({
      slot: band.band,
      serial: band.serial,
      color: ((Math.max(band.serial, 1) - 1) % 8) + 1,
      type: typeAt(band.shape),
      f: band.frequencyHz,
      g: band.gainDb,
      q: band.q,
      slope: band.slope,
      on: band.enabled,
      sections: band.sections,
    }))
    .toSorted((a, b) => a.serial - b.serial),
});

export const findBand = (bands: readonly Band[], slot: number | null): Band | undefined =>
  slot === null ? undefined : bands.find((band) => band.slot === slot);

/**
 * Takes a response from C++: the bands, and a selection or solo of a band that is gone (undo, redo,
 * the host) is dropped. A preview kept until this response ends.
 */
export const receiveResponse = (response: EqResponse): void => {
  const state = bandsFromResponse(response);
  useBandsStore.setState(state);

  const { selected, solo, previewUntilResponse } = useSelectionStore.getState();
  const exists = (slot: number) => state.bands.some((band) => band.slot === slot);
  if (selected !== null && !exists(selected)) useSelectionStore.setState({ selected: null, typeMenu: null });
  if (solo !== null && !exists(solo)) useSelectionStore.setState({ solo: null });
  if (previewUntilResponse) useSelectionStore.setState({ preview: null, previewUntilResponse: false });
};
