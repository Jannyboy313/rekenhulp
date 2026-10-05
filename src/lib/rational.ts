/** An exact fraction, always normalised: den > 0 and gcd(num, den) = 1. */
export interface Rational {
  readonly num: bigint;
  readonly den: bigint;
}

function gcd(a: bigint, b: bigint): bigint {
  let x = a < 0n ? -a : a;
  let y = b < 0n ? -b : b;
  while (y !== 0n) [x, y] = [y, x % y];
  return x;
}

export function rational(num: bigint, den: bigint = 1n): Rational {
  if (den === 0n) throw new RangeError('Denominator must not be zero');
  const sign = den < 0n ? -1n : 1n;
  const divisor = gcd(num, den);
  return { num: (sign * num) / divisor, den: (sign * den) / divisor };
}

export function fromInteger(value: number): Rational {
  if (!Number.isSafeInteger(value)) throw new RangeError(`Not a safe integer: ${value}`);
  return rational(BigInt(value));
}

export function equals(a: Rational, b: Rational): boolean {
  return a.num === b.num && a.den === b.den;
}

// Optional ASCII or typographic minus, optional integer part, optional ",digits".
const DUTCH_NUMBER = /^([-−])?(\d*)(?:,(\d+))?$/;

/** Parses Dutch notation such as "12", "−3", "0,25" or ",5". Returns null for anything else. */
export function parseDutchNumber(input: string): Rational | null {
  const match = DUTCH_NUMBER.exec(input.trim());
  if (!match) return null;
  const [, sign, integerPart = '', fractionPart = ''] = match;
  if (integerPart === '' && fractionPart === '') return null;
  const digits = BigInt(integerPart + fractionPart);
  const den = 10n ** BigInt(fractionPart.length);
  return rational(sign ? -digits : digits, den);
}

export function multiply(a: Rational, b: Rational): Rational {
  return rational(a.num * b.num, a.den * b.den);
}

export function divide(a: Rational, b: Rational): Rational {
  if (b.num === 0n) throw new RangeError('Division by zero');
  return rational(a.num * b.den, a.den * b.num);
}

/** −1, 0 or 1. Denominators are always positive, so cross-multiplying keeps the order. */
export function compare(a: Rational, b: Rational): -1 | 0 | 1 {
  const difference = a.num * b.den - b.num * a.den;
  return difference < 0n ? -1 : difference > 0n ? 1 : 0;
}

export function powerOfTen(exponent: number): Rational {
  if (!Number.isSafeInteger(exponent)) throw new RangeError(`Not a safe integer: ${exponent}`);
  const power = 10n ** BigInt(Math.abs(exponent));
  return exponent >= 0 ? rational(power) : rational(1n, power);
}

/** Decimals needed to write the value exactly, or null when it does not terminate (1/3). */
export function decimalPlaces(value: Rational): number | null {
  let den = value.den;
  let twos = 0;
  let fives = 0;
  while (den % 2n === 0n) {
    den /= 2n;
    twos++;
  }
  while (den % 5n === 0n) {
    den /= 5n;
    fives++;
  }
  return den === 1n ? Math.max(twos, fives) : null;
}
