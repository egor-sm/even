import { type FilterType, hasGain } from '~/entities/band';
import { maxRange, minRange } from '~/entities/viewport';
import { clamp } from '~/shared/lib';

/** Range that fits the largest gain of the enabled bands with 20 % headroom, snapped. */
export const fitRange = (bands: readonly { type: FilterType; g: number; on: boolean }[]): number => {
  let largest = 0;
  for (const band of bands) if (band.on && hasGain(band.type)) largest = Math.max(largest, Math.abs(band.g));
  return [3, 6, 9, 12, 18, 24, 30, 36].find((range) => range >= largest * 1.2 + 0.5) ?? maxRange;
};

/** One wheel step on the dB axis: by 1 up to ±12, by 3 above. */
export const wheelRange = (range: number, up: boolean): number => {
  const step = range < 12 || (range === 12 && up) ? 1 : 3;
  return clamp(range + (up ? -step : step), minRange, maxRange);
};
