import * as Juce from '@juce-framework/webview';
import { useCallback, useMemo, useSyncExternalStore } from 'react';

export type SliderParameter = {
  /** Value in the parameter's own units (NormalisableRange::convertFrom0to1 on the C++ side). */
  value: number;
  /** Value in [0, 1]; what a slider control should move linearly. */
  normalised: number;
  setNormalised: (value: number) => void;
  /** Call around user interaction so hosts record automation as a single gesture. */
  beginGesture: () => void;
  endGesture: () => void;
};

/** Binds to a WebSliderRelay on the C++ side. */
export const useSliderParameter = (name: string): SliderParameter => {
  const state = useMemo(() => Juce.getSliderState(name), [name]);

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

  const normalised = useSyncExternalStore(subscribe, () => state.getNormalisedValue());
  const value = useSyncExternalStore(subscribe, () => state.getScaledValue());

  return {
    value,
    normalised,
    setNormalised: useCallback((next: number) => state.setNormalisedValue(next), [state]),
    beginGesture: useCallback(() => state.sliderDragStarted(), [state]),
    endGesture: useCallback(() => state.sliderDragEnded(), [state]),
  };
};
