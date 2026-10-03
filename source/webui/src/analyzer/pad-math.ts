import { bandRanges } from '../juce/parameter-scales';
import type { SpectrumScale } from './scale';

export type PadValue = { frequencyHz: number; gainDb: number };
export type PadPoint = { x: number; y: number };
export type PadNode = PadPoint & { band: number };

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/** Graph position (device pixels) to band values, clamped to the parameter ranges. */
export const pointToValue = (scale: SpectrumScale, { x, y }: PadPoint): PadValue => {
  const { eqDb } = scale.range;
  const { frequencyHz, gainDb } = bandRanges;

  return {
    frequencyHz: clamp(scale.frequencyAt(x), frequencyHz.min, frequencyHz.max),
    gainDb: clamp(eqDb - (y / scale.height) * 2 * eqDb, gainDb.min, gainDb.max),
  };
};

/** Band values to graph position (device pixels). */
export const valueToPoint = (scale: SpectrumScale, { frequencyHz, gainDb }: PadValue): PadPoint => ({
  x: scale.x(frequencyHz),
  y: scale.eqY(gainDb),
});

/**
 * The node under the pointer: within `radius` of its center. Overlapping nodes prefer the selected
 * band, then the closest one.
 */
export const findNode = (
  nodes: readonly PadNode[],
  pointer: PadPoint,
  radius: number,
  selectedBand: number,
): number | null => {
  let best: { band: number; distance: number } | null = null;

  for (const node of nodes) {
    const distance = Math.hypot(node.x - pointer.x, node.y - pointer.y);
    if (distance > radius) continue;
    if (node.band === selectedBand) return node.band;
    if (best === null || distance < best.distance) best = { band: node.band, distance };
  }

  return best?.band ?? null;
};
