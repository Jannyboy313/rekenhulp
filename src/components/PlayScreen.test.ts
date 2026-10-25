// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fromInteger } from '../lib/rational';
import { isCorrect, type QuestionRecord } from '../lib/results';
import { TABLES_SET } from '../lib/sets';
import { booleanStep, numberStep } from '../lib/steps';
import { propertyQuestion } from '../lib/topics/properties';
import type { Question } from '../lib/types';
import { CORRECT_FEEDBACK_MS } from './Feedback.svelte';
import PlayScreen from './PlayScreen.svelte';
import { stubMatchMedia } from './testMatchMedia';

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

beforeEach(() => {
  vi.useFakeTimers();
  stubMatchMedia();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('PlayScreen', () => {
  const questions = [question('2 × 3 = ?', 6), question('4 × 5 = ?', 20)];

  it('records answers and finishes after the last question', async () => {
    const onfinish = vi.fn<(records: QuestionRecord[], totalMs: number) => void>();
    render(PlayScreen, { props: { set: TABLES_SET, questions, onfinish } });

    expect(screen.getByText('Tafels')).toBeTruthy();
    expect(screen.getByText('1 / 2')).toBeTruthy();
    await vi.advanceTimersByTimeAsync(2000);
    await press('6', 'OK');
    await vi.advanceTimersByTimeAsync(CORRECT_FEEDBACK_MS);

    expect(screen.getByText('2 / 2')).toBeTruthy();
    await press('2', '0', 'OK');
    await vi.advanceTimersByTimeAsync(CORRECT_FEEDBACK_MS);

    expect(onfinish).toHaveBeenCalledOnce();
    const [records, totalMs] = onfinish.mock.calls[0]!;
    expect(records.map(isCorrect)).toEqual([true, true]);
    expect(records[0]!.durationMs).toBe(2000);
    expect(totalMs).toBe(3200);
  });

  it('keeps the screen on while the session runs', async () => {
    const release = vi.fn(async () => {});
    const request = vi.fn(async () => ({ released: false, release }));
    Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request } });
    try {
      const { unmount } = render(PlayScreen, {
        props: { set: TABLES_SET, questions, onfinish: vi.fn() },
      });
      await vi.advanceTimersByTimeAsync(0);
      expect(request).toHaveBeenCalledWith('screen');
      unmount();
      expect(release).toHaveBeenCalled();
    } finally {
      Reflect.deleteProperty(navigator, 'wakeLock');
    }
  });

  it('shows the elapsed time', async () => {
    render(PlayScreen, { props: { set: TABLES_SET, questions, onfinish: vi.fn() } });
    expect(screen.getByText('0:00')).toBeTruthy();
    await vi.advanceTimersByTimeAsync(65_000);
    expect(screen.getByText('1:05')).toBeTruthy();
  });

  it('announces the result in a live region', async () => {
    render(PlayScreen, { props: { set: TABLES_SET, questions, onfinish: vi.fn() } });
    await press('6', 'OK');
    expect(screen.getByRole('status').textContent?.trim()).toBe('Goed!');
    await vi.advanceTimersByTimeAsync(CORRECT_FEEDBACK_MS);
    await press('9', 'OK');
    expect(screen.getByRole('status').textContent?.trim()).toBe('Fout. Juist antwoord: 20');
  });

  it('calls onfinish at most once when Stop is pressed during the final auto-advance', async () => {
    const onfinish = vi.fn<(records: QuestionRecord[], totalMs: number) => void>();
    render(PlayScreen, {
      props: { set: TABLES_SET, questions: [questions[0]!], onfinish },
    });
    await press('6', 'OK', 'Stoppen');
    await vi.advanceTimersByTimeAsync(CORRECT_FEEDBACK_MS);
    expect(onfinish).toHaveBeenCalledOnce();
  });

  it('Stop finishes with only the answered questions', async () => {
    const onfinish = vi.fn<(records: QuestionRecord[], totalMs: number) => void>();
    render(PlayScreen, { props: { set: TABLES_SET, questions, onfinish } });
    await press('6', 'OK');
    await vi.advanceTimersByTimeAsync(CORRECT_FEEDBACK_MS);
    await press('2', 'Stoppen');
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
    // The wrong answer brings the question back; it finishes once answered correctly.
    expect(onfinish).not.toHaveBeenCalled();
    await press('Nee');
    await vi.advanceTimersByTimeAsync(CORRECT_FEEDBACK_MS);
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
    await vi.advanceTimersByTimeAsync(CORRECT_FEEDBACK_MS);

    expect(screen.getByText('20% van 90 = ?')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Kladblok vak 1: 9' })).toBeTruthy();
    await press('1', '8', 'OK');
    await vi.advanceTimersByTimeAsync(CORRECT_FEEDBACK_MS);

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
    // The slot is its own element, so the whole prompt is matched on its text content.
    expect(document.querySelector('.prompt')?.textContent).toBe('7 × 98 = ?');
    await press('6', '8', '6', 'OK');
    await vi.advanceTimersByTimeAsync(CORRECT_FEEDBACK_MS);

    // One wrong step is enough to bring the whole question back.
    expect(screen.getByText('Herhaling')).toBeTruthy();
    await press('Stoppen');
    expect(onfinish).toHaveBeenCalledOnce();
    const [records] = onfinish.mock.calls[0]!;
    expect(records[0]!.attempts.map((attempt) => attempt.result.correct)).toEqual([false, true]);
    expect(isCorrect(records[0]!)).toBe(false);
  });

  it('repeats a wrong question until it is correct and records only first attempts', async () => {
    const onfinish = vi.fn<(records: QuestionRecord[], totalMs: number) => void>();
    render(PlayScreen, { props: { set: TABLES_SET, questions, onfinish } });

    await press('5', 'OK', 'Verder');
    // With one question left, the repeat comes after it, not directly next.
    expect(screen.getByText('4 × 5 = ?')).toBeTruthy();
    expect(screen.getByText('2 / 2')).toBeTruthy();
    await press('2', '0', 'OK');
    await vi.advanceTimersByTimeAsync(CORRECT_FEEDBACK_MS);

    expect(screen.getByText('2 × 3 = ?')).toBeTruthy();
    expect(screen.getByText('Herhaling')).toBeTruthy();
    await press('7', 'OK', 'Verder');

    expect(screen.getByText('2 × 3 = ?')).toBeTruthy();
    expect(screen.getByText('Herhaling')).toBeTruthy();
    await press('6', 'OK');
    await vi.advanceTimersByTimeAsync(CORRECT_FEEDBACK_MS);

    expect(onfinish).toHaveBeenCalledOnce();
    const [records] = onfinish.mock.calls[0]!;
    expect(records.map((record) => record.question.key)).toEqual(['2 × 3 = ?', '4 × 5 = ?']);
    expect(records.map(isCorrect)).toEqual([false, true]);
    expect(records[0]!.attempts[0]!.input).toBe('5');
  });

  describe('session header', () => {
    const fifteen = Array.from({ length: 15 }, (_, i) => question(`${i + 1} × 1 = ?`, i + 1));

    function progress(): HTMLElement {
      return screen.getByRole('progressbar');
    }

    it('shows the counter and an empty progress bar on the first question', () => {
      render(PlayScreen, { props: { set: TABLES_SET, questions: fifteen, onfinish: vi.fn() } });
      expect(screen.getByText('1 / 15')).toBeTruthy();
      expect(progress().getAttribute('aria-valuenow')).toBe('0');
      expect(progress().getAttribute('aria-valuemin')).toBe('0');
      expect(progress().getAttribute('aria-valuemax')).toBe('15');
    });

    it('advances the counter and the bar after a correct answer', async () => {
      render(PlayScreen, { props: { set: TABLES_SET, questions: fifteen, onfinish: vi.fn() } });
      await press('1', 'OK');
      await vi.advanceTimersByTimeAsync(CORRECT_FEEDBACK_MS);
      expect(screen.getByText('2 / 15')).toBeTruthy();
      expect(progress().getAttribute('aria-valuenow')).toBe('1');
    });

    it('replaces the number with the Herhaling label and keeps the bar on a repeat', async () => {
      render(PlayScreen, { props: { set: TABLES_SET, questions: [fifteen[0]!, fifteen[1]!], onfinish: vi.fn() } });
      await press('9', 'OK', 'Verder');
      await press('2', 'OK');
      await vi.advanceTimersByTimeAsync(CORRECT_FEEDBACK_MS);
      expect(screen.getByText('Herhaling')).toBeTruthy();
      expect(screen.queryByText(/^\d+ \/ 2$/)).toBeNull();
      expect(progress().getAttribute('aria-valuenow')).toBe('2');
    });

    it('stops with one click on Stoppen, without a dialog', async () => {
      const onfinish = vi.fn();
      const confirm = vi.spyOn(window, 'confirm');
      render(PlayScreen, { props: { set: TABLES_SET, questions, onfinish } });
      await press('Stoppen');
      expect(onfinish).toHaveBeenCalledOnce();
      expect(confirm).not.toHaveBeenCalled();
      expect(screen.queryByRole('button', { name: 'Stop' })).toBeNull();
    });
  });

  it('Stop drops repeats that are still waiting', async () => {
    const onfinish = vi.fn<(records: QuestionRecord[], totalMs: number) => void>();
    render(PlayScreen, { props: { set: TABLES_SET, questions, onfinish } });
    await press('5', 'OK', 'Verder', 'Stoppen');
    expect(onfinish).toHaveBeenCalledOnce();
    expect(onfinish.mock.calls[0]![0].map(isCorrect)).toEqual([false]);
  });
});
