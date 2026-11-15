// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/svelte';
import { tick } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fromInteger } from '../lib/rational';
import { isCorrect, type QuestionRecord } from '../lib/results';
import { numberStep } from '../lib/steps';
import type { Question } from '../lib/types';
import { viewport } from './layout.svelte';
import TestScreen from './TestScreen.svelte';

const LIMIT = 17 * 60_000;

function question(prompt: string, ...answers: number[]): Question {
  return {
    key: prompt,
    topic: 'tables',
    steps: answers.map((answer, i) =>
      numberStep({ prompt: `${prompt} (${i + 1})`, answer: fromInteger(answer) }),
    ),
  };
}

async function press(...names: string[]) {
  for (const name of names) await fireEvent.click(screen.getByRole('button', { name }));
}

type Finish = (records: QuestionRecord[], totalMs: number, timedOut: boolean) => void;

function renderTest(questions: Question[] = [question('2 × 3', 6), question('4 × 5', 20)]) {
  const onfinish = vi.fn<Finish>();
  render(TestScreen, { props: { questions, limitMs: LIMIT, onfinish } });
  return onfinish;
}

const timer = () => document.querySelector('.countdown');
const dialog = () => screen.queryByRole('dialog', { name: 'Toets stoppen?' });

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  viewport.shown = 'phone';
  viewport.layout = 'phone';
});

describe('TestScreen (test spec §5)', () => {
  it('shows the name, the counter and the full time', () => {
    renderTest();
    expect(screen.getByText('Oefentoets')).toBeTruthy();
    expect(screen.getByText('1 / 2')).toBeTruthy();
    expect(timer()?.textContent).toBe('17:00');
  });

  it.each([
    ['wrong', ['7']],
    ['right', ['6']],
  ])('moves on at once after a %s answer, without feedback', async (_, keys) => {
    renderTest();
    await press(...keys, 'OK');
    expect(screen.getByText('2 / 2')).toBeTruthy();
    expect(screen.queryByText('Niet goed')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Verder' })).toBeNull();
    expect(document.querySelector('.correct, .good')).toBeNull();
    expect(document.body.textContent).not.toContain('Goed!');
  });

  it('shows step 2 after a wrong step 1', async () => {
    renderTest([question('a', 4, 5), question('b', 1)]);
    await press('9', 'OK');
    expect(screen.getByText('a (2)', { exact: false })).toBeTruthy();
    expect(screen.getByText('1 / 2')).toBeTruthy();
  });

  it('finishes after the last answer', async () => {
    const onfinish = renderTest();
    await vi.advanceTimersByTimeAsync(3000);
    await press('6', 'OK', '9', 'OK');
    expect(onfinish).toHaveBeenCalledOnce();
    const [records, totalMs, timedOut] = onfinish.mock.calls[0]!;
    expect(records.map(isCorrect)).toEqual([true, false]);
    expect(totalMs).toBe(3000);
    expect(timedOut).toBe(false);
  });

  it('marks and announces the last minute once', async () => {
    renderTest();
    await vi.advanceTimersByTimeAsync(16 * 60_000);
    expect(timer()?.textContent).toBe('1:00');
    expect(timer()?.classList.contains('last-minute')).toBe(true);
    const live = () => document.querySelector('[aria-live="polite"]')?.textContent?.trim();
    expect(live()).toBe('Nog één minuut');
    await vi.advanceTimersByTimeAsync(30_000);
    expect(live()).toBe('Nog één minuut');
    expect(timer()?.textContent).toBe('0:30');
  });

  it('ends at the deadline with the answers so far', async () => {
    const onfinish = renderTest();
    await press('6', 'OK');
    await vi.advanceTimersByTimeAsync(LIMIT);
    expect(onfinish).toHaveBeenCalledOnce();
    const [records, , timedOut] = onfinish.mock.calls[0]!;
    expect(records).toHaveLength(1);
    expect(timedOut).toBe(true);
  });

  it('ends at once when it becomes visible after the deadline', async () => {
    const onfinish = renderTest();
    vi.setSystemTime(Date.now() + LIMIT + 5000);
    document.dispatchEvent(new Event('visibilitychange'));
    await tick();
    expect(onfinish).toHaveBeenCalledOnce();
    expect(onfinish.mock.calls[0]![2]).toBe(true);
  });

  it('keeps the typed answer and the deadline through a rotation', async () => {
    renderTest();
    await press('1', '2');
    await vi.advanceTimersByTimeAsync(60_000);
    viewport.shown = 'tablet-landscape';
    await tick();
    expect(document.body.textContent).toContain('12');
    expect(timer()?.textContent).toBe('16:00');
  });
});

describe('TestScreen stop dialog (test spec §5.4)', () => {
  it('opens on ✕ while the time runs on', async () => {
    const onfinish = renderTest();
    await press('Stoppen');
    expect(dialog()).toBeTruthy();
    expect(onfinish).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(5000);
    expect(timer()?.textContent).toBe('16:55');
  });

  it('closes on Verder werken and on Escape', async () => {
    const onfinish = renderTest();
    await press('Stoppen');
    await press('Verder werken');
    expect(dialog()).toBeNull();
    await press('Stoppen');
    await fireEvent.keyDown(window, { key: 'Escape' });
    expect(dialog()).toBeNull();
    expect(onfinish).not.toHaveBeenCalled();
  });

  it('ends the test on Stoppen', async () => {
    const onfinish = renderTest();
    await press('Stoppen');
    const stop = dialog()!.querySelector<HTMLButtonElement>('.primary')!;
    expect(document.activeElement).toBe(stop);
    await fireEvent.click(stop);
    expect(onfinish).toHaveBeenCalledOnce();
    expect(onfinish.mock.calls[0]![2]).toBe(false);
  });

  it('ends at the deadline with the dialog open', async () => {
    const onfinish = renderTest();
    await press('Stoppen');
    await vi.advanceTimersByTimeAsync(LIMIT);
    expect(onfinish).toHaveBeenCalledOnce();
    expect(onfinish.mock.calls[0]![2]).toBe(true);
  });

  it('hides the dialog under the "too low" notice and shows it again after', async () => {
    renderTest();
    await press('Stoppen');
    viewport.layout = 'too-low';
    await tick();
    expect(dialog()).toBeNull();
    viewport.layout = 'phone';
    await tick();
    expect(dialog()).toBeTruthy();
  });
});
