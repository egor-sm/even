import { type CanvasLayer } from './canvas-layer';
import { clamp, graph, type Mapper } from './geometry';
import { withAlpha } from './theme-colors';

const feather = 22;

// Position along the plot as a gradient offset 0…1.
const offset = (x: number) => clamp((x - graph.left) / (graph.right - graph.left), 0, 1);

/**
 * Solo: the band's working range stays lit with a light tint of its color and thin edges, the rest
 * of the graph (analyzer included) is dimmed, with soft borders.
 */
export const drawSolo = (
  layer: CanvasLayer,
  solo: { mapper: Mapper; range: [number, number]; color: string; canvasColor: string } | null,
) => {
  const context = layer.begin();
  if (solo === null) return;

  const { mapper, color, canvasColor } = solo;
  const xa = clamp(mapper.x(solo.range[0]), graph.left, graph.right);
  const xb = clamp(mapper.x(solo.range[1]), graph.left, graph.right);
  const o1 = offset(xa - feather);
  const o2 = Math.max(o1, offset(xa));
  const o3 = Math.max(o2, offset(xb));
  const o4 = Math.max(o3, offset(xb + feather));

  const horizontal = (outside: string, inside: string) => {
    const gradient = context.createLinearGradient(graph.left, 0, graph.right, 0);
    gradient.addColorStop(o1, outside);
    gradient.addColorStop(o2, inside);
    gradient.addColorStop(o3, inside);
    gradient.addColorStop(o4, outside);
    context.fillStyle = gradient;
    context.fillRect(graph.left, 0, graph.right - graph.left, graph.bottom);
  };
  horizontal(withAlpha(canvasColor, 0.74), withAlpha(canvasColor, 0));
  horizontal(withAlpha(color, 0), withAlpha(color, 0.09));

  const edge = context.createLinearGradient(0, graph.top, 0, graph.bottom);
  edge.addColorStop(0, withAlpha(color, 0));
  edge.addColorStop(0.25, withAlpha(color, 0.55));
  edge.addColorStop(1, withAlpha(color, 0.55));
  context.fillStyle = edge;
  for (const x of [xa, xb]) context.fillRect(x - 0.5, graph.top, 1, graph.bottom - graph.top);
};
