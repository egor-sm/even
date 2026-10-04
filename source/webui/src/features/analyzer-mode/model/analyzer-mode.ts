import { type AnalyzerMode, native } from '~/shared/api';
import { createStore } from '~/shared/lib';

export const analyzerModes: readonly { mode: AnalyzerMode; name: string }[] = [
  { mode: 'prepost', name: 'Pre + Post' },
  { mode: 'post', name: 'Post' },
  { mode: 'pre', name: 'Pre' },
  { mode: 'off', name: 'Off' },
];

/** The analyzer mode lives in C++ without being saved: the page holds it and hands it over. */
export const analyzerModeStore = createStore<{ mode: AnalyzerMode }>({ mode: 'prepost' });

export const setAnalyzerMode = (mode: AnalyzerMode): void => {
  analyzerModeStore.set({ mode });
  void native.setAnalyzerMode(mode);
};

/** Hands the page's mode to C++ (after the page loads). */
export const syncAnalyzerMode = (): void => void native.setAnalyzerMode(analyzerModeStore.get().mode);
