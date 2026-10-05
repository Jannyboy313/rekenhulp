// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Feedback from './Feedback.svelte';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('Feedback', () => {
  it('auto-advances 600 ms after a correct answer', async () => {
    const onnext = vi.fn();
    render(Feedback, {
      props: { prompt: '3 × 4 = ?', input: '12', result: { correct: true, expected: '12' }, onnext },
    });
    expect(screen.getByText('Goed!')).toBeTruthy();
    await vi.advanceTimersByTimeAsync(599);
    expect(onnext).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(onnext).toHaveBeenCalledOnce();
  });

  it('waits for Verder after a wrong answer and shows the details', async () => {
    const onnext = vi.fn();
    render(Feedback, {
      props: {
        prompt: '91 : 7 = ?',
        input: '-12',
        result: { correct: false, expected: '13', explanation: '13 × 7 = 91' },
        onnext,
      },
    });
    expect(screen.getByText('Fout')).toBeTruthy();
    expect(screen.getByText('−12')).toBeTruthy();
    expect(screen.getByText('13')).toBeTruthy();
    expect(screen.getByText('13 × 7 = 91')).toBeTruthy();

    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Verder' }));

    await vi.advanceTimersByTimeAsync(5000);
    expect(onnext).not.toHaveBeenCalled();

    await fireEvent.click(screen.getByRole('button', { name: 'Verder' }));
    expect(onnext).toHaveBeenCalledOnce();
  });
});
