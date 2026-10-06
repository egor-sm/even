import { waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test';

import { type Band, useBandsStore, useSelectionStore } from '~/entities/band';
import { createMapper, useViewportStore } from '~/entities/viewport';
import { endGesture, midiToFrequency, moveGesture } from '~/shared/lib';
import { recordingBackend } from '~/shared/testing';

import { keyDown, useGlideTargetStore } from '../key-gestures';

const bell: Band = {
  slot: 1,
  serial: 1,
  color: 1,
  type: 'bell',
  f: midiToFrequency(55),
  g: 3,
  q: 1,
  slope: 1,
  on: true,
  sections: [],
};

/** A point on a key, in graph units. */
const onKey = (midi: number) => ({ x: createMapper(18).noteX(midi), y: 640 });

describe('key gestures', () => {
  beforeEach(() => {
    recordingBackend();
    useBandsStore.setState({ sampleRate: 48000, bands: [bell] });
    useSelectionStore.setState({ selected: 1, solo: null, typeMenu: null, preview: null, previewUntilResponse: false });
    useViewportStore.setState({ axis: 'note', range: 18, view: { range: 18, morph: 1 }, hotKey: null });
    useGlideTargetStore.setState({ target: null });
  });
  afterEach(endGesture);

  it('keeps the note a click glides the band to until the glide ends', async () => {
    keyDown(57, false, onKey(57));
    expect(useGlideTargetStore.getState().target).toEqual({ slot: 1, f: midiToFrequency(57) });

    // The click ends before the glide does.
    endGesture();
    expect(useGlideTargetStore.getState().target).not.toBeNull();

    await waitFor(() => expect(useGlideTargetStore.getState().target).toBeNull());
    expect(useSelectionStore.getState().preview?.f).toBeCloseTo(midiToFrequency(57), 9);
  });

  it('keeps a click on a black key there when the pointer moves a little', async () => {
    const start = onKey(58);
    keyDown(58, false, start);
    moveGesture({ x: start.x + 2, y: start.y + 1 }, { shiftKey: false });
    expect(useGlideTargetStore.getState().target).toEqual({ slot: 1, f: midiToFrequency(58) });

    endGesture();
    await waitFor(() => expect(useGlideTargetStore.getState().target).toBeNull());
    expect(useSelectionStore.getState().preview?.f).toBeCloseTo(midiToFrequency(58), 9);
  });

  it('drops the glide when a drag along the keys takes over', () => {
    keyDown(57, false, onKey(57));
    moveGesture(onKey(60), { shiftKey: false });

    expect(useGlideTargetStore.getState().target).toBeNull();
    expect(useSelectionStore.getState().preview).toEqual({ slot: 1, f: midiToFrequency(60) });
  });
});
