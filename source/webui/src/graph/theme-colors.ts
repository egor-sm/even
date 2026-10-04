/** The token colors the canvases draw with (canvas cannot use CSS variables), read for the current theme. */
export type GraphColors = {
  canvas: string;
  gridMinor: string;
  gridMajor: string;
  zero: string;
  analyzerFill: string;
  analyzerPre: string;
  analyzerPost: string;
  curveStart: string;
  curveEnd: string;
  ghost: string;
  focus: string;
  /** band-1 … band-8 at index 0 … 7. */
  bands: string[];
};

export const readGraphColors = (root: Element): GraphColors => {
  const style = getComputedStyle(root);
  const token = (name: string) => style.getPropertyValue(`--${name}`).trim();

  return {
    canvas: token('surface-canvas'),
    gridMinor: token('graph-grid-minor'),
    gridMajor: token('graph-grid-major'),
    zero: token('graph-zero'),
    analyzerFill: token('graph-analyzer-fill'),
    analyzerPre: token('graph-analyzer-pre'),
    analyzerPost: token('graph-analyzer-post'),
    curveStart: token('graph-curve-start'),
    curveEnd: token('graph-curve-end'),
    ghost: token('graph-ghost'),
    focus: token('state-focus'),
    bands: Array.from({ length: 8 }, (_, i) => token(`band-${i + 1}`)),
  };
};

export type Rgba = [number, number, number, number];

/** '#RRGGBB' or '#RRGGBBAA' as 0…1 components; anything else reads as transparent. */
export const parseHexColor = (color: string): Rgba => {
  const match = /^#([\da-f]{6})([\da-f]{2})?$/i.exec(color);
  if (match === null) return [0, 0, 0, 0];

  const rgb = Number.parseInt(match[1], 16);
  const alpha = match[2] === undefined ? 255 : Number.parseInt(match[2], 16);
  return [((rgb >> 16) & 255) / 255, ((rgb >> 8) & 255) / 255, (rgb & 255) / 255, alpha / 255];
};

/** The color with its alpha multiplied, as an rgba() string for a canvas. */
export const withAlpha = (color: string, alpha: number): string => {
  const [r, g, b, a] = parseHexColor(color);
  return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a * alpha})`;
};
