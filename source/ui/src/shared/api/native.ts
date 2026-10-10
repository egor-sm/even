import { currentBackend } from './backend';

const call = (name: string, ...args: unknown[]): Promise<unknown> => currentBackend().call(name, args);

export type AnalyzerMode = 'prepost' | 'post' | 'pre' | 'off';

/** The analyzer as the user set it up (C++ AnalyzerSettings, kept in UserSettings). */
export type AnalyzerSettings = {
  mode: AnalyzerMode;
  /** dB drawn over the plot height, down from 0 dB at the top: 60…120 in steps of 10. */
  range: number;
  /** The chosen FFT size, 1024…16384; C++ uses 8192 instead of 16384 below 88.2 kHz. */
  fftSize: number;
  /** How fast the curve falls after a peak, dB/s. */
  decay: number;
  /** Slope of the spectrum around 1 kHz, dB/oct. */
  tilt: number;
};

export type SettingKey = 'theme' | 'scale' | `analyzer.${keyof AnalyzerSettings}`;

/** Native functions registered in PluginEditor::createWebViewOptions(). */
export const native = {
  getPluginInfo: () => call('getPluginInfo'),
  setTestSignal: (enabled: boolean) => call('setTestSignal', enabled),
  setAnalyzerActive: (active: boolean) => call('setAnalyzerActive', active),
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
  /** Each resolves to the settings: {theme, scale, analyzer: AnalyzerSettings}. */
  getSettings: () => call('getSettings'),
  setSetting: (key: SettingKey, value: string | number) => call('setSetting', key, value),
};
