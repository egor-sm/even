import { create } from 'zustand';

import { native } from '~/shared/api';

/** Whether C++ (BandHistory) has steps to undo and redo. */
export const useHistoryStore = create<{ canUndo: boolean; canRedo: boolean }>()(() => ({
  canUndo: false,
  canRedo: false,
}));

/** Takes {canUndo, canRedo} as C++ answers it; anything else is ignored. */
export const applyHistory = (value: unknown): void => {
  if (typeof value !== 'object' || value === null) return;
  const canUndo = Reflect.get(value, 'canUndo');
  const canRedo = Reflect.get(value, 'canRedo');
  if (typeof canUndo === 'boolean' && typeof canRedo === 'boolean') useHistoryStore.setState({ canUndo, canRedo });
};

export const undo = (): void => void native.undo().then(applyHistory);
export const redo = (): void => void native.redo().then(applyHistory);
