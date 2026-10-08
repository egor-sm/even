import { create } from 'zustand';

import { type AnalyzerOptions, defaultAnalyzerOptions, native } from '~/shared/api';

/** How the page draws the spectra. */
export type DisplayTuning = {
  /** dB drawn over the plot height, down from -6 dBFS: 60, 90 or 120. */
  rangeDb: number;
  /** Spectral tilt around 1 kHz. */
  slopeDbPerOctave: number;
  attackMs: number;
  /** How fast the curve falls after a peak. */
  decayDbPerSecond: number;
  /** Straight segments between the points, or a monotone cubic (Steffen) through them. */
  curve: 'polyline' | 'monotone';
  /** Each point offset along its neighbours' chord, or mitred joins with an antialiased edge. */
  line: 'chord' | 'mitred';
};

export const defaultDisplayTuning: DisplayTuning = {
  rangeDb: 120,
  slopeDbPerOctave: 4.5,
  attackMs: 10,
  decayDbPerSecond: 120,
  curve: 'monotone',
  line: 'mitred',
};

/** The analyzer's settings, switchable in the development panel: the C++ analysis options and the page's drawing. */
export const useAnalyzerTuningStore = create<{ options: AnalyzerOptions; display: DisplayTuning }>()(() => ({
  options: defaultAnalyzerOptions,
  display: defaultDisplayTuning,
}));

export const setAnalyzerOptions = (patch: Partial<AnalyzerOptions>): void => {
  const options = { ...useAnalyzerTuningStore.getState().options, ...patch };
  useAnalyzerTuningStore.setState({ options });
  void native.setAnalyzerOptions(options);
};

export const setDisplayTuning = (patch: Partial<DisplayTuning>): void =>
  useAnalyzerTuningStore.setState((state) => ({ display: { ...state.display, ...patch } }));

/** C++ keeps its options across page reloads: sends the page's (after a reload, the defaults). */
export const syncAnalyzerOptions = (): void =>
  void native.setAnalyzerOptions(useAnalyzerTuningStore.getState().options);
