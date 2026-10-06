// @vitest-environment jsdom
import { fireEvent } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import { press } from './press';

function setup() {
  const button = document.createElement('button');
  const handler = vi.fn();
  const action = press(button, handler);
  return { button, handler, action };
}

describe('press', () => {
  it('fires on pointerdown and ignores the click that follows the press', async () => {
    const { button, handler } = setup();
    await fireEvent.pointerDown(button);
    expect(handler).toHaveBeenCalledOnce();
    await fireEvent.click(button, { detail: 1 });
    expect(handler).toHaveBeenCalledOnce();
  });

  it('fires on keyboard activation, which clicks with detail 0', async () => {
    const { button, handler } = setup();
    await fireEvent.click(button, { detail: 0 });
    expect(handler).toHaveBeenCalledOnce();
  });

  it('ignores secondary buttons and disabled keys', async () => {
    const { button, handler } = setup();
    await fireEvent.pointerDown(button, { button: 2 });
    button.disabled = true;
    await fireEvent.pointerDown(button);
    expect(handler).not.toHaveBeenCalled();
  });

  it('uses the latest handler and stops after destroy', async () => {
    const { button, handler, action } = setup();
    const next = vi.fn();
    action.update?.(next);
    await fireEvent.pointerDown(button);
    expect(next).toHaveBeenCalledOnce();
    expect(handler).not.toHaveBeenCalled();

    action.destroy?.();
    await fireEvent.pointerDown(button);
    expect(next).toHaveBeenCalledOnce();
  });
});
