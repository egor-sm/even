import { midiToFrequency } from '~/shared/lib';

/** The graph area at 100 % scale, in its own coordinates (the window's top bar is above it). */
export const graph = {
  width: 1280,
  height: 664,
  /** Plot area: the dB axis takes 44 px on the left, 18 px are kept on the right for a level meter. */
  left: 44,
  right: 1262,
  top: 26,
  bottom: 628,
} as const;

export const minHz = 20;
export const maxHz = 20000;

/** The analyzer's dBFS span drawn over the plot height. */
export const analyzerTopDb = -6;
export const analyzerBottomDb = -84;

/** Maps frequency and gain to graph coordinates for a display range of ±range dB and a visible span lo…hi Hz. */
export type Mapper = {
  x: (hz: number) => number;
  frequencyAt: (x: number) => number;
  /** x of a (fractional) MIDI note. */
  noteX: (midi: number) => number;
  y: (db: number) => number;
  dbAt: (y: number) => number;
  /** y of an analyzer level in dBFS. */
  analyzerY: (dbfs: number) => number;
  zeroY: number;
  range: number;
};

export const createMapper = (range: number, lo: number = minHz, hi: number = maxHz): Mapper => {
  const logLo = Math.log10(lo);
  const logSpan = Math.log10(hi) - logLo;
  const width = graph.right - graph.left;
  const zeroY = (graph.top + graph.bottom) / 2;
  const half = (graph.bottom - graph.top) / 2;

  const x = (hz: number) => graph.left + ((Math.log10(hz) - logLo) / logSpan) * width;

  return {
    x,
    frequencyAt: (px) => 10 ** (logLo + ((px - graph.left) / width) * logSpan),
    noteX: (midi) => x(midiToFrequency(midi)),
    y: (db) => zeroY - (db / range) * half,
    dbAt: (py) => ((zeroY - py) / half) * range,
    analyzerY: (dbfs) =>
      graph.top + ((analyzerTopDb - dbfs) / (analyzerTopDb - analyzerBottomDb)) * (graph.bottom - graph.top),
    zeroY,
    range,
  };
};

/** Restricts drawing to the plot area, so curves never run over the dB axis or the meter space. */
export const clipToPlot = (context: CanvasRenderingContext2D): void => {
  context.beginPath();
  context.rect(graph.left, 0, graph.right - graph.left, graph.height);
  context.clip();
};
