import { bandsFromResponse, bandsStore } from '../model/bands';
import { uiStore } from '../model/ui';
import { type AnalyzerFrame, decodeBase64Frame } from './frame';
import { native } from './native';
import { decodeBase64Response } from './response';

declare global {
  interface Window {
    /** Called by C++ (PluginEditor::handleAsyncUpdate) via evaluateJavascript for every analyzer frame. */
    evenOnAnalyzerFrame?: (sentAtMs: number, frameBase64: string) => void;
    /** Called by C++ (PluginEditor::timerCallback) whenever the EQ response changes. */
    evenOnResponse?: (responseBase64: string) => void;
    /** Called by C++ (PluginEditor::timerCallback) whenever undo or redo becomes (un)available. */
    evenOnHistory?: (canUndo: boolean, canRedo: boolean) => void;
  }
}

export type FrameListener = (frame: AnalyzerFrame, info: { latencyMs: number; bytes: number }) => void;

const frameListeners = new Set<FrameListener>();

/** Analyzer frames go to the graph directly, outside of the stores: they arrive at 60 Hz. */
export const onAnalyzerFrame = (listener: FrameListener): (() => void) => {
  frameListeners.add(listener);
  return () => frameListeners.delete(listener);
};

const historyState = (value: unknown): { canUndo: boolean; canRedo: boolean } | null => {
  if (typeof value !== 'object' || value === null) return null;
  const canUndo = Reflect.get(value, 'canUndo');
  const canRedo = Reflect.get(value, 'canRedo');
  return typeof canUndo === 'boolean' && typeof canRedo === 'boolean' ? { canUndo, canRedo } : null;
};

export const applyHistory = (value: unknown): void => {
  const state = historyState(value);
  if (state !== null) uiStore.set(state);
};

export const applySettings = (value: unknown): void => {
  if (typeof value !== 'object' || value === null) return;
  const theme = Reflect.get(value, 'theme');
  const scale = Reflect.get(value, 'scale');
  if (theme === 'dark' || theme === 'light') uiStore.set({ theme });
  if (typeof scale === 'number') uiStore.set({ scale });
};

// The analyzer and the response stream only run while the page is visible.
const syncVisibility = () => {
  const visible = document.visibilityState === 'visible';
  void native.setAnalyzerActive(visible);
  if (visible) void native.requestResponse();
};

/** Routes everything C++ sends into the stores; returns the disconnect function. */
export const connectBackend = (): (() => void) => {
  window.evenOnResponse = (base64) => {
    const response = decodeBase64Response(base64);
    if (response === null) return;
    const state = bandsFromResponse(response);
    bandsStore.set(state);

    // Undo, redo or the host may have removed the selected or soloed band.
    const { selected, solo, previewUntilResponse } = uiStore.get();
    const exists = (slot: number | null) => slot !== null && state.bands.some((band) => band.slot === slot);
    if (selected !== null && !exists(selected))
      uiStore.set({ selected: null, strip: false, picker: false, hoverType: null });
    if (solo !== null && !exists(solo)) uiStore.set({ solo: null });
    if (previewUntilResponse) uiStore.set({ preview: null, previewUntilResponse: false });
  };

  window.evenOnHistory = (canUndo, canRedo) => uiStore.set({ canUndo, canRedo });

  window.evenOnAnalyzerFrame = (sentAtMs, base64) => {
    const frame = decodeBase64Frame(base64);
    if (frame === null) return;
    const info = { latencyMs: Date.now() - sentAtMs, bytes: base64.length };
    for (const listener of frameListeners) listener(frame, info);
  };

  document.addEventListener('visibilitychange', syncVisibility);
  syncVisibility();

  void native.getSettings().then(applySettings);
  void native.getHistoryState().then(applyHistory);
  // The analyzer mode lives in C++ without being saved: hand it the page's choice.
  void native.setAnalyzerMode(uiStore.get().analyzerMode);

  return () => {
    document.removeEventListener('visibilitychange', syncVisibility);
    delete window.evenOnResponse;
    delete window.evenOnHistory;
    delete window.evenOnAnalyzerFrame;
  };
};
