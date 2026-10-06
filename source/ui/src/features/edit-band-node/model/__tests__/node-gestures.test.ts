import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';

import { type Band, receiveResponse, useBandsStore, useSelectionStore } from '~/entities/band';
import { createMapper, useViewportStore } from '~/entities/viewport';
import { type EqResponse, native } from '~/shared/api';
import { endGesture, moveGesture, type Point } from '~/shared/lib';
import { recordingBackend } from '~/shared/testing';

import { createBandAt, nodeDown } from '../node-gestures';

const bell: Band = {
  slot: 3,
  serial: 1,
  color: 1,
  type: 'bell',
  f: 1000,
  g: 6,
  q: 1,
  slope: 1,
  on: true,
  sections: [],
};

// What C++ sends back after the drag: the gain at the +36 dB top of the parameter.
const response: EqResponse = {
  sampleRate: 48000,
  bands: [
    {
      band: 3,
      enabled: true,
      serial: 1,
      slope: 1,
      shape: 0,
      frequencyHz: 1000,
      gainDb: 36,
      q: 1,
      sections: [],
    },
  ],
};

// The widest display range, ±36 dB, as wide as the gain parameter.
const mapper = createMapper(36);
const node = { x: mapper.x(bell.f), y: mapper.y(bell.g) };

const dragNode = (to: Point) => {
  nodeDown(bell, node);
  moveGesture(to, { shiftKey: false });
  endGesture();
};

describe('node gestures', () => {
  let backend: ReturnType<typeof recordingBackend>;

  beforeEach(() => {
    backend = recordingBackend();
    useViewportStore.setState({ axis: 'hz', range: 36, view: { range: 36, morph: 0 }, hotKey: null });
    useBandsStore.setState({ sampleRate: 48000, bands: [bell] });
    useSelectionStore.setState({ selected: 3, solo: null, typeMenu: null, preview: null, previewUntilResponse: false });
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('take a dragged bell up to +36 dB, the top of the scale and of the gain parameter', () => {
    dragNode({ x: node.x, y: mapper.y(40) });
    expect(backend.named('set').map((call) => call.args)).toContainEqual([3, 'gain', 36]);
    expect(useSelectionStore.getState().preview).toMatchObject({ slot: 3, g: 36 });
  });

  it('take a dragged bell down to −36 dB', () => {
    dragNode({ x: node.x, y: mapper.y(-40) });
    expect(backend.named('set').map((call) => call.args)).toContainEqual([3, 'gain', -36]);
    expect(useSelectionStore.getState().preview).toMatchObject({ slot: 3, g: -36 });
  });

  it('keep the preview after a drag until C++ sends the response, and ask for it', () => {
    dragNode({ x: node.x, y: mapper.y(36) });
    expect(useSelectionStore.getState().previewUntilResponse).toBe(true);
    expect(backend.named('requestResponse')).toHaveLength(1);
  });

  it('end the preview with a response that comes at once, as from the mock', () => {
    vi.spyOn(native, 'requestResponse').mockImplementation(() => {
      receiveResponse(response);
      return Promise.resolve(undefined);
    });
    dragNode({ x: node.x, y: mapper.y(36) });
    expect(useSelectionStore.getState().preview).toBeNull();
    expect(useBandsStore.getState().bands[0]?.g).toBe(36);
  });

  it('create a bell with +36 dB from a double click at the top of the scale', () => {
    createBandAt({ x: node.x, y: mapper.y(36) });
    // A bell (type 0) at 1 kHz.
    expect(backend.named('createBand')[0]?.args).toEqual([0, expect.closeTo(1000, 6), 36]);
  });
});
