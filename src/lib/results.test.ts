import { describe, expect, it } from 'vitest';
import { fromInteger } from './rational';
import { isCorrect, summarize, type QuestionRecord } from './results';
import { numberStep } from './steps';

function record(stepResults: boolean[], durationMs: number, answeredSteps = stepResults.length) {
  const steps = stepResults.map((_, i) => numberStep({ prompt: `p${i}`, answer: fromInteger(i) }));
  const attempts = stepResults
    .slice(0, answeredSteps)
    .map((correct) => ({ input: '1', result: { correct, expected: '0' } }));
  return {
    question: { key: `k${durationMs}`, topic: 'tables', steps },
    attempts,
    durationMs,
  } satisfies QuestionRecord;
}

describe('isCorrect', () => {
  it('requires every step to be answered correctly', () => {
    expect(isCorrect(record([true], 1000))).toBe(true);
    expect(isCorrect(record([true, true], 1000))).toBe(true);
    expect(isCorrect(record([true, false], 1000))).toBe(false);
    expect(isCorrect(record([true, true], 1000, 1))).toBe(false);
  });
});

describe('summarize', () => {
  it('computes score, percentage, times and mistakes', () => {
    const wrong = record([false], 4000);
    const summary = summarize([record([true], 2000), wrong, record([true], 3000)], 12_000);
    expect(summary).toEqual({
      answered: 3,
      correct: 2,
      percentage: 67,
      totalMs: 12_000,
      averageMs: 3000,
      mistakes: [wrong],
    });
  });

  it('handles a session stopped before any answer', () => {
    expect(summarize([], 5000)).toEqual({
      answered: 0,
      correct: 0,
      percentage: 0,
      totalMs: 5000,
      averageMs: 0,
      mistakes: [],
    });
  });
});
