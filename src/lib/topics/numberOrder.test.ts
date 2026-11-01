import { describe, expect, it } from 'vitest';
import { formatRational } from '../format';
import { createRng } from '../random';
import {
  compare,
  decimalPlaces,
  isBetween,
  negate,
  parseDutchNumber,
  type Rational,
} from '../rational';
import type { Question } from '../types';
import { betweenQuestion, generateNumberOrder, orderQuestion } from './numberOrder';
import { decimal, stepOf } from './testHelpers';

const SAMPLES = 2000;

const orderOf = (texts: string[], ascending: boolean, swaps: [number, number], seed = 1) =>
  stepOf(orderQuestion(texts.map(decimal), ascending, swaps, createRng(seed)));

describe('orderQuestion', () => {
  const values = ['−3,5', '−1,2', '0,35', '0,4'];

  it('offers the right chain, the sign trap and two neighbour swaps (ascending)', () => {
    const step = orderOf(values, true, [0, 2]);
    expect(step.kind).toBe('choice');
    expect(step.prompt).toBe('Welke rij klopt?');
    expect(new Set(step.options)).toEqual(
      new Set([
        '−3,5 < −1,2 < 0,35 < 0,4',
        '0,35 < 0,4 < −1,2 < −3,5',
        '−1,2 < −3,5 < 0,35 < 0,4',
        '−3,5 < −1,2 < 0,4 < 0,35',
      ]),
    );
    expect(step.check('−3,5 < −1,2 < 0,35 < 0,4')).toEqual({
      correct: true,
      expected: '−3,5 < −1,2 < 0,35 < 0,4',
      explanation:
        'op de getallenlijn van links naar rechts: −3,5, −1,2, 0,35, 0,4. ' +
        '−3,5 is kleiner dan −1,2: hoe verder onder nul, hoe kleiner',
    });
    expect(step.check('0,35 < 0,4 < −1,2 < −3,5').correct).toBe(false);
  });

  it('writes a descending chain with >', () => {
    const step = orderOf(values, false, [1, 2]);
    expect(new Set(step.options)).toEqual(
      new Set([
        '0,4 > 0,35 > −1,2 > −3,5',
        '0,4 > 0,35 > −3,5 > −1,2',
        '0,4 > −1,2 > 0,35 > −3,5',
        '−3,5 > −1,2 > 0,4 > 0,35',
      ]),
    );
    expect(step.check('').expected).toBe('0,4 > 0,35 > −1,2 > −3,5');
    expect(step.check('').explanation).toBe(
      'op de getallenlijn van rechts naar links: 0,4, 0,35, −1,2, −3,5. ' +
        '−3,5 is kleiner dan −1,2: hoe verder onder nul, hoe kleiner',
    );
  });

  it('shuffles the options with the rng', () => {
    const orders = new Set<string>();
    for (let seed = 1; seed <= 30; seed++) {
      orders.add(orderOf(values, true, [0, 2], seed).options!.join('|'));
    }
    expect(orders.size).toBeGreaterThan(5);
  });
});

describe('betweenQuestion', () => {
  it('asks for the number between two negative tenths', () => {
    const step = stepOf(betweenQuestion(decimal('−2,5')));
    expect(step.prompt).toBe('Welk getal ligt tussen −2,5 en −2,4?');
    expect(step.options).toEqual(['−2,55', '−2,45', '−2,35', '2,45']);
    expect(step.check('−2,45')).toEqual({
      correct: true,
      expected: '−2,45',
      explanation: '−2,5 = −2,50 en −2,4 = −2,40 → −2,45 ligt ertussen',
    });
    expect(step.check('2,45').correct).toBe(false);
  });
});

describe('generateNumberOrder', () => {
  const rng = createRng(31);
  const questions: Question[] = Array.from({ length: SAMPLES }, () => generateNumberOrder(rng));
  const formOf = (question: Question) => question.key.split(':')[1];
  const parts = (text: string) => text.split(/ [<>] /).map((part) => parseDutchNumber(part)!);
  const absolute = (value: Rational) => (value.num < 0n ? negate(value) : value);
  const significantDigits = (value: Rational) => {
    const scaled = absolute(value).num * 10n ** BigInt(decimalPlaces(value)!);
    return (scaled / value.den).toString().length;
  };
  const orders = questions.filter((q) => formOf(q) === 'order');
  const betweens = questions.filter((q) => formOf(q) === 'between');

  it('is multiple choice with four unique options, one of them correct', () => {
    for (const question of questions) {
      const step = question.steps[0]!;
      expect(question.topic).toBe('numberOrder');
      expect(question.steps).toHaveLength(1);
      expect(step.kind).toBe('choice');
      expect(new Set(step.options).size).toBe(4);
      expect(step.options).toContain(step.check('').expected);
      expect(step.check(step.check('').expected).correct).toBe(true);
    }
  });

  it('uses both forms and both directions about equally', () => {
    expect(orders.length + betweens.length).toBe(SAMPLES);
    expect(orders.length).toBeGreaterThan(SAMPLES * 0.4);
    expect(betweens.length).toBeGreaterThan(SAMPLES * 0.4);
    const ascending = orders.filter((q) => q.steps[0]!.check('').expected.includes(' < '));
    expect(ascending.length).toBeGreaterThan(orders.length * 0.4);
    expect(ascending.length).toBeLessThan(orders.length * 0.6);
  });

  it('order: four distinct numbers within the spec rules', () => {
    for (const question of orders) {
      const numbers = parts(question.steps[0]!.check('').expected);
      expect(numbers).toHaveLength(4);
      for (const value of numbers) {
        expect(isBetween(value, decimal('−20'), decimal('20'))).toBe(true);
        expect(decimalPlaces(value)).toBeLessThanOrEqual(2);
        expect(significantDigits(value)).toBeLessThanOrEqual(3);
      }
      for (let i = 1; i < 4; i++) expect(compare(numbers[i - 1]!, numbers[i]!)).not.toBe(0);
      // No two numbers share an absolute value, so the sign trap has one order.
      expect(new Set(numbers.map((value) => formatRational(absolute(value)))).size).toBe(4);
      const negatives = numbers.filter((value) => value.num < 0n).length;
      expect(negatives).toBeGreaterThanOrEqual(2);
      expect(negatives).toBeLessThanOrEqual(3);
      expect(new Set(numbers.map(decimalPlaces)).size).toBeGreaterThanOrEqual(2);
    }
  });

  it('order: only the right chain is true; the other three are the sign trap and two swaps', () => {
    for (const question of orders) {
      const step = question.steps[0]!;
      const right = step.check('').expected;
      const ascending = right.includes(' < ');
      const separator = ascending ? ' < ' : ' > ';
      const holds = (chain: string) => {
        const numbers = parts(chain);
        const direction = ascending ? -1 : 1;
        return numbers.every((v, i) => i === 0 || compare(numbers[i - 1]!, v) === direction);
      };
      expect(step.options!.filter(holds)).toEqual([right]);
      const rightNumbers = parts(right);
      const join = (numbers: Rational[]) => numbers.map(formatRational).join(separator);
      const trap = join(
        [...rightNumbers].sort((a, b) => compare(absolute(a), absolute(b)) * (ascending ? 1 : -1)),
      );
      const swaps = [0, 1, 2].map((i) => {
        const numbers = [...rightNumbers];
        [numbers[i], numbers[i + 1]] = [numbers[i + 1]!, numbers[i]!];
        return join(numbers);
      });
      expect(step.options).toContain(trap);
      const rest = step.options!.filter((option) => option !== right && option !== trap);
      expect(rest).toHaveLength(2);
      for (const option of rest) expect(swaps).toContain(option);
    }
  });

  it('between: bounds a and a + 0,1 in [−9,9; −0,2], answer a + 0,05, options ascending', () => {
    for (const question of betweens) {
      const step = question.steps[0]!;
      const [low, high] = /tussen (\S+) en (\S+)\?/
        .exec(step.prompt)!
        .slice(1)
        .map((text) => decimal(text));
      expect(decimalPlaces(low!)).toBeLessThanOrEqual(1);
      expect(isBetween(low!, decimal('−9,9'), decimal('−0,2'))).toBe(true);
      expect(compare(high!, low!)).toBe(1);
      const answer = decimal(step.check('').expected);
      expect(compare(answer, low!)).toBe(1);
      expect(compare(answer, high!)).toBe(-1);
      const values = step.options!.map((option) => decimal(option));
      for (let i = 1; i < 4; i++) expect(compare(values[i - 1]!, values[i]!)).toBe(-1);
      // Three negative options and the sign trap (the positive mirror of the answer) last.
      expect(values.map((value) => value.num > 0n)).toEqual([false, false, false, true]);
      expect(compare(values[3]!, negate(answer))).toBe(0);
    }
  });

  it('is deterministic for a seed and gives order questions mostly distinct keys', () => {
    expect(generateNumberOrder(createRng(9)).key).toBe(generateNumberOrder(createRng(9)).key);
    expect(new Set(orders.map((q) => q.key)).size).toBeGreaterThan(orders.length * 0.95);
  });
});
