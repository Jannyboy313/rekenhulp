// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import { INPUT_MODELS } from '../lib/inputModels';
import { NOTE_COLUMNS, NOTE_KEYS } from '../lib/scratchpad';
import Keypad from './Keypad.svelte';

const keys = INPUT_MODELS.number.keys;

describe('Keypad', () => {
  it('submits with OK on click', async () => {
    const onsubmit = vi.fn();
    render(Keypad, { props: { keys, canSubmit: true, onkey: vi.fn(), onsubmit } });
    await fireEvent.click(screen.getByRole('button', { name: 'OK' }), { detail: 1 });
    expect(onsubmit).toHaveBeenCalledOnce();
  });

  it('has no OK without onsubmit, and the spatie is a normal key', async () => {
    const onkey = vi.fn();
    render(Keypad, { props: { keys: NOTE_KEYS, columns: NOTE_COLUMNS, canSubmit: false, onkey } });
    expect(screen.queryByRole('button', { name: 'OK' })).toBeNull();
    const space = screen.getByRole('button', { name: 'spatie' });
    expect(space.querySelector('.space')).not.toBeNull();
    expect(space.style.gridColumn).toBe('');
    expect(space.classList.contains('ok')).toBe(false);
    await fireEvent.pointerDown(space, { button: 0 });
    expect(onkey).toHaveBeenCalledWith(' ');
  });

  it('disables every key when disabled, so none calls onkey', async () => {
    const onkey = vi.fn();
    const onsubmit = vi.fn();
    render(Keypad, { props: { keys, canSubmit: true, disabled: true, onkey, onsubmit } });
    const buttons = screen.getAllByRole<HTMLButtonElement>('button');
    for (const button of buttons) expect(button.disabled).toBe(true);
    // A real browser sends no events to a disabled button; press must not rely on that.
    for (const button of buttons.slice(0, -1)) {
      await fireEvent.pointerDown(button, { button: 0 });
      await fireEvent.click(button);
    }
    expect(onkey).not.toHaveBeenCalled();
  });

  it('draws ^ as x with a raised n, and the breuk key as two outlined boxes', () => {
    render(Keypad, {
      props: {
        keys: NOTE_KEYS,
        columns: NOTE_COLUMNS,
        canSubmit: false,
        onkey: vi.fn(),
        tray: true,
      },
    });
    const power = screen.getByRole('button', { name: 'tot de macht' });
    expect(power.querySelector('sup')?.textContent).toBe('n');
    expect(power.textContent?.replace(/\s/g, '')).toBe('xn');
    expect(screen.getByRole('button', { name: 'breuk' }).querySelectorAll('.box')).toHaveLength(2);
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

  it('sets the number of rows, so the keys fill the height of five rows', () => {
    const rows = (props: { keys: typeof keys; columns?: number }) => {
      const { container, unmount } = render(Keypad, {
        props: { ...props, canSubmit: true, onkey: vi.fn(), onsubmit: vi.fn() },
      });
      const value = container
        .querySelector<HTMLElement>('.keypad')!
        .style.getPropertyValue('--rows');
      unmount();
      return value;
    };
    expect(rows({ keys })).toBe('5');
    expect(rows({ keys: INPUT_MODELS.scientific.keys, columns: 4 })).toBe('4');
  });
});

describe('Keypad with a spanning key', () => {
  it('sets 4 rows for the roman keypad and lets M span 2 columns', () => {
    const { container } = render(Keypad, {
      props: { keys: INPUT_MODELS.roman.keys, canSubmit: true, onkey: vi.fn(), onsubmit: vi.fn() },
    });
    expect(container.querySelector<HTMLElement>('.keypad')!.style.getPropertyValue('--rows')).toBe(
      '4',
    );
    expect(screen.getByRole('button', { name: 'M' }).style.gridColumn).toBe('span 2');
    expect(screen.getByRole('button', { name: 'I' }).style.gridColumn).toBe('');
    expect(screen.getByRole('button', { name: 'OK' }).style.gridColumn).toBe('span 3');
  });
});
