// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fromInteger } from '../lib/rational';
import { isCorrect, type QuestionRecord } from '../lib/results';
import { TABLES_SET } from '../lib/sets';
import { numberStep } from '../lib/steps';
import type { Question } from '../lib/types';
import PlayScreen from './PlayScreen.svelte';

function question(prompt: string, answer: number): Question {
  return {
    key: prompt,
    topic: 'tables',
    steps: [numberStep({ prompt, answer: fromInteger(answer) })],
  };
}

async function press(...names: string[]) {
  for (const name of names) await fireEvent.click(screen.getByRole('button', { name }));
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('PlayScreen', () => {
  const questions = [question('2 × 3 = ?', 6), question('4 × 5 = ?', 20)];

  it('records answers and finishes after the last question', async () => {
    const onfinish = vi.fn<(records: QuestionRecord[], totalMs: number) => void>();
    render(PlayScreen, { props: { set: TABLES_SET, questions, onfinish } });

    expect(screen.getByText('Tafels')).toBeTruthy();
    expect(screen.getByText('1 / 2')).toBeTruthy();
    await vi.advanceTimersByTimeAsync(2000);
    await press('6', 'OK');
    await vi.advanceTimersByTimeAsync(600);

    expect(screen.getByText('2 / 2')).toBeTruthy();
    await press('9', 'OK', 'Verder');

    expect(onfinish).toHaveBeenCalledOnce();
    const [records, totalMs] = onfinish.mock.calls[0]!;
    expect(records.map(isCorrect)).toEqual([true, false]);
    expect(records[0]!.durationMs).toBe(2000);
    expect(totalMs).toBe(2600);
  });

  it('shows the elapsed time', async () => {
    render(PlayScreen, { props: { set: TABLES_SET, questions, onfinish: vi.fn() } });
    expect(screen.getByText('00:00')).toBeTruthy();
    await vi.advanceTimersByTimeAsync(65_000);
    expect(screen.getByText('01:05')).toBeTruthy();
  });

  it('Stop finishes with only the answered questions', async () => {
    const onfinish = vi.fn<(records: QuestionRecord[], totalMs: number) => void>();
    render(PlayScreen, { props: { set: TABLES_SET, questions, onfinish } });
    await press('6', 'OK');
    await vi.advanceTimersByTimeAsync(600);
    await press('2', 'Stop');
    expect(onfinish).toHaveBeenCalledOnce();
    expect(onfinish.mock.calls[0]![0]).toHaveLength(1);
  });
});
