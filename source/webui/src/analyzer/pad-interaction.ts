import { bandStates, numBands, shapeUsesGain } from '../juce/bands';
import { bandRanges } from '../juce/parameter-scales';
import { setSliderValue } from '../juce/slider-values';
import { findNode, pointToValue, valueToPoint, type PadNode, type PadPoint, type PadValue } from './pad-math';
import type { EqResponse } from './response';
import type { SpectrumScale } from './scale';

export type NodePreview = { band: number; value: PadValue };

export type PadCallbacks = {
  getScale: () => SpectrumScale;
  getResponse: () => EqResponse | null;
  getSelectedBand: () => number;
  selectBand: (band: number) => void;
  /** Where to draw a node being dragged, ahead of the response coming back from C++. */
  previewNode: (preview: NodePreview | null) => void;
};

const hitRadiusCss = 12;
const fineDragFactor = 0.1;
const qWheelStep = 1.1;
const wheelGestureEndMs = 300;

type Drag = {
  band: number;
  pointerId: number;
  usesGain: boolean;
  /** Node position being dragged (device pixels); moves by pointer deltas, scaled when fine. */
  point: PadPoint;
  lastPointer: PadPoint;
};

// Values are written in parameter units (see slider-values.ts); pointToValue already clamps them.
const setFrequency = (band: number, frequencyHz: number) => setSliderValue(bandStates(band).frequency, frequencyHz);
const setGain = (band: number, gainDb: number) => setSliderValue(bandStates(band).gain, gainDb);

/**
 * The graph as an XY pad: drag a node to set frequency (x) and gain (y), wheel over a node for q,
 * double-click empty space to switch on a free band there, double-click a node to switch it off.
 */
export class PadInteraction {
  private drag: Drag | null = null;
  private wheelBand: number | null = null;
  private wheelGestureTimer: number | null = null;

  constructor(
    private readonly element: HTMLElement,
    private readonly callbacks: PadCallbacks,
  ) {
    element.addEventListener('pointerdown', this.onPointerDown);
    element.addEventListener('pointermove', this.onPointerMove);
    element.addEventListener('pointerup', this.onPointerUp);
    element.addEventListener('pointercancel', this.onPointerUp);
    element.addEventListener('dblclick', this.onDoubleClick);
    element.addEventListener('wheel', this.onWheel, { passive: false });
  }

  dispose(): void {
    this.element.removeEventListener('pointerdown', this.onPointerDown);
    this.element.removeEventListener('pointermove', this.onPointerMove);
    this.element.removeEventListener('pointerup', this.onPointerUp);
    this.element.removeEventListener('pointercancel', this.onPointerUp);
    this.element.removeEventListener('dblclick', this.onDoubleClick);
    this.element.removeEventListener('wheel', this.onWheel);
    this.endWheelGesture();
  }

  private pointer(event: MouseEvent): PadPoint {
    const rect = this.element.getBoundingClientRect();
    return { x: (event.clientX - rect.left) * devicePixelRatio, y: (event.clientY - rect.top) * devicePixelRatio };
  }

  private nodes(): PadNode[] {
    const scale = this.callbacks.getScale();
    return (this.callbacks.getResponse()?.bands ?? []).map((band) => {
      const { x, y } = valueToPoint(scale, { frequencyHz: band.frequencyHz, gainDb: band.gainDb });
      return { band: band.band, x, y };
    });
  }

  private nodeAt(pointer: PadPoint): number | null {
    return findNode(this.nodes(), pointer, hitRadiusCss * devicePixelRatio, this.callbacks.getSelectedBand());
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) return;

    const pointer = this.pointer(event);
    const band = this.nodeAt(pointer);
    const node = this.nodes().find((candidate) => candidate.band === band);
    const response = this.callbacks.getResponse()?.bands.find((candidate) => candidate.band === band);
    if (band === null || node === undefined || response === undefined) return;

    event.preventDefault();
    this.callbacks.selectBand(band);
    this.element.setPointerCapture(event.pointerId);
    this.element.style.cursor = 'grabbing';

    const usesGain = shapeUsesGain(response.shape);
    const states = bandStates(band);
    states.frequency.sliderDragStarted();
    if (usesGain) states.gain.sliderDragStarted();

    this.drag = { band, pointerId: event.pointerId, usesGain, point: { x: node.x, y: node.y }, lastPointer: pointer };
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    const pointer = this.pointer(event);
    const { drag } = this;

    if (drag === null || drag.pointerId !== event.pointerId) {
      this.element.style.cursor = this.nodeAt(pointer) === null ? '' : 'grab';
      return;
    }

    // Follow pointer deltas rather than the absolute position: the node does not jump under the
    // cursor, and holding Shift slows it down for fine adjustment.
    const factor = event.shiftKey ? fineDragFactor : 1;
    drag.point = {
      x: drag.point.x + (pointer.x - drag.lastPointer.x) * factor,
      y: drag.usesGain ? drag.point.y + (pointer.y - drag.lastPointer.y) * factor : drag.point.y,
    };
    drag.lastPointer = pointer;

    const value = pointToValue(this.callbacks.getScale(), drag.point);
    setFrequency(drag.band, value.frequencyHz);
    if (drag.usesGain) setGain(drag.band, value.gainDb);

    this.callbacks.previewNode({ band: drag.band, value: { ...value, gainDb: drag.usesGain ? value.gainDb : 0 } });
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    const { drag } = this;
    if (drag === null || drag.pointerId !== event.pointerId) return;

    const states = bandStates(drag.band);
    states.frequency.sliderDragEnded();
    if (drag.usesGain) states.gain.sliderDragEnded();

    this.element.releasePointerCapture(event.pointerId);
    this.element.style.cursor = 'grab';
    this.drag = null;
    this.callbacks.previewNode(null);
  };

  private readonly onDoubleClick = (event: MouseEvent): void => {
    const pointer = this.pointer(event);
    const band = this.nodeAt(pointer);

    if (band !== null) {
      bandStates(band).enabled.setValue(false);
      return;
    }

    // Switch on the first free band as a bell at the clicked position.
    const free = Array.from({ length: numBands }, (_, i) => i + 1).find((n) => !bandStates(n).enabled.getValue());
    if (free === undefined) return;

    const value = pointToValue(this.callbacks.getScale(), pointer);
    const states = bandStates(free);
    states.shape.setChoiceIndex(0);
    setFrequency(free, value.frequencyHz);
    setGain(free, value.gainDb);
    states.enabled.setValue(true);
    this.callbacks.selectBand(free);
  };

  private readonly onWheel = (event: WheelEvent): void => {
    const band = this.nodeAt(this.pointer(event));
    if (band === null || event.deltaY === 0) return;

    event.preventDefault();

    if (this.wheelBand !== band) {
      this.endWheelGesture();
      bandStates(band).q.sliderDragStarted();
      this.wheelBand = band;
    }

    // Scrolling up narrows the band (higher q), in equal ratios per wheel step.
    const { q } = bandStates(band);
    const current = q.getScaledValue();
    const next = event.deltaY < 0 ? current * qWheelStep : current / qWheelStep;
    setSliderValue(q, Math.min(Math.max(next, bandRanges.q.min), bandRanges.q.max));

    if (this.wheelGestureTimer !== null) clearTimeout(this.wheelGestureTimer);
    this.wheelGestureTimer = window.setTimeout(() => this.endWheelGesture(), wheelGestureEndMs);
  };

  private endWheelGesture(): void {
    if (this.wheelGestureTimer !== null) clearTimeout(this.wheelGestureTimer);
    this.wheelGestureTimer = null;

    if (this.wheelBand !== null) bandStates(this.wheelBand).q.sliderDragEnded();
    this.wheelBand = null;
  }
}
