import { describe, expect, it } from 'vitest';
import { createRng } from '../random';
import type { Question } from '../types';
import { answerOf, stepOf, typed } from './testHelpers';
import {
  AMOUNT_ITEMS,
  applyChain,
  generateWorkingBackwards,
  moneyQuestion,
  moneyRest,
  PART_ITEMS,
  thinkOfNumberQuestion,
  type Expenses,
  type Operation,
  type OperationKind,
} from './workingBackwards';

const op = (kind: OperationKind, k: number): Operation => ({ kind, k });
const times = (k: number) => op('times', k);
const divide = (k: number) => op('divide', k);
const plus = (k: number) => op('plus', k);
const minus = (k: number) => op('minus', k);

const expenses = (
  part: Expenses['part'],
  amount: number,
  partFirst: boolean,
  partItem = 'kleren',
  amountItem = 'een lunch',
): Expenses => ({ part, partItem, amount, amountItem, partFirst });

describe('applyChain', () => {
  it.each<[string, number, Operation[], number | null]>([
    ['× 3, + 7, : 2', 7, [times(3), plus(7), divide(2)], 14],
    ['same kind in a row (×)', 5, [times(3), times(2)], null],
    ['same kind in a row (+)', 5, [plus(3), plus(4)], null],
    ['undo × 3 with : 3', 6, [times(3), divide(3)], null],
    ['undo + 5 with − 5', 8, [plus(5), minus(5)], null],
    ['× 3 then : 2 is no undo', 6, [times(3), divide(2)], 9],
    ['division not exact', 7, [divide(2)], null],
    ['above 200', 20, [times(5), plus(120)], null],
    ['below 1', 3, [minus(3)], null],
  ])('%s', (_label, start, operations, expected) => {
    expect(applyChain(start, operations)).toBe(expected);
  });
});

describe('moneyRest', () => {
  it.each<[string, number, Expenses, number | null]>([
    ['30; helft, € 6, part first', 30, expenses('helft', 6, true), 9],
    ['25; helft, € 6, part first (12,5)', 25, expenses('helft', 6, true), null],
    ['30; derde, € 6, amount first', 30, expenses('derde', 6, false), 16],
    ['31; derde, € 6, amount first (25 : 3)', 31, expenses('derde', 6, false), null],
    ['12; helft, € 6, part first (rest 0)', 12, expenses('helft', 6, true), null],
  ])('%s', (_label, start, given, expected) => {
    expect(moneyRest(start, given)).toBe(expected);
  });
});

describe('question text', () => {
  it.each<[string, () => Question, string, string, string]>([
    [
      '7; × 3, + 7, : 2',
      () => thinkOfNumberQuestion(7, [times(3), plus(7), divide(2)]),
      'Ik denk aan een getal. Ik doe het keer 3, tel er 7 bij op en deel de uitkomst door 2. Ik kom uit op 14. Aan welk getal dacht ik?',
      '7',
      'Terugrekenen vanaf 14: 14 × 2 = 28 → 28 − 7 = 21 → 21 : 3 = 7',
    ],
    [
      '5; + 7, × 4 (two operations)',
      () => thinkOfNumberQuestion(5, [plus(7), times(4)]),
      'Ik denk aan een getal. Ik tel er 7 bij op en doe de uitkomst keer 4. Ik kom uit op 48. Aan welk getal dacht ik?',
      '5',
      'Terugrekenen vanaf 48: 48 : 4 = 12 → 12 − 7 = 5',
    ],
    [
      '18; : 3, − 5 (result 1)',
      () => thinkOfNumberQuestion(18, [divide(3), minus(5)]),
      'Ik denk aan een getal. Ik deel het door 3 en trek er 5 van af. Ik kom uit op 1. Aan welk getal dacht ik?',
      '18',
      'Terugrekenen vanaf 1: 1 + 5 = 6 → 6 × 3 = 18',
    ],
    [
      '20; − 4, × 5, + 20',
      () => thinkOfNumberQuestion(20, [minus(4), times(5), plus(20)]),
      'Ik denk aan een getal. Ik trek er 4 van af, doe de uitkomst keer 5 en tel er 20 bij op. Ik kom uit op 100. Aan welk getal dacht ik?',
      '20',
      'Terugrekenen vanaf 100: 100 − 20 = 80 → 80 : 5 = 16 → 16 + 4 = 20',
    ],
    [
      '30; helft kleren, then € 6 een lunch',
      () => moneyQuestion(30, expenses('helft', 6, true)),
      'Je geeft de helft van je geld uit aan kleren. Daarna geef je €\u{a0}6 uit aan een lunch. Je hebt nog €\u{a0}9 over. Hoeveel geld had je eerst?',
      '30',
      'Terugrekenen vanaf €\u{a0}9: 9 + 6 = 15 → €\u{a0}15 is de helft van wat je had → 15 × 2 = 30',
    ],
    [
      '30; derde een cadeau, then € 6 een boek',
      () => moneyQuestion(30, expenses('derde', 6, true, 'een cadeau', 'een boek')),
      'Je geeft een derde van je geld uit aan een cadeau. Daarna geef je €\u{a0}6 uit aan een boek. Je hebt nog €\u{a0}14 over. Hoeveel geld had je eerst?',
      '30',
      'Terugrekenen vanaf €\u{a0}14: 14 + 6 = 20 → €\u{a0}20 is 2/3 van wat je had → 20 : 2 × 3 = 30',
    ],
    [
      '20; kwart een spelletje, then € 6 een lunch',
      () => moneyQuestion(20, expenses('kwart', 6, true, 'een spelletje')),
      'Je geeft een kwart van je geld uit aan een spelletje. Daarna geef je €\u{a0}6 uit aan een lunch. Je hebt nog €\u{a0}9 over. Hoeveel geld had je eerst?',
      '20',
      'Terugrekenen vanaf €\u{a0}9: 9 + 6 = 15 → €\u{a0}15 is 3/4 van wat je had → 15 : 3 × 4 = 20',
    ],
    [
      '24; € 6 een lunch, then helft kleren',
      () => moneyQuestion(24, expenses('helft', 6, false)),
      'Je geeft €\u{a0}6 uit aan een lunch. Daarna geef je de helft van wat je over hebt uit aan kleren. Je hebt nog €\u{a0}9 over. Hoeveel geld had je eerst?',
      '24',
      'Terugrekenen vanaf €\u{a0}9: €\u{a0}9 is de helft van wat je over had → 9 × 2 = 18 → 18 + 6 = 24',
    ],
    [
      '36; € 6 een boek, then derde een cadeau',
      () => moneyQuestion(36, expenses('derde', 6, false, 'een cadeau', 'een boek')),
      'Je geeft €\u{a0}6 uit aan een boek. Daarna geef je een derde van wat je over hebt uit aan een cadeau. Je hebt nog €\u{a0}20 over. Hoeveel geld had je eerst?',
      '36',
      'Terugrekenen vanaf €\u{a0}20: €\u{a0}20 is 2/3 van wat je over had → 20 : 2 × 3 = 30 → 30 + 6 = 36',
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

  it('has the € prefix on money answers only', () => {
    expect(stepOf(moneyQuestion(30, expenses('helft', 6, true))).prefix).toBe('€');
    expect(stepOf(thinkOfNumberQuestion(5, [plus(7), times(4)])).prefix).toBeUndefined();
  });

  it('keeps the longest money prompt within 170 characters', () => {
    const longest = moneyQuestion(
      79,
      expenses('kwart', 15, false, 'een spelletje', 'een bioscoopkaartje'),
    );
    expect(stepOf(longest).prompt.length).toBeLessThanOrEqual(170);
  });

  it('builds the key from the form and the numbers', () => {
    expect(thinkOfNumberQuestion(7, [times(3), plus(7), divide(2)]).key).toBe(
      'workingBackwards:number:7:times3,plus7,divide2',
    );
    expect(moneyQuestion(24, expenses('helft', 6, false)).key).toBe(
      'workingBackwards:money:24:helft:6:false',
    );
  });

  it('has no topic tips', () => {
    expect(stepOf(moneyQuestion(30, expenses('helft', 6, true))).check('15').tip).toBeUndefined();
  });
});

describe('generateWorkingBackwards', () => {
  const COUNT = 4000;
  const rng = createRng(4242);
  const questions = Array.from({ length: COUNT }, () => generateWorkingBackwards(rng));
  const near = (count: number, of: number, share: number) => Math.abs(count / of - share) <= 0.05;
  const numberQuestions = questions.filter((q) => q.key.startsWith('workingBackwards:number:'));
  const moneyQuestions = questions.filter((q) => q.key.startsWith('workingBackwards:money:'));

  function operationsOf(key: string): Operation[] {
    return key
      .split(':')[3]!
      .split(',')
      .map((text) => {
        const match = /^(times|divide|plus|minus)(\d+)$/.exec(text)!;
        return op(match[1] as OperationKind, Number(match[2]));
      });
  }

  it('picks the two forms equally', () => {
    expect(numberQuestions.length + moneyQuestions.length).toBe(COUNT);
    expect(near(numberQuestions.length, COUNT, 0.5)).toBe(true);
  });

  it('draws a number chain of spec §5.42', () => {
    let three = 0;
    for (const question of numberQuestions) {
      const start = Number(question.key.split(':')[2]);
      const operations = operationsOf(question.key);
      expect(start, question.key).toBeGreaterThanOrEqual(2);
      expect(start, question.key).toBeLessThanOrEqual(20);
      expect([2, 3], question.key).toContain(operations.length);
      if (operations.length === 3) three++;
      for (const { kind, k } of operations) {
        const max = kind === 'times' || kind === 'divide' ? 5 : 20;
        const min = kind === 'times' || kind === 'divide' ? 2 : 1;
        expect(k, question.key).toBeGreaterThanOrEqual(min);
        expect(k, question.key).toBeLessThanOrEqual(max);
      }
      expect(applyChain(start, operations), question.key).not.toBeNull();
      expect(Number(answerOf(question).num), question.key).toBe(start);
    }
    expect(near(three, numberQuestions.length, 0.5)).toBe(true);
  });

  it('draws money of spec §5.42', () => {
    const parts = { helft: 0, derde: 0, kwart: 0 };
    let partFirst = 0;
    for (const question of moneyQuestions) {
      const [, , startText, part, amountText, first] = question.key.split(':');
      const start = Number(startText);
      const amount = Number(amountText);
      expect(start, question.key).toBeGreaterThanOrEqual(12);
      expect(start, question.key).toBeLessThanOrEqual(80);
      expect(amount, question.key).toBeGreaterThanOrEqual(3);
      expect(amount, question.key).toBeLessThanOrEqual(15);
      parts[part as keyof typeof parts]++;
      if (first === 'true') partFirst++;
      const prompt = stepOf(question).prompt;
      expect(
        PART_ITEMS.some((item) => prompt.includes(`uit aan ${item}.`)),
        prompt,
      ).toBe(true);
      expect(
        AMOUNT_ITEMS.some((item) => prompt.includes(`uit aan ${item}.`)),
        prompt,
      ).toBe(true);
      const rest = moneyRest(start, expenses(part as Expenses['part'], amount, first === 'true'));
      expect(rest, question.key).not.toBeNull();
      expect(rest!, question.key).toBeGreaterThanOrEqual(1);
    }
    const total = moneyQuestions.length;
    expect(near(parts.helft, total, 0.5)).toBe(true);
    expect(near(parts.derde, total, 0.25)).toBe(true);
    expect(near(partFirst, total, 0.5)).toBe(true);
  });

  it('answers, explains and keeps every prompt within 170 characters', () => {
    for (const question of questions) {
      const step = stepOf(question);
      const result = step.check(typed(answerOf(question)));
      expect(result.correct, question.key).toBe(true);
      expect(result.explanation, question.key).toMatch(/^Terugrekenen vanaf /);
      expect(step.prompt.length, question.key).toBeLessThanOrEqual(170);
      expect(question.topic).toBe('workingBackwards');
    }
  });
});
