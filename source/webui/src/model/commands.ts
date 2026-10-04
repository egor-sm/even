import { applyHistory, applySettings } from '~/app/connect-backend';
import { type AnalyzerMode, bandParameters, native } from '~/shared/api';
import type { Band } from '~/model/bands';
import { type FilterType, typeIndex } from '~/model/filter-types';
import { uiStore } from '~/model/ui';

/** User actions that are more than a field in a store: they talk to C++ and keep the UI state consistent. */
export const commands = {
  undo: () => void native.undo().then(applyHistory),
  redo: () => void native.redo().then(applyHistory),

  toggleTheme: () => {
    const theme = uiStore.get().theme === 'dark' ? 'light' : 'dark';
    uiStore.set({ theme });
    void native.setSetting('theme', theme).then(applySettings);
  },

  setScale: (scale: number) => void native.setSetting('scale', scale).then(applySettings),

  setAnalyzerMode: (mode: AnalyzerMode) => {
    uiStore.set({ analyzerMode: mode, analyzerMenu: false });
    void native.setAnalyzerMode(mode);
  },

  select: (slot: number | null) => uiStore.set({ selected: slot, strip: false, picker: false, hoverType: null }),

  /** A new band, selected, with the type strip expanded over it. */
  createBand: (type: FilterType, frequencyHz: number, gainDb: number) =>
    void native.createBand(typeIndex(type), frequencyHz, gainDb).then((slot) => {
      if (typeof slot === 'number') uiStore.set({ selected: slot, strip: true, picker: false, hoverType: null });
    }),

  deleteBand: (slot: number) => {
    const { selected, solo } = uiStore.get();
    uiStore.set({
      selected: selected === slot ? null : selected,
      solo: solo === slot ? null : solo,
      strip: false,
      picker: false,
      hoverType: null,
    });
    void native.deleteBand(slot);
  },

  setType: (slot: number, type: FilterType) => {
    uiStore.set({ strip: false, picker: false, hoverType: null });
    void native.setBandShape(slot, typeIndex(type));
  },

  toggleBypass: (band: Band) => bandParameters.setEnabled(band.slot, !band.on),

  toggleSolo: (slot: number) => uiStore.set(({ solo }) => ({ solo: solo === slot ? null : slot })),
};
