/**
 * Ranges and mappings of the band parameters; must match parameters.h / parameters.cpp.
 *
 * The JUCE web bridge only knows power-law (skew) ranges, so slider positions of parameters with a
 * true logarithmic range on the C++ side (frequency, q: see logarithmicRange in parameters.cpp) are
 * computed here; values themselves cross the bridge in parameter units (see slider-values.ts).
 */
export type ParameterScale = 'linear' | 'logarithmic';

export const bandRanges = {
  frequencyHz: { min: 20, max: 20000 },
  gainDb: { min: -24, max: 24 },
  q: { min: 0.1, max: 40 },
} as const;

const clamp01 = (value: number) => Math.min(Math.max(value, 0), 1);

export const logarithmicFromNormalised = (normalised: number, start: number, end: number): number =>
  start * (end / start) ** normalised;

export const logarithmicToNormalised = (value: number, start: number, end: number): number => {
  // Before the bridge delivers the real range its defaults (start 0) would make this NaN.
  if (!(start > 0 && end > start && value > 0)) return 0;
  return clamp01(Math.log(value / start) / Math.log(end / start));
};

export const linearToNormalised = (value: number, start: number, end: number): number =>
  clamp01((value - start) / (end - start));
