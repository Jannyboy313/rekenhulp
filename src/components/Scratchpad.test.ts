// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import Scratchpad from './Scratchpad.svelte';

describe('Scratchpad', () => {
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
