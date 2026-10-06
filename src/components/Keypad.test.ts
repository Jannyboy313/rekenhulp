// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import { INPUT_MODELS } from '../lib/inputModels';
import { NOTE_KEYS } from '../lib/scratchpad';
import Keypad from './Keypad.svelte';

const keys = INPUT_MODELS.number.keys;

describe('Keypad', () => {
  it('submits with OK on click', async () => {
    const onsubmit = vi.fn();
    render(Keypad, { props: { keys, canSubmit: true, onkey: vi.fn(), onsubmit } });
    await fireEvent.click(screen.getByRole('button', { name: 'OK' }), { detail: 1 });
    expect(onsubmit).toHaveBeenCalledOnce();
  });

  it('has no OK without onsubmit, and a wide key takes its place', async () => {
    const onkey = vi.fn();
    render(Keypad, { props: { keys: NOTE_KEYS, canSubmit: false, onkey } });
    expect(screen.queryByRole('button', { name: 'OK' })).toBeNull();
    const space = screen.getByRole('button', { name: 'spatie' });
    expect(space.style.gridColumn).toBe('span 2');
    expect(space.classList.contains('ok')).toBe(false);
    expect(screen.getByRole('button', { name: 'wissen' }).style.gridColumn).toBe('');
    await fireEvent.pointerDown(space, { button: 0 });
    expect(onkey).toHaveBeenCalledWith(' ');
  });

  it('uses 3 columns unless told otherwise', () => {
    const { container } = render(Keypad, {
      props: { keys, canSubmit: true, onkey: vi.fn(), onsubmit: vi.fn() },
    });
    const grid = container.querySelector<HTMLElement>('.keypad')!;
    expect(grid.style.getPropertyValue('--columns')).toBe('3');
    expect(screen.getByRole('button', { name: 'OK' }).style.gridColumn).toBe('span 2');
  });

  it('lays out the expression keys in 4 columns with OK over the last 3', () => {
    const { container } = render(Keypad, {
      props: {
        keys: INPUT_MODELS.expression.keys,
        columns: 4,
        canSubmit: true,
        onkey: vi.fn(),
        onsubmit: vi.fn(),
      },
    });
    const grid = container.querySelector<HTMLElement>('.keypad')!;
    expect(grid.style.getPropertyValue('--columns')).toBe('4');
    expect(screen.getByRole('button', { name: 'OK' }).style.gridColumn).toBe('span 3');
  });
});
