import {
  type Band,
  useBandsStore,
  createBand,
  findBand,
  hasGain,
  useSelectionStore,
  setPreview,
  withPreview,
} from '~/entities/band';
import { createMapper, maxHz, minHz, nodePoint, useViewportStore } from '~/entities/viewport';
import { bandParameters } from '~/shared/api';
import { clamp, frequencyToMidi, midiToFrequency, type Point, startGesture, updateGesture } from '~/shared/lib';

const dragThreshold = 3;
const qWheelStep = 1.1;
const wheelGestureEndMs = 300;
const minQ = 0.1;
const maxQ = 30;

const roundTo = (value: number, step: number) => Math.round(value / step) * step;
const clampQ = (q: number) => clamp(Math.round(q * 100) / 100, minQ, maxQ);

const editedFields = (band: Band) => (hasGain(band.type) ? (['frequency', 'gain'] as const) : (['frequency'] as const));

/**
 * Pointer down on a node: selects the band; past a 3 px threshold the drag moves frequency (x) and
 * gain (y). Shift snaps to semitones in Hz mode; in note mode snapping is the default and Shift
 * turns it off. The whole drag is one gesture (one undo step).
 */
export const nodeDown = (band: Band, start: Point): void => {
  const { selected, typeMenu } = useSelectionStore.getState();
  const node = nodePoint(band.f, hasGain(band.type) ? band.g : 0, useViewportStore.getState().view.range);
  const offset = { x: start.x - node.x, y: start.y - node.y };
  useSelectionStore.setState({ selected: band.slot, typeMenu: selected === band.slot ? typeMenu : null });

  let moved = false;
  startGesture(
    { kind: 'node', slot: band.slot, moved: false },
    {
      move: (point, { shiftKey }) => {
        const current = findBand(useBandsStore.getState().bands, band.slot);
        if (current === undefined) return;

        if (!moved) {
          if (Math.hypot(point.x - start.x, point.y - start.y) < dragThreshold) return;
          moved = true;
          updateGesture({ moved: true });
          useSelectionStore.setState({ typeMenu: null });
          bandParameters.begin(band.slot, editedFields(current));
        }

        const { axis, range, view } = useViewportStore.getState();
        const mapper = createMapper(view.range);
        let f = clamp(mapper.frequencyAt(point.x - offset.x), minHz, maxHz);
        let hotKey: number | null = null;
        if (shiftKey !== (axis === 'note')) {
          hotKey = Math.round(frequencyToMidi(f));
          f = clamp(midiToFrequency(hotKey), minHz, maxHz);
        }
        const g = hasGain(current.type)
          ? roundTo(clamp(mapper.dbAt(point.y - offset.y), -range, range), 0.1)
          : current.g;

        setPreview({ slot: band.slot, f, g });
        useViewportStore.setState({ hotKey });
        bandParameters.set(band.slot, 'frequency', f);
        if (hasGain(current.type)) bandParameters.set(band.slot, 'gain', g);
      },
      end: () => {
        useViewportStore.setState({ hotKey: null });
        if (!moved) return;
        const current = findBand(useBandsStore.getState().bands, band.slot);
        if (current !== undefined) bandParameters.end(band.slot, editedFields(current));
        // Keep showing the dragged values until C++ confirms them.
        useSelectionStore.setState(({ preview }) => ({ previewUntilResponse: preview !== null }));
      },
    },
  );
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

  const current = withPreview(band, useSelectionStore.getState().preview).q;
  const q = clampQ(up ? current * qWheelStep : current / qWheelStep);
  setPreview({ slot: band.slot, q }, true);
  bandParameters.set(band.slot, 'q', q);

  if (wheelTimer !== null) clearTimeout(wheelTimer);
  wheelTimer = window.setTimeout(endWheelGesture, wheelGestureEndMs);
};

/** Double click on the empty graph: a new bell at the point. */
export const createBandAt = (point: Point): void => {
  const { range, view } = useViewportStore.getState();
  const mapper = createMapper(view.range);
  createBand(
    'bell',
    clamp(mapper.frequencyAt(point.x), minHz, maxHz),
    roundTo(clamp(mapper.dbAt(point.y), -range, range), 0.1),
  );
};
