import * as Juce from '@juce-framework/webview';
import { useCallback, useMemo, useSyncExternalStore } from 'react';

/** Binds to a WebToggleButtonRelay on the C++ side; returns the value and a setter. */
export const useToggleParameter = (name: string): [boolean, (value: boolean) => void] => {
  const state = useMemo(() => Juce.getToggleState(name), [name]);

  const subscribe = useCallback(
    (onChange: () => void) => {
      const id = state.valueChangedEvent.addListener(onChange);
      return () => state.valueChangedEvent.removeListener(id);
    },
    [state],
  );

  const value = useSyncExternalStore(subscribe, () => state.getValue());
  const setValue = useCallback((next: boolean) => state.setValue(next), [state]);

  return [value, setValue];
};
