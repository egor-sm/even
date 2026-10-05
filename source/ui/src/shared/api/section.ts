/**
 * One filter section as designed in C++ (dsp::Section). Its transfer function, with s normalized so
 * that s = j at the section's cutoff:
 *   order 2: H(s) = (lowpassMix + bandpassMix * s / q + highpassMix * s^2) / (s^2 + s / q + 1)
 *   order 1: H(s) = (lowpassMix + highpassMix * s) / (s + 1)
 * evaluated at s = j * tan(pi * f / sampleRate) / g (the bilinear-warped frequency).
 */
export type Section = {
  order: 1 | 2;
  g: number;
  q: number;
  lowpassMix: number;
  bandpassMix: number;
  highpassMix: number;
};

/** Sections sent as plain objects (previewBand), or null when the value is not a list of them. */
export const toSections = (value: unknown): Section[] | null => {
  if (!Array.isArray(value)) return null;
  const sections: Section[] = [];
  for (const item of value) {
    if (typeof item !== 'object' || item === null) return null;
    const field = (name: string) => Number(Reflect.get(item, name));
    sections.push({
      order: field('order') === 1 ? 1 : 2,
      g: field('g'),
      q: field('q'),
      lowpassMix: field('lowpassMix'),
      bandpassMix: field('bandpassMix'),
      highpassMix: field('highpassMix'),
    });
  }
  return sections.every((section) => Number.isFinite(section.g) && Number.isFinite(section.q)) ? sections : null;
};
