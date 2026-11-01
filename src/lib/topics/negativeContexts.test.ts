import { describe, expect, it } from 'vitest';
import { createRng } from '../random';
import { decimalPlaces, isBetween, parseDutchNumber } from '../rational';
import type { Question } from '../types';
import {
  balanceQuestion,
  generateNegativeContexts,
  heightDifferenceQuestion,
  inTheRedQuestion,
  liftQuestion,
  shortfallQuestion,
  temperatureQuestion,
} from './negativeContexts';
import { answerOf, decimal, stepOf } from './testHelpers';

const SAMPLES = 4000;
const NBSP = '\u{a0}';

describe('money', () => {
  it('asks how far in the red', () => {
    const step = stepOf(inTheRedQuestion(318, 774));
    expect(step.kind).toBe('number');
    expect(step.prompt).toBe(
      `Je hebt €${NBSP}318 op je rekening en betaalt €${NBSP}774. Hoeveel sta je in het rood?`,
    );
    expect(step.prefix).toBe('€');
    expect(step.check('456')).toEqual({
      correct: true,
      expected: '456',
      explanation: `774 − 318 = 456 → €${NBSP}456 in het rood`,
    });
    expect(step.check('1092').correct).toBe(false);
  });

  it('asks the balance, which can be negative', () => {
    const step = stepOf(balanceQuestion(145, 400));
    expect(step.prompt).toBe(
      `Je staat €${NBSP}145 in het rood. Je krijgt €${NBSP}400 salaris. Wat is je saldo nu?`,
    );
    expect(step.prefix).toBe('€');
    expect(step.check('255')).toEqual({
      correct: true,
      expected: '255',
      explanation: '−145 + 400 = −145 + 145 + 255 = 255',
    });
    const negative = stepOf(balanceQuestion(400, 100)).check('−300');
    expect(negative).toMatchObject({ correct: true, expected: '−300' });
    expect(negative.explanation).toBe('−400 + 100 = −300');
    expect(stepOf(balanceQuestion(400, 100)).check('-300').correct).toBe(true);
  });

  it('asks how much is missing', () => {
    const step = stepOf(shortfallQuestion('fiets', 849, 387));
    expect(step.prompt).toBe(
      `Je wilt een fiets van €${NBSP}849 kopen en hebt €${NBSP}387 gespaard. Hoeveel kom je te kort?`,
    );
    expect(step.check('462')).toEqual({
      correct: true,
      expected: '462',
      explanation: '849 − 387 = 462',
    });
    expect(stepOf(shortfallQuestion('laptop', 500, 120)).prompt).toContain('een laptop van');
    expect(stepOf(shortfallQuestion('telefoon', 500, 120)).prompt).toContain('een telefoon van');
  });
});

describe('height', () => {
  it('asks how much higher a dune lies than a polder', () => {
    const step = stepOf(heightDifferenceQuestion(decimal('−4'), 'polder', 'duin', 23));
    expect(step.prompt).toBe(
      `Een polder ligt op −4${NBSP}m NAP, een duin op 23${NBSP}m NAP. Hoeveel meter hoger ligt het duin?`,
    );
    expect(step.suffix).toBe('m');
    expect(step.check('27')).toEqual({
      correct: true,
      expected: '27',
      explanation: '23 − (−4) = 23 + 4 = 27',
    });
  });

  it('keeps a decimal depth and the article of the high point', () => {
    const step = stepOf(heightDifferenceQuestion(decimal('−4,5'), 'meer', 'dijk', 12));
    expect(step.prompt).toBe(
      `Een meer ligt op −4,5${NBSP}m NAP, een dijk op 12${NBSP}m NAP. Hoeveel meter hoger ligt de dijk?`,
    );
    expect(step.check('16,5')).toMatchObject({
      correct: true,
      explanation: '12 − (−4,5) = 12 + 4,5 = 16,5',
    });
  });

  it('moves a lift up and down', () => {
    const up = stepOf(liftQuestion(-2, 7));
    expect(up.prompt).toBe(
      'Een lift staat op verdieping −2 en gaat 7 verdiepingen omhoog. Op welke verdieping stopt hij?',
    );
    expect(up.suffix).toBeUndefined();
    expect(up.check('5')).toEqual({
      correct: true,
      expected: '5',
      explanation: '−2 + 7 = −2 + 2 + 5 = 5',
    });
    const down = stepOf(liftQuestion(3, -6));
    expect(down.prompt).toBe(
      'Een lift staat op verdieping 3 en gaat 6 verdiepingen omlaag. Op welke verdieping stopt hij?',
    );
    expect(down.check('−3')).toMatchObject({
      correct: true,
      explanation: '3 − 6 = 3 − 3 − 3 = −3',
    });
  });
});

describe('temperature', () => {
  it('chains a warmer and a kouder change', () => {
    const step = stepOf(temperatureQuestion(-3, 9, -11));
    expect(step.prompt).toBe(
      `'s Ochtends is het −3${NBSP}°C. Het wordt 9 graden warmer en 's avonds weer 11 graden kouder. Hoeveel graden is het dan?`,
    );
    expect(step.suffix).toBe('°C');
    expect(step.check('−5')).toEqual({
      correct: true,
      expected: '−5',
      explanation: '−3 + 9 = −3 + 3 + 6 = 6 → 6 − 11 = 6 − 6 − 5 = −5',
    });
  });

  it('starts with a kouder change as well', () => {
    const step = stepOf(temperatureQuestion(4, -10, 3));
    expect(step.prompt).toBe(
      `'s Ochtends is het 4${NBSP}°C. Het wordt 10 graden kouder en 's avonds weer 3 graden warmer. Hoeveel graden is het dan?`,
    );
    expect(step.check('−3')).toMatchObject({
      explanation: '4 − 10 = 4 − 4 − 6 = −6 → −6 + 3 = −3',
    });
  });
});

describe('generateNegativeContexts', () => {
  const rng = createRng(53);
  const questions: Question[] = Array.from({ length: SAMPLES }, () =>
    generateNegativeContexts(rng),
  );
  const parts = (question: Question) => question.key.split(':');
  const where = (form: string, variant?: string) =>
    questions.filter(
      (q) => parts(q)[1] === form && (variant === undefined || parts(q)[2] === variant),
    );
  const nums = (question: Question, from: number) =>
    parts(question)
      .slice(from)
      .map((part) => parseDutchNumber(part)!)
      .map((value) => Number(value.num) / Number(value.den));
  const share = (count: number, total: number) => count / total;

  it('is a single number step with the right unit, never zero for the saldo', () => {
    for (const question of questions) {
      const step = stepOf(question);
      expect(question.topic).toBe('negativeContexts');
      expect(question.steps).toHaveLength(1);
      expect(step.kind).toBe('number');
      expect(step.check(step.check('').expected).correct).toBe(true);
    }
    for (const question of where('money')) expect(stepOf(question).prefix).toBe('€');
    for (const question of where('height', 'verschil')) expect(stepOf(question).suffix).toBe('m');
    for (const question of where('height', 'lift')) expect(stepOf(question).suffix).toBeUndefined();
    for (const question of where('temperature')) expect(stepOf(question).suffix).toBe('°C');
  });

  it('uses the three forms and their variants about equally', () => {
    for (const form of ['money', 'height', 'temperature']) {
      expect(share(where(form).length, SAMPLES)).toBeGreaterThan(0.3);
      expect(share(where(form).length, SAMPLES)).toBeLessThan(0.37);
    }
    for (const variant of ['rood', 'saldo', 'kort']) {
      expect(share(where('money', variant).length, where('money').length)).toBeGreaterThan(0.28);
    }
    expect(share(where('height', 'lift').length, where('height').length)).toBeGreaterThan(0.45);
    expect(share(where('height', 'lift').length, where('height').length)).toBeLessThan(0.55);
    expect(new Set(where('money', 'kort').map((q) => parts(q)[3]))).toEqual(
      new Set(['fiets', 'telefoon', 'laptop']),
    );
    expect(new Set(where('height', 'verschil').map((q) => parts(q)[3]))).toEqual(
      new Set(['polder', 'meer']),
    );
    expect(new Set(where('height', 'verschil').map((q) => parts(q)[4]))).toEqual(
      new Set(['duin', 'dijk', 'heuvel']),
    );
  });

  it('in het rood: balance 50-900, a higher payment up to 999, with a borrow', () => {
    for (const question of where('money', 'rood')) {
      const [balance, payment] = nums(question, 3) as [number, number];
      expect(balance).toBeGreaterThanOrEqual(50);
      expect(balance).toBeLessThanOrEqual(900);
      expect(payment).toBeGreaterThanOrEqual(100);
      expect(payment).toBeLessThanOrEqual(999);
      expect(payment).toBeGreaterThan(balance);
      const ones = payment % 10 < balance % 10;
      const tens = Math.floor(payment / 10) % 10 < (Math.floor(balance / 10) % 10) + (ones ? 1 : 0);
      expect(ones || tens).toBe(true);
      expect(Number(answerOf(question).num)).toBe(payment - balance);
    }
  });

  it('saldo: minus 20-900, income 100-2000 (a multiple of 10 above 1000), not 0', () => {
    const answers: number[] = [];
    for (const question of where('money', 'saldo')) {
      const [minus, income] = nums(question, 3) as [number, number];
      expect(minus).toBeGreaterThanOrEqual(20);
      expect(minus).toBeLessThanOrEqual(900);
      expect(income).toBeGreaterThanOrEqual(100);
      expect(income).toBeLessThanOrEqual(2000);
      if (income > 1000) expect(income % 10).toBe(0);
      const answer = Number(answerOf(question).num);
      expect(answer).toBe(income - minus);
      expect(answer).not.toBe(0);
      answers.push(answer);
    }
    expect(answers.some((answer) => answer < 0)).toBe(true);
    expect(answers.some((answer) => answer > 0)).toBe(true);
  });

  it('te kort: price 100-999, savings from 20 up to price - 10', () => {
    for (const question of where('money', 'kort')) {
      const [price, savings] = nums(question, 4) as [number, number];
      expect(price).toBeGreaterThanOrEqual(100);
      expect(price).toBeLessThanOrEqual(999);
      expect(savings).toBeGreaterThanOrEqual(20);
      expect(savings).toBeLessThanOrEqual(price - 10);
      expect(Number(answerOf(question).num)).toBe(price - savings);
    }
  });

  it('height verschil: low -7 to -1 with at most 1 decimal, high 5-50', () => {
    for (const question of where('height', 'verschil')) {
      const low = parseDutchNumber(parts(question)[5]!)!;
      const high = parseDutchNumber(parts(question)[6]!)!;
      expect(isBetween(low, decimal('−7'), decimal('−1'))).toBe(true);
      expect(decimalPlaces(low)).toBeLessThanOrEqual(1);
      expect(isBetween(high, decimal('5'), decimal('50'))).toBe(true);
      expect(decimalPlaces(high)).toBe(0);
      const answer = answerOf(question);
      expect(answer.num * low.den * high.den).toBe(
        (high.num * low.den - low.num * high.den) * answer.den,
      );
    }
    expect(
      where('height', 'verschil').some((q) => decimalPlaces(parseDutchNumber(parts(q)[5]!)!) === 1),
    ).toBe(true);
  });

  it('lift: start -3 to 10, move 2-12 up or down, end -3 to 12, below zero at start or end', () => {
    const lifts = where('height', 'lift');
    for (const question of lifts) {
      const [start, move] = nums(question, 3) as [number, number];
      const end = start + move;
      expect(start).toBeGreaterThanOrEqual(-3);
      expect(start).toBeLessThanOrEqual(10);
      expect(Math.abs(move)).toBeGreaterThanOrEqual(2);
      expect(Math.abs(move)).toBeLessThanOrEqual(12);
      expect(end).toBeGreaterThanOrEqual(-3);
      expect(end).toBeLessThanOrEqual(12);
      expect(start < 0 || end < 0).toBe(true);
      expect(Number(answerOf(question).num)).toBe(end);
    }
    expect(lifts.some((q) => nums(q, 4)[0]! > 0)).toBe(true);
    expect(lifts.some((q) => nums(q, 4)[0]! < 0)).toBe(true);
  });

  it('temperature: start -10 to 10, two opposite changes of 2-15, all values in -15 to 20, one crossing', () => {
    for (const question of where('temperature')) {
      const [start, first, second] = nums(question, 2) as [number, number, number];
      expect(start).toBeGreaterThanOrEqual(-10);
      expect(start).toBeLessThanOrEqual(10);
      for (const change of [first, second]) {
        expect(Math.abs(change)).toBeGreaterThanOrEqual(2);
        expect(Math.abs(change)).toBeLessThanOrEqual(15);
      }
      expect(Math.sign(first)).toBe(-Math.sign(second));
      const values = [start, start + first, start + first + second];
      for (const value of values) {
        expect(value).toBeGreaterThanOrEqual(-15);
        expect(value).toBeLessThanOrEqual(20);
      }
      const crosses = (from: number, to: number) => (from < 0 && to > 0) || (from > 0 && to < 0);
      expect(crosses(values[0]!, values[1]!) || crosses(values[1]!, values[2]!)).toBe(true);
      expect(Number(answerOf(question).num)).toBe(values[2]);
    }
    expect(where('temperature').some((q) => nums(q, 3)[0]! > 0)).toBe(true);
    expect(where('temperature').some((q) => nums(q, 3)[0]! < 0)).toBe(true);
  });
});
