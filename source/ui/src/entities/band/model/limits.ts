import { bandParameterRange } from '~/shared/api';
import { clamp } from '~/shared/lib';

/**
 * The gain an edit sets: in 0.1 dB steps, within the display range (±range) and the gain parameter's
 * range, so the preview never shows a gain C++ would not take. Until the plugin has sent that range,
 * the display range alone limits the edit.
 */
export const clampGain = (db: number, range: number): number => {
  const parameter = bandParameterRange('gain');
  const low = Math.max(-range, parameter?.min ?? -range);
  const high = Math.min(range, parameter?.max ?? range);
  return clamp(Math.round(db * 10) / 10, low, high);
};
