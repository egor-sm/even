import { type ContinuousField, currentBackend, type ParameterRange } from './backend';

/**
 * Writes band parameters through the JUCE relays (values in parameter units). A continuous edit
 * runs between begin and end: C++ sees it as one host gesture, and one undo step.
 */
export const bandParameters = {
  begin: (slot: number, fields: readonly ContinuousField[]) => currentBackend().parameters.begin(slot, fields),
  end: (slot: number, fields: readonly ContinuousField[]) => currentBackend().parameters.end(slot, fields),
  set: (slot: number, field: ContinuousField, value: number) => currentBackend().parameters.set(slot, field, value),
  setSlope: (slot: number, slopeIndex: number) => currentBackend().parameters.setSlope(slot, slopeIndex),
  setEnabled: (slot: number, enabled: boolean) => currentBackend().parameters.setEnabled(slot, enabled),
};

/** The range of a band parameter in C++, or null until the plugin has sent it. */
export const bandParameterRange = (field: ContinuousField): ParameterRange | null =>
  currentBackend().parameterRange(field);

export const setMute = (muted: boolean): void => currentBackend().parameters.setMute(muted);
