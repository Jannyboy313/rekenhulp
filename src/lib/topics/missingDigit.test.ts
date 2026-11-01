import { describe, expect, it } from 'vitest';
import { GROUP_SEPARATOR } from '../format';
import { createRng } from '../random';
import { fromInteger } from '../rational';
import { SLOT } from '../slot';
import type { Question } from '../types';
import {
  fittingDigits,
  generateMissingDigit,
  missingDigitExplanation,
  rangeAnswer,
  rangeExplanation,
} from './missingDigit';
import { answerOf, stepOf, typed } from './testHelpers';

const SAMPLES = 5000;

const rng = createRng(61);
const questions: Question[] = Array.from({ length: SAMPLES }, () => generateMissingDigit(rng));

function withForm(form: string): Question[] {
  return questions.filter((question) => question.key.split(':')[1] === form);
}

const DIGIT_DIVISORS = [3, 4, 6, 8, 9, 11, 12];
const RANGE_DIVISORS = [3, 4, 6, 7, 8, 9, 11, 12, 13, 15];

describe('missingDigit: missing digit form', () => {
  const rows = withForm('digit');

  it('puts the slot in a number of 3 to 5 digits, never first, and answers a fitting digit', () => {
    const picks = new Set<string>();
    for (const question of rows) {
      const [, , masked, divisorText, pickKind] = question.key.split(':');
      const divisor = Number(divisorText);
      const digits = [...masked!].map((c) => (c === '_' ? null : Number(c)));
      const slot = digits.indexOf(null);
      const step = stepOf(question);
      expect(question.topic).toBe('missingDigit');
      expect(step.kind).toBe('number');
      expect(step.suffix).toBeUndefined();
      expect(DIGIT_DIVISORS).toContain(divisor);
      expect(digits.length).toBeGreaterThanOrEqual(3);
      expect(digits.length).toBeLessThanOrEqual(5);
      expect(slot).toBeGreaterThanOrEqual(1);
      expect(digits.lastIndexOf(null)).toBe(slot);
      const fits = fittingDigits(
        digits.map((d) => d ?? 0),
        slot,
        divisor,
      );
      expect(fits.length).toBeGreaterThanOrEqual(1);
      expect(fits.length).toBeLessThan(10);
      const answer = Number(typed(answerOf(question)));
      expect(fits).toContain(answer);
      const shown = step.prompt.split(' ')[0]!.replaceAll(GROUP_SEPARATOR, '').replace('?', '_');
      expect(shown).toBe(masked);
      const base = `${step.prompt.split(' ')[0]} is deelbaar door ${divisor}. Welk cijfer staat op de lege plek?`;
      if (fits.length === 1) {
        expect(pickKind).toBe('only');
        expect(step.prompt).toBe(base);
      } else {
        expect(['smallest', 'largest']).toContain(pickKind);
        expect(step.prompt).toBe(
          `${base} Geef het ${pickKind === 'smallest' ? 'kleinste' : 'grootste'}.`,
        );
        expect(answer).toBe(pickKind === 'smallest' ? Math.min(...fits) : Math.max(...fits));
      }
      picks.add(pickKind!);
    }
    expect([...picks].sort()).toEqual(['largest', 'only', 'smallest']);
  });

  it('uses every divisor, digit count and slot position', () => {
    const seen = {
      divisors: new Set<string>(),
      lengths: new Set<number>(),
      slots: new Set<number>(),
    };
    for (const question of rows) {
      const [, , masked, divisor] = question.key.split(':');
      seen.divisors.add(divisor!);
      seen.lengths.add(masked!.length);
      seen.slots.add(masked!.indexOf('_'));
    }
    expect([...seen.divisors].sort()).toEqual(DIGIT_DIVISORS.map(String).sort());
    expect([...seen.lengths].sort()).toEqual([3, 4, 5]);
    expect(seen.slots.has(1)).toBe(true);
    expect(seen.slots.has(4)).toBe(true);
  });

  it('puts the slot in the prompt as the marker and groups five digits', () => {
    for (const question of rows) {
      const prompt = question.steps[0]!.prompt;
      expect(prompt.split(SLOT).length).toBe(2);
      if (question.key.split(':')[2]!.length === 5) expect(prompt).toContain(GROUP_SEPARATOR);
    }
  });

  it('finds the fitting digits and explains with the digit filled in', () => {
    expect(fittingDigits([3, 0, 7, 2], 1, 9)).toEqual([6]);
    expect(fittingDigits([3, 0, 7, 2], 1, 3)).toEqual([0, 3, 6, 9]);
    expect(missingDigitExplanation([3, 6, 7, 2], 1, 9)).toBe(
      'Cijfersom 3 + 7 + 2 = 12 → 12 + 6 = 18 is deelbaar door 9 → 6',
    );
    expect(missingDigitExplanation([3, 6, 7, 2], 1, 4)).toBe(
      'Laatste twee cijfers 72 → deelbaar door 4 → 6',
    );
  });
});

describe('missingDigit: smallest and largest form', () => {
  const rows = withForm('range');

  it('asks kleinste/grootste of n digits and kleinste boven m with a right answer', () => {
    const kinds = new Set<string>();
    for (const question of rows) {
      const [, , kind, boundText, divisorText] = question.key.split(':');
      const bound = Number(boundText);
      const divisor = Number(divisorText);
      const answer = Number(typed(answerOf(question)));
      const step = stepOf(question);
      kinds.add(kind!);
      expect(RANGE_DIVISORS).toContain(divisor);
      expect(answer % divisor).toBe(0);
      expect(step.kind).toBe('number');
      if (kind === 'smallest') {
        expect([100, 1000]).toContain(bound);
        expect(answer).toBeGreaterThanOrEqual(bound);
        expect(answer - divisor).toBeLessThan(bound);
        const cijfers = bound === 100 ? 'drie' : 'vier';
        expect(step.prompt).toBe(
          `Wat is het kleinste getal van ${cijfers} cijfers dat deelbaar is door ${divisor}?`,
        );
      } else if (kind === 'largest') {
        expect([999, 9999]).toContain(bound);
        expect(answer).toBeLessThanOrEqual(bound);
        expect(answer + divisor).toBeGreaterThan(bound);
        const cijfers = bound === 999 ? 'drie' : 'vier';
        expect(step.prompt).toBe(
          `Wat is het grootste getal van ${cijfers} cijfers dat deelbaar is door ${divisor}?`,
        );
      } else {
        expect(kind).toBe('above');
        expect(bound % 100).toBe(0);
        expect(bound).toBeGreaterThanOrEqual(200);
        expect(bound).toBeLessThanOrEqual(900);
        expect(answer).toBeGreaterThan(bound);
        expect(answer - divisor).toBeLessThanOrEqual(bound);
        expect(step.prompt).toBe(
          `Wat is het kleinste getal boven ${bound} dat deelbaar is door ${divisor}?`,
        );
      }
      expect(step.check(String(answer)).correct).toBe(true);
      expect(answerOf(question)).toEqual(
        fromInteger(rangeAnswer(kind as 'smallest', bound, divisor)),
      );
    }
    expect([...kinds].sort()).toEqual(['above', 'largest', 'smallest']);
  });

  it('uses the two forms equally and every divisor', () => {
    expect(rows.length / SAMPLES).toBeGreaterThan(0.45);
    expect(rows.length / SAMPLES).toBeLessThan(0.55);
    const divisors = new Set(rows.map((question) => question.key.split(':')[4]));
    expect([...divisors].sort()).toEqual(RANGE_DIVISORS.map(String).sort());
  });

  it('gives the spec answers and explanations', () => {
    expect(rangeAnswer('smallest', 1000, 6)).toBe(1002);
    expect(rangeAnswer('largest', 9999, 7)).toBe(9996);
    expect(rangeAnswer('smallest', 1000, 8)).toBe(1000);
    expect(rangeAnswer('above', 400, 8)).toBe(408);
    expect(rangeExplanation('smallest', 1000, 6)).toBe('1000 : 6 = 166 rest 4 → 1000 + 2 = 1002');
    expect(rangeExplanation('largest', 9999, 7)).toBe('9999 : 7 = 1428 rest 3 → 9999 − 3 = 9996');
    expect(rangeExplanation('smallest', 1000, 8)).toBe('1000 : 8 = 125 rest 0 → 1000');
    expect(rangeExplanation('above', 400, 13)).toBe('400 : 13 = 30 rest 10 → 400 + 3 = 403');
    expect(rangeExplanation('above', 400, 8)).toBe('400 : 8 = 50 rest 0 → 400 + 8 = 408');
  });
});
