import type { Section } from '../graph/response-math';
import { type FilterType, slopes } from '../model/filter-types';

// Development only: the band design of dsp/band_design.cpp, so the mock backend can send a response
// packet without the plugin. The plugin itself always uses the C++ design.

const mix = (g: number, q: number, lowpassMix: number, bandpassMix: number, highpassMix: number): Section => ({
  order: 2,
  g,
  q,
  lowpassMix,
  bandpassMix,
  highpassMix,
});

// Butterworth of order slope / 6; the user's q scales the most resonant section.
const designCut = (band: { type: FilterType; q: number; slope: number }, warped: number): Section[] => {
  const order = (slopes[band.slope] ?? 12) / 6;
  const highpass = band.type === 'lcut' ? 1 : 0;
  const sections: Section[] = [];
  if (order % 2 === 1)
    sections.push({ order: 1, g: warped, q: 1, lowpassMix: 1 - highpass, bandpassMix: 0, highpassMix: highpass });

  const pairs = Math.floor(order / 2);
  for (let k = 1; k <= pairs; k++) {
    const angle = order % 2 === 0 ? (Math.PI * (2 * k - 1)) / (2 * order) : (Math.PI * k) / order;
    const q = (1 / (2 * Math.cos(angle))) * (k === pairs ? band.q * Math.SQRT2 : 1);
    sections.push(mix(warped, q, 1 - highpass, 0, highpass));
  }
  return sections;
};

export const mockDesign = (
  band: { type: FilterType; f: number; g: number; q: number; slope: number },
  sampleRate: number,
): Section[] => {
  const warped = Math.tan((Math.PI * Math.min(band.f, 0.49 * sampleRate)) / sampleRate);
  if (band.type === 'lcut' || band.type === 'hcut') return designCut(band, warped);

  const gain = 10 ** (band.g / 20);
  const sqrtGain = 10 ** (band.g / 40);
  const fourthRoot = 10 ** (band.g / 80);
  const single: Record<Exclude<FilterType, 'lcut' | 'hcut'>, Section> = {
    bell: mix(warped, band.q * sqrtGain, 1, gain, 1),
    lshelf: mix(warped / fourthRoot, band.q, gain, sqrtGain, 1),
    hshelf: mix(warped * fourthRoot, band.q, 1, sqrtGain, gain),
    tilt: mix(warped * fourthRoot, band.q, 1 / sqrtGain, 1, sqrtGain),
    notch: mix(warped, band.q, 1, 0, 1),
    bpass: mix(warped, band.q, 0, 1, 0),
  };
  return [single[band.type]];
};
