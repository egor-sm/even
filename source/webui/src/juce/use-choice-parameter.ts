import * as Juce from '@juce-framework/webview';
import { useCallback, useMemo, useSyncExternalStore } from 'react';

export type ChoiceParameter = {
  index: number;
  choices: string[];
  setIndex: (index: number) => void;
};

/** Binds to a WebComboBoxRelay on the C++ side (an AudioParameterChoice). */
export const useChoiceParameter = (name: string): ChoiceParameter => {
  const state = useMemo(() => Juce.getComboBoxState(name), [name]);

  const subscribe = useCallback(
    (onChange: () => void) => {
      const valueListener = state.valueChangedEvent.addListener(onChange);
      const propertiesListener = state.propertiesChangedEvent.addListener(onChange);
      return () => {
        state.valueChangedEvent.removeListener(valueListener);
        state.propertiesChangedEvent.removeListener(propertiesListener);
      };
    },
    [state],
  );

  const index = useSyncExternalStore(subscribe, () => state.getChoiceIndex());
  const choices = useSyncExternalStore(subscribe, () => state.properties.choices);

  return { index, choices, setIndex: useCallback((next: number) => state.setChoiceIndex(next), [state]) };
};
