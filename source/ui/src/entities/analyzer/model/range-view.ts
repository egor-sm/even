import { create } from 'zustand';

import { useAnalyzerSettingsStore } from './settings';

/** Of the remaining distance per frame: about 150 ms to settle. */
const rangeFollow = 0.3;

/** The range the spectrum and the scale are drawn with: it glides to the set one. */
export const useAnalyzerViewStore = create<{ range: number }>()(() => ({
  range: useAnalyzerSettingsStore.getState().range,
}));

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Moves the drawn range towards the set one while they differ; returns the stop. */
export const startAnalyzerRangeAnimator = (): (() => void) => {
  let frame: number | null = null;

  const step = () => {
    frame = null;
    const target = useAnalyzerSettingsStore.getState().range;
    const shown = useAnalyzerViewStore.getState().range;
    let next = shown + (target - shown) * rangeFollow;
    if (reducedMotion() || Math.abs(target - next) < 0.05) next = target;
    useAnalyzerViewStore.setState({ range: next });
    if (next !== target) frame = requestAnimationFrame(step);
  };

  const unsubscribe = useAnalyzerSettingsStore.subscribe((settings) => {
    if (settings.range !== useAnalyzerViewStore.getState().range && frame === null) frame = requestAnimationFrame(step);
  });

  return () => {
    unsubscribe();
    if (frame !== null) cancelAnimationFrame(frame);
  };
};
