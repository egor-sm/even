import { clamp, formatAxisFrequency, frequencyToMidi, isBlackKey } from '~/shared/lib';
import { graph, type Mapper, maxHz, minHz } from './geometry';

export type AxisMode = 'hz' | 'note';

export type GridLines = { major: number[]; minor: number[] };

const majorFrequencies = new Set([50, 100, 200, 500, 1000, 2000, 5000, 10000]);

const lowestNote = Math.ceil(frequencyToMidi(minHz));
const highestNote = Math.floor(frequencyToMidi(maxHz));

/** Vertical grid lines (x): 1–9 per decade in Hz mode, white keys in note mode (C is major). */
export const gridLines = (mapper: Mapper, mode: AxisMode): GridLines => {
  const major: number[] = [];
  const minor: number[] = [];

  if (mode === 'note') {
    for (let midi = lowestNote; midi <= highestNote; midi++)
      if (!isBlackKey(midi)) (midi % 12 === 0 ? major : minor).push(mapper.noteX(midi));
  } else {
    for (let decade = 10; decade <= 10000; decade *= 10)
      for (let k = 1; k <= 9; k++) {
        const hz = decade * k;
        if (hz >= minHz && hz <= maxHz) (majorFrequencies.has(hz) ? major : minor).push(mapper.x(hz));
      }
  }

  return { major, minor };
};

/** Line pairs [from, to] for morphing grid a into b: draw each at from + (to − from) · t. */
export type GridMorph = { major: [number, number][]; minor: [number, number][] };

const nearestLine = (lines: number[], x: number) =>
  lines.reduce((best, line) => (Math.abs(line - x) < Math.abs(best - x) ? line : best), lines[0] ?? x);

// Every line of `from` slides to its nearest line in `to`, and every line of `to` comes from its nearest in `from`.
const pairLines = (from: number[], to: number[]): [number, number][] => [
  ...from.map((x): [number, number] => [x, nearestLine(to, x)]),
  ...to.map((x): [number, number] => [nearestLine(from, x), x]),
];

export const gridMorph = (a: GridLines, b: GridLines): GridMorph => ({
  major: pairLines(a.major, b.major),
  minor: pairLines(a.minor, b.minor),
});

/** Hz labels without units, majors first, then whole and half steps, at least `gap` px apart. */
export const frequencyLabels = (mapper: Mapper, gap = 52): { x: number; text: string }[] => {
  const candidates: { hz: number; priority: number }[] = [];
  for (let decade = 10; decade <= 10000; decade *= 10)
    for (let k = 1; k <= 9; k += 0.5) {
      const hz = decade * k;
      if (hz >= minHz && hz <= maxHz)
        candidates.push({ hz, priority: majorFrequencies.has(hz) ? 0 : k % 1 === 0 ? 1 : 2 });
    }

  const taken: number[] = [];
  const labels: { x: number; text: string }[] = [];
  for (const priority of [0, 1, 2])
    for (const candidate of candidates) {
      if (candidate.priority !== priority) continue;
      const x = mapper.x(candidate.hz);
      if (x < graph.left + 12 || x > graph.right - 12 || taken.some((t) => Math.abs(t - x) < gap)) continue;
      taken.push(x);
      labels.push({ x, text: formatAxisFrequency(candidate.hz) });
    }

  return labels.toSorted((a, b) => a.x - b.x);
};

/** dB label step: the smallest of 1/2/3/6/10/12 that keeps at most about seven labels. */
export const dbStep = (range: number): number => [1, 2, 3, 6, 10, 12].find((step) => range / step <= 3.5) ?? 12;

/** The dB values of the horizontal grid lines and labels for a range. */
export const dbLines = (range: number): number[] => {
  const step = dbStep(range);
  const top = Math.floor(range / step + 1e-6) * step;
  const lines: number[] = [];
  for (let db = -top; db <= top + 0.01; db += step) lines.push(db);
  return lines;
};

export const minRange = 3;
export const maxRange = 36;

/** Height of the keyboard (the frequency axis in note mode) and of its black keys. */
export const keyboardHeight = 36;
export const blackKeyHeight = 22;

const keySpan = (midi: number): [number, number] => {
  if (isBlackKey(midi)) return [midi - 0.31, midi + 0.31];
  return [isBlackKey(midi - 1) ? midi - 1 : midi - 0.5, isBlackKey(midi + 1) ? midi + 1 : midi + 0.5];
};

/** SVG path of one key, x in graph coordinates, y from the top of the keyboard. */
export const keyPath = (mapper: Mapper, midi: number): string => {
  const x = (note: number) => clamp(mapper.noteX(note), graph.left, graph.right).toFixed(1);
  const [low, high] = keySpan(midi);
  if (isBlackKey(midi)) return `M${x(low)} 0H${x(high)}V${blackKeyHeight}H${x(low)}Z`;
  return `M${x(low)} 0H${(Number(x(high)) - 1).toFixed(1)}V${keyboardHeight}H${x(low)}Z`;
};

/** All keys as three paths: white keys, C keys (drawn lighter) and black keys. */
export const keyboardPaths = (mapper: Mapper): { white: string; c: string; black: string } => {
  let white = '';
  let c = '';
  let black = '';
  for (let midi = lowestNote; midi <= highestNote; midi++) {
    const path = keyPath(mapper, midi);
    if (isBlackKey(midi)) black += path;
    else if (midi % 12 === 0) c += path;
    else white += path;
  }
  return { white, c, black };
};

/** The key under a point: above the black keys' bottom a black key may be hit, below only white ones. */
export const keyAt = (mapper: Mapper, x: number, y: number): number => {
  const midi = frequencyToMidi(clamp(mapper.frequencyAt(x), minHz, maxHz));
  const nearest = Math.round(midi);
  if (!isBlackKey(nearest)) return nearest;
  if (y < blackKeyHeight && Math.abs(midi - nearest) < 0.31) return nearest;
  return midi < nearest ? nearest - 1 : nearest + 1;
};

/** Centre of a band's dot on the keyboard: black keys at mid-height, white keys in their wide lower part. */
export const keyDot = (mapper: Mapper, hz: number): { midi: number; x: number; y: number } => {
  const midi = Math.round(frequencyToMidi(hz));
  const black = isBlackKey(midi);
  const [low, high] = black ? [midi, midi] : keySpan(midi);
  return {
    midi,
    x: (mapper.noteX(low) + mapper.noteX(high)) / 2 - (black ? 0 : 0.5),
    y: black ? blackKeyHeight / 2 : (blackKeyHeight + keyboardHeight) / 2,
  };
};
