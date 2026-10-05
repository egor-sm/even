import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test';

import { type Band, useBandsStore, useSelectionStore } from '~/entities/band';
import { graphRootAttribute, useViewportStore } from '~/entities/viewport';
import { endGesture, moveGesture } from '~/shared/lib';
import { recordingBackend } from '~/shared/testing';

import { BandDock } from '../band-dock';

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

const renderDock = (band: Band = bell) => {
  useBandsStore.setState({ sampleRate: 48000, bands: [band] });
  useSelectionStore.setState({
    selected: band.slot,
    solo: null,
    typeMenu: null,
    preview: null,
    previewUntilResponse: false,
  });
  // Controls find the graph root to convert pointer positions.
  return render(
    <div {...{ [graphRootAttribute]: true }}>
      <BandDock />
    </div>,
  );
};

describe('band dock', () => {
  let backend: ReturnType<typeof recordingBackend>;

  beforeEach(() => {
    backend = recordingBackend();
    useViewportStore.setState({ axis: 'hz', range: 18, view: { range: 18, morph: 0 }, hotKey: null });
  });
  afterEach(cleanup);

  it('shows the values of the selected band', () => {
    renderDock();
    expect(screen.getByRole('button', { name: 'Frequency, drag to change' }).textContent).toContain('182 Hz');
    expect(screen.getByRole('button', { name: 'Gain or slope, drag to change' }).textContent).toContain('−7.5 dB');
    expect(screen.getByRole('button', { name: 'Q, drag to change' }).textContent).toContain('5.20');
  });

  it('shows the slope instead of the gain for a cut, and no gain for a notch', () => {
    const { unmount } = renderDock({ ...bell, type: 'lcut', slope: 3 });
    expect(screen.getByRole('button', { name: 'Gain or slope, drag to change' }).textContent).toBe('Slope24 dB/oct');
    unmount();
    renderDock({ ...bell, type: 'notch' });
    expect(screen.getByRole('button', { name: 'Gain or slope, drag to change' }).textContent).toBe('Gain—');
  });

  it('scrubs the frequency as one gesture: twice the frequency per 60 px', () => {
    renderDock();
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Frequency, drag to change' }), {
      button: 0,
      clientX: 100,
      clientY: 600,
    });
    moveGesture({ x: 160, y: 600 }, { shiftKey: false });
    endGesture();

    expect(backend.named('begin')[0]?.args).toEqual([2, ['frequency']]);
    expect(backend.named('set').at(-1)?.args).toEqual([2, 'frequency', 364]);
    expect(backend.named('end')[0]?.args).toEqual([2, ['frequency']]);
    expect(useSelectionStore.getState().preview).toEqual({ slot: 2, f: 364 });
  });

  it('bypasses, solos and deletes the band', () => {
    renderDock();
    fireEvent.click(screen.getByRole('button', { name: 'Bypass band' }));
    expect(backend.named('setEnabled')[0]?.args).toEqual([2, false]);

    fireEvent.click(screen.getByRole('button', { name: 'Solo band' }));
    expect(useSelectionStore.getState().solo).toBe(2);

    fireEvent.click(screen.getByRole('button', { name: 'Delete band' }));
    expect(backend.named('deleteBand')[0]?.args).toEqual([2]);
    expect(useSelectionStore.getState()).toMatchObject({ selected: null, solo: null });
  });

  it('opens the type picker from the type button', () => {
    renderDock();
    fireEvent.click(screen.getByRole('button', { name: 'Filter type' }));
    expect(useSelectionStore.getState().typeMenu).toBe('picker');
    expect(screen.getAllByRole('radio')).toHaveLength(8);
  });
});
