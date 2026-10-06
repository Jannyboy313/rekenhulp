// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fromInteger } from '../lib/rational';
import { isCorrect, type QuestionRecord } from '../lib/results';
import { TABLES_SET } from '../lib/sets';
import { booleanStep, numberStep } from '../lib/steps';
import { propertyQuestion } from '../lib/topics/properties';
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

  it('announces the result in a live region', async () => {
    render(PlayScreen, { props: { set: TABLES_SET, questions, onfinish: vi.fn() } });
    await press('6', 'OK');
    expect(screen.getByRole('status').textContent?.trim()).toBe('Goed!');
    await vi.advanceTimersByTimeAsync(600);
    await press('9', 'OK');
    expect(screen.getByRole('status').textContent?.trim()).toBe('Fout. Juist antwoord: 20');
  });

  it('calls onfinish at most once when Stop is pressed during the final auto-advance', async () => {
    const onfinish = vi.fn<(records: QuestionRecord[], totalMs: number) => void>();
    render(PlayScreen, {
      props: { set: TABLES_SET, questions: [questions[0]!], onfinish },
    });
    await press('6', 'OK', 'Stop');
    await vi.advanceTimersByTimeAsync(600);
    expect(onfinish).toHaveBeenCalledOnce();
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

  it('takes a Ja/Nee answer with one tap and shows it in the feedback', async () => {
    const onfinish = vi.fn<(records: QuestionRecord[], totalMs: number) => void>();
    const prime: Question = {
      key: 'prime:91',
      topic: 'prime',
      steps: [
        booleanStep({ prompt: 'Is 91 een priemgetal?', answer: false, explanation: '91 = 7 × 13' }),
      ],
    };
    render(PlayScreen, { props: { set: TABLES_SET, questions: [prime], onfinish } });
    await press('Ja');
    expect(screen.getByText('Fout')).toBeTruthy();
    expect(screen.getByText('Ja')).toBeTruthy();
    expect(screen.getByText('Nee')).toBeTruthy();
    expect(screen.getByText('91 = 7 × 13')).toBeTruthy();
    await press('Verder');
    expect(onfinish).toHaveBeenCalledOnce();
  });

  it('keeps the kladblok across the steps of a question and clears it at the next', async () => {
    const twoSteps: Question = {
      key: 'two-steps',
      topic: 'percentages',
      steps: [
        numberStep({ prompt: '10% van 90 = ?', answer: fromInteger(9) }),
        numberStep({ prompt: '20% van 90 = ?', answer: fromInteger(18) }),
      ],
    };
    const next: Question = {
      key: 'next',
      topic: 'percentages',
      steps: [numberStep({ prompt: '50% van 8 = ?', answer: fromInteger(4) })],
    };
    // Visibility depends on the question's topic, not on the set, so TABLES_SET is fine here.
    render(PlayScreen, {
      props: { set: TABLES_SET, questions: [twoSteps, next], onfinish: vi.fn() },
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Kladblok vak 1: leeg' }));
    await press('9', 'Naar antwoordveld', '9', 'OK');
    expect(screen.queryByRole('group', { name: 'Kladblok' })).toBeNull();
    await vi.advanceTimersByTimeAsync(600);

    expect(screen.getByText('20% van 90 = ?')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Kladblok vak 1: 9' })).toBeTruthy();
    await press('1', '8', 'OK');
    await vi.advanceTimersByTimeAsync(600);

    expect(screen.getByText('50% van 8 = ?')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Kladblok vak 1: leeg' })).toBeTruthy();
  });

  it('shows no kladblok for table questions', () => {
    render(PlayScreen, { props: { set: TABLES_SET, questions, onfinish: vi.fn() } });
    expect(screen.queryByRole('group', { name: 'Kladblok' })).toBeNull();
  });

  it('runs a property question through both steps, also after a wrong rewrite', async () => {
    const onfinish = vi.fn<(records: QuestionRecord[], totalMs: number) => void>();
    const property = propertyQuestion(
      {
        text: '7 × 98',
        intended: 'distributive',
        rewrites: { commutative: '98 × 7', distributive: '7 × 100 − 7 × 2' },
      },
      'basis',
      'distributive',
    );
    // The steps come from the question, not from the set: TABLES_SET only provides the header name.
    render(PlayScreen, { props: { set: TABLES_SET, questions: [property], onfinish } });

    await press('9', '8', 'keer', '7', 'OK');
    expect(screen.getByText('Fout')).toBeTruthy();
    expect(screen.getByText('98 × 7')).toBeTruthy();
    expect(screen.getByText('7 × 100 − 7 × 2')).toBeTruthy();
    expect(
      screen.getByText('Geldige stap (commutatief), maar niet handig. Probeer distributief.'),
    ).toBeTruthy();

    await press('Verder');
    expect(screen.getByText('7 × 98 = ?')).toBeTruthy();
    await press('6', '8', '6', 'OK');
    await vi.advanceTimersByTimeAsync(600);

    expect(onfinish).toHaveBeenCalledOnce();
    const [records] = onfinish.mock.calls[0]!;
    expect(records[0]!.attempts.map((attempt) => attempt.result.correct)).toEqual([false, true]);
    expect(isCorrect(records[0]!)).toBe(false);
  });
});
