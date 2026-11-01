import { describe, expect, it } from 'vitest';
import { formatFraction } from '../format';
import { createRng } from '../random';
import {
  add,
  compare,
  decimalPlaces,
  divide,
  equals,
  fromInteger,
  isInteger,
  multiply,
  parseDutchNumber,
  rational,
  subtract,
  type Rational,
} from '../rational';
import {
  buildMixedNotation,
  divideExpression,
  generateMixedNotation,
  mixedQuestion,
  multiplyExpression,
  percentExpression,
  sumExpression,
  TEMPLATES,
  type Template,
} from './mixedNotation';
import { decimal, stepOf } from './testHelpers';

const PER_TEMPLATE = 1000;
const frac = (p: number, q: number) => rational(BigInt(p), BigInt(q));

function questionsOf(template: Template) {
  const rng = createRng(760 + TEMPLATES.indexOf(template));
  return Array.from({ length: PER_TEMPLATE }, () => buildMixedNotation(rng, template));
}

describe('spec examples', () => {
  it('4 3/5 : 0,2 = 23', () => {
    const expression = divideExpression(4, frac(3, 5), decimal('0,2'));
    const step = stepOf(mixedQuestion('divide', expression));
    expect(step.kind).toBe('fraction');
    expect(step.prompt).toBe('4 3/5 : 0,2 = ?');
    expect(step.check('23')).toMatchObject({
      correct: true,
      expected: '23',
      explanation: '0,2 = 1/5 → 4 3/5 : 1/5 = 23/5 × 5 = 23',
    });
    expect(step.check('46').correct).toBe(false);
  });

  it('0,75 × 2/3 = 0,5, also as 1/2', () => {
    const step = stepOf(mixedQuestion('multiply', multiplyExpression(decimal('0,75'), frac(2, 3), true)));
    expect(step.prompt).toBe('0,75 × 2/3 = ?');
    expect(step.check('0,5')).toMatchObject({
      correct: true,
      expected: '0,5',
      explanation: '0,75 = 3/4 → 3/4 × 2/3 = 6/12 = 1/2 = 0,5',
    });
    expect(step.check('1/2').correct).toBe(true);
    expect(step.check('2/4').correct).toBe(true);
  });

  it('keeps the order of the factors in the prompt and the explanation', () => {
    const step = stepOf(mixedQuestion('multiply', multiplyExpression(decimal('0,75'), frac(2, 3), false)));
    expect(step.prompt).toBe('2/3 × 0,75 = ?');
    expect(step.check('0,5').explanation).toBe('0,75 = 3/4 → 2/3 × 3/4 = 6/12 = 1/2 = 0,5');
  });

  it('writes an improper product as a mixed number', () => {
    const step = stepOf(mixedQuestion('multiply', multiplyExpression(decimal('1,5'), frac(5, 7), true)));
    expect(step.check('').expected).toBe('1 1/14');
    expect(step.check('1 1/14').correct).toBe(true);
    expect(step.check('15/14').correct).toBe(true);
    expect(step.check('1 1/14').explanation).toBe('1,5 = 3/2 → 3/2 × 5/7 = 15/14 = 1 1/14');
  });

  it('25% van 3/4 = 3/16', () => {
    const step = stepOf(mixedQuestion('percent', percentExpression(25, frac(3, 4), true)));
    expect(step.prompt).toBe('25% van 3/4 = ?');
    expect(step.check('3/16')).toMatchObject({
      correct: true,
      expected: '3/16',
      explanation: '25% = 1/4 → 1/4 × 3/4 = 3/16',
    });
    expect(step.check('0,1875').correct).toBe(true);
  });

  it('takes a percentage of a decimal by dividing', () => {
    const step = stepOf(mixedQuestion('percent', percentExpression(75, decimal('4,8'), false)));
    expect(step.prompt).toBe('75% van 4,8 = ?');
    expect(step.check('3,6')).toMatchObject({
      correct: true,
      expected: '3,6',
      explanation: '75% = 3/4 → 4,8 : 4 = 1,2 → 3 × 1,2 = 3,6',
    });
    const quarter = stepOf(mixedQuestion('percent', percentExpression(25, decimal('4,8'), false)));
    expect(quarter.check('').explanation).toBe('25% = 1/4 → 4,8 : 4 = 1,2');
  });

  it('1/4 + 0,15 = 0,4, also as 2/5', () => {
    const step = stepOf(mixedQuestion('sum', sumExpression(frac(1, 4), decimal('0,15'), true)));
    expect(step.prompt).toBe('1/4 + 0,15 = ?');
    expect(step.check('0,4')).toMatchObject({
      correct: true,
      expected: '0,4',
      explanation: '1/4 = 0,25 → 0,25 + 0,15 = 0,4',
    });
    expect(step.check('2/5').correct).toBe(true);
    expect(step.check('0,04').correct).toBe(false);
  });

  it('writes a minus sum with the typographic minus', () => {
    const step = stepOf(mixedQuestion('sum', sumExpression(frac(3, 5), decimal('0,25'), false)));
    expect(step.prompt).toBe('3/5 − 0,25 = ?');
    expect(step.check('0,35').correct).toBe(true);
  });
});

describe('generateMixedNotation', () => {
  it('produces all four templates, each accepting its expected answer and any equal fraction', () => {
    const rng = createRng(1);
    const seen = new Set<string>();
    for (let i = 0; i < 1500; i++) {
      const question = generateMixedNotation(rng);
      expect(question.topic).toBe('mixedNotation');
      seen.add(question.key.split(':')[1]!);
      const step = stepOf(question);
      expect(step.kind).toBe('fraction');
      const { expected } = step.check('');
      expect(step.check(expected).correct).toBe(true);
    }
    expect([...seen].sort()).toEqual([...TEMPLATES].sort());
  });

  it('gives a decimal when the answer has at most 3 decimals, else a whole or mixed number', () => {
    for (const template of TEMPLATES) {
      for (const question of questionsOf(template)) {
        const step = stepOf(question);
        const { expected } = step.check('');
        const value = step.check(expected).correct;
        expect(value).toBe(true);
        const mixed = /^(\d+ )?\d+\/\d+$/.test(expected);
        if (mixed) {
          const terms = expected.split(/[ /]/).map(Number);
          const [num, den] = terms.slice(-2) as [number, number];
          const decimals = decimalPlaces(rational(BigInt(num), BigInt(den)));
          expect(decimals === null || decimals > 3, expected).toBe(true);
        } else {
          expect(decimalPlaces(parseDutchNumber(expected)!)!, expected).toBeLessThanOrEqual(3);
        }
      }
    }
  });

  describe('divide', () => {
    const questions = questionsOf('divide');

    it('divides a mixed number by 0,1, 0,2, 0,25 or 0,5 with a whole answer', () => {
      const divisors = new Set<string>();
      const wholes = new Set<number>();
      const denominators = new Set<number>();
      for (const question of questions) {
        const step = stepOf(question);
        const match = /^(\d) (\d+)\/(\d+) : ([\d,]+) = \?$/.exec(step.prompt)!;
        const [whole, p, q] = [match[1], match[2], match[3]].map(Number) as [number, number, number];
        divisors.add(match[4]!);
        wholes.add(whole);
        denominators.add(q);
        expect(p).toBeLessThan(q);
        expect(rational(BigInt(p), BigInt(q)).den).toBe(BigInt(q));
        const answer = divide(add(fromInteger(whole), frac(p, q)), decimal(match[4]!));
        expect(isInteger(answer)).toBe(true);
        expect(step.check(String(answer.num)).correct).toBe(true);
      }
      expect([...divisors].sort()).toEqual(['0,1', '0,2', '0,25', '0,5']);
      expect([...wholes].sort()).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
      expect([...denominators].sort((a, b) => a - b)).toEqual([2, 4, 5, 10]);
    });
  });

  describe('multiply', () => {
    const questions = questionsOf('multiply');

    it('uses the decimals and denominators of the spec, in both orders, with a denominator of at most 20', () => {
      const factors = new Set<string>();
      const orders = new Set<string>();
      const denominators = new Set<number>();
      for (const question of questions) {
        const step = stepOf(question);
        const decimalFirst = /^[\d,]+ × \d+\/\d+ = \?$/.test(step.prompt);
        orders.add(decimalFirst ? 'decimal first' : 'fraction first');
        const match = decimalFirst
          ? /^([\d,]+) × (\d+)\/(\d+) = \?$/.exec(step.prompt)!
          : /^(\d+)\/(\d+) × ([\d,]+) = \?$/.exec(step.prompt)!;
        const [factor, p, q] = decimalFirst
          ? [match[1]!, match[2]!, match[3]!]
          : [match[3]!, match[1]!, match[2]!];
        factors.add(factor);
        denominators.add(Number(q));
        const fraction = frac(Number(p), Number(q));
        expect(Number(p)).toBeLessThan(Number(q));
        expect(fraction.den).toBe(BigInt(q));
        const answer = multiply(decimal(factor), fraction);
        expect(answer.den).toBeLessThanOrEqual(20n);
        expect(step.check(formatFraction(answer)).correct).toBe(true);
      }
      expect([...factors].sort()).toEqual(
        ['0,2', '0,25', '0,4', '0,5', '0,6', '0,75', '0,8', '1,5', '2,5'].sort(),
      );
      expect([...orders].sort()).toEqual(['decimal first', 'fraction first']);
      expect(Math.min(...denominators)).toBe(2);
      expect(Math.max(...denominators)).toBe(12);
    });
  });

  describe('percent', () => {
    const questions = questionsOf('percent');

    it('takes 10, 20, 25, 50 or 75 percent of a fraction (q to 10) or of a decimal in [0,2; 9,9]', () => {
      const percentages = new Set<number>();
      const kinds = new Set<string>();
      for (const question of questions) {
        const step = stepOf(question);
        const match = /^(\d+)% van (.+) = \?$/.exec(step.prompt)!;
        const percent = Number(match[1]);
        percentages.add(percent);
        const whole = match[2]!;
        let value: Rational;
        if (whole.includes('/')) {
          kinds.add('fraction');
          const [p, q] = whole.split('/').map(Number) as [number, number];
          expect(p).toBeLessThan(q);
          expect(q).toBeLessThanOrEqual(10);
          expect(rational(BigInt(p), BigInt(q)).den).toBe(BigInt(q));
          value = frac(p, q);
        } else {
          kinds.add('decimal');
          value = decimal(whole);
          expect(decimalPlaces(value)).toBe(1);
          expect(compare(value, decimal('0,2'))).toBeGreaterThanOrEqual(0);
          expect(compare(value, decimal('9,9'))).toBeLessThanOrEqual(0);
        }
        const answer = multiply(frac(percent, 100), value);
        expect(step.check(formatFraction(answer)).correct).toBe(true);
      }
      expect([...percentages].sort((a, b) => a - b)).toEqual([10, 20, 25, 50, 75]);
      expect([...kinds].sort()).toEqual(['decimal', 'fraction']);
    });
  });

  describe('sum', () => {
    const questions = questionsOf('sum');

    it('adds or subtracts a decimal below 1 with 1 or 2 decimals to a fraction, positive answer', () => {
      const denominators = new Set<number>();
      const signs = new Set<string>();
      const places = new Set<number>();
      for (const question of questions) {
        const step = stepOf(question);
        const match = /^(\d+)\/(\d+) ([+−]) ([\d,]+) = \?$/.exec(step.prompt)!;
        const [p, q] = [Number(match[1]), Number(match[2])];
        denominators.add(q);
        signs.add(match[3]!);
        const term = decimal(match[4]!);
        places.add(decimalPlaces(term)!);
        expect(compare(term, fromInteger(1))).toBeLessThan(0);
        expect(p).toBeLessThan(q);
        expect(frac(p, q).den).toBe(BigInt(q));
        const answer = match[3] === '+' ? add(frac(p, q), term) : subtract(frac(p, q), term);
        expect(compare(answer, fromInteger(0))).toBeGreaterThan(0);
        expect(equals(answer, parseDutchNumber(step.check('').expected)!)).toBe(true);
      }
      expect([...denominators].sort((a, b) => a - b)).toEqual([2, 4, 5, 8, 10, 20, 25]);
      expect([...signs].sort()).toEqual(['+', '−']);
      expect([...places].sort()).toEqual([1, 2]);
    });
  });
});
