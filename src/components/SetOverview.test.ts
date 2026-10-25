// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import { PRACTICE_SETS } from '../lib/sets';
import SetOverview from './SetOverview.svelte';

describe('SetOverview', () => {
  it('shows the title and subtitle', () => {
    render(SetOverview, { sets: PRACTICE_SETS, onselect: () => {} });
    expect(screen.getByRole('heading', { name: 'Rekenhulp' })).toBeTruthy();
    expect(screen.getByText('Wat wil je oefenen?')).toBeTruthy();
  });

  it('renders one button with a glyph per set', () => {
    render(SetOverview, { sets: PRACTICE_SETS, onselect: () => {} });
    const rows = screen.getAllByRole('button');
    expect(rows).toHaveLength(PRACTICE_SETS.length);
    PRACTICE_SETS.forEach((set, i) => {
      const row = rows[i]!;
      expect(row.textContent).toContain(set.name);
      expect(row.querySelector('svg')).not.toBeNull();
    });
  });

  it('calls onselect with the clicked set', async () => {
    const onselect = vi.fn();
    render(SetOverview, { sets: PRACTICE_SETS, onselect });
    await fireEvent.click(screen.getByRole('button', { name: /^Meten/ }));
    expect(onselect).toHaveBeenCalledWith(PRACTICE_SETS[1]);
  });
});
