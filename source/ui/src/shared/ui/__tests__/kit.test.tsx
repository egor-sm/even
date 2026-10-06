import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { SegmentedControl } from '../segmented-control';
import { SelectMenu } from '../select-menu';
import { ToggleGroup, ToggleGroupItem } from '../toggle-group';
import { UiRoot } from '../ui-root';

afterEach(cleanup);

const modes = [
  { value: 'prepost', label: 'Pre + Post' },
  { value: 'post', label: 'Post' },
  { value: 'off', label: 'Off', separated: true },
];

/** A select menu whose value follows the picks, as it does with a store. */
function AnalyzerMenu({ onPick }: { onPick: (value: string) => void }) {
  const [mode, setMode] = useState('post');
  return (
    <SelectMenu
      label="Analyzer"
      value={mode}
      options={modes}
      onValueChange={(value) => {
        onPick(value);
        setMode(value);
      }}
    />
  );
}

describe('select menu', () => {
  // Ark's state machines run in happy-dom, a microtask or a frame behind the events: the tests wait for the
  // outcome. Styles are not loaded, so a closed menu shows only as hidden; that the kit's styles take it off
  // the screen is checked in the browser.
  it('shows the current option on the pill and opens with it checked', async () => {
    const onValueChange = vi.fn();
    render(<SelectMenu label="Analyzer" value="post" options={modes} onValueChange={onValueChange} />);
    const pill = screen.getByRole('button', { name: /Analyzer/ });
    expect(pill.textContent).toContain('Post');

    fireEvent.click(pill);
    await waitFor(() => expect(screen.getByRole('menuitemradio', { name: 'Off' })).toBeTruthy());
    expect(screen.getByRole('menuitemradio', { name: 'Post' }).getAttribute('aria-checked')).toBe('true');
  });

  it('picks one option after another, closing after each pick', async () => {
    const picked: string[] = [];
    render(<AnalyzerMenu onPick={(value) => picked.push(value)} />);
    const pill = screen.getByRole('button', { name: /Analyzer/ });
    const menu = screen.getByRole('menu', { hidden: true });
    const pick = async (label: string) => {
      fireEvent.click(pill);
      fireEvent.click(await screen.findByRole('menuitemradio', { name: label }));
      await waitFor(() => expect(menu.hidden).toBe(true));
    };

    await pick('Off');
    await pick('Pre + Post');
    await pick('Post');
    expect(picked).toEqual(['off', 'prepost', 'post']);
  });

  it('closes on a pointer down outside, even on a control that stops its propagation', async () => {
    render(
      <UiRoot theme="dark" scale={100}>
        <SelectMenu label="Analyzer" value="post" options={modes} onValueChange={vi.fn()} />
        {/* Keeps its pointer downs to itself, like the graph's nodes and the dock. */}
        <button type="button" onPointerDown={(event) => event.stopPropagation()}>
          Node
        </button>
      </UiRoot>,
    );
    fireEvent.click(screen.getByRole('button', { name: /Analyzer/ }));
    const menu = await screen.findByRole('menu');
    // Ark starts listening for pointer downs outside the menu a frame and a task after it opens.
    await act(async () => {
      await new Promise((resolve) => {
        requestAnimationFrame(() => setTimeout(resolve, 0));
      });
    });

    fireEvent.pointerDown(screen.getByRole('button', { name: 'Node' }));
    await waitFor(() => expect(menu.hidden).toBe(true));
  });
});

describe('segmented control', () => {
  it('marks the current segment and names icon segments', () => {
    const onValueChange = vi.fn();
    render(
      <SegmentedControl
        label="Units"
        value="hz"
        segments={[
          { value: 'hz', content: 'Hz' },
          { value: 'note', content: '♫', label: 'Notes' },
        ]}
        onValueChange={onValueChange}
      />,
    );
    expect(screen.getByRole('radio', { name: 'Hz' })).toHaveProperty('checked', true);

    expect(screen.getByRole('radio', { name: 'Notes' })).toHaveProperty('checked', false);
  });
});

describe('toggle group', () => {
  it('reports every pick, also of the current item, and highlights on hover', () => {
    const picked: string[] = [];
    const highlighted: string[] = [];
    render(
      <ToggleGroup label="Types" value="b">
        {['a', 'b'].map((value) => (
          <ToggleGroupItem
            key={value}
            value={value}
            label={value}
            onSelect={() => picked.push(value)}
            onHighlight={(on) => on && highlighted.push(value)}
          >
            {value}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>,
    );
    expect(screen.getByRole('radio', { name: 'b' }).getAttribute('aria-checked')).toBe('true');

    fireEvent.mouseEnter(screen.getByRole('radio', { name: 'a' }));
    fireEvent.click(screen.getByRole('radio', { name: 'a' }));
    fireEvent.click(screen.getByRole('radio', { name: 'b' }));
    expect(highlighted).toEqual(['a']);
    expect(picked).toEqual(['a', 'b']);
  });
});
