/**
 * The JUCE web bridge only knows power-law (skew) ranges, so parameters with a true logarithmic
 * range on the C++ side (frequency, q: see parameters.cpp, logarithmicRange) are mapped here.
 */
export type ParameterScale = 'linear' | 'logarithmic';

export const logarithmicFromNormalised = (normalised: number, start: number, end: number): number =>
  start * (end / start) ** normalised;
