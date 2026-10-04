import { clipToPlot, type Mapper, toCurve } from '~/entities/viewport';
import { type CanvasLayer, withAlpha } from '~/shared/lib';

// Brightness along x around the node: bright close to it, gone 260 px away.
const ghostStops: [offset: number, alpha: number][] = [
  [0, 0],
  [0.3, 0.04],
  [0.42, 0.35],
  [0.5, 0.85],
  [0.58, 0.35],
  [0.7, 0.04],
  [1, 0],
];
const reach = 260;

/**
 * The total response as it would be with the selected band of another type: a dashed line, bright
 * only near the node (the canvas itself pulses with CSS).
 */
export const drawGhost = (
  layer: CanvasLayer,
  ghost: { mapper: Mapper; frequencies: readonly number[]; totalDb: Float64Array; nodeX: number; color: string } | null,
) => {
  const context = layer.begin();
  if (ghost === null) return;

  const { xs, ys } = toCurve(ghost.mapper, ghost.frequencies, ghost.totalDb);
  context.save();
  clipToPlot(context);

  const gradient = context.createLinearGradient(ghost.nodeX - reach, 0, ghost.nodeX + reach, 0);
  for (const [offset, alpha] of ghostStops) gradient.addColorStop(offset, withAlpha(ghost.color, alpha));

  context.beginPath();
  for (let i = 0; i < xs.length; i++) {
    if (i === 0) context.moveTo(xs[i], ys[i]);
    else context.lineTo(xs[i], ys[i]);
  }
  context.setLineDash([8, 5]);
  context.lineWidth = 1.5;
  context.strokeStyle = gradient;
  context.stroke();
  context.restore();
};
