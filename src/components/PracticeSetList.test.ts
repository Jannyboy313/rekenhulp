// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import { PRACTICE_SETS } from '../lib/sets';
import PracticeSetList from './PracticeSetList.svelte';

describe('PracticeSetList', () => {
  it('renders one button with a glyph per set, and the Oefentoets last', () => {
    render(PracticeSetList, { sets: PRACTICE_SETS, onselect: () => {}, ontest: () => {} });
    const rows = screen.getAllByRole('button');
    expect(rows).toHaveLength(PRACTICE_SETS.length + 1);
    [
      ...PRACTICE_SETS,
      { name: 'Oefentoets', description: 'Toets met tijdslimiet, uitslag na afloop' },
    ].forEach((set, i) => {
      const row = rows[i]!;
      expect(row.textContent).toContain(set.name);
      expect(row.textContent).toContain(set.description);
      expect(row.querySelector('svg')).not.toBeNull();
      expect((row as HTMLButtonElement).disabled).toBe(false);
    });
  });

  it('calls onselect with the clicked set, and ontest for the Oefentoets', async () => {
    const onselect = vi.fn();
    const ontest = vi.fn();
    render(PracticeSetList, { sets: PRACTICE_SETS, onselect, ontest });
    await fireEvent.click(screen.getByRole('button', { name: /^Meten/ }));
    expect(onselect).toHaveBeenCalledWith(PRACTICE_SETS[1]);
    await fireEvent.click(screen.getByRole('button', { name: /^Oefentoets/ }));
    expect(ontest).toHaveBeenCalledOnce();
  });
});
