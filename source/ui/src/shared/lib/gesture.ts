import { create } from 'zustand';

export type Point = { x: number; y: number };

/** What other parts of the UI may know about the gesture in progress (e.g. to hide while dragging). */
export type GestureInfo = { kind: string; slot?: number; field?: string; moved?: boolean };

export type GestureHandlers = {
  move: (point: Point, modifiers: { shiftKey: boolean }) => void;
  end: () => void;
};

export const useGestureStore = create<{ active: GestureInfo | null }>()(() => ({ active: null }));

let handlers: GestureHandlers | null = null;

/**
 * One pointer gesture at a time: the element that starts it captures the pointer, and whatever
 * area receives the pointer events forwards them here (moveGesture, endGesture).
 */
export const startGesture = (info: GestureInfo, gestureHandlers: GestureHandlers): void => {
  handlers?.end();
  handlers = gestureHandlers;
  useGestureStore.setState({ active: info });
};

export const updateGesture = (patch: Partial<GestureInfo>): void =>
  useGestureStore.setState(({ active }) => ({ active: active === null ? null : { ...active, ...patch } }));

export const moveGesture = (point: Point, modifiers: { shiftKey: boolean }): void => handlers?.move(point, modifiers);

export const endGesture = (): void => {
  const ending = handlers;
  handlers = null;
  useGestureStore.setState({ active: null });
  ending?.end();
};
