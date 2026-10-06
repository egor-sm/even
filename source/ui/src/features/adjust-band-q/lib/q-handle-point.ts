import { qToOctaves } from '~/entities/band';
import { type Mapper, maxHz, minHz } from '~/entities/viewport';
import { clamp, type Point } from '~/shared/lib';

/** Handles closer to the node are drawn this far from it, clear of the node even for a narrow band. */
const minNodeDistance = 18;

/**
 * Where a Q handle is drawn (side -1 at the lower edge, 1 at the upper): at the edge of the band for its
 * q, kept off the node, on the 0 dB line. The handles mark the width only: they don't move up and down
 * while q changes, and they don't wait for the band's curve, which C++ sends a frame or more later.
 */
export const qHandlePoint = (band: { f: number; q: number }, side: -1 | 1, mapper: Mapper): Point => {
  const nodeX = mapper.x(band.f);
  const half = qToOctaves(band.q) / 2;
  let x = mapper.x(clamp(band.f * 2 ** (side * half), minHz, maxHz));
  if (Math.abs(x - nodeX) < minNodeDistance) x = nodeX + side * minNodeDistance;
  return { x, y: mapper.zeroY };
};
