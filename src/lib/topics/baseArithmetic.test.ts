import { describe, expect, it } from 'vitest';
import { createRng } from '../random';
import type { Question } from '../types';
import { toBase } from './numberSystems';
import {
  carries,
  generateBaseArithmetic,
  sumExplanation,
  timesExplanation,
} from './baseArithmetic';
import { stepOf } from './testHelpers';

const SAMPLES = 6000;

const rng = createRng(90);
const questions: Question[] = Array.from({ length: SAMPLES }, () => generateBaseArithmetic(rng));

type SumBase = 2 | 5;

interface Parts {
  form: string;
  base: SumBase;
  values: number[];
}

function parts(question: Question): Parts {
  const [, form, baseText, ...values] = question.key.split(':');
  return { form: form!, base: Number(baseText) as SumBase, values: values.map(Number) };
}

const SUM_RANGES: Record<SumBase, { min: number; max: number; cap: number }> = {
  2: { min: 3, max: 31, cap: 63 },
  5: { min: 6, max: 60, cap: 124 },
};

const TIMES_RANGES: Record<SumBase, { min: number; max: number }> = {
  2: { min: 3, max: 7 },
  5: { min: 6, max: 124 },
};

const NAME: Record<SumBase, string> = { 2: 'tweetallig', 5: 'vijftallig' };

describe('carries', () => {
  it.each<[number, number, SumBase, number]>([
    [5, 3, 2, 3], // 101 + 011
    [1, 2, 2, 0], // 01 + 10
    [4, 4, 5, 1], // 4 + 4
    [12, 3, 5, 1], // 22 + 3
    [7, 13, 5, 1], // 12 + 23
    [2, 1, 5, 0],
  ])('counts the carries of %i + %i in base %i as %i', (a, b, base, count) => {
    expect(carries(a, b, base)).toBe(count);
  });
});

describe('explanations', () => {
  it('writes the spec examples', () => {
    expect(sumExplanation(5, 3, 2)).toBe(
      'tweetallig → gewoon getal: 101 = 5 en 11 = 3 → 5 + 3 = 8 → 8 = 1 × 8 + 0 × 4 + 0 × 2 + 0 × 1 → 1000',
    );
    expect(timesExplanation(73, 5)).toBe(
      '× 10 in het vijftallig stelsel is × 5: elk cijfer schuift een plaats op → 243 wordt 2430',
    );
    expect(timesExplanation(5, 2)).toBe(
      '× 10 in het tweetallig stelsel is × 2: elk cijfer schuift een plaats op → 101 wordt 1010',
    );
  });

  it('gives the spec answers 101 + 11 = 1000 (base 2) and 243 × 10 = 2430 (base 5)', () => {
    expect(parseInt('101', 2) + parseInt('11', 2)).toBe(5 + 3);
    expect(toBase(5 + 3, 2)).toBe('1000');
    expect(parseInt('243', 5)).toBe(73);
    expect(toBase(73 * 5, 5)).toBe('2430');
  });
});

describe('generateBaseArithmetic', () => {
  it('draws both bases and both forms', () => {
    const seen = new Set(questions.map((q) => parts(q).form + ':' + parts(q).base));
    expect([...seen].sort()).toEqual(['sum:2', 'sum:5', 'times:2', 'times:5']);
  });

  it('keeps the forms and bases near even shares', () => {
    for (const form of ['sum', 'times']) {
      const share = questions.filter((q) => parts(q).form === form).length / SAMPLES;
      expect(share, form).toBeGreaterThan(0.45);
      expect(share, form).toBeLessThan(0.55);
    }
    for (const base of [2, 5]) {
      const share = questions.filter((q) => parts(q).base === base).length / SAMPLES;
      expect(share, `base ${base}`).toBeGreaterThan(0.45);
      expect(share, `base ${base}`).toBeLessThan(0.55);
    }
  });

  it('keeps sum terms in range, distinct, without exceeding the cap, with a carry', () => {
    for (const question of questions.filter((q) => parts(q).form === 'sum')) {
      const { base, values } = parts(question);
      const [a, b] = values as [number, number];
      const { min, max, cap } = SUM_RANGES[base];
      const step = stepOf(question);
      expect(question.topic).toBe('baseArithmetic');
      expect(step.kind).toBe('baseDigits');
      for (const term of [a, b]) {
        expect(term).toBeGreaterThanOrEqual(min);
        expect(term).toBeLessThanOrEqual(max);
      }
      expect(a).not.toBe(b);
      expect(a + b).toBeLessThanOrEqual(cap);
      expect(carries(a, b, base)).toBeGreaterThan(0);
      expect(step.prompt).toBe(
        `Tel op in het ${NAME[base]} stelsel: ${toBase(a, base)} + ${toBase(b, base)}. Schrijf je antwoord ook ${NAME[base]}.`,
      );
    }
  });

  it('keeps times values in range with two or three digits', () => {
    for (const question of questions.filter((q) => parts(q).form === 'times')) {
      const { base, values } = parts(question);
      const [value] = values as [number];
      const { min, max } = TIMES_RANGES[base];
      const step = stepOf(question);
      expect(value).toBeGreaterThanOrEqual(min);
      expect(value).toBeLessThanOrEqual(max);
      expect(toBase(value, base).length).toBeGreaterThanOrEqual(2);
      expect(toBase(value, base).length).toBeLessThanOrEqual(3);
      expect(step.kind).toBe('baseDigits');
      expect(step.prompt).toBe(
        `Vermenigvuldig in het ${NAME[base]} stelsel: ${toBase(value, base)} × 10. Schrijf je antwoord ook ${NAME[base]}.`,
      );
    }
  });

  it('accepts its own answer and rejects a wrong one, with an explanation', () => {
    for (const question of questions) {
      const { form, base, values } = parts(question);
      const step = stepOf(question);
      const expected =
        form === 'sum' ? toBase(values[0]! + values[1]!, base) : toBase(values[0]! * base, base);
      const result = step.check(expected);
      expect(result.correct).toBe(true);
      expect(result.expected).toBe(expected);
      expect(step.check(`0${expected}`).correct).toBe(true);
      expect(step.check(toBase(Number.parseInt(expected, base) + 1, base)).correct).toBe(false);
      expect(step.check(expected).tip).toBeUndefined();
      expect(result.explanation).toBeTruthy();
    }
  });

  it('writes the explanation of each question', () => {
    for (const question of questions) {
      const { form, base, values } = parts(question);
      const explanation = stepOf(question).check('').explanation;
      expect(explanation).toBe(
        form === 'sum'
          ? sumExplanation(values[0]!, values[1]!, base)
          : timesExplanation(values[0]!, base),
      );
    }
  });

  it('keeps every prompt free of a literal question mark and within 170 characters', () => {
    for (const question of questions) {
      const { prompt } = stepOf(question);
      expect(prompt).not.toContain('?');
      expect(prompt.length).toBeLessThanOrEqual(170);
    }
  });

  it('gives distinct keys for distinct exercises', () => {
    const keys = new Set(questions.map((q) => q.key));
    expect(keys.size).toBeGreaterThan(300);
  });
});
