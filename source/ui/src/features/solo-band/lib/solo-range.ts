import { type FilterType, qToOctaves } from '~/entities/band';
import { maxHz, minHz } from '~/entities/viewport';
import { clamp } from '~/shared/lib';

// Same rule as model::soloRange in C++, which decides what solo lets through: the UI lights exactly that.
/** The frequency range a band works on: lit while the band is soloed (and what solo lets through). */
export const soloRange = (band: { type: FilterType; f: number; q: number }): [number, number] => {
  const { type, f } = band;
  if (type === 'lcut' || type === 'lshelf') return [minHz, Math.min(maxHz, f * Math.SQRT2)];
  if (type === 'hcut' || type === 'hshelf') return [Math.max(minHz, f / Math.SQRT2), maxHz];
  if (type === 'tilt') return [Math.max(minHz, f / 8), Math.min(maxHz, f * 8)];

  const half = clamp(qToOctaves(band.q) * 0.75, 0.2, 3);
  return [Math.max(minHz, f / 2 ** half), Math.min(maxHz, f * 2 ** half)];
};
