import { describe, expect, it } from 'vitest';
import { MINUS } from '../format';
import { createRng } from '../random';
import { SLOT } from '../slot';
import type { Question } from '../types';
import {
  digitCountExplanation,
  firstDigitValue,
  generateBaseReasoning,
  largestExplanation,
  placeValueExplanation,
} from './baseReasoning';
import { answerOf, stepOf, typed } from './testHelpers';

const SAMPLES = 6000;

const rng = createRng(91);
const questions: Question[] = Array.from({ length: SAMPLES }, () => generateBaseReasoning(rng));

const NAMES: Record<number, string> = { 2: 'tweetallig', 5: 'vijftallig', 16: 'zestientallig' };
const DIGIT_RANGES: Record<number, readonly [number, number]> = {
  2: [10, 255],
  5: [26, 624],
  16: [200, 4000],
};
const PLACE_RANGES: Record<number, readonly [number, number]> = {
  2: [8, 15],
  5: [25, 124],
  16: [256, 2559],
};

function formOf(question: Question): string {
  return question.key.split(':')[1]!;
}

function withForm(form: string): Question[] {
  return questions.filter((question) => formOf(question) === form);
}

function answer(question: Question): number {
  return Number(typed(answerOf(question)));
}

/** Number of digits of a value in a base, by repeated division (independent of toBase). */
function digitCount(value: number, base: number): number {
  let rest = value;
  let count = 0;
  while (rest > 0) {
    rest = Math.floor(rest / base);
    count++;
  }
  return count;
}

/** Shared checks for every question: a number answer, a prompt and an explanation with the answer. */
function expectSound(question: Question, expected: number): void {
  const step = stepOf(question);
  expect(question.topic).toBe('baseReasoning');
  expect(step.kind).toBe('number');
  expect(step.suffix).toBeUndefined();
  expect(step.prompt.length).toBeGreaterThan(0);
  expect(step.prompt.length).toBeLessThanOrEqual(170);
  expect(step.prompt).not.toContain(SLOT);
  expect(answer(question)).toBe(expected);
  expect(step.check(String(expected)).correct).toBe(true);
  const wrong = step.check(String(expected + 1));
  expect(wrong.correct).toBe(false);
  expect(wrong.explanation).toBeTruthy();
  expect(wrong.explanation).toContain(String(expected));
}

describe('baseReasoning: spec examples', () => {
  it('writes the largest-number explanation', () => {
    expect(largestExplanation(2, 4)).toBe(`1111 = 8 + 4 + 2 + 1 = 15, of 2⁴ ${MINUS} 1 = 16 ${MINUS} 1 = 15`);
    expect(largestExplanation(2, 3)).toBe(`111 = 4 + 2 + 1 = 7, of 2³ ${MINUS} 1 = 8 ${MINUS} 1 = 7`);
    expect(largestExplanation(16, 2)).toBe(
      `F = 15: FF = 15 × 16 + 15 × 1 = 255, of 16² ${MINUS} 1 = 256 ${MINUS} 1 = 255`,
    );
  });

  it('writes the digit-count explanation', () => {
    expect(digitCountExplanation(100, 2)).toBe(
      '64 = 2⁶ en 128 = 2⁷ → 100 zit tussen 64 en 128 → 7 cijfers',
    );
    expect(digitCountExplanation(10, 2)).toBe('8 = 2³ en 16 = 2⁴ → 10 zit tussen 8 en 16 → 4 cijfers');
    expect(digitCountExplanation(26, 5)).toBe('25 = 5² en 125 = 5³ → 26 zit tussen 25 en 125 → 3 cijfers');
    expect(digitCountExplanation(624, 5)).toBe(
      '125 = 5³ en 625 = 5⁴ → 624 zit tussen 125 en 625 → 4 cijfers',
    );
    expect(digitCountExplanation(255, 2)).toBe(
      '128 = 2⁷ en 256 = 2⁸ → 255 zit tussen 128 en 256 → 8 cijfers',
    );
  });

  it('writes the place-value explanation and value', () => {
    // The numeral 213 in base 5 is the value 58.
    expect(firstDigitValue(58, 5)).toBe(50);
    expect(placeValueExplanation(58, 5)).toBe(
      'het eerste van 3 cijfers staat op de plaats van 5 × 5 = 25 → 2 × 25 = 50',
    );
    expect(firstDigitValue(935, 16)).toBe(768);
    expect(placeValueExplanation(935, 16)).toBe(
      'het eerste van 3 cijfers staat op de plaats van 16 × 16 = 256 → 3 × 256 = 768',
    );
    expect(firstDigitValue(11, 2)).toBe(8);
  });
});

describe('baseReasoning: largest', () => {
  const rows = withForm('largest');

  it('uses the listed digit counts per base with a prompt and the value base^k − 1', () => {
    const allowed: Record<number, number[]> = { 2: [3, 4, 5, 6, 7, 8], 5: [2, 3, 4], 16: [2] };
    const bases = new Set<number>();
    for (const question of rows) {
      const [, , baseText, digitsText] = question.key.split(':');
      const base = Number(baseText);
      const digits = Number(digitsText);
      bases.add(base);
      expect(allowed[base]).toContain(digits);
      const value = base ** digits - 1;
      expect(stepOf(question).prompt).toBe(
        `Wat is het grootste getal dat je met ${digits} cijfers in het ${NAMES[base]} stelsel kunt schrijven? Geef je antwoord als gewoon getal.`,
      );
      expectSound(question, value);
    }
    expect([...bases].sort((a, b) => a - b)).toEqual([2, 5, 16]);
  });
});

describe('baseReasoning: digits', () => {
  const rows = withForm('digits');

  it('uses the listed decimal ranges and counts the digits of the value', () => {
    for (const question of rows) {
      const [, , baseText, valueText] = question.key.split(':');
      const base = Number(baseText);
      const value = Number(valueText);
      const [min, max] = DIGIT_RANGES[base]!;
      expect(value).toBeGreaterThanOrEqual(min);
      expect(value).toBeLessThanOrEqual(max);
      expect(stepOf(question).prompt).toBe(
        `Hoeveel cijfers heeft het getal ${value} in het ${NAMES[base]} stelsel?`,
      );
      expectSound(question, digitCount(value, base));
    }
  });
});

describe('baseReasoning: place value', () => {
  const rows = withForm('place');

  it('asks a non-first 1 in a 4-digit binary numeral, answer 1, 2 or 4, keyed by position', () => {
    const answers = new Set<number>();
    const binary = rows.filter((question) => question.key.split(':')[2] === '2');
    expect(binary.length).toBeGreaterThan(100);
    for (const question of binary) {
      const [, , , valueText, positionText] = question.key.split(':');
      const value = Number(valueText);
      const position = Number(positionText);
      const numeral = value.toString(2);
      expect(numeral).toHaveLength(4);
      expect(position).toBeGreaterThanOrEqual(2);
      expect(position).toBeLessThanOrEqual(4);
      expect(numeral[position - 1]).toBe('1');
      const ordinal = ['', 'eerste', 'tweede', 'derde', 'vierde'][position];
      expect(stepOf(question).prompt).toBe(
        `Wat is de waarde van het ${ordinal} cijfer in het tweetallige getal ${numeral}? Geef je antwoord als gewoon getal.`,
      );
      const expected = 2 ** (4 - position);
      answers.add(expected);
      expectSound(question, expected);
    }
    expect([...answers].sort((a, b) => a - b)).toEqual([1, 2, 4]);
    expect(placeValueExplanation(11, 2, 3)).toBe(
      'het derde van 4 cijfers staat op de plaats van 2 → 1 × 2 = 2',
    );
  });

  it('uses a first digit at its place with a letter in base 16 and gives d × place', () => {
    for (const question of rows.filter((q) => q.key.split(':')[2] !== '2')) {
      const [, , baseText, valueText] = question.key.split(':');
      const base = Number(baseText);
      const value = Number(valueText);
      const [min, max] = PLACE_RANGES[base]!;
      expect(value).toBeGreaterThanOrEqual(min);
      expect(value).toBeLessThanOrEqual(max);
      const numeral = value.toString(base).toUpperCase();
      const length = digitCount(value, base);
      expect(length).toBe(3);
      const place = base ** (length - 1);
      const first = Math.floor(value / place);
      expect(first).toBeGreaterThanOrEqual(1);
      expect(first).toBeLessThanOrEqual(base === 16 ? 9 : base - 1);
      if (base === 16) expect(/[A-F]/.test(numeral.slice(1))).toBe(true);
      expect(stepOf(question).prompt).toBe(
        `Wat is de waarde van het eerste cijfer in het ${NAMES[base]}e getal ${numeral}? Geef je antwoord als gewoon getal.`,
      );
      expectSound(question, first * place);
    }
  });
});

describe('baseReasoning: forms', () => {
  it('uses the three forms and the three bases equally', () => {
    for (const form of ['largest', 'digits', 'place']) {
      const share = withForm(form).length / SAMPLES;
      expect(share, form).toBeGreaterThan(0.3);
      expect(share, form).toBeLessThan(0.37);
    }
    for (const base of [2, 5, 16]) {
      const share = questions.filter((q) => q.key.split(':')[2] === String(base)).length / SAMPLES;
      expect(share, `base ${base}`).toBeGreaterThan(0.2);
      expect(share, `base ${base}`).toBeLessThan(0.45);
    }
  });

  it('keys the same content: one key always gives one prompt and answer', () => {
    const seen = new Map<string, string>();
    for (const question of questions) {
      const step = stepOf(question);
      const content = `${step.prompt}|${step.check('').expected}`;
      const previous = seen.get(question.key);
      if (previous !== undefined) expect(content).toBe(previous);
      seen.set(question.key, content);
    }
    expect(seen.size).toBeGreaterThan(100);
  });
});
