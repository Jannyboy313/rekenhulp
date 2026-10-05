import { describe, expect, it } from 'vitest';
import { equals, fromInteger, parseDutchNumber, rational } from './rational';

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

describe('equals', () => {
  it('compares normalised values', () => {
    expect(equals(rational(1n, 2n), rational(2n, 4n))).toBe(true);
    expect(equals(rational(1n, 2n), rational(1n, 3n))).toBe(false);
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
