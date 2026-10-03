/**
 * One filter section as designed in C++ (dsp::Section). Its transfer function, with s normalized so
 * that s = j at the section's cutoff:
 *   H(s) = (lowpassMix + bandpassMix * s / q + highpassMix * s^2) / (s^2 + s / q + 1)
 * evaluated at s = j * tan(pi * f / sampleRate) / g (the bilinear-warped frequency).
 */
export type Section = {
  g: number;
  q: number;
  lowpassMix: number;
  bandpassMix: number;
  highpassMix: number;
};

/** Floors the result so a notch center (|H| = 0) is a very deep finite value, not -Infinity. */
const minMagnitudeSquared = 1e-30;

/** |H|^2 of one section at the given warped frequency tan(pi * f / sampleRate). */
const sectionMagnitudeSquared = ({ g, q, lowpassMix, bandpassMix, highpassMix }: Section, warped: number): number => {
  // With s = j w: numerator = (lowpassMix - highpassMix w^2) + j (bandpassMix w / q),
  //               denominator = (1 - w^2) + j (w / q).
  const w = warped / g;
  const numeratorReal = lowpassMix - highpassMix * w * w;
  const numeratorImaginary = (bandpassMix * w) / q;
  const denominatorReal = 1 - w * w;
  const denominatorImaginary = w / q;

  return (numeratorReal ** 2 + numeratorImaginary ** 2) / (denominatorReal ** 2 + denominatorImaginary ** 2);
};

/** Magnitude response of sections in series at frequencyHz, in dB. Frequencies are kept below Nyquist. */
export const magnitudeDb = (sections: readonly Section[], frequencyHz: number, sampleRate: number): number => {
  const frequency = Math.min(frequencyHz, 0.4999 * sampleRate);
  const warped = Math.tan((Math.PI * frequency) / sampleRate);

  let magnitudeSquared = 1;
  for (const section of sections) magnitudeSquared *= sectionMagnitudeSquared(section, warped);

  return 10 * Math.log10(Math.max(magnitudeSquared, minMagnitudeSquared));
};
