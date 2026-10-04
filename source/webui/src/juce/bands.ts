import * as Juce from '@juce-framework/webview';

/** Must match parameters::numBands on the C++ side. */
export const numBands = 12;

/** Parameter ID of a band field, e.g. bandId(3, 'Gain') === 'band3Gain'. */
export const bandId = (band: number, field: 'Used' | 'Enabled' | 'Shape' | 'Frequency' | 'Gain' | 'Q' | 'Slope') =>
  `band${band}${field}`;

/** Shape choice indices that use the gain parameter (Bell, Low Shelf, High Shelf, Tilt Shelf; see parameters.h). */
export const shapeUsesGain = (shapeIndex: number) => shapeIndex <= 2 || shapeIndex === 7;

/** The relay states of one band (the JUCE bridge caches them by name). */
export const bandStates = (band: number) => ({
  used: Juce.getToggleState(bandId(band, 'Used')),
  enabled: Juce.getToggleState(bandId(band, 'Enabled')),
  shape: Juce.getComboBoxState(bandId(band, 'Shape')),
  frequency: Juce.getSliderState(bandId(band, 'Frequency')),
  gain: Juce.getSliderState(bandId(band, 'Gain')),
  q: Juce.getSliderState(bandId(band, 'Q')),
});
