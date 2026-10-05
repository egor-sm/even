import type { Band } from '~/entities/band';
import { clipToPlot, type Curve, graph, type Mapper, toCurve } from '~/entities/viewport';
import { type CanvasLayer, withAlpha } from '~/shared/lib';
import type { GraphColors } from '~/shared/ui';

const tracePath = (context: CanvasRenderingContext2D, { xs, ys }: Curve) => {
  context.beginPath();
  for (let i = 0; i < xs.length; i++) {
    if (i === 0) context.moveTo(xs[i], ys[i]);
    else context.lineTo(xs[i], ys[i]);
  }
};

export type ResponseScene = {
  mapper: Mapper;
  frequencies: readonly number[];
  /** Response of each band in dB at `frequencies`, by slot. */
  bandDb: ReadonlyMap<number, Float64Array>;
  /** Sum of the enabled bands. */
  totalDb: Float64Array;
  bands: readonly Band[];
  selected: number | null;
  solo: number | null;
  colors: GraphColors;
};

/**
 * The EQ curves, bottom to top: the other bands (hidden in solo), the selected band (fill to 0 dB and
 * a line) and the total response with the logo gradient (faded in solo).
 */
export const drawResponse = (layer: CanvasLayer, scene: ResponseScene) => {
  const { mapper, frequencies, bandDb, totalDb, bands, selected, solo, colors } = scene;
  const context = layer.begin();
  const bandColor = (band: Band) => colors.bands[band.color - 1] ?? colors.focus;

  context.save();
  clipToPlot(context);
  context.lineJoin = 'round';
  context.lineCap = 'round';

  if (solo === null)
    for (const band of bands) {
      const db = bandDb.get(band.slot);
      if (band.slot === selected || !band.on || db === undefined) continue;
      tracePath(context, toCurve(mapper, frequencies, db));
      context.strokeStyle = withAlpha(bandColor(band), 0.38);
      context.lineWidth = 1;
      context.stroke();
    }

  const selectedBand = bands.find((band) => band.slot === selected);
  const selectedDb = selectedBand === undefined ? undefined : bandDb.get(selectedBand.slot);
  if (selectedBand !== undefined && selectedDb !== undefined && selectedBand.on) {
    const curve = toCurve(mapper, frequencies, selectedDb);
    tracePath(context, curve);
    context.lineTo(curve.xs[curve.xs.length - 1], mapper.zeroY);
    context.lineTo(curve.xs[0], mapper.zeroY);
    context.closePath();
    context.fillStyle = withAlpha(bandColor(selectedBand), 0.16);
    context.fill();

    tracePath(context, curve);
    context.strokeStyle = bandColor(selectedBand);
    context.lineWidth = 1.5;
    context.stroke();
  }

  const gradient = context.createLinearGradient(graph.left, 0, graph.right, 0);
  gradient.addColorStop(0, colors.curveStart);
  gradient.addColorStop(1, colors.curveEnd);
  tracePath(context, toCurve(mapper, frequencies, totalDb));
  context.globalAlpha = solo === null ? 1 : 0.35;
  context.strokeStyle = gradient;
  context.lineWidth = 2;
  context.stroke();

  context.restore();
};
