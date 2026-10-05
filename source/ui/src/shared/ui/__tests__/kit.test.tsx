import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { SegmentedControl } from '../segmented-control';
import { SelectMenu } from '../select-menu';
import { ToggleGroup, ToggleGroupItem } from '../toggle-group';

afterEach(cleanup);

describe('select menu', () => {
  // Picking (pointer and keyboard) is driven by Ark's state machines, which happy-dom does not run
  // faithfully; it is checked in the browser.
  it('shows the current option on the pill and opens with it checked', async () => {
    const onValueChange = vi.fn();
    render(
      <SelectMenu
        label="Analyzer"
        value="post"
        options={[
          { value: 'prepost', label: 'Pre + Post' },
          { value: 'post', label: 'Post' },
          { value: 'off', label: 'Off', separated: true },
        ]}
        onValueChange={onValueChange}
      />,
    );
    const pill = screen.getByRole('button', { name: /Analyzer/ });
    expect(pill.textContent).toContain('Post');

    fireEvent.click(pill);
    await waitFor(() => expect(screen.getByRole('menuitemradio', { name: 'Off' })).toBeTruthy());
    expect(screen.getByRole('menuitemradio', { name: 'Post' }).getAttribute('aria-checked')).toBe('true');
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
