import { create } from 'zustand';

import { type AnalyzerMode, native } from '~/shared/api';

export const analyzerModes: readonly { value: AnalyzerMode; label: string; separated?: boolean }[] = [
  { value: 'prepost', label: 'Pre + Post' },
  { value: 'post', label: 'Post' },
  { value: 'pre', label: 'Pre' },
  { value: 'off', label: 'Off', separated: true },
];

/** The analyzer mode lives in C++ without being saved: the page holds it and hands it over. */
export const useAnalyzerModeStore = create<{ mode: AnalyzerMode }>()(() => ({ mode: 'prepost' }));

export const setAnalyzerMode = (mode: AnalyzerMode): void => {
  useAnalyzerModeStore.setState({ mode });
  void native.setAnalyzerMode(mode);
};

/** Hands the page's mode to C++ (after the page loads). */
export const syncAnalyzerMode = (): void => void native.setAnalyzerMode(useAnalyzerModeStore.getState().mode);
