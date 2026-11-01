import { describe, expect, it } from 'vitest';
import { GROUP_SEPARATOR as S } from '../format';
import { createRng } from '../random';
import {
  compare,
  decimalPlaces,
  divide,
  hasAtMostDecimals,
  isBetween,
  isInteger,
  multiply,
  parseDutchNumber,
  subtract,
  type Rational,
} from '../rational';
import type { Question } from '../types';
import { estimateCalcQuestion, generateEstimateCalc } from './estimateCalc';
import { decimal, stepOf } from './testHelpers';

const SAMPLES = 3000;

const ask = (operator: '×' | ':', moved: string[], rounded: string[], seed = 5) =>
  stepOf(
    estimateCalcQuestion(operator, moved.map(decimal) as [Rational, Rational], rounded.map(decimal) as [Rational, Rational], createRng(seed)),
  );

describe('estimateCalcQuestion', () => {
  it('estimates 6189 : 31 as 200', () => {
    const step = ask(':', ['6189', '31'], ['6000', '30']);
    expect(step.kind).toBe('choice');
    expect(step.prompt).toBe('Ongeveer hoeveel is 6189 : 31?');
    expect(step.check('200')).toEqual({
      correct: true,
      expected: '200',
      explanation: '6189 ≈ 6000 en 31 ≈ 30 → 6000 : 30 = 200',
    });
    expect(step.check('20').correct).toBe(false);
  });

  it('offers either c × 0,01 … 10 or c × 0,1 … 100, ascending', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 60; seed++) {
      seen.add(ask(':', ['6189', '31'], ['6000', '30'], seed).options!.join(' | '));
    }
    expect(seen).toEqual(
      new Set(['2 | 20 | 200 | 2000', `20 | 200 | 2000 | 20${S}000`]),
    );
  });

  it('multiplies with a decimal operand', () => {
    const step = ask('×', ['412', '0,52'], ['400', '0,5']);
    expect(step.prompt).toBe('Ongeveer hoeveel is 412 × 0,52?');
    expect(step.check('').expected).toBe('200');
    expect(step.check('').explanation).toBe('412 ≈ 400 en 0,52 ≈ 0,5 → 400 × 0,5 = 200');
  });

  it('drops a set with an option of more than 2 decimals and fails when none is left', () => {
    // c = 0,6: 0,006 has 3 decimals, so only c × {0,1; 1; 10; 100} is left.
    const step = ask('×', ['0,31', '1,9'], ['0,3', '2']);
    expect(step.options).toEqual(['0,06', '0,6', '6', '60']);
    expect(() => ask('×', ['0,31', '0,41'], ['0,3', '0,4'])).toThrow(RangeError);
  });
});

describe('generateEstimateCalc', () => {
  const rng = createRng(71);
  const questions: Question[] = Array.from({ length: SAMPLES }, () => generateEstimateCalc(rng));

  const number = (text: string) => parseDutchNumber(text.replaceAll(S, ''))!;
  const parsed = questions.map((question) => {
    const step = stepOf(question);
    const [, left, operator, right] = /^Ongeveer hoeveel is (\S+) ([×:]) (\S+)\?$/.exec(
      step.prompt,
    )!;
    const [, moved1, round1, moved2, round2] = /^(\S+) ≈ (\S+) en (\S+) ≈ (\S+) → /.exec(
      step.check('').explanation!,
    )!;
    return {
      question,
      step,
      operator: operator as '×' | ':',
      operands: [number(left!), number(right!)] as const,
      moved: [number(moved1!), number(moved2!)] as const,
      rounded: [number(round1!), number(round2!)] as const,
      answer: number(step.check('').expected),
    };
  });

  const significant = (value: Rational) => {
    const places = decimalPlaces(value)!;
    const scaled = (value.num * 10n ** BigInt(places)) / value.den;
    return scaled.toString().replace(/0+$/, '').length;
  };

  it('is multiple choice with four unique ascending options, one of them correct', () => {
    for (const { question, step, answer } of parsed) {
      expect(question.topic).toBe('estimateCalc');
      expect(question.steps).toHaveLength(1);
      expect(step.kind).toBe('choice');
      expect(new Set(step.options).size).toBe(4);
      const values = step.options!.map(number);
      expect(step.options).toContain(step.check('').expected);
      for (let i = 0; i < 4; i++) expect(hasAtMostDecimals(values[i]!, 2)).toBe(true);
      for (let i = 1; i < 4; i++) expect(compare(values[i - 1]!, values[i]!)).toBe(-1);
      // Powers of ten of the estimate: each option is 10 times the one before.
      for (let i = 1; i < 4; i++) {
        expect(compare(multiply(values[i - 1]!, decimal('10')), values[i]!)).toBe(0);
      }
      expect([1, 2]).toContain(values.findIndex((value) => compare(value, answer) === 0));
    }
  });

  it('uses both option sets and both operations', () => {
    const positions = parsed.map(({ step, answer }) =>
      step.options!.findIndex((option) => compare(number(option), answer) === 0),
    );
    expect(new Set(positions)).toEqual(new Set([1, 2]));
    const times = parsed.filter(({ operator }) => operator === '×').length;
    expect(times / SAMPLES).toBeGreaterThan(0.45);
    expect(times / SAMPLES).toBeLessThan(0.55);
  });

  it('estimates with the rounded operands and stays within a factor 1,4 of the exact value', () => {
    for (const { operator, operands, moved, rounded, answer } of parsed) {
      expect(moved[0]).toEqual(operands[0]);
      expect(moved[1]).toEqual(operands[1]);
      const calc = (a: Rational, b: Rational) => (operator === '×' ? multiply(a, b) : divide(a, b));
      const estimate = calc(rounded[0], rounded[1]);
      expect(compare(estimate, answer)).toBe(0);
      expect(compare(estimate, decimal('10000'))).toBeLessThanOrEqual(0);
      const exact = calc(operands[0], operands[1]);
      const ratio = compare(exact, estimate) >= 0 ? divide(exact, estimate) : divide(estimate, exact);
      expect(compare(ratio, decimal('1,4'))).toBeLessThanOrEqual(0);
    }
  });

  it('moves each operand 3% to 10% from a rounded operand of 1 significant digit', () => {
    for (const { operator, moved, rounded } of parsed) {
      moved.forEach((value, index) => {
        const base = rounded[index]!;
        const change = divide(subtract(value, base), base);
        const size = change.num < 0n ? -change.num : change.num;
        expect(size * 100n).toBeGreaterThanOrEqual(3n * change.den);
        expect(size * 10n).toBeLessThanOrEqual(change.den);
      });
      expect(significant(rounded[1])).toBe(1);
      expect(significant(rounded[0])).toBeLessThanOrEqual(operator === ':' ? 2 : 1);
      if (operator === ':') expect(isInteger(divide(rounded[0], rounded[1]))).toBe(true);
    }
  });

  it('never gives a round operand: wholes end in a non-zero digit, decimals have 2 or 3 digits', () => {
    for (const { operands } of parsed) {
      for (const value of operands) {
        if (isInteger(value)) {
          expect(value.num % 10n).not.toBe(0n);
          expect(value.num).toBeGreaterThanOrEqual(10n);
          expect(value.num).toBeLessThan(10000n);
        } else {
          expect(isBetween(value, decimal('0,1'), decimal('99'))).toBe(true);
          expect(significant(value)).toBeGreaterThanOrEqual(2);
          expect(significant(value)).toBeLessThanOrEqual(3);
        }
      }
    }
  });

  it('gives about 30% of the exercises exactly one decimal operand, the others two wholes', () => {
    const counts = parsed.map(({ operands }) => operands.filter((v) => !isInteger(v)).length);
    expect(counts.every((count) => count <= 1)).toBe(true);
    const share = counts.filter((count) => count === 1).length / SAMPLES;
    expect(share).toBeGreaterThan(0.25);
    expect(share).toBeLessThan(0.35);
    const decimalLeft = parsed.filter(({ operands }) => !isInteger(operands[0]!)).length;
    const decimalRight = parsed.filter(({ operands }) => !isInteger(operands[1]!)).length;
    expect(decimalLeft).toBeGreaterThan(100);
    expect(decimalRight).toBeGreaterThan(100);
  });

  it('is deterministic for a seed and gives distinct keys most of the time', () => {
    expect(generateEstimateCalc(createRng(9)).key).toBe(generateEstimateCalc(createRng(9)).key);
    expect(new Set(questions.map((q) => q.key)).size).toBeGreaterThan(SAMPLES * 0.9);
  });
});
