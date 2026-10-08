import { currentBackend } from './backend';

const call = (name: string, ...args: unknown[]): Promise<unknown> => currentBackend().call(name, args);

export type AnalyzerMode = 'prepost' | 'post' | 'pre' | 'off';

/** How C++ computes and smooths the spectra (AnalyzerOptions). */
export type AnalyzerOptions = {
  window: 'blackmanHarris' | 'hann';
  /** Samples of the main transform. */
  windowLength: 1024 | 2048 | 4096 | 8192;
  /** FFT size per window length. */
  zeroPadding: 1 | 2 | 4;
  kernel: 'roundedBox' | 'box' | 'triangle' | 'hann' | 'gaussian';
  width: 'constant' | 'psychoacoustic' | 'erb';
  /** Nominal smoothing width. */
  octaves: number;
  /** Where the kernel is narrower than a bin. */
  lowEnd: 'linearPower' | 'monotoneDb' | 'minimumWidth';
  minimumBins: number;
  /** Exponential average of the power over time; 0: none. */
  averagingMs: number;
  /** A 4x longer window for the low end, crossfaded in over 120-240 Hz. */
  lowFft: boolean;
};

/**
 * Light smoothing (1/12 octave Hann kernel) on a 4096-sample Hann window, zero-padded twice, with a
 * monotone cubic in dB at the low end; no averaging over time (the page's release does that).
 */
export const defaultAnalyzerOptions: AnalyzerOptions = {
  window: 'hann',
  windowLength: 4096,
  zeroPadding: 2,
  kernel: 'hann',
  width: 'constant',
  octaves: 1 / 12,
  lowEnd: 'monotoneDb',
  minimumBins: 1,
  averagingMs: 0,
  lowFft: false,
};

/** Native functions registered in PluginEditor::createWebViewOptions(). */
export const native = {
  getPluginInfo: () => call('getPluginInfo'),
  setTestSignal: (enabled: boolean) => call('setTestSignal', enabled),
  setAnalyzerActive: (active: boolean) => call('setAnalyzerActive', active),
  setAnalyzerMode: (mode: AnalyzerMode) => call('setAnalyzerMode', mode),
  setAnalyzerOptions: (options: AnalyzerOptions) => call('setAnalyzerOptions', options),
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
