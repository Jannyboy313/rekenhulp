import { formatFraction, formatRational } from '../format';
import { parseDutchNumber, rational, subtract, type Rational } from '../rational';

/** A number of the prompt: a proper fraction or a decimal, as it is written. */
export interface Shown {
  text: string;
  value: Rational;
  fraction: boolean;
}

export const fractionShown = (p: number, q: number): Shown => {
  const value = rational(BigInt(p), BigInt(q));
  return { text: formatFraction(value), value, fraction: true };
};

export const decimalShown = (value: Rational): Shown => ({
  text: formatRational(value),
  value,
  fraction: false,
});

/** A decimal literal such as `0,25` as a rational. */
export const decimal = (text: string) => parseDutchNumber(text)!;

export const absDifference = (a: Rational, b: Rational) => {
  const difference = subtract(a, b);
  return difference.num < 0n ? rational(-difference.num, difference.den) : difference;
};
