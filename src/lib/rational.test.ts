import { describe, expect, it } from 'vitest';
import {
  add,
  compare,
  decimalPlaces,
  divide,
  equals,
  finiteDecimalPlaces,
  fromInteger,
  HUNDRED,
  isInteger,
  multiply,
  negate,
  ONE,
  parseDutchNumber,
  parseFraction,
  parseMixedNumber,
  power,
  powerOfTen,
  rational,
  subtract,
} from './rational';

describe('rational', () => {
  it('normalises sign and reduces the fraction', () => {
    expect(rational(6n, 8n)).toEqual({ num: 3n, den: 4n });
    expect(rational(3n, -6n)).toEqual({ num: -1n, den: 2n });
    expect(rational(0n, 5n)).toEqual({ num: 0n, den: 1n });
    expect(rational(7n)).toEqual({ num: 7n, den: 1n });
  });

  it('rejects a zero denominator', () => {
    expect(() => rational(1n, 0n)).toThrow(RangeError);
  });
});

describe('fromInteger', () => {
  it('converts safe integers', () => {
    expect(fromInteger(12)).toEqual({ num: 12n, den: 1n });
    expect(fromInteger(-3)).toEqual({ num: -3n, den: 1n });
  });

  it('rejects non-integers', () => {
    expect(() => fromInteger(1.5)).toThrow(RangeError);
  });
});

describe('constants', () => {
  it('holds 1 and 100', () => {
    expect(ONE).toEqual(rational(1n));
    expect(HUNDRED).toEqual(rational(100n));
  });
});

describe('equals', () => {
  it('compares normalised values', () => {
    expect(equals(rational(1n, 2n), rational(2n, 4n))).toBe(true);
    expect(equals(rational(1n, 2n), rational(1n, 3n))).toBe(false);
  });
});

describe('isInteger', () => {
  it('is true for whole numbers only', () => {
    expect(isInteger(rational(8n, 4n))).toBe(true);
    expect(isInteger(rational(-3n))).toBe(true);
    expect(isInteger(rational(1n, 2n))).toBe(false);
  });
});

describe('parseDutchNumber', () => {
  it.each([
    ['12', rational(12n)],
    ['007', rational(7n)],
    ['-3', rational(-3n)],
    ['−3', rational(-3n)],
    ['0,25', rational(1n, 4n)],
    [',25', rational(1n, 4n)],
    ['0,250', rational(1n, 4n)],
    ['  2,5 ', rational(5n, 2n)],
    ['-0', rational(0n)],
    [String.fromCodePoint(0x2212) + '7', rational(-7n)],
  ])('parses %j', (input, expected) => {
    expect(parseDutchNumber(input)).toEqual(expected);
  });

  it.each(['', '-', ',', '5,', '1,2,3', '1.5', 'abc', '--1', '1-'])('rejects %j', (input) => {
    expect(parseDutchNumber(input)).toBeNull();
  });
});

describe('multiply', () => {
  it('multiplies exactly and normalises', () => {
    expect(multiply(rational(7n, 2n), rational(1000n))).toEqual(rational(3500n));
    expect(multiply(rational(-1n, 4n), rational(2n, 3n))).toEqual(rational(-1n, 6n));
  });
});

describe('divide', () => {
  it('divides exactly and normalises', () => {
    expect(divide(rational(135n), rational(60n))).toEqual(rational(9n, 4n));
    expect(divide(rational(1n), rational(-2n))).toEqual(rational(-1n, 2n));
  });

  it('rejects division by zero', () => {
    expect(() => divide(rational(1n), rational(0n))).toThrow(/Division by zero/);
  });
});

describe('compare', () => {
  it.each([
    [rational(1n, 3n), rational(1n, 2n), -1],
    [rational(2n, 4n), rational(1n, 2n), 0],
    [rational(-1n), rational(-2n), 1],
    [rational(10_000_001n), rational(10_000_000n), 1],
  ])('compares %o with %o', (a, b, expected) => {
    expect(compare(a, b)).toBe(expected);
  });
});

describe('powerOfTen', () => {
  it.each([
    [0, rational(1n)],
    [3, rational(1000n)],
    [24, rational(10n ** 24n)],
    [-2, rational(1n, 100n)],
  ])('computes 10^%i', (exponent, expected) => {
    expect(powerOfTen(exponent)).toEqual(expected);
  });

  it('rejects non-integers', () => {
    expect(() => powerOfTen(1.5)).toThrow(RangeError);
  });
});

describe('decimalPlaces', () => {
  it.each([
    ['3500', rational(3500n), 0],
    ['3,5', rational(7n, 2n), 1],
    ['−2,25', rational(-9n, 4n), 2],
    ['0,125', rational(1n, 8n), 3],
    ['0,075', rational(3n, 40n), 3],
    ['0,001', rational(1n, 1000n), 3],
  ])('needs the right number of decimals for %s', (_label, value, expected) => {
    expect(decimalPlaces(value)).toBe(expected);
  });

  it('needs no decimals for zero', () => {
    expect(decimalPlaces(rational(0n))).toBe(0);
  });

  it('returns null for values that do not terminate', () => {
    expect(decimalPlaces(rational(1n, 3n))).toBeNull();
    expect(decimalPlaces(rational(1n, 60n))).toBeNull();
  });
});

describe('finiteDecimalPlaces', () => {
  it('returns the decimals of a terminating value', () => {
    expect(finiteDecimalPlaces(rational(3n, 40n))).toBe(3);
    expect(finiteDecimalPlaces(rational(12n))).toBe(0);
  });

  it('throws for values that do not terminate', () => {
    expect(() => finiteDecimalPlaces(rational(1n, 3n))).toThrow(/no finite decimal/);
  });
});

describe('add and subtract', () => {
  it('adds exactly and normalises', () => {
    expect(add(rational(1n, 2n), rational(1n, 3n))).toEqual(rational(5n, 6n));
    expect(add(fromInteger(100), rational(25n, 2n))).toEqual(rational(225n, 2n));
  });

  it('subtracts exactly and normalises', () => {
    expect(subtract(fromInteger(100), rational(25n, 2n))).toEqual(rational(175n, 2n));
    expect(subtract(rational(1n, 4n), rational(1n, 4n))).toEqual(rational(0n));
    expect(subtract(rational(1n, 4n), rational(1n, 2n))).toEqual(rational(-1n, 4n));
  });
});

describe('parseFraction', () => {
  it.each([
    ['25/2', rational(25n, 2n)],
    ['50/4', rational(25n, 2n)],
    ['-3/4', rational(-3n, 4n)],
    ['−3/4', rational(-3n, 4n)],
    [' 7/1 ', rational(7n)],
    ['0/5', rational(0n)],
  ])('parses %j', (input, expected) => {
    expect(parseFraction(input)).toEqual(expected);
  });

  it.each(['', '25', '12,5', '25/', '/2', '1/0', '1,5/2', '1/2/3', '2/-3', '1 1/2'])(
    'rejects %j',
    (input) => {
      expect(parseFraction(input)).toBeNull();
    },
  );
});

describe('parseMixedNumber', () => {
  it.each([
    ['12 1/2', rational(25n, 2n)],
    ['-12 1/2', rational(-25n, 2n)],
    ['−1 2/3', rational(-5n, 3n)],
    ['12 5/3', rational(41n, 3n)],
    ['0 1/2', rational(1n, 2n)],
    [' 2 0/7 ', rational(2n)],
  ])('parses %j', (input, expected) => {
    expect(parseMixedNumber(input)).toEqual(expected);
  });

  it.each(['', '12', '1/2', '12 1/0', '12 /2', '12 1/', '12  1/2', '12,5 1/2', '12 -1/2', ' 1/2'])(
    'rejects %j',
    (input) => {
      expect(parseMixedNumber(input)).toBeNull();
    },
  );
});

describe('negate', () => {
  it('flips the sign', () => {
    expect(negate(rational(3n, 4n))).toEqual(rational(-3n, 4n));
    expect(negate(rational(-7n))).toEqual(rational(7n));
    expect(negate(rational(0n))).toEqual(rational(0n));
  });
});

describe('power', () => {
  it('raises exactly', () => {
    expect(power(rational(-4n), 2)).toEqual(rational(16n));
    expect(power(rational(-2n), 3)).toEqual(rational(-8n));
    expect(power(rational(2n, 3n), 3)).toEqual(rational(8n, 27n));
    expect(power(rational(5n), 0)).toEqual(rational(1n));
  });

  it('rejects negative and fractional exponents', () => {
    expect(() => power(rational(2n), -1)).toThrow(RangeError);
    expect(() => power(rational(2n), 1.5)).toThrow(RangeError);
  });
});
