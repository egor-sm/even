import * as Juce from '@juce-framework/webview';

import { setSliderValue } from './slider-values';

type ContinuousField = 'frequency' | 'gain' | 'q';

const relays = (slot: number) => ({
  enabled: Juce.getToggleState(`band${slot}Enabled`),
  slope: Juce.getComboBoxState(`band${slot}Slope`),
  frequency: Juce.getSliderState(`band${slot}Frequency`),
  gain: Juce.getSliderState(`band${slot}Gain`),
  q: Juce.getSliderState(`band${slot}Q`),
});

/**
 * Writes band parameters through the JUCE relays (values in parameter units). A continuous edit
 * runs between begin and end: C++ sees it as one host gesture, and one undo step.
 */
export const bandParameters = {
  begin: (slot: number, fields: readonly ContinuousField[]): void => {
    const states = relays(slot);
    for (const field of fields) states[field].sliderDragStarted();
  },
  end: (slot: number, fields: readonly ContinuousField[]): void => {
    const states = relays(slot);
    for (const field of fields) states[field].sliderDragEnded();
  },
  set: (slot: number, field: ContinuousField, value: number): void => setSliderValue(relays(slot)[field], value),
  setSlope: (slot: number, slopeIndex: number): void => relays(slot).slope.setChoiceIndex(slopeIndex),
  setEnabled: (slot: number, enabled: boolean): void => relays(slot).enabled.setValue(enabled),
};

export const setMute = (muted: boolean): void => Juce.getToggleState('mute').setValue(muted);
