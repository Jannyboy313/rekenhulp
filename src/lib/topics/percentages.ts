import { formatInteger, formatRational } from '../format';
import { compare, divide, equals, fromInteger, multiply, rational, type Rational } from '../rational';

export interface Percentage {
  value: Rational;
  /** Known percentage the explanation goes through: base% = whole : (100 / base). */
  base: Rational;
}

function percentage(value: number, base: number): Percentage {
  return { value: fromInteger(value), base: fromInteger(base) };
}

const TWELVE_AND_A_HALF = rational(25n, 2n);

/** Spec §5.12. 100 / base and value / base are always whole numbers. */
export const PERCENTAGES: readonly Percentage[] = [
  percentage(1, 1),
  percentage(2, 1),
  percentage(5, 5),
  percentage(10, 10),
  { value: TWELVE_AND_A_HALF, base: TWELVE_AND_A_HALF },
  percentage(15, 5),
  percentage(20, 10),
  percentage(25, 25),
  percentage(30, 10),
  percentage(40, 10),
  percentage(50, 50),
  percentage(60, 10),
  percentage(75, 25),
  percentage(80, 10),
  percentage(90, 10),
  percentage(120, 10),
  percentage(150, 50),
];

const HUNDRED = fromInteger(100);
const FIFTY = fromInteger(50);
const FIFTEEN = fromInteger(15);
const TEN = fromInteger(10);
const FIVE = fromInteger(5);

/** "120% korting" makes no sense; increases stay at most 50% (spec §5.12). */
export const DISCOUNT_PERCENTAGES: readonly Percentage[] = PERCENTAGES.filter(
  ({ value }) => compare(value, HUNDRED) < 0,
);
export const INCREASE_PERCENTAGES: readonly Percentage[] = PERCENTAGES.filter(
  ({ value }) => compare(value, FIFTY) <= 0,
);

export const MIN_WHOLE = 10;
export const MAX_WHOLE = 1000;

function hasAtMostTwoSignificantDigits(value: number): boolean {
  let digits = value;
  while (digits % 10 === 0) digits /= 10;
  return digits < 100;
}

/** Integers in [10, 1000] with at most 2 significant digits: 85 and 470, not 487. */
export const NICE_WHOLES: readonly number[] = Array.from(
  { length: MAX_WHOLE - MIN_WHOLE + 1 },
  (_, index) => MIN_WHOLE + index,
).filter(hasAtMostTwoSignificantDigits);

/** '15' or '12½'. Percentages are whole or half (spec §8). */
export function formatPercentage(value: Rational): string {
  if (value.den === 1n) return formatRational(value);
  if (value.den === 2n && value.num > 0n) return `${formatInteger((value.num - 1n) / 2n)}½`;
  throw new RangeError('Only whole and half percentages are supported');
}

function percentLabel(percent: Rational): string {
  return `${formatPercentage(percent)}%`;
}

/** p% of the whole, exactly. */
export function percentOf(percent: Rational, whole: Rational): Rational {
  return divide(multiply(percent, whole), HUNDRED);
}

/**
 * Strategy for p% of a whole: '10% = 80 : 10 = 8 → 30% = 3 × 8 = 24'. 5% and 15% go via 10%:
 * '10% = 8, 5% = 4 → 15% = 12'. `format` formats the amounts, e.g. formatMoney.
 */
export function partExplanation(
  p: Percentage,
  whole: Rational,
  format: (value: Rational) => string = formatRational,
): string {
  const of = (percent: Rational) => format(percentOf(percent, whole));
  if (equals(p.value, FIVE)) return `10% = ${of(TEN)} → 5% = ${of(FIVE)}`;
  if (equals(p.value, FIFTEEN)) return `10% = ${of(TEN)}, 5% = ${of(FIVE)} → 15% = ${of(FIFTEEN)}`;
  const divisor = formatRational(divide(HUNDRED, p.base));
  const first = `${percentLabel(p.base)} = ${format(whole)} : ${divisor} = ${of(p.base)}`;
  if (equals(p.value, p.base)) return first;
  const times = formatRational(divide(p.value, p.base));
  return `${first} → ${percentLabel(p.value)} = ${times} × ${of(p.base)} = ${of(p.value)}`;
}

/** Strategy from p% back to 100%: '20% = 14 → 10% = 7 → 100% = 10 × 7 = 70'. */
export function wholeExplanation(p: Percentage, whole: Rational): string {
  const part = formatRational(percentOf(p.value, whole));
  const factor = formatRational(divide(HUNDRED, p.base));
  const known = `${percentLabel(p.value)} = ${part}`;
  const total = formatRational(whole);
  if (equals(p.value, p.base)) return `${known} → 100% = ${factor} × ${part} = ${total}`;
  const baseValue = formatRational(percentOf(p.base, whole));
  return `${known} → ${percentLabel(p.base)} = ${baseValue} → 100% = ${factor} × ${baseValue} = ${total}`;
}
