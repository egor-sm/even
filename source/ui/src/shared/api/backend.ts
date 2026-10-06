import * as Juce from '@juce-framework/webview';

import { setSliderValue } from './slider-values';

export type ContinuousField = 'frequency' | 'gain' | 'q';

/** The values a band parameter can take, in parameter units. */
export type ParameterRange = { min: number; max: number };

/** Writes of band parameters (values in parameter units). */
export type ParameterWriter = {
  begin: (slot: number, fields: readonly ContinuousField[]) => void;
  end: (slot: number, fields: readonly ContinuousField[]) => void;
  set: (slot: number, field: ContinuousField, value: number) => void;
  setSlope: (slot: number, slopeIndex: number) => void;
  setEnabled: (slot: number, enabled: boolean) => void;
  setMute: (muted: boolean) => void;
};

/** What the page talks to: the plugin, or a stand-in (see setBackend). */
export type Backend = {
  call: (name: string, args: unknown[]) => Promise<unknown>;
  parameters: ParameterWriter;
  /** The range of a band parameter (every band has the same ranges), or null while it is not known. */
  parameterRange: (field: ContinuousField) => ParameterRange | null;
};

/** Whether the page runs inside the plugin (the JUCE backend announced its native functions). */
export const hasPluginBackend = (): boolean => {
  const juce: unknown = Reflect.get(window, '__JUCE__');
  const functions: unknown =
    typeof juce === 'object' && juce !== null
      ? Reflect.get(Reflect.get(juce, 'initialisationData') ?? {}, '__juce__functions')
      : undefined;
  return Array.isArray(functions) && functions.includes('getPluginInfo');
};

const relays = (slot: number) => ({
  enabled: Juce.getToggleState(`band${slot}Enabled`),
  slope: Juce.getComboBoxState(`band${slot}Slope`),
  frequency: Juce.getSliderState(`band${slot}Frequency`),
  gain: Juce.getSliderState(`band${slot}Gain`),
  q: Juce.getSliderState(`band${slot}Q`),
});

/** The plugin: native functions and the JUCE parameter relays. */
const pluginBackend: Backend = {
  // A plain browser has no backend: calls then resolve to undefined instead of hanging.
  call: (name, args) =>
    hasPluginBackend() ? Juce.getNativeFunction(name)(...args).catch(() => undefined) : Promise.resolve(undefined),
  parameters: {
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
    setMute: (muted) => Juce.getToggleState('mute').setValue(muted),
  },
  // Band 1's relays will do: every band has the same ranges. JUCE sends a relay its parameter's range
  // when the page asks for the relay's state; until then it holds placeholders (0…1, parameter index −1).
  parameterRange: (field) => {
    const { start, end, parameterIndex } = relays(1)[field].properties;
    return parameterIndex < 0 ? null : { min: start, max: end };
  },
};

let backend = pluginBackend;

/** Replaces the plugin with a stand-in (development in a plain browser). */
export const setBackend = (replacement: Backend): void => {
  backend = replacement;
};

export const currentBackend = (): Backend => backend;
