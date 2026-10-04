import { useRef, useSyncExternalStore } from 'react';

export type Store<State> = {
  get: () => State;
  /** Merges the given fields (or the fields returned for the current state) into a new state. */
  set: (update: Partial<State> | ((state: State) => Partial<State>)) => void;
  /** Calls the listener after every change; returns the unsubscribe function. */
  subscribe: (listener: () => void) => () => void;
};

export const createStore = <State extends object>(initial: State): Store<State> => {
  let state = initial;
  const listeners = new Set<() => void>();

  return {
    get: () => state,
    set: (update) => {
      const patch = typeof update === 'function' ? update(state) : update;
      state = { ...state, ...patch };
      for (const listener of listeners) listener();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
};

export const shallowEqual = <Value>(a: Value, b: Value): boolean => {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;

  const keysA = Object.keys(a);
  if (keysA.length !== Object.keys(b).length) return false;
  return keysA.every((key) => Object.is(Reflect.get(a, key), Reflect.get(b, key)));
};

/**
 * The part of a store a component renders. It re-renders only when the selected value changes
 * (by `equal`), so selectors may build new objects as long as `equal` compares them by content.
 */
export const useStore = <State, Selected>(
  store: Store<State>,
  selector: (state: State) => Selected,
  equal: (a: Selected, b: Selected) => boolean = Object.is,
): Selected => {
  const cache = useRef<{ state: State; selector: (state: State) => Selected; value: Selected } | null>(null);

  const getSnapshot = (): Selected => {
    const state = store.get();
    const cached = cache.current;
    if (cached !== null && cached.state === state && cached.selector === selector) return cached.value;

    const selected = selector(state);
    const value = cached !== null && equal(cached.value, selected) ? cached.value : selected;
    cache.current = { state, selector, value };
    return value;
  };

  return useSyncExternalStore(store.subscribe, getSnapshot);
};
