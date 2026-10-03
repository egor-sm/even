import * as Juce from '@juce-framework/webview';
import { useCallback, useMemo, useSyncExternalStore } from 'react';

import {
  linearToNormalised,
  logarithmicFromNormalised,
  logarithmicToNormalised,
  type ParameterScale,
} from './parameter-scales';
import { setSliderValue } from './slider-values';

export type SliderParameter = {
  /** Value in the parameter's own units (Hz, dB, ...). */
  value: number;
  /** Slider position in [0, 1] on the parameter's scale (logarithmic for frequency and q). */
  position: number;
  setPosition: (position: number) => void;
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

  const value = useSyncExternalStore(subscribe, () => state.getScaledValue());
  const start = useSyncExternalStore(subscribe, () => state.properties.start);
  const end = useSyncExternalStore(subscribe, () => state.properties.end);

  const position =
    scale === 'logarithmic' ? logarithmicToNormalised(value, start, end) : linearToNormalised(value, start, end);

  const setPosition = useCallback(
    (next: number) =>
      setSliderValue(
        state,
        scale === 'logarithmic' ? logarithmicFromNormalised(next, start, end) : start + next * (end - start),
      ),
    [state, scale, start, end],
  );

  return {
    value,
    position,
    setPosition,
    beginGesture: useCallback(() => state.sliderDragStarted(), [state]),
    endGesture: useCallback(() => state.sliderDragEnded(), [state]),
  };
};
