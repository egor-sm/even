import { create } from 'zustand';

import { type Point } from '~/shared/lib';

/** The pointer over the empty graph (graph units), for the crosshair. */
export const useCursorStore = create<{ point: Point | null }>()(() => ({ point: null }));

export const setCursor = (point: Point | null): void => useCursorStore.setState({ point });
