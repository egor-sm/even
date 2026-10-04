/**
 * Values travel across the JUCE web bridge in parameter units ("scaled": Hz, dB, ...). The bridge's
 * own normalised value only knows power-law (skew) ranges, so it does not match parameters with a
 * custom mapping on the C++ side (our logarithmic frequency and q). Always read and write values in
 * parameter units and convert to slider positions in the UI.
 */
export type SliderRange = { start: number; end: number; skew: number };

/** The bridge's normalisation (mirrors SliderState.getNormalisedValue in @juce-framework/webview). */
export const bridgeNormalised = (value: number, { start, end, skew }: SliderRange): number =>
  Math.min(Math.max((value - start) / (end - start), 0), 1) ** skew;

/** The bridge's inverse (mirrors SliderState.normalisedToScaledValue). */
export const bridgeScaled = (normalised: number, { start, end, skew }: SliderRange): number =>
  normalised ** (1 / skew) * (end - start) + start;

type BridgeSlider = {
  properties: SliderRange;
  setNormalisedValue: (normalised: number) => void;
};

/** Sets a slider relay to `value` in parameter units. */
export const setSliderValue = (state: BridgeSlider, value: number): void =>
  state.setNormalisedValue(bridgeNormalised(value, state.properties));
