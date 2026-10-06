import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';

import { type Band, receiveResponse, useBandsStore, useSelectionStore } from '~/entities/band';
import { useViewportStore } from '~/entities/viewport';
import { type EqResponse, native } from '~/shared/api';
import { endGesture, moveGesture } from '~/shared/lib';
import { recordingBackend } from '~/shared/testing';

import { scrubDown } from '../scrub-gesture';

const bell: Band = {
  slot: 2,
  serial: 2,
  color: 2,
  type: 'bell',
  f: 182,
  g: -7.5,
  q: 5.2,
  slope: 1,
  on: true,
  sections: [],
};

// What C++ sends back after the scrub: the gain at the +36 dB top of the parameter.
const response: EqResponse = {
  sampleRate: 48000,
  bands: [
    {
      band: 2,
      enabled: true,
      serial: 2,
      slope: 1,
      shape: 0,
      frequencyHz: 182,
      gainDb: 36,
      q: 5.2,
      sections: [],
    },
  ],
};

// 0.1 dB per px.
const scrubGain = (dx: number) => {
  scrubDown(bell, 'g', { x: 600, y: 640 });
  moveGesture({ x: 600 + dx, y: 640 }, { shiftKey: false });
  endGesture();
};

describe('gain scrub', () => {
  let backend: ReturnType<typeof recordingBackend>;

  beforeEach(() => {
    backend = recordingBackend();
    // The widest display range, ±36 dB, as wide as the gain parameter.
    useViewportStore.setState({ axis: 'hz', range: 36, view: { range: 36, morph: 0 }, hotKey: null });
    useBandsStore.setState({ sampleRate: 48000, bands: [bell] });
    useSelectionStore.setState({ selected: 2, solo: null, typeMenu: null, preview: null, previewUntilResponse: false });
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('goes up to +36 dB, the top of the scale and of the gain parameter', () => {
    scrubGain(500); // −7.5 dB + 50 dB
    expect(backend.named('set').at(-1)?.args).toEqual([2, 'gain', 36]);
    expect(useSelectionStore.getState().preview).toEqual({ slot: 2, g: 36 });
  });

  it('goes down to −36 dB', () => {
    scrubGain(-300); // −7.5 dB − 30 dB
    expect(backend.named('set').at(-1)?.args).toEqual([2, 'gain', -36]);
    expect(useSelectionStore.getState().preview).toEqual({ slot: 2, g: -36 });
  });

  it('keeps the preview until C++ sends the response, and asks for it', () => {
    scrubGain(500);
    expect(useSelectionStore.getState().previewUntilResponse).toBe(true);
    expect(backend.named('requestResponse')).toHaveLength(1);
  });

  it('ends the preview with a response that comes at once, as from the mock', () => {
    vi.spyOn(native, 'requestResponse').mockImplementation(() => {
      receiveResponse(response);
      return Promise.resolve(undefined);
    });
    scrubGain(500);
    expect(useSelectionStore.getState().preview).toBeNull();
    expect(useBandsStore.getState().bands[0]?.g).toBe(36);
  });
});
