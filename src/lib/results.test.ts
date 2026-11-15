import { describe, expect, it } from 'vitest';
import { fromInteger } from './rational';
import {
  isCorrect,
  summarize,
  summarizeTest,
  topicScores,
  wrongSteps,
  type QuestionRecord,
} from './results';
import type { Topic } from './types';
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

describe('wrongSteps', () => {
  it('lists only the steps that were answered wrongly', () => {
    const twoSteps = record([true, false], 1000);
    expect(wrongSteps([twoSteps])).toEqual([
      { prompt: 'p1', kind: 'number', attempt: twoSteps.attempts[1] },
    ]);
  });

  it('lists every wrong step of every record, in order', () => {
    const first = record([false], 1000);
    const second = record([false, false], 2000);
    const prompts = wrongSteps([first, record([true], 1500), second]).map(({ prompt }) => prompt);
    expect(prompts).toEqual(['p0', 'p0', 'p1']);
  });

  it('carries the prefix and suffix of the step, undefined without a unit', () => {
    const withUnit = {
      question: {
        key: 'area',
        topic: 'perimeterArea',
        steps: [
          numberStep({ prompt: 'p', answer: fromInteger(126), suffix: 'cm²' }),
          numberStep({ prompt: 'q', answer: fromInteger(45), prefix: '€' }),
          numberStep({ prompt: 'r', answer: fromInteger(3) }),
        ],
      },
      attempts: [1, 2, 3].map((n) => ({
        input: String(n),
        result: { correct: false, expected: '0' },
      })),
      durationMs: 1000,
    } satisfies QuestionRecord;
    const [area, money, bare] = wrongSteps([withUnit]);
    expect(area).toMatchObject({ prefix: undefined, suffix: 'cm²' });
    expect(money).toMatchObject({ prefix: '€', suffix: undefined });
    expect(bare!.prefix).toBeUndefined();
    expect(bare!.suffix).toBeUndefined();
  });

  it('is empty without mistakes', () => {
    expect(wrongSteps([record([true, true], 1000)])).toEqual([]);
    expect(wrongSteps([])).toEqual([]);
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
      topics: [{ name: 'Tafels van 2 t/m 15', correct: 2, answered: 3 }],
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
      topics: [],
    });
  });
});

describe('topicScores', () => {
  function topicRecord(topic: Topic, correct: boolean): QuestionRecord {
    return {
      question: {
        key: `${topic}${correct}`,
        topic,
        steps: [numberStep({ prompt: 'p', answer: fromInteger(1) })],
      },
      attempts: [{ input: '1', result: { correct, expected: '1' } }],
      durationMs: 1000,
    };
  }

  it('is empty without records', () => {
    expect(topicScores([])).toEqual([]);
  });

  it('counts first attempts per topic under its short name, weakest first', () => {
    const scores = topicScores([
      topicRecord('percentages', true),
      topicRecord('scale', false),
      topicRecord('percentages', false),
      topicRecord('lcm', true),
    ]);
    expect(scores).toEqual([
      { name: 'Schaal', correct: 0, answered: 1 },
      { name: 'Procenten', correct: 1, answered: 2 },
      { name: 'KGV', correct: 1, answered: 1 },
    ]);
  });

  it('keeps a label without a parenthesis whole', () => {
    expect(topicScores([topicRecord('missingDigit', true)])).toEqual([
      { name: 'Ontbrekend cijfer en deelbaarheid', correct: 1, answered: 1 },
    ]);
  });

  it('merges topics with the same short name', () => {
    expect(topicScores([topicRecord('probability', true), topicRecord('twoDice', false)])).toEqual([
      { name: 'Kans', correct: 1, answered: 2 },
    ]);
  });

  it('counts a partly answered two-step question as wrong', () => {
    const partial = record([true, true], 1000, 1);
    expect(topicScores([partial])).toEqual([
      { name: 'Tafels van 2 t/m 15', correct: 0, answered: 1 },
    ]);
  });

  it('sorts a tied percentage by the larger count, then by first appearance', () => {
    const scores = topicScores([
      topicRecord('lcm', true),
      topicRecord('gcd', true),
      topicRecord('scale', true),
      topicRecord('scale', true),
    ]);
    expect(scores.map(({ name }) => name)).toEqual(['Schaal', 'KGV', 'GGD']);
  });
});

describe('summarizeTest (test spec §6)', () => {
  const LIMIT = 17 * 60_000;
  const records = (correct: number, wrong: number) => [
    ...Array.from({ length: correct }, (_, i) => record([true], 1000 + i)),
    ...Array.from({ length: wrong }, (_, i) => record([false], 2000 + i)),
  ];

  it('scores over every exercise of the test, unanswered ones included', () => {
    const summary = summarizeTest(records(11, 1), 15, LIMIT, 600_000, false);
    expect(summary).toMatchObject({ answered: 12, correct: 11, percentage: 73 });
    expect(summary.test).toEqual({
      total: 15,
      unanswered: 3,
      needed: 11,
      passed: true,
      limitMs: LIMIT,
      timedOut: false,
    });
  });

  it('fails below the pass mark', () => {
    const summary = summarizeTest(records(10, 5), 15, LIMIT, 600_000, false);
    expect(summary.percentage).toBe(67);
    expect(summary.test).toMatchObject({ unanswered: 0, passed: false });
  });

  it('handles a test with no answers', () => {
    const summary = summarizeTest([], 15, LIMIT, LIMIT, true);
    expect(summary).toMatchObject({ answered: 0, percentage: 0, averageMs: 0, topics: [] });
    expect(summary.test).toMatchObject({ unanswered: 15, passed: false, timedOut: true });
  });

  it('caps the time at the limit', () => {
    expect(summarizeTest([], 15, LIMIT, LIMIT + 80_000, true).totalMs).toBe(LIMIT);
  });

  it('keeps the topics and mistakes to the answered exercises', () => {
    const summary = summarizeTest(records(8, 2), 15, LIMIT, 600_000, false);
    expect(summary.mistakes).toHaveLength(2);
    expect(summary.topics).toEqual([{ name: 'Tafels van 2 t/m 15', correct: 8, answered: 10 }]);
  });

  it('leaves a practice summary without a test', () => {
    expect(summarize([], 5000).test).toBeUndefined();
  });
});
