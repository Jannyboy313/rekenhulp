// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
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

describe('PracticeSetList review row (review spec §4)', () => {
  it('has no such row without the prop', () => {
    render(PracticeSetList, { sets: PRACTICE_SETS, onselect: () => {}, ontest: () => {} });
    expect(screen.queryByRole('button', { name: /Fouten van eerder/ })).toBeNull();
  });

  it('renders it as the first row, with the count and a glyph', async () => {
    const onstart = vi.fn();
    render(PracticeSetList, {
      sets: PRACTICE_SETS,
      onselect: () => {},
      ontest: () => {},
      review: { count: 3, onstart },
    });
    const rows = screen.getAllByRole('button');
    expect(rows).toHaveLength(PRACTICE_SETS.length + 2);
    expect(rows[0]!.textContent).toContain('Fouten van eerder');
    expect(rows[0]!.textContent).toContain('3 onderwerpen om te herhalen');
    expect(rows[0]!.querySelector('svg')).not.toBeNull();
    await fireEvent.click(rows[0]!);
    expect(onstart).toHaveBeenCalledOnce();
  });
});

describe('PracticeSetList footer', () => {
  it('has no footer item without a footer', () => {
    render(PracticeSetList, { sets: PRACTICE_SETS, onselect: () => {}, ontest: () => {} });
    expect(document.querySelector('li.list-footer')).toBeNull();
  });

  it('renders the footer as the last item of the list', () => {
    const footer = createRawSnippet(() => ({ render: () => '<span>voet</span>' }));
    render(PracticeSetList, { sets: PRACTICE_SETS, onselect: () => {}, ontest: () => {}, footer });
    const items = [...document.querySelectorAll('.set-list > li')];
    expect(items).toHaveLength(PRACTICE_SETS.length + 2);
    expect(items.at(-1)!.className).toBe('list-footer');
    expect(items.at(-1)!.textContent).toBe('voet');
  });
});
