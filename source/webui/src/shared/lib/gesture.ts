import { createStore } from './store';

export type Point = { x: number; y: number };

/** What other parts of the UI may know about the gesture in progress (e.g. to hide while dragging). */
export type GestureInfo = { kind: string; slot?: number; field?: string; moved?: boolean };

export type GestureHandlers = {
  move: (point: Point, modifiers: { shiftKey: boolean }) => void;
  end: () => void;
};

export const gestureStore = createStore<{ active: GestureInfo | null }>({ active: null });

let handlers: GestureHandlers | null = null;

/**
 * One pointer gesture at a time: the element that starts it captures the pointer, and whatever
 * area receives the pointer events forwards them here (moveGesture, endGesture).
 */
export const startGesture = (info: GestureInfo, gestureHandlers: GestureHandlers): void => {
  handlers?.end();
  handlers = gestureHandlers;
  gestureStore.set({ active: info });
};

export const updateGesture = (patch: Partial<GestureInfo>): void =>
  gestureStore.set(({ active }) => ({ active: active === null ? null : { ...active, ...patch } }));

export const moveGesture = (point: Point, modifiers: { shiftKey: boolean }): void => handlers?.move(point, modifiers);

export const endGesture = (): void => {
  const ending = handlers;
  handlers = null;
  gestureStore.set({ active: null });
  ending?.end();
};
