import { currentBackend } from './backend';

const call = (name: string, ...args: unknown[]): Promise<unknown> => currentBackend().call(name, args);

export type AnalyzerMode = 'prepost' | 'post' | 'pre' | 'off';

/** Native functions registered in PluginEditor::createWebViewOptions(). */
export const native = {
  getPluginInfo: () => call('getPluginInfo'),
  setTestSignal: (enabled: boolean) => call('setTestSignal', enabled),
  setAnalyzerActive: (active: boolean) => call('setAnalyzerActive', active),
  setAnalyzerMode: (mode: AnalyzerMode) => call('setAnalyzerMode', mode),
  /** Asks for the EQ response to be sent again (evenOnResponse). */
  requestResponse: () => call('requestResponse'),
  /** Resolves to the new band's slot (1-based), or undefined when every slot is used. */
  createBand: (typeIndex: number, frequencyHz: number, gainDb: number) =>
    call('createBand', typeIndex, frequencyHz, gainDb),
  deleteBand: (slot: number) => call('deleteBand', slot),
  /** Also adjusts q and gain to suit the new type (model::withShape). */
  setBandShape: (slot: number, typeIndex: number) => call('setBandShape', slot, typeIndex),
  /** Solos a band (only its working range is heard); 0 ends solo. */
  setSolo: (slot: number) => call('setSolo', slot),
  /** Resolves to the sections the band would have with another type (see toSections). */
  previewBand: (slot: number, typeIndex: number) => call('previewBand', slot, typeIndex),
  /** Each resolves to {canUndo, canRedo}. */
  undo: () => call('undo'),
  redo: () => call('redo'),
  getHistoryState: () => call('getHistoryState'),
  /** Resolves to {theme, scale}. */
  getSettings: () => call('getSettings'),
  setSetting: (key: 'theme' | 'scale', value: string | number) => call('setSetting', key, value),
};
