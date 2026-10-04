import { bandParameters } from '../bridge/parameters';
import { type Band, bandsStore, findBand } from '../model/bands';
import { commands } from '../model/commands';
import { hasGain, isCut, slopes } from '../model/filter-types';
import { frequencyToMidi, midiToFrequency } from '../model/format';
import { type ScrubField, uiStore, withPreview } from '../model/ui';
import { fitRange, keyAt, maxRange, minRange, octavesToQ, wheelRange } from './axis-math';
import { clamp, createMapper, graph, maxHz, minHz } from './geometry';

export type Point = { x: number; y: number };

const dragThreshold = 3;
const qWheelStep = 1.1;
const wheelGestureEndMs = 300;
const minQ = 0.1;
const maxQ = 30;

/** Pointer position in graph units: the window may be scaled, the graph is 1280 wide at any scale. */
export const toGraphPoint = (event: { clientX: number; clientY: number }, graphElement: Element): Point => {
  const rect = graphElement.getBoundingClientRect();
  const unit = rect.width / graph.width || 1;
  return { x: (event.clientX - rect.left) / unit, y: (event.clientY - rect.top) / unit };
};

const mapper = () => createMapper(uiStore.get().view.range);

const selectedBand = (): Band | undefined => {
  const { preview, selected } = uiStore.get();
  const band = findBand(bandsStore.get().bands, selected);
  return band === undefined ? undefined : withPreview(band, preview);
};

const roundTo = (value: number, step: number) => Math.round(value / step) * step;

const clampQ = (q: number) => clamp(Math.round(q * 100) / 100, minQ, maxQ);

/** Where a band's node sits: (frequency, gain), on 0 dB for types without gain. */
export const nodePosition = (band: Band, range: number): Point => {
  const map = createMapper(range);
  return { x: map.x(band.f), y: map.y(hasGain(band.type) ? clamp(band.g, -range, range) : 0) };
};

const continuousFields = (band: Band) =>
  hasGain(band.type) ? (['frequency', 'gain'] as const) : (['frequency'] as const);

export const nodeDown = (band: Band, point: Point): void => {
  const { selected, strip, picker, view } = uiStore.get();
  const node = nodePosition(band, view.range);
  const same = selected === band.slot;
  uiStore.set({
    selected: band.slot,
    hoverType: null,
    strip: same && strip,
    picker: same && picker,
    drag: {
      kind: 'node',
      slot: band.slot,
      startX: point.x,
      startY: point.y,
      offsetX: point.x - node.x,
      offsetY: point.y - node.y,
      moved: false,
    },
  });
};

const moveNode = (point: Point, snapToNotes: boolean): void => {
  const { drag, axis, range } = uiStore.get();
  if (drag?.kind !== 'node') return;
  const band = findBand(bandsStore.get().bands, drag.slot);
  if (band === undefined) return;

  if (!drag.moved) {
    if (Math.hypot(point.x - drag.startX, point.y - drag.startY) < dragThreshold) return;
    uiStore.set({ drag: { ...drag, moved: true }, strip: false, picker: false, hoverType: null });
    bandParameters.begin(band.slot, continuousFields(band));
  }

  const map = mapper();
  let f = clamp(map.frequencyAt(point.x - drag.offsetX), minHz, maxHz);
  // Shift snaps to semitones in Hz mode; in note mode snapping is the default and Shift turns it off.
  const snap = snapToNotes !== (axis === 'note');
  let hotKey: number | null = null;
  if (snap) {
    hotKey = Math.round(frequencyToMidi(f));
    f = clamp(midiToFrequency(hotKey), minHz, maxHz);
  }

  const g = hasGain(band.type) ? roundTo(clamp(map.dbAt(point.y - drag.offsetY), -range, range), 0.1) : band.g;

  uiStore.set({ preview: { slot: band.slot, f, g }, previewUntilResponse: false, hotKey });
  bandParameters.set(band.slot, 'frequency', f);
  if (hasGain(band.type)) bandParameters.set(band.slot, 'gain', g);
};

export const qDown = (band: Band): void => {
  uiStore.set({ drag: { kind: 'q', slot: band.slot }, picker: false });
  bandParameters.begin(band.slot, ['q']);
};

const moveQ = (point: Point): void => {
  const band = selectedBand();
  if (band === undefined) return;
  const octaves = Math.max(0.02, Math.abs(Math.log2(clamp(mapper().frequencyAt(point.x), minHz, maxHz) / band.f)));
  const q = clampQ(octavesToQ(2 * octaves));
  uiStore.set({ preview: { slot: band.slot, q }, previewUntilResponse: false });
  bandParameters.set(band.slot, 'q', q);
};

const scrubValue = (band: Band, field: ScrubField): number => {
  if (field === 'f') return band.f;
  if (field === 'q') return band.q;
  return isCut(band.type) ? band.slope : band.g;
};

export const scrubDown = (band: Band, field: ScrubField, point: Point): void => {
  uiStore.set({
    drag: { kind: 'scrub', slot: band.slot, field, startX: point.x, startValue: scrubValue(band, field) },
    picker: false,
  });
  if (field === 'f') bandParameters.begin(band.slot, ['frequency']);
  else if (field === 'q') bandParameters.begin(band.slot, ['q']);
  else if (hasGain(band.type)) bandParameters.begin(band.slot, ['gain']);
};

const moveScrub = (point: Point): void => {
  const { drag, axis, range } = uiStore.get();
  const band = selectedBand();
  if (drag?.kind !== 'scrub' || band === undefined) return;
  const dx = point.x - drag.startX;

  if (drag.field === 'f') {
    // Hz: twice the frequency per 60 px; notes: a semitone per 14 px.
    const f =
      axis === 'note'
        ? clamp(midiToFrequency(Math.round(frequencyToMidi(drag.startValue)) + Math.round(dx / 14)), minHz, maxHz)
        : clamp(drag.startValue * 2 ** (dx / 60), minHz, maxHz);
    uiStore.set({ preview: { slot: band.slot, f }, previewUntilResponse: false });
    bandParameters.set(band.slot, 'frequency', f);
  } else if (drag.field === 'q') {
    const q = clampQ(drag.startValue * 2 ** (dx / 90));
    uiStore.set({ preview: { slot: band.slot, q }, previewUntilResponse: false });
    bandParameters.set(band.slot, 'q', q);
  } else if (isCut(band.type)) {
    const slope = clamp(Math.round(drag.startValue + dx / 28), 0, slopes.length - 1);
    if (slope !== band.slope) {
      uiStore.set({ preview: { slot: band.slot, slope }, previewUntilResponse: false });
      bandParameters.setSlope(band.slot, slope);
    }
  } else if (hasGain(band.type)) {
    const g = roundTo(clamp(drag.startValue + dx * 0.1, -range, range), 0.1);
    uiStore.set({ preview: { slot: band.slot, g }, previewUntilResponse: false });
    bandParameters.set(band.slot, 'gain', g);
  }
};

// ---- dB axis: the display range ----

export const rangeDown = (point: Point): void =>
  uiStore.set(({ range }) => ({
    drag: { kind: 'range', startY: point.y, startRange: range },
    strip: false,
    picker: false,
    hoverType: null,
  }));

const moveRange = (point: Point): void => {
  const { drag, range } = uiStore.get();
  if (drag?.kind !== 'range') return;
  // Twice the range per 160 px downwards.
  const next = clamp(Math.round(drag.startRange * 2 ** ((point.y - drag.startY) / 160)), minRange, maxRange);
  if (next !== range) uiStore.set({ range: next });
};

export const rangeWheel = (up: boolean): void => uiStore.set(({ range }) => ({ range: wheelRange(range, up) }));

export const fitRangeToBands = (): void => uiStore.set({ range: fitRange(bandsStore.get().bands) });

// ---- Keyboard (frequency axis in note mode) ----

let tween = 0;

/** Moves a band to a frequency in 180 ms (one gesture), easing out. */
const glideFrequency = (band: Band, to: number): void => {
  const token = ++tween;
  const from = band.f;
  const startedAt = performance.now();
  bandParameters.begin(band.slot, ['frequency']);

  const step = () => {
    if (token !== tween) {
      bandParameters.end(band.slot, ['frequency']);
      return;
    }
    const k = Math.min(1, (performance.now() - startedAt) / 180);
    const f = from * (to / from) ** (1 - (1 - k) ** 3);
    uiStore.set({ preview: { slot: band.slot, f }, previewUntilResponse: true });
    bandParameters.set(band.slot, 'frequency', f);
    if (k < 1) requestAnimationFrame(step);
    else bandParameters.end(band.slot, ['frequency']);
  };
  requestAnimationFrame(step);
};

/** The key under a point of the keyboard (y from the keyboard's top). */
export const keyUnder = (point: Point, keyboardY: number): number =>
  keyAt(createMapper(uiStore.get().view.range), point.x, keyboardY);

/** Click on a key: the selected band glides to that note; with Alt, or without a selection, a new band. */
export const keyDown = (midi: number, altKey: boolean): void => {
  const band = selectedBand();
  if (altKey || band === undefined) {
    commands.createBand('bell', midiToFrequency(midi), 0);
    uiStore.set({ hotKey: midi, strip: false });
    return;
  }
  glideFrequency(band, midiToFrequency(midi));
  uiStore.set({ hotKey: midi, strip: false, picker: false, drag: { kind: 'keys', slot: band.slot, midi } });
};

const moveKeys = (point: Point): void => {
  const { drag } = uiStore.get();
  if (drag?.kind !== 'keys') return;
  // Dragging along the keys moves the band by semitones (on the white keys' row).
  const midi = keyUnder(point, 32);
  if (midi === drag.midi) return;
  tween++;
  const f = midiToFrequency(midi);
  bandParameters.begin(drag.slot, ['frequency']);
  uiStore.set({ preview: { slot: drag.slot, f }, previewUntilResponse: true, hotKey: midi, drag: { ...drag, midi } });
  bandParameters.set(drag.slot, 'frequency', f);
  bandParameters.end(drag.slot, ['frequency']);
};

/** Pointer move anywhere over the graph while a gesture runs. */
export const pointerMove = (point: Point, shiftKey: boolean): void => {
  const { drag } = uiStore.get();
  if (drag === null) return;
  if (drag.kind === 'node') moveNode(point, shiftKey);
  else if (drag.kind === 'q') moveQ(point);
  else if (drag.kind === 'scrub') moveScrub(point);
  else if (drag.kind === 'range') moveRange(point);
  else if (drag.kind === 'keys') moveKeys(point);
};

/** Pointer up: ends the gesture (one undo step) and keeps the preview until C++ confirms the values. */
export const pointerUp = (): void => {
  const { drag } = uiStore.get();
  if (drag === null) return;

  const band = 'slot' in drag ? findBand(bandsStore.get().bands, drag.slot) : undefined;
  if (band !== undefined) {
    if (drag.kind === 'node' && drag.moved) bandParameters.end(band.slot, continuousFields(band));
    if (drag.kind === 'q') bandParameters.end(band.slot, ['q']);
    if (drag.kind === 'scrub') {
      if (drag.field === 'f') bandParameters.end(band.slot, ['frequency']);
      else if (drag.field === 'q') bandParameters.end(band.slot, ['q']);
      else if (hasGain(band.type)) bandParameters.end(band.slot, ['gain']);
    }
  }

  const { preview } = uiStore.get();
  uiStore.set({ drag: null, hotKey: null, previewUntilResponse: preview !== null });
};

let wheelSlot: number | null = null;
let wheelTimer: number | null = null;

const endWheelGesture = () => {
  if (wheelTimer !== null) clearTimeout(wheelTimer);
  wheelTimer = null;
  if (wheelSlot !== null) bandParameters.end(wheelSlot, ['q']);
  wheelSlot = null;
};

/** Wheel over a node: q times or divided by 1.1 per step; a pause ends the gesture. */
export const nodeWheel = (band: Band, up: boolean): void => {
  if (wheelSlot !== band.slot) {
    endWheelGesture();
    bandParameters.begin(band.slot, ['q']);
    wheelSlot = band.slot;
  }

  const { preview } = uiStore.get();
  const current = withPreview(band, preview).q;
  const q = clampQ(up ? current * qWheelStep : current / qWheelStep);
  uiStore.set({ preview: { slot: band.slot, q }, previewUntilResponse: true });
  bandParameters.set(band.slot, 'q', q);

  if (wheelTimer !== null) clearTimeout(wheelTimer);
  wheelTimer = window.setTimeout(endWheelGesture, wheelGestureEndMs);
};

/** Pointer down on the empty graph: the first click folds the type strip, the next one deselects. */
export const backgroundDown = (): void => {
  const { strip, selected, picker } = uiStore.get();
  if (strip) uiStore.set({ strip: false, hoverType: null });
  else if (selected !== null || picker) commands.select(null);
};

/** Double click on the empty graph: a new bell at the point. */
export const backgroundDoubleClick = (point: Point): void => {
  const map = mapper();
  const { range } = uiStore.get();
  commands.createBand(
    'bell',
    clamp(map.frequencyAt(point.x), minHz, maxHz),
    roundTo(clamp(map.dbAt(point.y), -range, range), 0.1),
  );
};
