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
