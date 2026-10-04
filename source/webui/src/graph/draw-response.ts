import type { Band } from '../model/bands';
import { type CanvasLayer, clipToPlot } from './canvas-layer';
import { graph, type Mapper, maxHz, minHz } from './geometry';
import { magnitudeDb, type Section } from './response-math';
import { type GraphColors, withAlpha } from './theme-colors';

/**
 * Frequencies to evaluate curves at: two per graph unit across the plot, plus every band frequency
 * exactly, so a narrow bell peaks precisely at its node and a notch dips at its true centre.
 */
export const sampleFrequencies = (mapper: Mapper, bands: readonly Band[]): number[] => {
  const frequencies: number[] = [];
  for (let x = graph.left - 2; x <= graph.right + 2; x += 0.5) frequencies.push(mapper.frequencyAt(x));
  for (const band of bands) if (band.f > minHz && band.f < maxHz) frequencies.push(band.f);
  return frequencies.toSorted((a, b) => a - b);
};

export const responseDb = (sections: readonly Section[], frequencies: readonly number[], sampleRate: number) =>
  Float64Array.from(frequencies, (hz) => magnitudeDb(sections, hz, sampleRate));

export type Curve = { xs: Float64Array; ys: Float64Array };

/** Graph coordinates of a response; y is clamped just outside the graph (a notch goes to −∞). */
export const toCurve = (mapper: Mapper, frequencies: readonly number[], db: Float64Array): Curve => ({
  xs: Float64Array.from(frequencies, (hz) => mapper.x(hz)),
  ys: Float64Array.from(db, (value) => Math.min(Math.max(mapper.y(value), -2), graph.height + 2)),
});

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
