import { describe, expect, it } from 'vitest';
import { createRng } from '../random';
import { applyChain, type Operation } from './workingBackwards';
import {
  chainQuestion,
  generateBackwardsProblems,
  roundsQuestion,
  roundsStart,
} from './backwardsProblems';
import { answerOf, stepOf, typed } from './testHelpers';

const times = (k: number): Operation => ({ kind: 'times', k });
const divide = (k: number): Operation => ({ kind: 'divide', k });
const plus = (k: number): Operation => ({ kind: 'plus', k });
const minus = (k: number): Operation => ({ kind: 'minus', k });

describe('roundsStart', () => {
  it.each<[string, number, number, number, number | null]>([
    ['helft, derde, 12 left', 2, 3, 12, 36],
    ['kwart, helft, 6 left', 4, 2, 6, 16],
    ['derde, derde, 4 left (9)', 3, 3, 4, 9],
    ['derde, derde, 5 left (stock after round 1 not whole)', 3, 3, 5, null],
    ['kwart, kwart, 9 left (16)', 4, 4, 9, 16],
    ['helft, helft, 20 left (80)', 2, 2, 20, 80],
    ['derde, kwart, 20 left (stock 26.67)', 3, 4, 20, null],
    ['kwart, derde, 20 left (40)', 4, 3, 20, 40],
    ['kwart, kwart, 16 left (stock 21,33)', 4, 4, 16, null],
  ])('%s', (_label, n1, n2, left, expected) => {
    expect(roundsStart(n1, n2, left)).toBe(expected);
  });
});

describe('question text', () => {
  it('writes a long chain', () => {
    const q = chainQuestion(14, [minus(4), times(3), divide(2), plus(9)]);
    const step = stepOf(q);
    expect(step.prompt).toBe(
      'Ik denk aan een getal. Ik trek er 4 van af, doe de uitkomst keer 3, deel de uitkomst door 2 en tel er 9 bij op. Ik kom uit op 24. Aan welk getal dacht ik?',
    );
    expect(step.check('14')).toMatchObject({
      correct: true,
      explanation: `Terugrekenen vanaf 24: 24 \u{2212} 9 = 15 → 15 × 2 = 30 → 30 : 3 = 10 → 10 + 4 = 14`,
    });
    expect(q.key).toBe('backwardsProblems:chain:14:minus4,times3,divide2,plus9');
  });

  it.each<[string, () => ReturnType<typeof roundsQuestion>, string, string]>([
    [
      'helft, derde, bakker',
      () => roundsQuestion(2, 3, 12, 'bakker'),
      "Een bakker verkoopt 's ochtends de helft van de broden en 's middags een derde van de rest. Er blijven 12 broden over. Hoeveel broden waren het eerst?",
      'Terugrekenen vanaf 12: na de middag is 2/3 over → 12 : 2 × 3 = 18 → na de ochtend is 1/2 over → 18 × 2 = 36',
    ],
    [
      'kwart, helft, kraam',
      () => roundsQuestion(4, 2, 6, 'kraam'),
      "Een kraam verkoopt 's ochtends een kwart van de appels en 's middags de helft van de rest. Er blijven 6 appels over. Hoeveel appels waren het eerst?",
      'Terugrekenen vanaf 6: na de middag is 1/2 over → 6 × 2 = 12 → na de ochtend is 3/4 over → 12 : 3 × 4 = 16',
    ],
    [
      'derde, kwart, kassa',
      () => roundsQuestion(3, 4, 9, 'kassa'),
      "Een kassa verkoopt 's ochtends een derde van de kaartjes en 's middags een kwart van de rest. Er blijven 9 kaartjes over. Hoeveel kaartjes waren het eerst?",
      'Terugrekenen vanaf 9: na de middag is 3/4 over → 9 : 3 × 4 = 12 → na de ochtend is 2/3 over → 12 : 2 × 3 = 18',
    ],
  ])('%s', (_label, make, prompt, explanation) => {
    const q = make();
    const step = stepOf(q);
    expect(step.prompt).toBe(prompt);
    const answer = typed(answerOf(q));
    expect(step.check(answer)).toMatchObject({ correct: true, explanation });
  });
});

describe('generateBackwardsProblems', () => {
  const COUNT = 2000;
  const rng = createRng(95);
  const questions = Array.from({ length: COUNT }, () => generateBackwardsProblems(rng));
  const chains = questions.filter((q) => q.key.startsWith('backwardsProblems:chain:'));
  const rounds = questions.filter((q) => q.key.startsWith('backwardsProblems:rounds:'));

  it('picks the two forms equally', () => {
    expect(chains.length + rounds.length).toBe(COUNT);
    expect(Math.abs(chains.length / COUNT - 0.5)).toBeLessThanOrEqual(0.05);
  });

  it('draws chains of 4 operations within [1, 300]', () => {
    for (const q of chains) {
      const [, , start, ops] = q.key.split(':');
      const operations = ops!.split(',').map((text): Operation => {
        const m = /^(times|divide|plus|minus)(\d+)$/.exec(text)!;
        return { kind: m[1] as Operation['kind'], k: Number(m[2]) };
      });
      expect(operations).toHaveLength(4);
      expect(Number(start)).toBeGreaterThanOrEqual(2);
      expect(Number(start)).toBeLessThanOrEqual(20);
      expect(applyChain(Number(start), operations, 300)).not.toBeNull();
      expect(answerOf(q)).toEqual(answerOf(chainQuestion(Number(start), operations)));
      expect(typed(answerOf(q))).toBe(start);
    }
  });

  it('draws rounds within the spec ranges', () => {
    const contexts = new Set<string>();
    for (const q of rounds) {
      const [, , n1, n2, left, context] = q.key.split(':');
      contexts.add(context!);
      expect(Number(left)).toBeGreaterThanOrEqual(4);
      expect(Number(left)).toBeLessThanOrEqual(20);
      const start = roundsStart(Number(n1), Number(n2), Number(left));
      expect(start).not.toBeNull();
      expect(start!).toBeLessThanOrEqual(120);
      expect(typed(answerOf(q))).toBe(String(start));
    }
    expect([...contexts].sort()).toEqual(['bakker', 'kassa', 'kraam']);
  });

  it('checks the answer, rejects a wrong one and explains', () => {
    for (const q of questions) {
      const step = stepOf(q);
      const expected = typed(answerOf(q));
      expect(step.check(expected).correct).toBe(true);
      const wrong = step.check(String(Number(expected) + 1));
      expect(wrong.correct).toBe(false);
      expect(wrong.explanation).toMatch(/^Terugrekenen vanaf /);
      expect(step.prompt.length).toBeLessThanOrEqual(170);
      expect(q.topic).toBe('backwardsProblems');
    }
  });

  it('has mostly distinct keys', () => {
    expect(new Set(questions.map((q) => q.key)).size).toBeGreaterThan(COUNT * 0.5);
  });
});
