import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test';

import { type Band, useBandsStore, useSelectionStore } from '~/entities/band';
import { useViewportStore } from '~/entities/viewport';
import { recordingBackend } from '~/shared/testing';

import { TypeButton } from '../type-button';
import { TypeStrip } from '../type-strip';

const bell: Band = {
  slot: 3,
  serial: 1,
  color: 1,
  type: 'bell',
  f: 1000,
  g: 3,
  q: 1,
  slope: 1,
  on: true,
  sections: [],
};

describe('type strip', () => {
  let backend: ReturnType<typeof recordingBackend>;

  beforeEach(() => {
    backend = recordingBackend();
    useViewportStore.setState({ axis: 'hz', range: 18, view: { range: 18, morph: 0 }, hotKey: null });
    useBandsStore.setState({ sampleRate: 48000, bands: [bell] });
    useSelectionStore.setState({ selected: 3, solo: null, typeMenu: null, preview: null, previewUntilResponse: false });
  });
  afterEach(cleanup);

  it('expands from the pill into the eight types, low to high', () => {
    render(<TypeStrip />);
    fireEvent.click(screen.getByRole('button', { name: 'Change filter type' }));

    const types = screen.getAllByRole('radio').map((item) => item.getAttribute('aria-label'));
    expect(types).toEqual([
      'Low Cut',
      'Low Shelf',
      'Bell',
      'Notch',
      'Band Pass',
      'Tilt Shelf',
      'High Shelf',
      'High Cut',
    ]);
    expect(screen.getByRole('radio', { name: 'Bell' }).getAttribute('aria-checked')).toBe('true');
  });

  it('previews a hovered type by name, also in the dock type button', () => {
    useSelectionStore.setState({ typeMenu: 'strip' });
    render(
      <>
        <TypeStrip />
        <TypeButton band={bell} open={false} />
      </>,
    );
    fireEvent.mouseEnter(screen.getByRole('radio', { name: 'High Shelf' }));

    expect(screen.getAllByText('High Shelf')).toHaveLength(2); // name over the strip and in the button
    fireEvent.mouseLeave(screen.getByRole('radio', { name: 'High Shelf' }));
    expect(screen.getByRole('button', { name: 'Filter type' }).textContent).toContain('Bell');
  });

  it('changes the type in C++ and folds', () => {
    useSelectionStore.setState({ typeMenu: 'strip' });
    render(<TypeStrip />);
    fireEvent.click(screen.getByRole('radio', { name: 'Notch' }));

    expect(backend.named('setBandShape')[0]?.args).toEqual([3, 5]);
    expect(useSelectionStore.getState().typeMenu).toBeNull();
  });
});
