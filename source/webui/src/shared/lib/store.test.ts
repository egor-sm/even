import { describe, expect, it } from 'vite-plus/test';

import { createStore, shallowEqual } from './store';

describe('store', () => {
  it('merges updates and notifies subscribers', () => {
    const store = createStore({ a: 1, b: 'x' });
    const seen: number[] = [];
    const unsubscribe = store.subscribe(() => seen.push(store.get().a));

    store.set({ a: 2 });
    store.set((state) => ({ a: state.a + 1 }));
    unsubscribe();
    store.set({ a: 10 });

    expect(seen).toEqual([2, 3]);
    expect(store.get()).toEqual({ a: 10, b: 'x' });
  });

  it('compares objects shallowly', () => {
    const shared = [1];
    expect(shallowEqual({ x: 1, list: shared }, { x: 1, list: shared })).toBe(true);
    expect(shallowEqual({ x: 1, list: [1] }, { x: 1, list: [1] })).toBe(false);
    expect(shallowEqual({ x: 1 }, { x: 1, y: 2 })).toBe(false);
  });
});
