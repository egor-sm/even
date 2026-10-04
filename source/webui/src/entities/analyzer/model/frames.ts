import type { AnalyzerFrame } from '~/shared/api';

export type FrameListener = (frame: AnalyzerFrame, info: { latencyMs: number; bytes: number }) => void;

const listeners = new Set<FrameListener>();

/** Analyzer frames go to their listeners directly, outside of the stores: they arrive at 60 Hz. */
export const onAnalyzerFrame = (listener: FrameListener): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const publishAnalyzerFrame = (frame: AnalyzerFrame, info: { latencyMs: number; bytes: number }): void => {
  for (const listener of listeners) listener(frame, info);
};
