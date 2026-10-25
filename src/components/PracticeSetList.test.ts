// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import { PRACTICE_SETS } from '../lib/sets';
import PracticeSetList from './PracticeSetList.svelte';

describe('PracticeSetList', () => {
  it('renders one button with a glyph per set', () => {
    render(PracticeSetList, { sets: PRACTICE_SETS, onselect: () => {} });
    const rows = screen.getAllByRole('button');
    expect(rows).toHaveLength(PRACTICE_SETS.length);
    PRACTICE_SETS.forEach((set, i) => {
      const row = rows[i]!;
      expect(row.textContent).toContain(set.name);
      expect(row.textContent).toContain(set.description);
      expect(row.querySelector('svg')).not.toBeNull();
      expect((row as HTMLButtonElement).disabled).toBe(false);
    });
  });

  it('calls onselect with the clicked set', async () => {
    const onselect = vi.fn();
    render(PracticeSetList, { sets: PRACTICE_SETS, onselect });
    await fireEvent.click(screen.getByRole('button', { name: /^Meten/ }));
    expect(onselect).toHaveBeenCalledWith(PRACTICE_SETS[1]);
  });
});
