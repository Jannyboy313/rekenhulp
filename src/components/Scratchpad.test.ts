// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import Scratchpad from './Scratchpad.svelte';

describe('Scratchpad', () => {
  it('labels each cell with its number and content and marks the active one', () => {
    render(Scratchpad, {
      props: { notes: ['900', '', '-2,5', '', '12 -7 8', ''], active: 2, onselect: vi.fn() },
    });
    expect(screen.getByRole('group', { name: 'Kladblok' })).toBeTruthy();
    const cells = screen.getAllByRole('button');
    expect(cells.map((cell) => cell.getAttribute('aria-label'))).toEqual([
      'Kladblok vak 1: 900',
      'Kladblok vak 2: leeg',
      'Kladblok vak 3: −2,5',
      'Kladblok vak 4: leeg',
      'Kladblok vak 5: 12 −7 8',
      'Kladblok vak 6: leeg',
    ]);
    expect(cells.map((cell) => cell.textContent)).toEqual(['900', '', '−2,5', '', '12 −7 8', '']);
    expect(cells.map((cell) => cell.getAttribute('aria-pressed'))).toEqual([
      'false',
      'false',
      'true',
      'false',
      'false',
      'false',
    ]);
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
