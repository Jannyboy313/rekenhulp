import { describe, expect, it } from 'vitest';
import { createRng } from '../random';
import {
  compare,
  decimalPlaces,
  divide,
  fromInteger,
  multiply,
  parseDutchNumber,
  subtract,
  type Rational,
} from '../rational';
import {
  buildDecimalProblem,
  FORMS,
  generateDecimalProblems,
  pieceCountQuestion,
  pieceRestQuestion,
  priceBackQuestion,
  priceQuestion,
  PRICE_BACK_PRODUCTS,
  PRICE_PRODUCTS,
  type Form,
} from './decimalProblems';
import { decimal, stepOf } from './testHelpers';

const PER_FORM = 1000;
const HUNDRED = fromInteger(100);
const SPACE = /[  ]/;

function questionsOf(form: Form) {
  const rng = createRng(780 + FORMS.indexOf(form));
  return Array.from({ length: PER_FORM }, () => buildDecimalProblem(rng, form));
}

const number = (text: string): Rational => parseDutchNumber(text.replace(SPACE, ''))!;

describe('spec examples', () => {
  it('price: kaas € 14 per kilo, 0,25 kg → 3,50', () => {
    const step = stepOf(priceQuestion(PRICE_PRODUCTS[0], decimal('14'), decimal('0,25')));
    expect(step.kind).toBe('number');
    expect(step.prompt).toBe('Kaas kost € 14 per kilo. Wat kost 0,25 kg?');
    expect(step.prefix).toBe('€');
    expect(step.check('3,5')).toMatchObject({
      correct: true,
      expected: '3,50',
      explanation: '0,25 kg = 1/4 kilo → 14 : 4 = 3,50',
    });
    expect(step.check('3,05').correct).toBe(false);
  });

  it('price: a weight that is not a unit fraction is explained with its numerator', () => {
    const step = stepOf(priceQuestion(PRICE_PRODUCTS[2], decimal('2,4'), decimal('1,5')));
    expect(step.prompt).toBe('Druiven kosten € 2,40 per kilo. Wat kost 1,5 kg?');
    expect(step.check('3,6')).toMatchObject({
      correct: true,
      expected: '3,60',
      explanation: '1,5 kg = 3/2 kilo → 2,40 : 2 = 1,20 → 3 × 1,20 = 3,60',
    });
  });

  it('price back: 1,5 kg appels € 3,60 → 2,40', () => {
    const step = stepOf(priceBackQuestion('appels', decimal('2,4'), decimal('1,5')));
    expect(step.prompt).toBe('1,5 kg appels kost € 3,60. Wat kost 1 kg?');
    expect(step.check('2,4')).toMatchObject({
      correct: true,
      expected: '2,40',
      explanation: '1,5 kg = € 3,60 → 0,5 kg = 1,20 → 1 kg = 2,40',
    });
  });

  it('length: 2,4 m in pieces of 0,3 m → 8 stukken', () => {
    const step = stepOf(pieceCountQuestion({ name: 'plank', verb: 'zaag' }, 8, decimal('0,3')));
    expect(step.prompt).toBe(
      'Een plank van 2,4 m zaag je in stukken van 0,3 m. Hoeveel stukken krijg je?',
    );
    expect(step.suffix).toBe('stukken');
    expect(step.check('8')).toMatchObject({ correct: true, explanation: '2,4 : 0,3 = 24 : 3 = 8' });
    expect(
      stepOf(pieceCountQuestion({ name: 'lint', verb: 'knip' }, 7, decimal('0,25'))).check('7')
        .explanation,
    ).toBe('1,75 : 0,25 = 175 : 25 = 7');
  });

  it('length: 5 m minus 6 pieces of 0,45 m → 2,3 m', () => {
    const step = stepOf(pieceRestQuestion(5, 6, decimal('0,45')));
    expect(step.prompt).toBe(
      'Van een lint van 5 m knip je 6 stukken van 0,45 m. Hoeveel m blijft er over?',
    );
    expect(step.suffix).toBe('m');
    expect(step.check('2,3')).toMatchObject({
      correct: true,
      expected: '2,3',
      explanation: '6 × 0,45 = 2,7 → 5 − 2,7 = 2,3',
    });
  });
});

describe('generateDecimalProblems', () => {
  it('produces all three forms, each accepting its expected answer', () => {
    const rng = createRng(3);
    const seen = new Set<string>();
    for (let i = 0; i < 1500; i++) {
      const question = generateDecimalProblems(rng);
      expect(question.topic).toBe('decimalProblems');
      seen.add(question.key.split(':')[1]!);
      const step = stepOf(question);
      expect(step.kind).toBe('number');
      expect(step.check(step.check('').expected).correct).toBe(true);
    }
    expect([...seen].sort()).toEqual([...FORMS].sort());
  });

  describe('price', () => {
    const questions = questionsOf('price');

    it('uses prices of a multiple of € 0,10 in [1, 30], the spec weights and exact costs', () => {
      const weights = new Set<string>();
      const products = new Set<string>();
      for (const question of questions) {
        const step = stepOf(question);
        const match = /^(\S+) kost(?:en)? (€.[\d,]+) per kilo\. Wat kost ([\d,]+) kg\?$/u.exec(
          step.prompt,
        )!;
        products.add(match[1]!);
        weights.add(match[3]!);
        const price = number(match[2]!.slice(1));
        expect(compare(price, fromInteger(1))).toBeGreaterThanOrEqual(0);
        expect(compare(price, fromInteger(30))).toBeLessThanOrEqual(0);
        expect(decimalPlaces(multiply(price, decimal('10')))).toBe(0);
        const cost = multiply(price, number(match[3]!));
        expect(decimalPlaces(cost)!).toBeLessThanOrEqual(2);
        const { expected } = step.check('');
        expect(number(expected)).toEqual(cost);
        expect(expected.includes(',') ? expected.split(',')[1]!.length : 0).toBe(
          decimalPlaces(cost) === 0 ? 0 : 2,
        );
      }
      expect([...products].sort()).toEqual(PRICE_PRODUCTS.map((p) => p.name).sort());
      expect([...weights].sort()).toEqual(
        ['0,1', '0,2', '0,25', '0,3', '0,4', '0,5', '0,75', '1,2', '1,5', '2,5'].sort(),
      );
    });
  });

  describe('priceBack', () => {
    const questions = questionsOf('priceBack');

    it('gives the total and the weight (not 1) and asks the price per kilo with at most 2 decimals', () => {
      const products = new Set<string>();
      for (const question of questions) {
        const step = stepOf(question);
        const match = /^([\d,]+) kg (\S+) kost (€.[\d,]+)\. Wat kost 1 kg\?$/u.exec(step.prompt)!;
        products.add(match[2]!);
        const weight = number(match[1]!);
        expect(weight).not.toEqual(fromInteger(1));
        const total = number(match[3]!.slice(1));
        const price = divide(total, weight);
        expect(decimalPlaces(price)!).toBeLessThanOrEqual(2);
        expect(decimalPlaces(multiply(price, decimal('10')))).toBe(0);
        expect(number(step.check('').expected)).toEqual(price);
        expect(step.check(step.check('').expected).correct).toBe(true);
      }
      expect([...products].sort()).toEqual([...PRICE_BACK_PRODUCTS].sort());
    });
  });

  describe('length', () => {
    const questions = questionsOf('length');
    const counts = questions.filter((q) => q.key.startsWith('decimalProblems:length:count:'));
    const rests = questions.filter((q) => q.key.startsWith('decimalProblems:length:rest:'));

    it('splits 50/50 between counting pieces and the rest', () => {
      expect(counts.length / PER_FORM).toBeGreaterThan(0.45);
      expect(counts.length / PER_FORM).toBeLessThan(0.55);
    });

    it('counts 3 to 20 pieces of a plank or lint of at most 6 m', () => {
      const materials = new Set<string>();
      const pieces = new Set<string>();
      for (const question of counts) {
        const step = stepOf(question);
        const match =
          /^Een (plank|lint) van ([\d,]+) m (zaag|knip) je in stukken van ([\d,]+) m\. Hoeveel stukken krijg je\?$/.exec(
            step.prompt,
          )!;
        materials.add(`${match[1]} ${match[3]}`);
        pieces.add(match[4]!);
        const total = number(match[2]!);
        const piece = number(match[4]!);
        expect(compare(total, fromInteger(6))).toBeLessThanOrEqual(0);
        const count = divide(total, piece);
        expect(count.den).toBe(1n);
        expect(count.num).toBeGreaterThanOrEqual(3n);
        expect(count.num).toBeLessThanOrEqual(20n);
        expect(step.check(String(count.num)).correct).toBe(true);
      }
      expect([...materials].sort()).toEqual(['lint knip', 'plank zaag']);
      expect([...pieces].sort()).toEqual(
        ['0,2', '0,25', '0,3', '0,4', '0,5', '0,6', '0,75'].sort(),
      );
    });

    it('leaves a positive rest of a lint of 2, 3, 5 or 10 m after 2 to 8 pieces of 0,15 to 1,5 m', () => {
      const lints = new Set<number>();
      const counts = new Set<number>();
      for (const question of rests) {
        const step = stepOf(question);
        const match =
          /^Van een lint van (\d+) m knip je (\d+) stukken van ([\d,]+) m\. Hoeveel m blijft er over\?$/.exec(
            step.prompt,
          )!;
        lints.add(Number(match[1]));
        counts.add(Number(match[2]));
        const piece = number(match[3]!);
        expect(compare(piece, decimal('0,15'))).toBeGreaterThanOrEqual(0);
        expect(compare(piece, decimal('1,5'))).toBeLessThanOrEqual(0);
        expect(multiply(piece, HUNDRED).num % 5n).toBe(0n);
        const rest = subtract(
          fromInteger(Number(match[1])),
          multiply(piece, fromInteger(Number(match[2]))),
        );
        expect(compare(rest, fromInteger(0))).toBeGreaterThan(0);
        expect(number(step.check('').expected)).toEqual(rest);
      }
      expect([...lints].sort((a, b) => a - b)).toEqual([2, 3, 5, 10]);
      expect([...counts].sort((a, b) => a - b)).toEqual([2, 3, 4, 5, 6, 7, 8]);
    });
  });
});
