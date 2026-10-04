import { clipToPlot, dbLines, graph, type GridMorph, type Mapper } from '~/entities/viewport';
import type { CanvasLayer } from '~/shared/lib';
import type { GraphColors } from '~/graph/theme-colors';

/**
 * Grid lines, 1 device pixel wide: the frequency grid (morphing from the Hz grid to the note grid
 * as `morph` goes 0 → 1), the dB grid for the displayed range, and the 0 dB line.
 */
export const drawGrid = (layer: CanvasLayer, mapper: Mapper, grid: GridMorph, morph: number, colors: GraphColors) => {
  const context = layer.begin();
  const { pixel } = layer;
  // Centre hairlines on a device pixel so they are not smeared over two.
  const snap = (value: number) => Math.round(value / pixel) * pixel + pixel / 2;

  context.save();
  clipToPlot(context);
  context.lineWidth = pixel;

  const vertical = (pairs: [number, number][], color: string) => {
    context.beginPath();
    for (const [from, to] of pairs) {
      const x = snap(from + (to - from) * morph);
      context.moveTo(x, graph.top);
      context.lineTo(x, graph.bottom);
    }
    context.strokeStyle = color;
    context.stroke();
  };
  vertical(grid.minor, colors.gridMinor);
  vertical(grid.major, colors.gridMajor);

  context.beginPath();
  for (const db of dbLines(mapper.range)) {
    if (Math.abs(db) < 0.01) continue;
    const y = snap(mapper.y(db));
    context.moveTo(graph.left, y);
    context.lineTo(graph.right, y);
  }
  context.strokeStyle = colors.gridMajor;
  context.stroke();

  context.beginPath();
  const zero = snap(mapper.zeroY);
  context.moveTo(graph.left, zero);
  context.lineTo(graph.right, zero);
  context.strokeStyle = colors.zero;
  context.stroke();

  context.restore();
};
