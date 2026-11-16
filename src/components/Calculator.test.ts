// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/svelte';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import {
  applyCalculatorKey,
  EMPTY_CALCULATOR,
  type CalculatorKey,
  type CalculatorState,
} from '../lib/calculator';
import Calculator from './Calculator.svelte';

// jsdom has no modal dialogs.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  });
});

function stateOf(keys: string): CalculatorState {
  return [...keys].reduce(
    (state, key) => applyCalculatorKey(state, key as CalculatorKey),
    EMPTY_CALCULATOR,
  );
}

const RESULT = stateOf('3,14×6,5^2=');

function renderCalculator(state: CalculatorState = EMPTY_CALCULATOR, take = true) {
  const onkey = vi.fn();
  const onclose = vi.fn();
  const ontake = vi.fn();
  const result = render(Calculator, {
    calculation: state,
    onkey,
    onclose,
    ontake: take ? ontake : undefined,
  });
  const dialog = result.container.querySelector('dialog')!;
  const display = result.container.querySelector('.calculation')!;
  return { ...result, onkey, onclose, ontake, dialog, display };
}

const button = (name: string) => screen.getByRole<HTMLButtonElement>('button', { name });

describe('Calculator', () => {
  it('opens as a modal dialog labelled Rekenmachine', () => {
    const { dialog } = renderCalculator();
    expect(dialog.showModal).toHaveBeenCalled();
    const title = document.getElementById(dialog.getAttribute('aria-labelledby')!);
    expect(title?.textContent).toBe('Rekenmachine');
  });

  it('shows 0 for an empty calculation and disables the keys that do nothing', () => {
    const { display } = renderCalculator();
    expect(display.textContent).toBe('0');
    expect(display.classList.contains('empty')).toBe(true);
    for (const name of ['is', 'plus', 'keer', 'gedeeld door', 'haakje sluiten', 'Wissen']) {
      expect(button(name).disabled, name).toBe(true);
    }
    for (const name of ['7', 'komma', 'min', 'haakje openen']) {
      expect(button(name).disabled, name).toBe(false);
    }
  });

  it('shows the calculation with its result and says it', () => {
    const { display, container } = renderCalculator(RESULT);
    expect(display.textContent).toBe('3,14 × 6,5² = 132,665');
    expect(display.classList.contains('empty')).toBe(false);
    expect(container.querySelector('[aria-live="polite"]')?.textContent).toBe('is 132,665');
  });

  it('passes a tapped key, = and C on', async () => {
    const { onkey } = renderCalculator(stateOf('2+3'));
    await fireEvent.pointerDown(button('7'), { button: 0 });
    await fireEvent.click(button('is'), { detail: 1 });
    await fireEvent.pointerDown(button('Wissen'), { button: 0 });
    expect(onkey.mock.calls).toEqual([['7'], ['='], ['clear']]);
  });

  it('closes with ✕, Esc, a tap outside and the system back', async () => {
    const { onclose, dialog, container } = renderCalculator();
    await fireEvent.click(button('Sluiten'));
    expect(onclose).toHaveBeenCalledTimes(1);
    const cancel = new Event('cancel', { cancelable: true });
    dialog.dispatchEvent(cancel);
    expect(cancel.defaultPrevented).toBe(true);
    expect(onclose).toHaveBeenCalledTimes(2);
    await fireEvent.click(container.querySelector('.inner')!);
    expect(onclose).toHaveBeenCalledTimes(2);
    await fireEvent.click(dialog);
    expect(onclose).toHaveBeenCalledTimes(3);
    await fireEvent.popState(window);
    expect(onclose).toHaveBeenCalledTimes(4);
  });

  it.each<[string, CalculatorKey]>([
    ['7', '7'],
    ['*', '×'],
    ['x', '×'],
    ['/', ':'],
    ['Enter', '='],
    ['=', '='],
    ['Delete', 'clear'],
    ['Backspace', 'backspace'],
    ['.', ','],
  ])('takes the physical key %s as %s', async (physical, key) => {
    const { onkey } = renderCalculator(stateOf('2+3'));
    await fireEvent.keyDown(window, { key: physical });
    expect(onkey).toHaveBeenCalledWith(key);
  });

  it('keeps the keys from the session behind it', async () => {
    const behind = vi.fn();
    window.addEventListener('keydown', behind);
    const { onkey } = renderCalculator();
    // A digit is typed, `+` does nothing at the start, `a` is no key: none gets through.
    for (const key of ['7', '+', 'a', 'Enter']) await fireEvent.keyDown(window, { key });
    expect(onkey.mock.calls).toEqual([['7']]);
    expect(behind).not.toHaveBeenCalled();
    // Escape is left to the dialog.
    await fireEvent.keyDown(window, { key: 'Escape' });
    expect(behind).toHaveBeenCalledOnce();
    window.removeEventListener('keydown', behind);
  });

  it('ignores a physical key with a modifier', async () => {
    const { onkey } = renderCalculator();
    await fireEvent.keyDown(window, { key: '7', ctrlKey: true });
    await fireEvent.keyDown(window, { key: '7', metaKey: true });
    expect(onkey).not.toHaveBeenCalled();
  });

  it('leaves Enter on a focused ✕ to that button', async () => {
    const { onkey } = renderCalculator(stateOf('2+3'));
    const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    button('Sluiten').dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(onkey).not.toHaveBeenCalled();
  });

  it('turns Enter on a tapped key into =, not into that key again', async () => {
    const { onkey } = renderCalculator(stateOf('2+3'));
    const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    button('7').dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(onkey.mock.calls).toEqual([['=']]);
  });

  it('has no Neem over without ontake', () => {
    renderCalculator(RESULT, false);
    expect(screen.queryByRole('button', { name: 'Neem over' })).toBeNull();
  });

  it('enables Neem over only with a result', () => {
    renderCalculator(stateOf('2+3'));
    expect(button('Neem over').disabled).toBe(true);
  });

  it('disables Neem over after Fout', () => {
    const { display } = renderCalculator(stateOf('5:0='));
    expect(display.textContent).toBe('5 : 0 = Fout');
    expect(button('Neem over').disabled).toBe(true);
  });

  it('hands the result over as the keypad would type it', async () => {
    const { ontake } = renderCalculator(RESULT);
    await fireEvent.click(button('Neem over'));
    expect(ontake).toHaveBeenCalledWith('132,665');
  });
});
