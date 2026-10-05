import { describe, expect, it } from 'vitest';
import { formatMoney } from '../format';
import { divide, fromInteger, rational } from '../rational';
import {
  DISCOUNT_PERCENTAGES,
  formatPercentage,
  INCREASE_PERCENTAGES,
  NICE_WHOLES,
  partExplanation,
  PERCENTAGES,
  percentOf,
  wholeExplanation,
  type Percentage,
} from './percentages';

function percentage(label: string): Percentage {
  const found = PERCENTAGES.find((p) => formatPercentage(p.value) === label);
  if (!found) throw new Error(`Unknown percentage ${label}`);
  return found;
}

function labels(percentages: readonly Percentage[]): string[] {
  return percentages.map((p) => formatPercentage(p.value));
}

describe('PERCENTAGES', () => {
  it('lists the percentages from the spec', () => {
    expect(labels(PERCENTAGES)).toEqual([
      '1', '2', '5', '10', '12½', '15', '20', '25', '30', '40', '50', '60', '75', '80', '90',
      '120', '150',
    ]);
  });

  it('has a base that divides both 100 and the percentage', () => {
    for (const { value, base } of PERCENTAGES) {
      expect(divide(fromInteger(100), base).den).toBe(1n);
      expect(divide(value, base).den).toBe(1n);
    }
  });

  it('limits discounts to below 100% and increases to at most 50%', () => {
    expect(labels(DISCOUNT_PERCENTAGES)).toEqual([
      '1', '2', '5', '10', '12½', '15', '20', '25', '30', '40', '50', '60', '75', '80', '90',
    ]);
    expect(labels(INCREASE_PERCENTAGES)).toEqual([
      '1', '2', '5', '10', '12½', '15', '20', '25', '30', '40', '50',
    ]);
  });
});

describe('formatPercentage', () => {
  it('writes whole percentages as integers and halves with ½', () => {
    expect(formatPercentage(fromInteger(15))).toBe('15');
    expect(formatPercentage(rational(25n, 2n))).toBe('12½');
  });

  it('rejects other fractions', () => {
    expect(() => formatPercentage(rational(1n, 3n))).toThrow(RangeError);
  });
});

describe('NICE_WHOLES', () => {
  it('has the integers in [10, 1000] with at most 2 significant digits', () => {
    expect(NICE_WHOLES).toHaveLength(181);
    expect(NICE_WHOLES[0]).toBe(10);
    expect(NICE_WHOLES.at(-1)).toBe(1000);
    for (const whole of [85, 99, 100, 470, 990]) expect(NICE_WHOLES).toContain(whole);
    for (const whole of [9, 105, 487, 999, 1010]) expect(NICE_WHOLES).not.toContain(whole);
  });
});

describe('percentOf', () => {
  it('computes p% of a whole exactly', () => {
    expect(percentOf(rational(25n, 2n), fromInteger(80))).toEqual(rational(10n));
    expect(percentOf(fromInteger(15), fromInteger(30))).toEqual(rational(9n, 2n));
    expect(percentOf(fromInteger(150), fromInteger(80))).toEqual(rational(120n));
  });
});

describe('partExplanation', () => {
  it.each([
    ['15', 80, '10% = 8, 5% = 4 → 15% = 12'],
    ['5', 80, '10% = 8 → 5% = 4'],
    ['10', 80, '10% = 80 : 10 = 8'],
    ['30', 80, '10% = 80 : 10 = 8 → 30% = 3 × 8 = 24'],
    ['25', 80, '25% = 80 : 4 = 20'],
    ['75', 80, '25% = 80 : 4 = 20 → 75% = 3 × 20 = 60'],
    ['12½', 80, '12½% = 80 : 8 = 10'],
    ['1', 500, '1% = 500 : 100 = 5'],
    ['2', 500, '1% = 500 : 100 = 5 → 2% = 2 × 5 = 10'],
    ['120', 80, '10% = 80 : 10 = 8 → 120% = 12 × 8 = 96'],
    ['150', 80, '50% = 80 : 2 = 40 → 150% = 3 × 40 = 120'],
  ])('explains %s%% of %i', (label, whole, expected) => {
    expect(partExplanation(percentage(label), fromInteger(whole))).toBe(expected);
  });

  it('uses the given formatter, e.g. for money', () => {
    expect(partExplanation(percentage('15'), fromInteger(30), formatMoney)).toBe(
      '10% = 3, 5% = 1,50 → 15% = 4,50',
    );
  });
});

describe('wholeExplanation', () => {
  it.each([
    ['20', 70, '20% = 14 → 10% = 7 → 100% = 10 × 7 = 70'],
    ['25', 56, '25% = 14 → 100% = 4 × 14 = 56'],
    ['15', 30, '15% = 4,5 → 5% = 1,5 → 100% = 20 × 1,5 = 30'],
    ['12½', 48, '12½% = 6 → 100% = 8 × 6 = 48'],
    ['1', 500, '1% = 5 → 100% = 100 × 5 = 500'],
    ['150', 80, '150% = 120 → 50% = 40 → 100% = 2 × 40 = 80'],
  ])('explains back to 100%% from %s%% of %i', (label, whole, expected) => {
    expect(wholeExplanation(percentage(label), fromInteger(whole))).toBe(expected);
  });
});
