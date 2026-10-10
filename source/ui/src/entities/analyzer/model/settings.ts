import { create } from 'zustand';

import { type AnalyzerMode, type AnalyzerSettings, native } from '~/shared/api';

import { analyzerModes, defaultAnalyzerSettings } from '../lib/settings-values';

/** The user's analyzer settings, kept in C++ (UserSettings) for every instance. */
export const useAnalyzerSettingsStore = create<AnalyzerSettings>()(() => defaultAnalyzerSettings);

const isMode = (value: unknown): value is AnalyzerMode => analyzerModes.some((mode) => mode.value === value);

/** Takes the analyzer part of the settings as C++ answers them ({theme, scale, analyzer}). */
export const applyAnalyzerSettings = (settings: unknown): void => {
  if (typeof settings !== 'object' || settings === null) return;
  const analyzer: unknown = Reflect.get(settings, 'analyzer');
  if (typeof analyzer !== 'object' || analyzer === null) return;

  const patch: Partial<AnalyzerSettings> = {};
  const mode: unknown = Reflect.get(analyzer, 'mode');
  if (isMode(mode)) patch.mode = mode;
  for (const key of ['range', 'fftSize', 'decay', 'tilt'] as const) {
    const value: unknown = Reflect.get(analyzer, key);
    if (typeof value === 'number' && Number.isFinite(value)) patch[key] = value;
  }
  useAnalyzerSettingsStore.setState(patch);
};

/** Shows the change at once; C++ keeps it and answers with the settings as kept. */
export const setAnalyzerSetting = <Key extends keyof AnalyzerSettings>(
  key: Key,
  value: AnalyzerSettings[Key],
): void => {
  if (useAnalyzerSettingsStore.getState()[key] === value) return;
  useAnalyzerSettingsStore.setState({ [key]: value });
  void native.setSetting(`analyzer.${key}`, value).then(applyAnalyzerSettings);
};

/** FFT size, decay and tilt back to their defaults; the mode and the range stay. */
export const resetAnalyzerTuning = (): void => {
  setAnalyzerSetting('fftSize', defaultAnalyzerSettings.fftSize);
  setAnalyzerSetting('decay', defaultAnalyzerSettings.decay);
  setAnalyzerSetting('tilt', defaultAnalyzerSettings.tilt);
};
