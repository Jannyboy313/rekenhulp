import { describe, expect, it } from 'vitest';
import { createRng } from '../random';
import type { Question } from '../types';
import {
  generateGuessAndCheck,
  KINDS,
  sumDifferenceQuestion,
  twoKindsQuestion,
} from './guessAndCheck';
import { answerOf, stepOf, typed } from './testHelpers';

describe('KINDS', () => {
  it('lists the two kinds of each context with their legs or wheels', () => {
    expect(KINDS.boerderij.map((kind) => [kind.plural, kind.per])).toEqual([
      ['kippen', 2],
      ['konijnen', 4],
    ]);
    expect(KINDS.stalling.map((kind) => [kind.plural, kind.per])).toEqual([
      ['fietsen', 2],
      ['driewielers', 3],
    ]);
  });
});

describe('question text', () => {
  it.each<[string, () => Question, string, string, string]>([
    [
      'boerderij 6, 4, konijnen',
      () => twoKindsQuestion('boerderij', 6, 4, true),
      'Op een boerderij lopen kippen en konijnen. Samen hebben ze 10 koppen en 28 poten. Hoeveel konijnen zijn er?',
      '4',
      'Slim proberen: stel dat alle 10 dieren kippen zijn: 10 × 2 = 20 poten → 28 − 20 = 8 poten te weinig → elk konijn heeft 2 poten meer: 8 : 2 = 4 konijnen',
    ],
    [
      'boerderij 6, 4, kippen',
      () => twoKindsQuestion('boerderij', 6, 4, false),
      'Op een boerderij lopen kippen en konijnen. Samen hebben ze 10 koppen en 28 poten. Hoeveel kippen zijn er?',
      '6',
      'Slim proberen: stel dat alle 10 dieren kippen zijn: 10 × 2 = 20 poten → 28 − 20 = 8 poten te weinig → elk konijn heeft 2 poten meer: 8 : 2 = 4 konijnen → 10 − 4 = 6 kippen',
    ],
    [
      'stalling 7, 5, driewielers',
      () => twoKindsQuestion('stalling', 7, 5, true),
      'In een stalling staan fietsen en driewielers, samen 12 stuks met 29 wielen. Hoeveel driewielers staan er?',
      '5',
      'Slim proberen: stel dat alle 12 fietsen zijn: 12 × 2 = 24 wielen → 29 − 24 = 5 wielen te weinig → elke driewieler heeft 1 wiel meer: 5 driewielers',
    ],
    [
      'stalling 7, 5, fietsen',
      () => twoKindsQuestion('stalling', 7, 5, false),
      'In een stalling staan fietsen en driewielers, samen 12 stuks met 29 wielen. Hoeveel fietsen staan er?',
      '7',
      'Slim proberen: stel dat alle 12 fietsen zijn: 12 × 2 = 24 wielen → 29 − 24 = 5 wielen te weinig → elke driewieler heeft 1 wiel meer: 5 driewielers → 12 − 5 = 7 fietsen',
    ],
    [
      'boerderij 4, 1 (singular)',
      () => twoKindsQuestion('boerderij', 4, 1, true),
      'Op een boerderij lopen kippen en konijnen. Samen hebben ze 5 koppen en 12 poten. Hoeveel konijnen zijn er?',
      '1',
      'Slim proberen: stel dat alle 5 dieren kippen zijn: 5 × 2 = 10 poten → 12 − 10 = 2 poten te weinig → elk konijn heeft 2 poten meer: 2 : 2 = 1 konijn',
    ],
    [
      'stalling 1, 19, fietsen (total 20, singular)',
      () => twoKindsQuestion('stalling', 1, 19, false),
      'In een stalling staan fietsen en driewielers, samen 20 stuks met 59 wielen. Hoeveel fietsen staan er?',
      '1',
      'Slim proberen: stel dat alle 20 fietsen zijn: 20 × 2 = 40 wielen → 59 − 40 = 19 wielen te weinig → elke driewieler heeft 1 wiel meer: 19 driewielers → 20 − 19 = 1 fiets',
    ],
    [
      'stalling 4, 1, driewielers (one wheel short)',
      () => twoKindsQuestion('stalling', 4, 1, true),
      'In een stalling staan fietsen en driewielers, samen 5 stuks met 11 wielen. Hoeveel driewielers staan er?',
      '1',
      'Slim proberen: stel dat alle 5 fietsen zijn: 5 × 2 = 10 wielen → 11 − 10 = 1 wiel te weinig → elke driewieler heeft 1 wiel meer: 1 driewieler',
    ],
    [
      'sum 50, difference 14, larger',
      () => sumDifferenceQuestion(32, 18, true),
      'Twee getallen zijn samen 50 en verschillen 14. Wat is het grootste getal?',
      '32',
      'Slim proberen: 25 en 25 zijn samen 50 maar verschillen 0 → maak het ene getal 7 groter en het andere 7 kleiner: 32 en 18 verschillen 14 → 32',
    ],
    [
      'sum 50, difference 14, smaller',
      () => sumDifferenceQuestion(32, 18, false),
      'Twee getallen zijn samen 50 en verschillen 14. Wat is het kleinste getal?',
      '18',
      'Slim proberen: 25 en 25 zijn samen 50 maar verschillen 0 → maak het ene getal 7 groter en het andere 7 kleiner: 32 en 18 verschillen 14 → 18',
    ],
    [
      '6 and 4 (sum 10, difference 2)',
      () => sumDifferenceQuestion(6, 4, true),
      'Twee getallen zijn samen 10 en verschillen 2. Wat is het grootste getal?',
      '6',
      'Slim proberen: 5 en 5 zijn samen 10 maar verschillen 0 → maak het ene getal 1 groter en het andere 1 kleiner: 6 en 4 verschillen 2 → 6',
    ],
    [
      '99 and 1 (sum 100, smallest 1)',
      () => sumDifferenceQuestion(99, 1, false),
      'Twee getallen zijn samen 100 en verschillen 98. Wat is het kleinste getal?',
      '1',
      'Slim proberen: 50 en 50 zijn samen 100 maar verschillen 0 → maak het ene getal 49 groter en het andere 49 kleiner: 99 en 1 verschillen 98 → 1',
    ],
  ])('%s', (_label, make, prompt, expected, explanation) => {
    const step = stepOf(make());
    expect(step.prompt).toBe(prompt);
    expect(step.check(typed(answerOf(make())))).toMatchObject({
      correct: true,
      expected,
      explanation,
    });
  });

  it('builds the key from the form, the numbers and what is asked', () => {
    expect(twoKindsQuestion('boerderij', 6, 4, true).key).toBe(
      'guessAndCheck:kinds:boerderij:6:4:second',
    );
    expect(sumDifferenceQuestion(32, 18, false).key).toBe('guessAndCheck:sum:32:18:smaller');
  });
});

describe('tips', () => {
  it.each<[string, string, () => Question, string | undefined]>([
    [
      'konijnen asked, kippen typed',
      '6',
      () => twoKindsQuestion('boerderij', 6, 4, true),
      'Dat is het aantal kippen; gevraagd is het aantal konijnen.',
    ],
    [
      'kippen asked, konijnen typed',
      '4',
      () => twoKindsQuestion('boerderij', 6, 4, false),
      'Dat is het aantal konijnen; gevraagd is het aantal kippen.',
    ],
    [
      'driewielers asked, fietsen typed',
      '7',
      () => twoKindsQuestion('stalling', 7, 5, true),
      'Dat is het aantal fietsen; gevraagd is het aantal driewielers.',
    ],
    [
      'larger asked, smaller typed',
      '18',
      () => sumDifferenceQuestion(32, 18, true),
      'Dat is het kleinste getal; gevraagd is het grootste.',
    ],
    [
      'smaller asked, larger typed',
      '32',
      () => sumDifferenceQuestion(32, 18, false),
      'Dat is het grootste getal; gevraagd is het kleinste.',
    ],
    ['another wrong answer', '25', () => sumDifferenceQuestion(32, 18, true), undefined],
  ])('%s, typing %s', (_label, input, make, tip) => {
    expect(stepOf(make()).check(input).tip).toBe(tip);
  });

  it('accepts the other count when both are equal', () => {
    expect(stepOf(twoKindsQuestion('boerderij', 5, 5, true)).check('5').correct).toBe(true);
  });
});

describe('generateGuessAndCheck', () => {
  const COUNT = 4000;
  const rng = createRng(4343);
  const questions = Array.from({ length: COUNT }, () => generateGuessAndCheck(rng));
  const near = (count: number, of: number, share: number) => Math.abs(count / of - share) <= 0.05;
  const kinds = questions.filter((q) => q.key.startsWith('guessAndCheck:kinds:'));
  const sums = questions.filter((q) => q.key.startsWith('guessAndCheck:sum:'));

  it('picks the two forms equally', () => {
    expect(kinds.length + sums.length).toBe(COUNT);
    expect(near(kinds.length, COUNT, 0.5)).toBe(true);
  });

  it('draws two kinds of spec §5.43', () => {
    let boerderij = 0;
    let second = 0;
    for (const question of kinds) {
      const [, , context, firstText, secondText, asked] = question.key.split(':');
      const first = Number(firstText);
      const other = Number(secondText);
      if (context === 'boerderij') boerderij++;
      if (asked === 'second') second++;
      expect(first, question.key).toBeGreaterThanOrEqual(1);
      expect(other, question.key).toBeGreaterThanOrEqual(1);
      expect(first + other, question.key).toBeGreaterThanOrEqual(5);
      expect(first + other, question.key).toBeLessThanOrEqual(20);
    }
    expect(near(boerderij, kinds.length, 0.5)).toBe(true);
    expect(near(second, kinds.length, 0.5)).toBe(true);
  });

  it('draws a sum and difference of spec §5.43', () => {
    let larger = 0;
    for (const question of sums) {
      const [, , largerText, smallerText, asked] = question.key.split(':');
      const a = Number(largerText);
      const b = Number(smallerText);
      if (asked === 'larger') larger++;
      expect((a + b) % 2, question.key).toBe(0);
      expect(a + b, question.key).toBeGreaterThanOrEqual(10);
      expect(a + b, question.key).toBeLessThanOrEqual(100);
      expect(a - b, question.key).toBeGreaterThanOrEqual(2);
      expect(b, question.key).toBeGreaterThanOrEqual(1);
    }
    expect(near(larger, sums.length, 0.5)).toBe(true);
  });

  it('answers, explains and keeps every prompt within 170 characters', () => {
    for (const question of questions) {
      const step = stepOf(question);
      const result = step.check(typed(answerOf(question)));
      expect(result.correct, question.key).toBe(true);
      expect(result.explanation, question.key).toMatch(/^Slim proberen: /);
      expect(step.prompt.length, question.key).toBeLessThanOrEqual(170);
      expect(question.topic).toBe('guessAndCheck');
    }
  });
});
