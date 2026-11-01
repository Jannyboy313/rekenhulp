import { describe, expect, it } from 'vitest';
import { createRng } from '../random';
import { SLOT } from '../slot';
import type { Question } from '../types';
import { NEGATIVE_POWERS, POSITIVE_POWERS } from './powersRoots';
import {
  generatePowerCalc,
  powerRuleQuestion,
  powerSumQuestion,
  rootQuestion,
  scientificProductQuestion,
  scientificQuotientQuestion,
  scientificTimesQuestion,
} from './powerCalc';
import { answerOf, stepOf } from './testHelpers';

const SAMPLES = 6000;

describe('powerRuleQuestion', () => {
  it('multiplies powers of the same base', () => {
    const step = stepOf(powerRuleQuestion('product', 2, 3, 4));
    expect(step.kind).toBe('number');
    expect(step.prompt).toBe('2³ × 2⁴ = 2ⁿ. n = ?');
    expect(step.check('7')).toEqual({
      correct: true,
      expected: '7',
      explanation: '2³ × 2⁴ = 2³⁺⁴ = 2⁷',
    });
    expect(step.check('12').correct).toBe(false);
    // The answer is an exponent: no factor-of-ten tip.
    expect(step.check('70').tip).toBeUndefined();
  });

  it('divides powers of the same base', () => {
    const step = stepOf(powerRuleQuestion('quotient', 2, 6, 2));
    expect(step.prompt).toBe('2⁶ : 2² = 2ⁿ. n = ?');
    expect(step.check('4')).toMatchObject({ correct: true, explanation: '2⁶ : 2² = 2⁶⁻² = 2⁴' });
  });

  it('raises a power to a power', () => {
    const step = stepOf(powerRuleQuestion('power', 3, 2, 3));
    expect(step.prompt).toBe('(3²)³ = 3ⁿ. n = ?');
    expect(step.check('6')).toMatchObject({ correct: true, explanation: '(3²)³ = 3²ˣ³ = 3⁶' });
    expect(step.check('5').correct).toBe(false);
  });
});

describe('rootQuestion', () => {
  it('takes the root of a product of squares', () => {
    const step = stepOf(rootQuestion(36, 25));
    expect(step.prompt).toBe('√(36 × 25) = ?');
    expect(step.check('30')).toEqual({
      correct: true,
      expected: '30',
      explanation: '√(36 × 25) = √36 × √25 = 6 × 5 = 30',
    });
  });
});

describe('powerSumQuestion', () => {
  it('subtracts two powers', () => {
    const step = stepOf(powerSumQuestion(2, 5, '−', 3, 3));
    expect(step.prompt).toBe('2⁵ − 3³ = ?');
    expect(step.check('5')).toEqual({
      correct: true,
      expected: '5',
      explanation: '2⁵ − 3³ = 32 − 27 = 5',
    });
  });

  it('writes a negative base in parentheses and may answer negative', () => {
    const first = stepOf(powerSumQuestion(-2, 3, '+', 5, 3));
    expect(first.prompt).toBe('(−2)³ + 5³ = ?');
    expect(first.check('117')).toMatchObject({
      correct: true,
      explanation: '(−2)³ + 5³ = −8 + 125 = 117',
    });
    const second = stepOf(powerSumQuestion(5, 3, '−', -2, 3));
    expect(second.check('133')).toMatchObject({
      correct: true,
      explanation: '5³ − (−2)³ = 125 − (−8) = 133',
    });
    expect(stepOf(powerSumQuestion(2, 3, '−', 3, 3)).check('−19').correct).toBe(true);
  });
});

describe('scientific questions', () => {
  it('multiplies and normalises (15 × 10⁷ is wrong)', () => {
    const step = stepOf(scientificProductQuestion(3, 4, 5, 3));
    expect(step.kind).toBe('scientific');
    expect(step.prompt).toBe('(3 × 10⁴) × (5 × 10³) = ?');
    expect(step.check('1,5×10^8')).toEqual({
      correct: true,
      expected: '1,5 × 10⁸',
      explanation: '3 × 5 = 15 en 10⁴ × 10³ = 10⁷ → 15 × 10⁷ = 1,5 × 10⁸',
    });
    expect(step.check('15×10^7').correct).toBe(false);
  });

  it('keeps a product below 10 as it is', () => {
    const step = stepOf(scientificProductQuestion(2, 4, 3, 3));
    expect(step.check('').expected).toBe('6 × 10⁷');
    expect(step.check('').explanation).toBe('2 × 3 = 6 en 10⁴ × 10³ = 10⁷ → 6 × 10⁷');
    expect(step.check('6×10^7').correct).toBe(true);
  });

  it('divides', () => {
    const step = stepOf(scientificQuotientQuestion(6, 8, 2, 5));
    expect(step.prompt).toBe('(6 × 10⁸) : (2 × 10⁵) = ?');
    expect(step.check('3×10^3')).toEqual({
      correct: true,
      expected: '3 × 10³',
      explanation: '6 : 2 = 3 en 10⁸ : 10⁵ = 10³ → 3 × 10³',
    });
  });

  it('asks how many times as large', () => {
    const step = stepOf(scientificTimesQuestion(6, 8, 2, 5));
    expect(step.kind).toBe('number');
    expect(step.prompt).toBe('Hoeveel keer zo groot is 6 × 10⁸ als 2 × 10⁵?');
    expect(step.check('3000')).toEqual({
      correct: true,
      expected: '3000',
      explanation: '6 : 2 = 3 en 10⁸ : 10⁵ = 10³ → 3000',
    });
  });
});

describe('generatePowerCalc', () => {
  const rng = createRng(83);
  const questions: Question[] = Array.from({ length: SAMPLES }, () => generatePowerCalc(rng));
  const parts = (question: Question) => question.key.split(':');
  const of = (form: string, variant?: string) =>
    questions.filter((q) => parts(q)[1] === form && (variant === undefined || parts(q)[2] === variant));
  const numbers = (question: Question, from: number) =>
    parts(question)
      .slice(from)
      .map((part) => Number(part.replace('−', '-')));

  it('is a single step with a slot for the unknown', () => {
    for (const question of questions) {
      const step = question.steps[0]!;
      expect(question.topic).toBe('powerCalc');
      expect(question.steps).toHaveLength(1);
      expect(['number', 'scientific']).toContain(step.kind);
      // What the user types for the expected answer: '1,5 × 10⁸' as '1,5×10^8'.
      const typed = step
        .check('')
        .expected.replaceAll('\u{202f}', '')
        .replace(' × 10', '×10^')
        .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]+$/, (power) =>
          [...power].map((digit) => '⁰¹²³⁴⁵⁶⁷⁸⁹'.indexOf(digit)).join(''),
        );
      expect(step.check(typed).correct).toBe(true);
      const slots = step.prompt.split(SLOT).length - 1;
      expect(slots).toBe(parts(question)[2] === 'times' ? 0 : 1);
    }
  });

  it('uses the three forms equally and every variant', () => {
    for (const form of ['rules', 'combined', 'scientific']) {
      expect(of(form).length / SAMPLES).toBeGreaterThan(0.3);
      expect(of(form).length / SAMPLES).toBeLessThan(0.37);
    }
    expect(new Set(of('rules').map((q) => parts(q)[2]))).toEqual(
      new Set(['product', 'quotient', 'power']),
    );
    expect(new Set(of('combined').map((q) => parts(q)[2]))).toEqual(new Set(['root', 'sum']));
    expect(new Set(of('scientific').map((q) => parts(q)[2]))).toEqual(
      new Set(['product', 'quotient', 'times']),
    );
    for (const variant of ['root', 'sum']) {
      expect(of('combined', variant).length / of('combined').length).toBeGreaterThan(0.45);
    }
  });

  it('rules: a in {2, 3, 5, 10}, exponents 2-6, result exponent at most 12, m > n for a quotient', () => {
    for (const question of of('rules')) {
      const [a, m, n] = numbers(question, 3) as [number, number, number];
      const kind = parts(question)[2];
      expect([2, 3, 5, 10]).toContain(a);
      for (const exponent of [m, n]) {
        expect(exponent).toBeGreaterThanOrEqual(2);
        expect(exponent).toBeLessThanOrEqual(6);
      }
      const result = { product: m + n, quotient: m - n, power: m * n }[kind as 'product'];
      expect(result).toBeLessThanOrEqual(12);
      expect(result).toBeGreaterThanOrEqual(1);
      if (kind === 'quotient') expect(m).toBeGreaterThan(n);
      expect(Number(answerOf(question).num)).toBe(result);
    }
    for (const kind of ['product', 'quotient', 'power']) {
      expect(of('rules', kind).length).toBeGreaterThan(SAMPLES * 0.3 * 0.25);
    }
  });

  it('root: two different squares of 2-10, answer at most 90', () => {
    for (const question of of('combined', 'root')) {
      const [p, q] = numbers(question, 3) as [number, number];
      const [s, t] = [Math.sqrt(p), Math.sqrt(q)];
      expect(Number.isInteger(s) && Number.isInteger(t)).toBe(true);
      expect(s).toBeGreaterThanOrEqual(2);
      expect(t).toBeLessThanOrEqual(10);
      expect(p).not.toBe(q);
      expect(Number(answerOf(question).num)).toBe(s * t);
      expect(s * t).toBeLessThanOrEqual(90);
    }
  });

  it('sum: powers from the positive pairs (value at most 1000, bases 2-9) or the negative pairs', () => {
    const positive = POSITIVE_POWERS.filter(([base, exp]) => base <= 9 && base ** exp <= 1000);
    const sums = of('combined', 'sum');
    let negatives = 0;
    for (const question of sums) {
      const [a, m, b, n] = [
        Number(parts(question)[3]),
        Number(parts(question)[4]),
        Number(parts(question)[6]),
        Number(parts(question)[7]),
      ];
      const operator = parts(question)[5];
      expect(['+', '−']).toContain(operator);
      expect(Math.abs(a)).not.toBe(Math.abs(b));
      const negativeCount = [a, b].filter((base) => base < 0).length;
      expect(negativeCount).toBeLessThanOrEqual(1);
      negatives += negativeCount;
      for (const [base, exponent] of [[a, m], [b, n]] as const) {
        const pairs = base < 0 ? NEGATIVE_POWERS : positive;
        expect(pairs.some(([x, e]) => x === Math.abs(base) && e === exponent)).toBe(true);
      }
      const value = (operator === '+' ? 1 : -1) * b ** n + a ** m;
      expect(Number(answerOf(question).num)).toBe(value);
      expect(value).not.toBe(0);
    }
    expect(negatives / sums.length).toBeGreaterThan(0.15);
    expect(negatives / sums.length).toBeLessThan(0.25);
    expect(sums.some((q) => Number(answerOf(q).num) < 0)).toBe(true);
  });

  it('scientific product: c in 1-9, exponents 2-9, normalised answer with exponent at most 15', () => {
    for (const question of of('scientific', 'product')) {
      const [c1, m, c2, n] = numbers(question, 3) as [number, number, number, number];
      for (const c of [c1, c2]) {
        expect(c).toBeGreaterThanOrEqual(1);
        expect(c).toBeLessThanOrEqual(9);
      }
      for (const e of [m, n]) {
        expect(e).toBeGreaterThanOrEqual(2);
        expect(e).toBeLessThanOrEqual(9);
      }
      const expected = question.steps[0]!.check('').expected;
      const [coefficient, exponent] = expected.split(' × 10');
      const shift = c1 * c2 >= 10 ? 1 : 0;
      expect(Number(coefficient!.replace(',', '.'))).toBeCloseTo((c1 * c2) / 10 ** shift);
      expect(exponent).toBe(
        String(m + n + shift)
          .split('')
          .map((digit) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[Number(digit)])
          .join(''),
      );
      expect(m + n + shift).toBeLessThanOrEqual(15);
    }
    expect(of('scientific', 'product').some((q) => numbers(q, 3)[0]! * numbers(q, 3)[2]! >= 10)).toBe(true);
  });

  it('scientific quotient and times: c1 a multiple of c2, c1 in 2-9, m > n, times at most 10⁷', () => {
    for (const variant of ['quotient', 'times']) {
      for (const question of of('scientific', variant)) {
        const [c1, m, c2, n] = numbers(question, 3) as [number, number, number, number];
        expect(c1).toBeGreaterThanOrEqual(2);
        expect(c1).toBeLessThanOrEqual(9);
        expect(c2).toBeGreaterThanOrEqual(1);
        expect(c1 % c2).toBe(0);
        expect(m).toBeGreaterThan(n);
        expect(n).toBeGreaterThanOrEqual(2);
        expect(m).toBeLessThanOrEqual(9);
        if (variant === 'times') {
          expect(Number(answerOf(question).num)).toBe((c1 / c2) * 10 ** (m - n));
          expect(Number(answerOf(question).num)).toBeLessThanOrEqual(10 ** 7);
        } else {
          expect(question.steps[0]!.check('').expected).toBe(
            `${c1 / c2} × 10${String(m - n)
              .split('')
              .map((digit) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[Number(digit)])
              .join('')}`,
          );
        }
      }
    }
  });

  it('is deterministic for a seed', () => {
    expect(generatePowerCalc(createRng(9)).key).toBe(generatePowerCalc(createRng(9)).key);
  });
});
