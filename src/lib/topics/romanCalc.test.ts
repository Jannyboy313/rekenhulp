import { describe, expect, it } from 'vitest';
import { MINUS } from '../format';
import { createRng } from '../random';
import type { Question } from '../types';
import { toRoman } from './romanNumerals';
import { arithmeticExplanation, generateRomanCalc, yearsExplanation } from './romanCalc';
import { stepOf } from './testHelpers';

const SAMPLES = 3000;
const SUBTRACTIVE = /IV|IX|XL|XC|CD|CM/;

const rng = createRng(93);
const questions: Question[] = Array.from({ length: SAMPLES }, () => generateRomanCalc(rng));

function withForm(form: string): Question[] {
  return questions.filter((question) => question.key.split(':')[1] === form);
}

function numbersOf(question: Question): number[] {
  return question.key.split(':').slice(2).map(Number);
}

/** At least one of the numerals contains a subtractive pair (spec §5.93). */
const someSubtractive = (values: readonly number[]) =>
  values.some((value) => SUBTRACTIVE.test(toRoman(value)));

describe('romanCalc: explanations', () => {
  it.each<[string, () => string, string]>([
    [
      'sum from the spec',
      () => arithmeticExplanation(14, '+', 28, 42),
      'XIV = 14 en XXVIII = 28 → 14 + 28 = 42 = 40 + 2 = XL + II → XLII',
    ],
    [
      'difference with two groups',
      () => arithmeticExplanation(42, MINUS, 18, 24),
      'XLII = 42 en XVIII = 18 → 42 − 18 = 24 = 20 + 4 = XX + IV → XXIV',
    ],
    [
      'one group in the result',
      () => arithmeticExplanation(14, '+', 6, 20),
      'XIV = 14 en VI = 6 → 14 + 6 = 20 → XX',
    ],
    [
      'years from the spec',
      () => yearsExplanation(1945, 2025),
      'MCMXLV = 1945 en MMXXV = 2025 → 2025 − 1945 = 80',
    ],
  ])('writes the %s', (_name, build, expected) => {
    expect(build()).toBe(expected);
  });
});

describe('romanCalc: sum', () => {
  const rows = withForm('sum');

  it('adds two different numbers in [10, 99] with a subtractive numeral', () => {
    expect(rows.length).toBeGreaterThan(0);
    for (const question of rows) {
      const [a, b] = numbersOf(question);
      const step = stepOf(question);
      expect(question.topic).toBe('romanCalc');
      expect(step.kind).toBe('roman');
      expect(a).toBeGreaterThanOrEqual(10);
      expect(a).toBeLessThanOrEqual(99);
      expect(b).toBeGreaterThanOrEqual(10);
      expect(b).toBeLessThanOrEqual(99);
      expect(a).not.toBe(b);
      expect(someSubtractive([a!, b!, a! + b!])).toBe(true);
      expect(step.prompt).toBe(
        `Tel op: ${toRoman(a!)} + ${toRoman(b!)}. Schrijf je antwoord met Romeinse cijfers.`,
      );
      expect(step.check('').expected).toBe(toRoman(a! + b!));
      expect(step.check(toRoman(a! + b!)).correct).toBe(true);
      expect(step.check(toRoman(a! + b! + 1)).correct).toBe(false);
      expect(step.check('').explanation).toBe(arithmeticExplanation(a!, '+', b!, a! + b!));
    }
  });
});

describe('romanCalc: difference', () => {
  const rows = withForm('difference');

  it('subtracts b in [10, a − 5] from a in [20, 99] with a subtractive numeral', () => {
    expect(rows.length).toBeGreaterThan(0);
    for (const question of rows) {
      const [a, b] = numbersOf(question);
      const step = stepOf(question);
      expect(step.kind).toBe('roman');
      expect(a).toBeGreaterThanOrEqual(20);
      expect(a).toBeLessThanOrEqual(99);
      expect(b).toBeGreaterThanOrEqual(10);
      expect(b).toBeLessThanOrEqual(a! - 5);
      expect(someSubtractive([a!, b!, a! - b!])).toBe(true);
      expect(step.prompt).toBe(
        `Trek af: ${toRoman(a!)} ${MINUS} ${toRoman(b!)}. Schrijf je antwoord met Romeinse cijfers.`,
      );
      expect(step.check('').expected).toBe(toRoman(a! - b!));
      expect(step.check(toRoman(a! - b! + 1)).correct).toBe(false);
      expect(step.check('').explanation).toBe(arithmeticExplanation(a!, MINUS, b!, a! - b!));
    }
  });
});

describe('romanCalc: years', () => {
  const rows = withForm('years');

  it('takes a first year in [1400, 1999] and a gap in [10, 120] ending by 2030', () => {
    expect(rows.length).toBeGreaterThan(0);
    for (const question of rows) {
      const [first, second] = numbersOf(question);
      const gap = second! - first!;
      const step = stepOf(question);
      expect(step.kind).toBe('number');
      expect(step.suffix).toBe('jaar');
      expect(first).toBeGreaterThanOrEqual(1400);
      expect(first).toBeLessThanOrEqual(1999);
      expect(gap).toBeGreaterThanOrEqual(10);
      expect(gap).toBeLessThanOrEqual(120);
      expect(second).toBeLessThanOrEqual(2030);
      expect(step.prompt).toBe(
        `Hoeveel jaar zit er tussen ${toRoman(first!)} en ${toRoman(second!)}?`,
      );
      expect(step.check('').expected).toBe(String(gap));
      expect(step.check(String(gap)).correct).toBe(true);
      expect(step.check(String(gap + 1)).correct).toBe(false);
      expect(step.check('').explanation).toBe(yearsExplanation(first!, second!));
    }
  });
});

describe('romanCalc: keys and forms', () => {
  it('maps each key to one prompt and draws many distinct keys', () => {
    const promptByKey = new Map<string, string>();
    for (const question of questions) {
      const prompt = stepOf(question).prompt;
      const known = promptByKey.get(question.key);
      if (known !== undefined) expect(known).toBe(prompt);
      promptByKey.set(question.key, prompt);
    }
    expect(promptByKey.size).toBeGreaterThan(SAMPLES * 0.5);
  });

  it('draws the three forms equally and keeps every prompt within 170 characters', () => {
    for (const form of ['sum', 'difference', 'years']) {
      const share = withForm(form).length / SAMPLES;
      expect(share, form).toBeGreaterThan(0.3);
      expect(share, form).toBeLessThan(0.37);
    }
    for (const question of questions) {
      expect(stepOf(question).prompt.length).toBeLessThanOrEqual(170);
    }
  });
});
