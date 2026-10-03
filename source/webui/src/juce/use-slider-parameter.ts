import * as Juce from '@juce-framework/webview';
import { useCallback, useMemo, useSyncExternalStore } from 'react';

import { logarithmicFromNormalised, type ParameterScale } from './parameter-scales';

export type SliderParameter = {
  /** Value in the parameter's own units (Hz, dB, ...). */
  value: number;
  /** Value in [0, 1]; what a slider control should move linearly. */
  normalised: number;
  setNormalised: (value: number) => void;
  /** Call around user interaction so hosts record automation as a single gesture. */
  beginGesture: () => void;
  endGesture: () => void;
};

/** Binds to a WebSliderRelay on the C++ side. `scale` must match the parameter's C++ range. */
export const useSliderParameter = (name: string, scale: ParameterScale = 'linear'): SliderParameter => {
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
  const value = useSyncExternalStore(subscribe, () =>
    scale === 'logarithmic'
      ? logarithmicFromNormalised(state.getNormalisedValue(), state.properties.start, state.properties.end)
      : state.getScaledValue(),
  );

  return {
    value,
    normalised,
    setNormalised: useCallback((next: number) => state.setNormalisedValue(next), [state]),
    beginGesture: useCallback(() => state.sliderDragStarted(), [state]),
    endGesture: useCallback(() => state.sliderDragEnded(), [state]),
  };
};
