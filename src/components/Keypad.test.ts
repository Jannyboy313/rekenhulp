// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import { INPUT_MODELS } from '../lib/inputModels';
import Keypad from './Keypad.svelte';

const keys = INPUT_MODELS.number.keys;

describe('Keypad', () => {
  it('labels the submit key OK by default', () => {
    render(Keypad, { props: { keys, canSubmit: true, onkey: vi.fn(), onsubmit: vi.fn() } });
    expect(screen.getByRole('button', { name: 'OK' })).toBeTruthy();
  });

  it('can label the submit key differently', async () => {
    const onsubmit = vi.fn();
    render(Keypad, {
      props: { keys, canSubmit: true, okLabel: 'Volgende', onkey: vi.fn(), onsubmit },
    });
    expect(screen.queryByRole('button', { name: 'OK' })).toBeNull();
    await fireEvent.click(screen.getByRole('button', { name: 'Volgende' }));
    expect(onsubmit).toHaveBeenCalledOnce();
  });
});
