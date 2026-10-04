import { applyHistory, applySettings } from '~/app/connect-backend';
import { type AnalyzerMode, bandParameters, native } from '~/shared/api';
import { type Band, type FilterType, selectBand, selectionStore, typeIndex } from '~/entities/band';
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

  select: (slot: number | null) => {
    selectBand(slot);
    uiStore.set({ hoverType: null });
  },

  /** A new band, selected, with the type strip expanded over it. */
  createBand: (type: FilterType, frequencyHz: number, gainDb: number) =>
    void native.createBand(typeIndex(type), frequencyHz, gainDb).then((slot) => {
      if (typeof slot !== 'number') return;
      selectBand(slot, 'strip');
      uiStore.set({ hoverType: null });
    }),

  deleteBand: (slot: number) => {
    const { selected, solo } = selectionStore.get();
    selectionStore.set({
      selected: selected === slot ? null : selected,
      solo: solo === slot ? null : solo,
      typeMenu: null,
    });
    uiStore.set({ hoverType: null });
    void native.deleteBand(slot);
  },

  setType: (slot: number, type: FilterType) => {
    selectionStore.set({ typeMenu: null });
    uiStore.set({ hoverType: null });
    void native.setBandShape(slot, typeIndex(type));
  },

  toggleBypass: (band: Band) => bandParameters.setEnabled(band.slot, !band.on),

  toggleSolo: (slot: number) => selectionStore.set(({ solo }) => ({ solo: solo === slot ? null : slot })),
};
