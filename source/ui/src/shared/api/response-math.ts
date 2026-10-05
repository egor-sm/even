import type { Section } from './section';

/** Floors the result so a notch center (|H| = 0) is a very deep finite value, not -Infinity. */
const minMagnitudeSquared = 1e-30;

/** |H|^2 of one section at the given warped frequency tan(pi * f / sampleRate). */
const sectionMagnitudeSquared = (
  { order, g, q, lowpassMix, bandpassMix, highpassMix }: Section,
  warped: number,
): number => {
  const w = warped / g;

  // With s = j w: numerator = lowpassMix + j highpassMix w, denominator = 1 + j w.
  if (order === 1) return (lowpassMix ** 2 + (highpassMix * w) ** 2) / (1 + w * w);

  // With s = j w: numerator = (lowpassMix - highpassMix w^2) + j (bandpassMix w / q),
  //               denominator = (1 - w^2) + j (w / q).
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

export const responseDb = (sections: readonly Section[], frequencies: readonly number[], sampleRate: number) =>
  Float64Array.from(frequencies, (hz) => magnitudeDb(sections, hz, sampleRate));

/**
 * Frequencies to evaluate the curves at: the given ones plus every band frequency exactly, so a
 * narrow bell peaks precisely at its node and a notch dips at its true centre.
 */
export const withBandFrequencies = (frequencies: readonly number[], bands: readonly { f: number }[]): number[] => {
  const low = frequencies[0] ?? 0;
  const high = frequencies.at(-1) ?? 0;
  const extra = bands.map((band) => band.f).filter((hz) => hz > low && hz < high);
  return [...frequencies, ...extra].toSorted((a, b) => a - b);
};
