// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import { NOTE_FRACTION_END } from '../lib/format';
import { SHORT_SCREENS } from '../lib/scratchpad';
import Scratchpad from './Scratchpad.svelte';
import source from './Scratchpad.svelte?raw';

describe('Scratchpad', () => {
  it('hides the cells in CSS exactly as SHORT_SCREENS lists them', () => {
    for (const { query, visibleCells } of SHORT_SCREENS) {
      expect(source).toContain(`@media ${query} {\n    .cell:nth-child(n + ${visibleCells + 1})`);
    }
  });

  it('hints at tapping while no cell is active and drops the hint when one is', () => {
    const { rerender } = render(Scratchpad, {
      props: { notes: ['', '', '', '', '', ''], active: null, onselect: vi.fn() },
    });
    expect(screen.getByText('Kladblok · tik om te noteren')).toBeTruthy();
    expect(document.querySelector('.label')?.classList.contains('active')).toBe(false);

    rerender({ notes: ['', '', '', '', '', ''], active: 1, onselect: vi.fn() });
    expect(screen.queryByText(/tik om te noteren/)).toBeNull();
    expect(document.querySelector('.label')?.textContent?.trim()).toBe('Kladblok');
    expect(document.querySelector('.label')?.classList.contains('active')).toBe(true);
  });

  it.each([
    ['_', false],
    ['_3', false],
    ['_3/', false],
    ['1_', false],
    ['_3/4', false],
    ['1_3/4', false],
    [`_3/4${NOTE_FRACTION_END}`, true],
    [`1_3/4${NOTE_FRACTION_END}`, true],
    ['_3/4 ', true],
    ['_3/4+', true],
    ['12', true],
    ['', true],
  ])('shows the caret in the note %j: %s', (note, caret) => {
    render(Scratchpad, { props: { notes: [note], active: 0, onselect: vi.fn() } });
    expect(document.querySelector('.caret') !== null).toBe(caret);
  });

  it('does not show the end-of-fraction marker, to the eye or to a screen reader', () => {
    render(Scratchpad, {
      props: { notes: [`_3/4${NOTE_FRACTION_END}+1`], active: 0, onselect: vi.fn() },
    });
    const cell = screen.getByRole('button');
    expect(cell.textContent).toBe('3/4+1');
    expect(cell.getAttribute('aria-label')).toBe('Kladblok vak 1: 3/4+1');
  });

  it('shows a caret only in the active cell', () => {
    render(Scratchpad, {
      props: { notes: ['12', '', '', '', '', ''], active: 0, onselect: vi.fn() },
    });
    expect(document.querySelectorAll('.caret')).toHaveLength(1);
    expect(screen.getAllByRole('button')[0]!.querySelector('.caret')).not.toBeNull();
  });

  it('labels each cell with its number and content and marks the active one', () => {
    render(Scratchpad, {
      props: { notes: ['900', '', '-2,5', '', '12×7=84 3-8=-5', ''], active: 2, onselect: vi.fn() },
    });
    expect(screen.getByRole('group', { name: 'Kladblok' })).toBeTruthy();
    const cells = screen.getAllByRole('button');
    expect(cells.map((cell) => cell.getAttribute('aria-label'))).toEqual([
      'Kladblok vak 1: 900',
      'Kladblok vak 2: leeg',
      'Kladblok vak 3: −2,5',
      'Kladblok vak 4: leeg',
      'Kladblok vak 5: 12×7=84 3−8=−5',
      'Kladblok vak 6: leeg',
    ]);
    // Compact: no spaces around operators, so a space always separates items (spec §3.6).
    expect(cells.map((cell) => cell.textContent)).toEqual([
      '900',
      '',
      '−2,5',
      '',
      '12×7=84 3−8=−5',
      '',
    ]);
    expect(cells.map((cell) => cell.getAttribute('aria-pressed'))).toEqual([
      'false',
      'false',
      'true',
      'false',
      'false',
      'false',
    ]);
  });

  it('shows exponents in superscript and fractions stacked', () => {
    render(Scratchpad, { props: { notes: ['2^3=8 -_3/4'], active: 0, onselect: vi.fn() } });
    const cell = screen.getByRole('button');
    expect(cell.textContent).toBe('2³=8 −3/4');
    expect(cell.getAttribute('aria-label')).toBe('Kladblok vak 1: 2³=8 −3/4');
    const fractions = cell.querySelectorAll('.fraction');
    expect(fractions).toHaveLength(1);
    expect(fractions[0]?.querySelector('.numerator')?.textContent).toBe('3');
    expect(fractions[0]?.querySelector('.denominator')?.textContent).toBe('4');
  });

  it('shows a mixed number against its whole part and reads it with en', () => {
    render(Scratchpad, { props: { notes: ['1_2/3'], active: 0, onselect: vi.fn() } });
    const cell = screen.getByRole('button');
    expect(cell.textContent).toBe('12/3');
    expect(cell.getAttribute('aria-label')).toBe('Kladblok vak 1: 1 en 2/3');
    expect(cell.querySelector('.numerator')?.textContent).toBe('2');
  });

  it('keeps a fraction after a space as its own item', () => {
    render(Scratchpad, { props: { notes: ['12 _3/4'], active: 0, onselect: vi.fn() } });
    const cell = screen.getByRole('button');
    expect(cell.textContent).toBe('12 3/4');
    expect(cell.getAttribute('aria-label')).toBe('Kladblok vak 1: 12 3/4');
  });

  // The placeholder marks the slot the next digit goes into; the other empty slot is blank.
  it.each([
    ['_', '…', '\u{a0}'],
    ['_3', '3', '\u{a0}'],
    ['_3/', '3', '…'],
  ])('shows the unfinished fraction %j stacked', (note, numerator, denominator) => {
    render(Scratchpad, { props: { notes: [note], active: 0, onselect: vi.fn() } });
    const cell = screen.getByRole('button');
    expect(cell.querySelector('.numerator')?.textContent).toBe(numerator);
    expect(cell.querySelector('.denominator')?.textContent).toBe(denominator);
  });

  it('keeps a trailing space after a fraction', () => {
    render(Scratchpad, { props: { notes: ['_3/4 '], active: 0, onselect: vi.fn() } });
    expect(screen.getByRole('button').textContent).toBe('3/4 ');
  });

  it('keeps a trailing space, so a typed spatie shows', () => {
    render(Scratchpad, { props: { notes: ['12 '], active: 0, onselect: vi.fn() } });
    expect(screen.getByRole('button').textContent).toBe('12 ');
  });

  it('selects a cell as soon as it is pressed', async () => {
    const onselect = vi.fn();
    render(Scratchpad, { props: { notes: ['', '', '', '', '', ''], active: null, onselect } });
    await fireEvent.pointerDown(screen.getByRole('button', { name: 'Kladblok vak 3: leeg' }));
    expect(onselect).toHaveBeenCalledWith(2);
  });
});
