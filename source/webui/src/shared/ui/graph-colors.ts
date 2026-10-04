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
