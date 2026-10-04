import { publishAnalyzerFrame } from '~/entities/analyzer';
import { receiveResponse } from '~/entities/band';
import { syncAnalyzerMode } from '~/features/analyzer-mode';
import { applySettings } from '~/features/settings';
import { syncSoloWithBackend } from '~/features/solo-band';
import { applyHistory, useHistoryStore } from '~/features/undo-redo';
import { decodeBase64Frame, decodeBase64Response, native } from '~/shared/api';

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

// The analyzer and the response stream only run while the page is visible.
const syncVisibility = () => {
  const visible = document.visibilityState === 'visible';
  void native.setAnalyzerActive(visible);
  if (visible) void native.requestResponse();
};

/** Routes everything C++ sends to where it belongs and hands C++ the page's state; returns the disconnect. */
export const connectBackend = (): (() => void) => {
  window.evenOnResponse = (base64) => {
    const response = decodeBase64Response(base64);
    if (response !== null) receiveResponse(response);
  };

  window.evenOnHistory = (canUndo, canRedo) => useHistoryStore.setState({ canUndo, canRedo });

  window.evenOnAnalyzerFrame = (sentAtMs, base64) => {
    const frame = decodeBase64Frame(base64);
    if (frame !== null) publishAnalyzerFrame(frame, { latencyMs: Date.now() - sentAtMs, bytes: base64.length });
  };

  const stopSoloSync = syncSoloWithBackend();
  document.addEventListener('visibilitychange', syncVisibility);
  syncVisibility();

  void native.getSettings().then(applySettings);
  void native.getHistoryState().then(applyHistory);
  syncAnalyzerMode();

  return () => {
    stopSoloSync();
    document.removeEventListener('visibilitychange', syncVisibility);
    delete window.evenOnResponse;
    delete window.evenOnHistory;
    delete window.evenOnAnalyzerFrame;
  };
};
