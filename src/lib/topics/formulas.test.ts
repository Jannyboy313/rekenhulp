import { describe, expect, it } from 'vitest';
import { MINUS } from '../format';
import { createRng } from '../random';
import { parseDutchNumber, type Rational } from '../rational';
import type { Question } from '../types';
import {
  generateFormulas,
  letterFormulaQuestion,
  tableQuestion,
  WORD_FORMULAS,
  wordFormulaQuestion,
  type WordContext,
} from './formulas';
import { answerOf, decimal, stepOf, typed } from './testHelpers';

const TIP_FACTOR_TEN = 'Je antwoord is 10 keer te groot. Let op de komma en het aantal nullen.';

const n = (text: string): Rational => decimal(text);

describe('WORD_FORMULAS', () => {
  it('lists the starts, rates and inputs of spec §5.36', () => {
    expect(WORD_FORMULAS.taxi).toEqual({
      starts: [n('3'), n('4'), n('5')],
      rates: [n('2'), n('2,5'), n('3')],
      inputRange: [2, 20],
    });
    expect(WORD_FORMULAS.fietsverhuur.starts).toEqual([n('5'), n('10'), n('15')]);
    expect(WORD_FORMULAS.fietsverhuur.inputRange).toEqual([2, 10]);
    expect(WORD_FORMULAS.kaars.starts).toEqual([n('15'), n('20'), n('24'), n('30')]);
    expect(WORD_FORMULAS.kaars.rates).toEqual([n('1'), n('1,5'), n('2'), n('3')]);
    expect(WORD_FORMULAS.kaars.inputRange).toEqual([2, 12]);
  });
});

describe('question text', () => {
  it.each<[string, () => Question, string, string, string, string | undefined, string | undefined]>(
    [
      [
        'taxi 4, 2,50, 12',
        () => wordFormulaQuestion('taxi', n('4'), n('2,5'), 12),
        'Taxi: kosten in euro = 4 + 2,50 × aantal km. Wat kost een rit van 12 km?',
        '34',
        '4 + 2,50 × 12 = 4 + 30 = 34',
        '€',
        undefined,
      ],
      [
        'taxi 3, 2,50, 7 (cents)',
        () => wordFormulaQuestion('taxi', n('3'), n('2,5'), 7),
        'Taxi: kosten in euro = 3 + 2,50 × aantal km. Wat kost een rit van 7 km?',
        '20,50',
        '3 + 2,50 × 7 = 3 + 17,50 = 20,50',
        '€',
        undefined,
      ],
      [
        'fietsverhuur 5, 8, 4',
        () => wordFormulaQuestion('fietsverhuur', n('5'), n('8'), 4),
        'Fietsverhuur: prijs in euro = 5 + 8 × aantal dagen. Wat kost 4 dagen huren?',
        '37',
        '5 + 8 × 4 = 5 + 32 = 37',
        '€',
        undefined,
      ],
      [
        'kaars 24, 2, 5',
        () => wordFormulaQuestion('kaars', n('24'), n('2'), 5),
        'Kaars: lengte in cm = 24 − 2 × aantal uren. Hoe lang is de kaars na 5 uur?',
        '14',
        '24 − 2 × 5 = 24 − 10 = 14',
        undefined,
        'cm',
      ],
      [
        'kaars 24, 1,5, 5',
        () => wordFormulaQuestion('kaars', n('24'), n('1,5'), 5),
        'Kaars: lengte in cm = 24 − 1,5 × aantal uren. Hoe lang is de kaars na 5 uur?',
        '16,5',
        '24 − 1,5 × 5 = 24 − 7,5 = 16,5',
        undefined,
        'cm',
      ],
      [
        'letter 3, −4, 5',
        () => letterFormulaQuestion(3, -4, 5),
        'y = 3x − 4. Wat is y als x = 5?',
        '11',
        '3 × 5 − 4 = 15 − 4 = 11',
        undefined,
        undefined,
      ],
      [
        'letter 3, −4, −2',
        () => letterFormulaQuestion(3, -4, -2),
        `y = 3x − 4. Wat is y als x = ${MINUS}2?`,
        `${MINUS}10`,
        `3 × (${MINUS}2) − 4 = ${MINUS}6 − 4 = ${MINUS}10`,
        undefined,
        undefined,
      ],
      [
        'letter 2, 7, 3',
        () => letterFormulaQuestion(2, 7, 3),
        'y = 2x + 7. Wat is y als x = 3?',
        '13',
        '2 × 3 + 7 = 6 + 7 = 13',
        undefined,
        undefined,
      ],
      [
        'table 3, 5, 2, step 2, hellingsgetal',
        () => tableQuestion(3, 5, 2, 2, 'hellingsgetal'),
        'Tabel: bij x = 2, 4, 6, 8 hoort y = 11, 17, 23, 29. Wat is het hellingsgetal?',
        '3',
        'x wordt 2 groter, y wordt 6 groter → 6 : 2 = 3',
        undefined,
        undefined,
      ],
      [
        'table 3, 4, 1, step 1, hellingsgetal',
        () => tableQuestion(3, 4, 1, 1, 'hellingsgetal'),
        'Tabel: bij x = 1, 2, 3, 4 hoort y = 7, 10, 13, 16. Wat is het hellingsgetal?',
        '3',
        'x wordt 1 groter, y wordt 3 groter → 3',
        undefined,
        undefined,
      ],
      [
        'table −2, 20, 1, step 2, hellingsgetal',
        () => tableQuestion(-2, 20, 1, 2, 'hellingsgetal'),
        'Tabel: bij x = 1, 3, 5, 7 hoort y = 18, 14, 10, 6. Wat is het hellingsgetal?',
        `${MINUS}2`,
        `x wordt 2 groter, y wordt 4 kleiner → ${MINUS}4 : 2 = ${MINUS}2`,
        undefined,
        undefined,
      ],
      [
        'table −2, 20, 1, step 1, hellingsgetal',
        () => tableQuestion(-2, 20, 1, 1, 'hellingsgetal'),
        'Tabel: bij x = 1, 2, 3, 4 hoort y = 18, 16, 14, 12. Wat is het hellingsgetal?',
        `${MINUS}2`,
        `x wordt 1 groter, y wordt 2 kleiner → ${MINUS}2`,
        undefined,
        undefined,
      ],
      [
        'table 3, 5, 2, step 2, startgetal',
        () => tableQuestion(3, 5, 2, 2, 'startgetal'),
        'Tabel: bij x = 2, 4, 6, 8 hoort y = 11, 17, 23, 29. Wat is het startgetal?',
        '5',
        'hellingsgetal 3 → bij x = 0: 11 − 2 × 3 = 5',
        undefined,
        undefined,
      ],
      [
        'table −2, 20, 1, step 2, startgetal',
        () => tableQuestion(-2, 20, 1, 2, 'startgetal'),
        'Tabel: bij x = 1, 3, 5, 7 hoort y = 18, 14, 10, 6. Wat is het startgetal?',
        '20',
        `hellingsgetal ${MINUS}2 → bij x = 0: 18 − 1 × (${MINUS}2) = 20`,
        undefined,
        undefined,
      ],
      [
        'table with a negative first y',
        () => tableQuestion(5, -10, 1, 1, 'startgetal'),
        `Tabel: bij x = 1, 2, 3, 4 hoort y = ${MINUS}5, 0, 5, 10. Wat is het startgetal?`,
        `${MINUS}10`,
        `hellingsgetal 5 → bij x = 0: ${MINUS}5 − 1 × 5 = ${MINUS}10`,
        undefined,
        undefined,
      ],
    ],
  )('%s', (_label, make, prompt, expected, explanation, prefix, suffix) => {
    const step = stepOf(make());
    expect(step.prompt).toBe(prompt);
    expect(step.prefix).toBe(prefix);
    expect(step.suffix).toBe(suffix);
    expect(step.check(typed(answerOf(make())))).toMatchObject({
      correct: true,
      expected,
      explanation,
    });
  });

  it('builds the key from the form, the context and the numbers', () => {
    expect(wordFormulaQuestion('taxi', n('4'), n('2,5'), 12).key).toBe(
      'formulas:word:taxi:4:2,5:12',
    );
    expect(letterFormulaQuestion(3, -4, 5).key).toBe('formulas:letter:letter:3:-4:5');
    expect(tableQuestion(3, 5, 2, 2, 'startgetal').key).toBe('formulas:table:startgetal:3:5:2:2');
  });

  it('accepts the cents with or without the trailing zero', () => {
    const step = stepOf(wordFormulaQuestion('taxi', n('3'), n('2,5'), 7));
    expect(step.check('20,5').correct).toBe(true);
    expect(step.check('20,50').correct).toBe(true);
  });
});

describe('tips', () => {
  it.each<[string, string, () => Question, string | undefined]>([
    [
      'slope: the change in y',
      '6',
      () => tableQuestion(3, 5, 2, 2, 'hellingsgetal'),
      'y wordt 6 groter als x 2 groter wordt; per 1 is dat 6 : 2 = 3.',
    ],
    [
      'slope, negative: the change in y',
      `${MINUS}4`,
      () => tableQuestion(-2, 20, 1, 2, 'hellingsgetal'),
      `y wordt 4 kleiner als x 2 groter wordt; per 1 is dat ${MINUS}4 : 2 = ${MINUS}2.`,
    ],
    [
      'slope, step 1: no topic tip',
      '4',
      () => tableQuestion(3, 4, 1, 1, 'hellingsgetal'),
      undefined,
    ],
    [
      'start: y at the first x',
      '11',
      () => tableQuestion(3, 5, 2, 2, 'startgetal'),
      'Het startgetal is y bij x = 0, niet bij x = 2.',
    ],
    ['start: another wrong answer', '6', () => tableQuestion(3, 5, 2, 2, 'startgetal'), undefined],
    [
      'word formula: no topic tip',
      '16',
      () => wordFormulaQuestion('taxi', n('4'), n('2,5'), 12),
      undefined,
    ],
    ['letter formula: no topic tip', '19', () => letterFormulaQuestion(3, -4, 5), undefined],
    [
      'word formula: factor of ten',
      '340',
      () => wordFormulaQuestion('taxi', n('4'), n('2,5'), 12),
      TIP_FACTOR_TEN,
    ],
  ])('%s, typing %s', (_label, input, make, tip) => {
    expect(stepOf(make()).check(input).tip).toBe(tip);
  });
});

describe('generateFormulas', () => {
  const COUNT = 4000;
  const rng = createRng(5136);
  const questions = Array.from({ length: COUNT }, () => generateFormulas(rng));

  interface Parsed {
    question: Question;
    form: 'word' | 'letter' | 'table';
    /** The key after the form. */
    parts: string[];
  }

  const parsed: Parsed[] = questions.map((question) => {
    const [, form, ...parts] = question.key.split(':');
    return { question, form: form as Parsed['form'], parts };
  });
  const ofForm = (form: Parsed['form']) => parsed.filter((item) => item.form === form);
  const near = (count: number, of: number, share: number) => Math.abs(count / of - share) <= 0.05;
  const num = (text: string) => parseDutchNumber(text)!;
  const value = (text: string) => Number(num(text).num) / Number(num(text).den);

  it('picks substitution and table 1/2 each, word and letter 1/2 each', () => {
    const substitution = ofForm('word').length + ofForm('letter').length;
    expect(near(substitution, COUNT, 0.5)).toBe(true);
    expect(near(ofForm('word').length, substitution, 0.5)).toBe(true);
  });

  it('draws the word contexts equally, from the starts, rates and inputs of the spec', () => {
    const words = ofForm('word');
    for (const context of Object.keys(WORD_FORMULAS) as WordContext[]) {
      const ofContext = words.filter((item) => item.parts[0] === context);
      expect(near(ofContext.length, words.length, 1 / 3), context).toBe(true);
      const { starts, rates, inputRange } = WORD_FORMULAS[context];
      for (const { parts, question } of ofContext) {
        const [, startText, rateText, inputText] = parts as [string, string, string, string];
        expect(
          starts.some((start) => start.num === num(startText).num),
          question.key,
        ).toBe(true);
        expect(
          rates.some((rate) => rate.num === num(rateText).num && rate.den === num(rateText).den),
          question.key,
        ).toBe(true);
        expect(Number(inputText), question.key).toBeGreaterThanOrEqual(inputRange[0]);
        expect(Number(inputText), question.key).toBeLessThanOrEqual(inputRange[1]);
        if (context === 'kaars') {
          expect(
            value(startText) - value(rateText) * Number(inputText),
            question.key,
          ).toBeGreaterThanOrEqual(1);
        }
      }
    }
  });

  it('answers a word formula with at most two decimals', () => {
    for (const { question } of ofForm('word')) {
      const expected = stepOf(question).check('').expected;
      expect(expected.split(',')[1]?.length ?? 0, question.key).toBeLessThanOrEqual(2);
    }
  });

  it('draws the letter formula of spec §5.36, negative b in 25%', () => {
    const letters = ofForm('letter');
    for (const { parts, question } of letters) {
      const [a, b, x] = parts.slice(1).map(Number) as [number, number, number];
      expect(a, question.key).toBeGreaterThanOrEqual(2);
      expect(a, question.key).toBeLessThanOrEqual(9);
      expect(Math.abs(b), question.key).toBeGreaterThanOrEqual(1);
      expect(Math.abs(b), question.key).toBeLessThanOrEqual(20);
      expect(x, question.key).toBeGreaterThanOrEqual(-5);
      expect(x, question.key).toBeLessThanOrEqual(10);
      expect(x, question.key).not.toBe(0);
    }
    const negative = letters.filter((item) => Number(item.parts[2]) < 0).length;
    expect(near(negative, letters.length, 0.25)).toBe(true);
  });

  it('draws the table of spec §5.36', () => {
    const tables = ofForm('table');
    for (const { parts, question } of tables) {
      const [a, b, firstX, step] = parts.slice(1).map(Number) as [number, number, number, number];
      expect(a, question.key).toBeGreaterThanOrEqual(-5);
      expect(a, question.key).toBeLessThanOrEqual(10);
      expect(a, question.key).not.toBe(0);
      expect(b, question.key).toBeGreaterThanOrEqual(-10);
      expect(b, question.key).toBeLessThanOrEqual(30);
      expect(firstX, question.key).toBeGreaterThanOrEqual(1);
      expect(firstX, question.key).toBeLessThanOrEqual(3);
      expect([1, 2], question.key).toContain(step);
      for (let i = 0; i < 4; i++) {
        const y = a * (firstX + i * step) + b;
        expect(y, question.key).toBeGreaterThanOrEqual(-50);
        expect(y, question.key).toBeLessThanOrEqual(100);
      }
    }
    expect(
      near(tables.filter((item) => item.parts[0] === 'startgetal').length, tables.length, 0.5),
    ).toBe(true);
    expect(near(tables.filter((item) => item.parts[4] === '2').length, tables.length, 0.5)).toBe(
      true,
    );
    expect(
      near(tables.filter((item) => Number(item.parts[1]) < 0).length, tables.length, 0.25),
    ).toBe(true);
  });

  it('answers every question and explains it', () => {
    for (const question of questions) {
      const result = stepOf(question).check(typed(answerOf(question)));
      expect(result.correct, question.key).toBe(true);
      expect(result.explanation, question.key).toBeTruthy();
      expect(question.topic).toBe('formulas');
    }
  });
});
