import { describe, expect, it } from 'vitest';
import { createRng } from '../random';
import type { Question } from '../types';
import {
  generateSimplifyDeep,
  oddSumQuestion,
  pagesQuestion,
  rangeSumQuestion,
} from './simplifyDeep';
import { answerOf, stepOf, typed } from './testHelpers';

const SAMPLES = 3000;
const PAGE_COUNTS = [25, 40, 60, 80, 100, 120, 150, 180];

const rng = createRng(97);
const questions: Question[] = Array.from({ length: SAMPLES }, () => generateSimplifyDeep(rng));

function withForm(form: string): Question[] {
  return questions.filter((question) => question.key.split(':')[1] === form);
}

function answer(question: Question): number {
  return Number(typed(answerOf(question)));
}

/** Independent sum of from, from + step, … up to to. */
function sumOf(from: number, to: number, step = 1): number {
  let total = 0;
  for (let value = from; value <= to; value += step) total += value;
  return total;
}

/** Independent digit count of the pages 1 to last. */
function digitsUpTo(last: number): number {
  let digits = 0;
  for (let page = 1; page <= last; page++) digits += String(page).length;
  return digits;
}

describe('simplifyDeep: spec examples', () => {
  it('gives the spec answers, prompts and explanations', () => {
    const range = rangeSumQuestion(11, 30);
    expect(stepOf(range).prompt).toBe('Wat is 11 + 12 + 13 + … + 30?');
    expect(answer(range)).toBe(410);
    expect(stepOf(range).check('410').explanation).toBe(
      'Vereenvoudigen: maak paren van de buitenste getallen: 11 + 30 = 41, 12 + 29 = 41, … → 20 getallen zijn 10 paren van 41 → 10 × 41 = 410',
    );

    const odd = oddSumQuestion(20);
    expect(stepOf(odd).prompt).toBe('Wat is 1 + 3 + 5 + … + 39?');
    expect(answer(odd)).toBe(400);
    expect(stepOf(odd).check('400').explanation).toBe(
      'Vereenvoudigen: 1 = 1 × 1, 1 + 3 = 4 = 2 × 2, 1 + 3 + 5 = 9 = 3 × 3 → n getallen geven n × n; 39 is het 20e oneven getal → 20 × 20 = 400',
    );

    const pages = pagesQuestion(120);
    expect(stepOf(pages).prompt).toBe(
      'Hoeveel cijfers heb je nodig om de bladzijden 1 tot en met 120 te nummeren?',
    );
    expect(answer(pages)).toBe(252);
    expect(stepOf(pages).check('252').explanation).toBe(
      'Vereenvoudigen: 1 t/m 9: 9 × 1 = 9 cijfers → 10 t/m 99: 90 × 2 = 180 → 100 t/m 120: 21 × 3 = 63 → 9 + 180 + 63 = 252',
    );
  });

  it('gives the edge answers', () => {
    expect(answer(rangeSumQuestion(2, 9))).toBe(44);
    expect(stepOf(rangeSumQuestion(2, 9)).prompt).toBe('Wat is 2 + 3 + 4 + … + 9?');
    expect(answer(oddSumQuestion(10))).toBe(100);
    expect(answer(pagesQuestion(25))).toBe(41);
    expect(stepOf(pagesQuestion(25)).check('41').explanation).toBe(
      'Vereenvoudigen: 1 t/m 9: 9 × 1 = 9 cijfers → 10 t/m 25: 16 × 2 = 32 → 9 + 32 = 41',
    );
    expect(answer(pagesQuestion(100))).toBe(192);
    expect(stepOf(pagesQuestion(100)).check('192').explanation).toBe(
      'Vereenvoudigen: 1 t/m 9: 9 × 1 = 9 cijfers → 10 t/m 99: 90 × 2 = 180 → 100 t/m 100: 1 × 3 = 3 → 9 + 180 + 3 = 192',
    );
  });
});

describe('simplifyDeep: range sums', () => {
  const rows = withForm('range');

  it('uses a in [2, 30] and an even number of terms in [8, 30] with a sum of at most 1500', () => {
    for (const question of rows) {
      const [, , aText, bText] = question.key.split(':');
      const a = Number(aText);
      const b = Number(bText);
      const terms = b - a + 1;
      expect(question.topic).toBe('simplifyDeep');
      expect(stepOf(question).kind).toBe('number');
      expect(stepOf(question).suffix).toBeUndefined();
      expect(a).toBeGreaterThanOrEqual(2);
      expect(a).toBeLessThanOrEqual(30);
      expect(terms % 2).toBe(0);
      expect(terms).toBeGreaterThanOrEqual(8);
      expect(terms).toBeLessThanOrEqual(30);
      expect(answer(question)).toBe(sumOf(a, b));
      expect(answer(question)).toBeLessThanOrEqual(1500);
      expect(stepOf(question).prompt).toBe(`Wat is ${a} + ${a + 1} + ${a + 2} + … + ${b}?`);
    }
    expect(rows.length / SAMPLES).toBeGreaterThan(0.3);
  });
});

describe('simplifyDeep: odd sums', () => {
  const rows = withForm('odd');

  it('uses n in [10, 30] and answers n × n', () => {
    for (const question of rows) {
      const n = Number(question.key.split(':')[2]);
      expect(n).toBeGreaterThanOrEqual(10);
      expect(n).toBeLessThanOrEqual(30);
      expect(answer(question)).toBe(n * n);
      expect(answer(question)).toBe(sumOf(1, 2 * n - 1, 2));
      expect(stepOf(question).prompt).toBe(`Wat is 1 + 3 + 5 + … + ${2 * n - 1}?`);
    }
    expect(rows.length / SAMPLES).toBeGreaterThan(0.3);
  });
});

describe('simplifyDeep: pages', () => {
  const rows = withForm('pages');

  it('uses the listed page counts and the digit count of pages 1 to N', () => {
    for (const question of rows) {
      const last = Number(question.key.split(':')[2]);
      expect(PAGE_COUNTS).toContain(last);
      expect(answer(question)).toBe(digitsUpTo(last));
      expect(stepOf(question).prompt).toBe(
        `Hoeveel cijfers heb je nodig om de bladzijden 1 tot en met ${last} te nummeren?`,
      );
    }
    expect(rows.length / SAMPLES).toBeGreaterThan(0.3);
  });
});

describe('simplifyDeep: all forms', () => {
  it('uses the three forms equally', () => {
    for (const form of ['range', 'odd', 'pages']) {
      const share = withForm(form).length / SAMPLES;
      expect(share, form).toBeGreaterThan(0.3);
      expect(share, form).toBeLessThan(0.37);
    }
  });

  it('has integer answers, an explanation and rejects a wrong answer', () => {
    for (const question of questions) {
      const step = stepOf(question);
      const value = answer(question);
      expect(Number.isInteger(value)).toBe(true);
      expect(step.check(String(value)).correct).toBe(true);
      expect(step.check(String(value + 1)).correct).toBe(false);
      expect(step.check(String(value)).explanation).toMatch(/^Vereenvoudigen: \S/);
    }
  });

  it('maps each de-duplication key to one prompt and sees many keys', () => {
    const prompts = new Map<string, Set<string>>();
    for (const question of questions) {
      const set = prompts.get(question.key) ?? new Set<string>();
      set.add(stepOf(question).prompt);
      prompts.set(question.key, set);
    }
    for (const set of prompts.values()) expect(set.size).toBe(1);
    expect(prompts.size).toBeGreaterThan(200);
  });
});
