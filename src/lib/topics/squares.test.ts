import { describe, expect, it } from 'vitest';
import { createRng } from '../random';
import { fromInteger, rational } from '../rational';
import { numberStep } from '../steps';
import type { Question, Step } from '../types';
import {
  generateSquares,
  MAX_BASE,
  MEMORISE_SHARE,
  MIN_BASE,
  MIN_MEMORISE_BASE,
  rootTip,
  squareExplanation,
  squareTip,
} from './squares';

const SAMPLES = 3000;

function sample(seed: number, count = SAMPLES): Question[] {
  const rng = createRng(seed);
  return Array.from({ length: count }, () => generateSquares(rng));
}

function stepOf(question: Question): Step {
  return question.steps[0]!;
}

function parts(question: Question): { form: string; n: number } {
  const [, form, n] = question.key.split(':');
  return { form: form!, n: Number(n) };
}

const questions = sample(23);

describe('generateSquares', () => {
  it('asks for a square or a square root and accepts its own answer', () => {
    for (const question of questions) {
      const { form, n } = parts(question);
      const step = stepOf(question);
      expect(question.topic).toBe('squares');
      expect(step.kind).toBe('number');
      expect(n).toBeGreaterThanOrEqual(MIN_BASE);
      expect(n).toBeLessThanOrEqual(MAX_BASE);
      expect(['square', 'root']).toContain(form);
      const square = form === 'square';
      expect(step.prompt).toBe(square ? `${n}² = ?` : `√${n * n} = ?`);
      const expected = String(square ? n * n : n);
      expect(step.check(expected)).toEqual({
        correct: true,
        expected,
        explanation: squareExplanation(n),
      });
    }
  });

  it('takes 70% of the numbers from 11 to 25', () => {
    const memorise = questions.filter((q) => parts(q).n >= MIN_MEMORISE_BASE).length / SAMPLES;
    expect(memorise).toBeGreaterThan(MEMORISE_SHARE - 0.04);
    expect(memorise).toBeLessThan(MEMORISE_SHARE + 0.04);
  });

  it('uses both forms about equally often and every number', () => {
    const roots = questions.filter((q) => parts(q).form === 'root').length / SAMPLES;
    expect(roots).toBeGreaterThan(0.46);
    expect(roots).toBeLessThan(0.54);
    expect(new Set(questions.map((q) => parts(q).n)).size).toBe(MAX_BASE - MIN_BASE + 1);
  });

  it('is deterministic for a fixed seed', () => {
    const keys = (seed: number) => sample(seed, 50).map((q) => q.key);
    expect(keys(5)).toEqual(keys(5));
  });
});

describe('squareExplanation', () => {
  it.each([
    [7, '7² = 7 × 7 = 49'],
    [10, '10² = 10 × 10 = 100'],
    [17, '17² = 17 × 10 + 17 × 7 = 170 + 119 = 289'],
    [20, '20² = 20 × 20 = 400'],
    [23, '23² = 23 × 20 + 23 × 3 = 460 + 69 = 529'],
    [25, '25² = 25 × 20 + 25 × 5 = 500 + 125 = 625'],
  ])('explains %i²', (n, expected) => {
    expect(squareExplanation(n)).toBe(expected);
  });

  it('adds up for every number', () => {
    for (let n = MIN_BASE; n <= MAX_BASE; n++) {
      const text = squareExplanation(n);
      expect(text.startsWith(`${n}² = `), text).toBe(true);
      expect(text.endsWith(` = ${n * n}`), text).toBe(true);
      const split = /× (\d+) \+ \d+ × (\d+) = (\d+) \+ (\d+) =/.exec(text);
      if (n > 10 && n % 10 !== 0) expect(split, text).not.toBeNull();
      if (split) {
        const [tens, units, first, second] = split.slice(1).map(Number) as [
          number,
          number,
          number,
          number,
        ];
        expect(tens + units, text).toBe(n);
        expect(first, text).toBe(n * tens);
        expect(second, text).toBe(n * units);
      }
    }
  });
});

describe('square tips', () => {
  it('names n × 2', () => {
    expect(squareTip(17)(fromInteger(34))).toBe('17² is 17 × 17, niet 17 × 2.');
    expect(squareTip(17)(fromInteger(290))).toBeUndefined();
  });

  it('wires the n × 2 tip into generated squares', () => {
    const rng = createRng(7);
    let seen = 0;
    for (let i = 0; i < 300; i++) {
      const step = generateSquares(rng).steps[0]!;
      const match = /^(\d+)² = \?$/.exec(step.prompt);
      if (!match) continue;
      const n = Number(match[1]);
      // 2² = 2 × 2, so typing 4 is correct.
      if (n === 2) continue;
      seen++;
      expect(step.check(String(2 * n)).tip).toBe(`${n}² is ${n} × ${n}, niet ${n} × 2.`);
    }
    expect(seen).toBeGreaterThan(50);
  });

  it('leaves a factor of ten off the root to the fallback', () => {
    const step = numberStep({
      prompt: '√196 = ?',
      answer: fromInteger(14),
      diagnose: rootTip(14),
    });
    expect(step.check('140').tip).toBe(
      'Je antwoord is 10 keer te groot. Let op de komma en het aantal nullen.',
    );
    expect(step.check('1,4').tip).toBe(
      'Je antwoord is 10 keer te klein. Let op de komma en het aantal nullen.',
    );
  });

  it('names half the square for an odd root', () => {
    expect(rootTip(15)(rational(225n, 2n))).toBe(
      '√225 is het getal dat keer zichzelf 225 geeft, niet de helft.',
    );
  });

  it('names half the square, and checks other roots', () => {
    expect(rootTip(14)(fromInteger(98))).toBe(
      '√196 is het getal dat keer zichzelf 196 geeft, niet de helft.',
    );
    expect(rootTip(14)(fromInteger(15))).toBe('15 × 15 = 225, niet 196.');
    expect(rootTip(14)(fromInteger(20000))).toBeUndefined();
  });
});
