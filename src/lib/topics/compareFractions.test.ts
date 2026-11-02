import { describe, expect, it } from 'vitest';
import { createRng } from '../random';
import {
  compare,
  fromInteger,
  parseDutchNumber,
  parseFraction,
  rational,
  subtract,
} from '../rational';
import type { Rational } from '../rational';
import {
  DENOMINATORS,
  extremeQuestion,
  generateCompareFractions,
  MAX_SPREAD,
  MIN_GAP,
  mixedQuestion,
  orderQuestion,
  percentShown,
  ratioShown,
} from './compareFractions';
import { decimalShown, fractionShown } from './fractionNotation';
import { decimal, stepOf } from './testHelpers';

const SAMPLES = 2000;
const dec = (text: string) => decimalShown(decimal(text));

const valueOf = (text: string): Rational =>
  (text.includes('/') ? parseFraction(text)?.value : parseDutchNumber(text))!;

const abs = (value: Rational) => (value.num < 0n ? rational(-value.num, value.den) : value);

function sample() {
  const rng = createRng(74);
  return Array.from({ length: SAMPLES }, () => generateCompareFractions(rng));
}

describe('extremeQuestion', () => {
  const numbers = [fractionShown(3, 5), dec('0,58'), fractionShown(5, 8)];

  it('asks for the largest of 3/5, 0,58 and 5/8 and accepts 5/8 and 0,625', () => {
    const step = stepOf(extremeQuestion('grootst', numbers));
    expect(step.kind).toBe('fraction');
    expect(step.prompt).toBe('Welk getal is het grootst: 3/5, 0,58 of 5/8?');
    expect(step.check('5/8')).toMatchObject({
      correct: true,
      expected: '5/8',
      explanation: '3/5 = 0,6 en 5/8 = 0,625 → 0,58 < 0,6 < 0,625 → 5/8',
    });
    expect(step.check('0,625').correct).toBe(true);
    expect(step.check('10/16').correct).toBe(true);
    expect(step.check('3/5').correct).toBe(false);
    expect(step.check('0,58').correct).toBe(false);
  });

  it('shows the smallest as written in the prompt', () => {
    const step = stepOf(extremeQuestion('kleinst', numbers));
    expect(step.prompt).toBe('Welk getal is het kleinst: 3/5, 0,58 of 5/8?');
    expect(step.check('0,58')).toMatchObject({ correct: true, expected: '0,58' });
    expect(step.check('5/8').correct).toBe(false);
  });

  it('writes a third with a cut-off decimal and an ellipsis', () => {
    const step = stepOf(extremeQuestion('grootst', [fractionShown(1, 3), dec('0,3'), dec('0,34')]));
    expect(step.check('0,34').explanation).toBe('1/3 = 0,33… → 0,3 < 0,33… < 0,34 → 0,34');
  });

  it('adds decimals until the order stays strict', () => {
    const step = stepOf(
      extremeQuestion('kleinst', [fractionShown(10, 11), dec('0,909'), dec('0,91')]),
    );
    expect(step.check('0,909').explanation).toBe(
      '10/11 = 0,90909… → 0,909 < 0,90909… < 0,91 → 0,909',
    );
  });
});

describe('orderQuestion', () => {
  const numbers = [dec('0,65'), fractionShown(5, 8), dec('0,58'), fractionShown(3, 5)];

  it('offers the right chain and the three neighbour swaps', () => {
    const step = stepOf(orderQuestion('<', numbers, createRng(1)));
    expect(step.kind).toBe('choice');
    expect(step.prompt).toBe('Welke rij klopt?');
    expect([...step.options!].sort()).toEqual(
      [
        '0,58 < 3/5 < 5/8 < 0,65',
        '3/5 < 0,58 < 5/8 < 0,65',
        '0,58 < 5/8 < 3/5 < 0,65',
        '0,58 < 3/5 < 0,65 < 5/8',
      ].sort(),
    );
    expect(step.check('0,58 < 3/5 < 5/8 < 0,65')).toMatchObject({
      correct: true,
      explanation: '3/5 = 0,6 en 5/8 = 0,625 → 0,58 < 0,6 < 0,625 < 0,65 → 0,58 < 3/5 < 5/8 < 0,65',
    });
    expect(step.check('3/5 < 0,58 < 5/8 < 0,65').correct).toBe(false);
  });

  it('writes the chain from large to small with >', () => {
    const step = stepOf(orderQuestion('>', numbers, createRng(2)));
    expect(step.options).toContain('0,65 > 5/8 > 3/5 > 0,58');
    expect(step.check('0,65 > 5/8 > 3/5 > 0,58').correct).toBe(true);
    expect(step.check('0,65 > 5/8 > 3/5 > 0,58').explanation).toBe(
      '3/5 = 0,6 en 5/8 = 0,625 → 0,65 > 0,625 > 0,6 > 0,58 → 0,65 > 5/8 > 3/5 > 0,58',
    );
  });
});

describe('mixedQuestion', () => {
  const numbers = [fractionShown(3, 5), dec('0,58'), percentShown(62), ratioShown(5, 8)];

  it('offers the four numbers and asks for the largest', () => {
    const step = stepOf(mixedQuestion('grootst', numbers, createRng(1)));
    expect(step.kind).toBe('choice');
    expect(step.prompt).toBe('Welke is het grootst?');
    expect([...step.options!].sort()).toEqual(['0,58', '3/5', '5 op de 8', '62%'].sort());
    expect(step.check('5 op de 8')).toMatchObject({
      correct: true,
      expected: '5 op de 8',
      explanation:
        '3/5 = 0,6 en 62% = 0,62 en 5 op de 8 = 0,625 → 0,58 < 0,6 < 0,62 < 0,625 → 5 op de 8',
    });
    expect(step.check('62%').correct).toBe(false);
  });

  it('asks for the smallest', () => {
    const step = stepOf(mixedQuestion('kleinst', numbers, createRng(2)));
    expect(step.prompt).toBe('Welke is het kleinst?');
    expect(step.check('0,58').correct).toBe(true);
  });
});

describe('generateCompareFractions', () => {
  const questions = sample();
  const extremes = questions.filter((q) => q.key.startsWith('compareFractions:extreme:'));
  const orders = questions.filter((q) => q.key.startsWith('compareFractions:order:'));
  const mixed = questions.filter((q) => q.key.startsWith('compareFractions:mixed:'));

  /** The numbers of a prompt or an option, as texts. */
  const parts = (text: string, separator: string) => text.split(separator);

  function checkNumbers(texts: readonly string[]) {
    for (const text of texts) {
      const value = valueOf(text);
      expect(compare(value, fromInteger(0)), text).toBeGreaterThan(0);
      expect(compare(value, fromInteger(1)), text).toBeLessThan(0);
      if (text.includes('/')) {
        const terms = parseFraction(text)!;
        expect(DENOMINATORS as readonly number[]).toContain(Number(terms.den));
        expect(rational(terms.num, terms.den).den).toBe(terms.den);
      } else {
        const decimals = text.split(',')[1]!.length;
        expect(decimals).toBeGreaterThanOrEqual(1);
        expect(decimals).toBeLessThanOrEqual(3);
        expect(text.endsWith('0')).toBe(false);
      }
    }
  }

  it('splits equally between the extreme, the order and the mixed form', () => {
    expect(extremes.length + orders.length + mixed.length).toBe(SAMPLES);
    for (const form of [extremes, orders, mixed]) {
      expect(form.length / SAMPLES).toBeGreaterThan(0.29);
      expect(form.length / SAMPLES).toBeLessThan(0.38);
    }
  });

  it('draws one number per notation for the mixed form, close but apart', () => {
    const asked = new Set<string>();
    for (const question of mixed) {
      const step = stepOf(question);
      const extreme = /^Welke is het (grootst|kleinst)\?$/.exec(step.prompt)![1]!;
      asked.add(extreme);
      const options = step.options!;
      const percents = options.filter((text) => text.endsWith('%'));
      const ratios = options.filter((text) => text.includes(' op de '));
      const plain = options.filter((text) => !percents.includes(text) && !ratios.includes(text));
      expect(percents).toHaveLength(1);
      expect(ratios).toHaveLength(1);
      checkNumbers(plain);
      expect(plain.filter((text) => text.includes('/'))).toHaveLength(1);
      const percent = Number(percents[0]!.slice(0, -1));
      expect(Number.isInteger(percent) && percent >= 1 && percent <= 99).toBe(true);
      const [p, q] = ratios[0]!.split(' op de ').map(Number) as [number, number];
      checkNumbers([`${p}/${q}`]);
      const valueOfOption = (text: string) =>
        text.endsWith('%')
          ? rational(BigInt(percent), 100n)
          : text.includes(' op de ')
            ? rational(BigInt(p), BigInt(q))
            : valueOf(text);
      const values = options.map(valueOfOption).sort((a, b) => compare(a, b));
      expect(compare(subtract(values[3]!, values[0]!), MAX_SPREAD)).toBeLessThanOrEqual(0);
      for (let index = 1; index < 4; index++) {
        expect(
          compare(subtract(values[index]!, values[index - 1]!), MIN_GAP),
        ).toBeGreaterThanOrEqual(0);
      }
      const answer = extreme === 'grootst' ? values[3]! : values[0]!;
      expect(compare(valueOfOption(step.check('').expected), answer)).toBe(0);
    }
    expect([...asked].sort()).toEqual(['grootst', 'kleinst']);
    const positions = new Set(
      mixed.map((q) => stepOf(q).options!.indexOf(stepOf(q).check('').expected)),
    );
    expect([...positions].sort()).toEqual([0, 1, 2, 3]);
  });

  it('sets the topic and accepts the expected answer', () => {
    for (const question of questions) {
      expect(question.topic).toBe('compareFractions');
      const step = stepOf(question);
      expect(step.check(step.check('').expected).correct).toBe(true);
    }
  });

  it('draws three numbers for the extreme form: a fraction and a decimal, close but apart', () => {
    const asked = new Set<string>();
    for (const question of extremes) {
      const step = stepOf(question);
      const match = /^Welk getal is het (grootst|kleinst): (.+), (.+) of (.+)\?$/.exec(
        step.prompt,
      )!;
      asked.add(match[1]!);
      const texts = [match[2]!, match[3]!, match[4]!];
      checkNumbers(texts);
      const fractions = texts.filter((text) => text.includes('/'));
      expect(fractions.length).toBeGreaterThanOrEqual(1);
      expect(fractions.length).toBeLessThanOrEqual(2);
      const values = texts.map(valueOf).sort((a, b) => compare(a, b));
      expect(compare(subtract(values[2]!, values[0]!), MAX_SPREAD)).toBeLessThanOrEqual(0);
      expect(compare(subtract(values[1]!, values[0]!), MIN_GAP)).toBeGreaterThanOrEqual(0);
      expect(compare(subtract(values[2]!, values[1]!), MIN_GAP)).toBeGreaterThanOrEqual(0);
      const answer = match[1] === 'grootst' ? values[2]! : values[0]!;
      expect(compare(valueOf(step.check('').expected), answer)).toBe(0);
      expect(texts).toContain(step.check('').expected);
    }
    expect([...asked].sort()).toEqual(['grootst', 'kleinst']);
  });

  it('draws two fractions and two decimals for the order form, in both directions', () => {
    const signs = new Set<string>();
    for (const question of orders) {
      const step = stepOf(question);
      const options = step.options!;
      expect(new Set(options).size).toBe(4);
      const sign = options[0]!.includes(' < ') ? ' < ' : ' > ';
      signs.add(sign);
      const answer = step.check('').expected;
      const lists = options.map((option) => parts(option, sign));
      const texts = parts(answer, sign);
      checkNumbers(texts);
      expect(texts.filter((text) => text.includes('/'))).toHaveLength(2);
      expect(new Set(texts.map((text) => compare(valueOf(text), fromInteger(0)))).size).toBe(1);
      expect(
        new Set(texts.map((text) => (valueOf(text).num * 1000000n) / valueOf(text).den)).size,
      ).toBe(4);
      let correct = 0;
      for (const list of lists) {
        const values = list.map(valueOf);
        const sorted = values.every(
          (value, index) =>
            index === 0 || compare(values[index - 1]!, value) === (sign === ' < ' ? -1 : 1),
        );
        if (sorted) correct++;
        expect([...list].sort()).toEqual([...texts].sort());
        const swaps = list.filter((text, index) => text !== texts[index]);
        if (list.join(sign) !== answer) {
          expect(swaps).toHaveLength(2);
          const at = list.findIndex((text, index) => text !== texts[index]);
          expect(list[at]).toBe(texts[at + 1]);
          expect(list[at + 1]).toBe(texts[at]);
        }
      }
      expect(correct).toBe(1);
    }
    expect([...signs].sort()).toEqual([' < ', ' > ']);
  });

  it('puts the right chain at every option position', () => {
    const positions = new Set(
      orders.map((q) => stepOf(q).options!.indexOf(stepOf(q).check('').expected)),
    );
    expect([...positions].sort()).toEqual([0, 1, 2, 3]);
  });

  it('uses every denominator and keeps the key per numbers', () => {
    const used = new Set<number>();
    for (const question of questions) {
      for (const match of stepOf(question).prompt.matchAll(/\d+\/(\d+)/g))
        used.add(Number(match[1]));
      for (const option of stepOf(question).options ?? []) {
        for (const match of option.matchAll(/\d+\/(\d+)/g)) used.add(Number(match[1]));
      }
      expect(question.key).not.toContain('?');
    }
    expect([...used].sort((a, b) => a - b)).toEqual([...DENOMINATORS]);
  });
});
