import { useCallback, useEffect, useState } from 'react';

import { native } from './native';

declare global {
  interface Window {
    /** Called by C++ (PluginEditor::timerCallback) whenever undo or redo becomes (un)available. */
    evenOnHistory?: (canUndo: boolean, canRedo: boolean) => void;
  }
}

export type HistoryState = { canUndo: boolean; canRedo: boolean };

const isHistoryState = (value: unknown): value is HistoryState =>
  typeof value === 'object' &&
  value !== null &&
  typeof Reflect.get(value, 'canUndo') === 'boolean' &&
  typeof Reflect.get(value, 'canRedo') === 'boolean';

/** Undo and redo of band edits (kept in C++, see BandHistory), with Cmd/Ctrl+Z and Shift+Cmd/Ctrl+Z. */
export const useHistory = () => {
  const [state, setState] = useState<HistoryState>({ canUndo: false, canRedo: false });

  const update = useCallback((result: unknown) => {
    if (isHistoryState(result)) setState(result);
  }, []);
  const undo = useCallback(() => void native.undo().then(update), [update]);
  const redo = useCallback(() => void native.redo().then(update), [update]);

  useEffect(() => {
    window.evenOnHistory = (canUndo, canRedo) => setState({ canUndo, canRedo });
    native
      .getHistoryState()
      .then(update)
      .catch(() => {});

    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'z') return;
      event.preventDefault();
      if (event.shiftKey) redo();
      else undo();
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      delete window.evenOnHistory;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [undo, redo, update]);

  return { ...state, undo, redo };
};
