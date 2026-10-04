import * as Juce from '@juce-framework/webview';

import { hasBackend } from './native';
import { setSliderValue } from './slider-values';

type ContinuousField = 'frequency' | 'gain' | 'q';

const relays = (slot: number) => ({
  enabled: Juce.getToggleState(`band${slot}Enabled`),
  slope: Juce.getComboBoxState(`band${slot}Slope`),
  frequency: Juce.getSliderState(`band${slot}Frequency`),
  gain: Juce.getSliderState(`band${slot}Gain`),
  q: Juce.getSliderState(`band${slot}Q`),
});

type BandParameters = {
  begin: (slot: number, fields: readonly ContinuousField[]) => void;
  end: (slot: number, fields: readonly ContinuousField[]) => void;
  set: (slot: number, field: ContinuousField, value: number) => void;
  setSlope: (slot: number, slopeIndex: number) => void;
  setEnabled: (slot: number, enabled: boolean) => void;
};

const relayParameters: BandParameters = {
  begin: (slot, fields) => {
    const states = relays(slot);
    for (const field of fields) states[field].sliderDragStarted();
  },
  end: (slot, fields) => {
    const states = relays(slot);
    for (const field of fields) states[field].sliderDragEnded();
  },
  set: (slot, field, value) => setSliderValue(relays(slot)[field], value),
  setSlope: (slot, slopeIndex) => relays(slot).slope.setChoiceIndex(slopeIndex),
  setEnabled: (slot, enabled) => relays(slot).enabled.setValue(enabled),
};

// Development builds in a plain browser write to the mock backend.
const withMock = (write: (parameters: BandParameters) => void) => {
  if (import.meta.env.DEV) void import('../dev/mock-backend').then(({ mockParameters }) => write(mockParameters));
};

const route =
  <Args extends unknown[]>(write: (parameters: BandParameters, ...args: Args) => void) =>
  (...args: Args): void => {
    if (hasBackend()) write(relayParameters, ...args);
    else withMock((parameters) => write(parameters, ...args));
  };

/**
 * Writes band parameters through the JUCE relays (values in parameter units). A continuous edit
 * runs between begin and end: C++ sees it as one host gesture, and one undo step.
 */
export const bandParameters: BandParameters = {
  begin: route((parameters, slot: number, fields: readonly ContinuousField[]) => parameters.begin(slot, fields)),
  end: route((parameters, slot: number, fields: readonly ContinuousField[]) => parameters.end(slot, fields)),
  set: route((parameters, slot: number, field: ContinuousField, value: number) => parameters.set(slot, field, value)),
  setSlope: route((parameters, slot: number, slopeIndex: number) => parameters.setSlope(slot, slopeIndex)),
  setEnabled: route((parameters, slot: number, enabled: boolean) => parameters.setEnabled(slot, enabled)),
};

export const setMute = (muted: boolean): void => Juce.getToggleState('mute').setValue(muted);
