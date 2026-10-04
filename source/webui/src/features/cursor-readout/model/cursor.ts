import { createStore, type Point } from '~/shared/lib';

/** The pointer over the empty graph (graph units), for the crosshair. */
export const cursorStore = createStore<{ point: Point | null }>({ point: null });

export const setCursor = (point: Point | null): void => cursorStore.set({ point });
