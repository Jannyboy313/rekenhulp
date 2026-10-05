import { describe, expect, it } from 'vitest';
import {
  formatDuration,
  formatInput,
  formatInteger,
  formatPowerOfTen,
  formatRational,
  formatSeconds,
  GROUP_SEPARATOR as S,
  MINUS,
  toSuperscript,
} from './format';
import { rational } from './rational';

describe('formatInteger', () => {
  it.each([
    [7, '7'],
    [1000, '1000'],
    [9999, '9999'],
    [10_000, `10${S}000`],
    [2_500_000, `2${S}500${S}000`],
    [-12, `${MINUS}12`],
    [-25_000, `${MINUS}25${S}000`],
    [0, '0'],
  ])('formats %d', (value, expected) => {
    expect(formatInteger(value)).toBe(expected);
  });

  it('accepts bigint', () => {
    expect(formatInteger(12345n)).toBe(`12${S}345`);
  });
});

describe('formatRational', () => {
  it.each([
    [rational(12n), '12'],
    [rational(1n, 4n), '0,25'],
    [rational(-5n, 2n), `${MINUS}2,5`],
    [rational(12345n, 10n), '1234,5'],
    [rational(2_500_000n), `2${S}500${S}000`],
    [rational(-1n, 8n), `${MINUS}0,125`],
  ])('formats %o', (value, expected) => {
    expect(formatRational(value)).toBe(expected);
  });

  it('rejects values without a finite decimal representation', () => {
    expect(() => formatRational(rational(1n, 3n))).toThrow(RangeError);
  });
});

describe('formatInput', () => {
  it('shows a typographic minus', () => {
    expect(formatInput('-12,5')).toBe(`${MINUS}12,5`);
    expect(formatInput('')).toBe('');
  });
});

describe('formatDuration', () => {
  it.each([
    [0, '00:00'],
    [999, '00:00'],
    [65_000, '01:05'],
    [600_999, '10:00'],
    [-5, '00:00'],
  ])('formats %d ms', (ms, expected) => {
    expect(formatDuration(ms)).toBe(expected);
  });
});

describe('spec code points (§8)', () => {
  it('uses U+2212 for minus and U+202F for digit grouping', () => {
    expect([...MINUS].map((c) => c.codePointAt(0))).toEqual([0x2212]);
    expect([...S].map((c) => c.codePointAt(0))).toEqual([0x202f]);
  });
});

describe('formatSeconds', () => {
  it('formats with one decimal and a comma', () => {
    expect(formatSeconds(4230)).toBe('4,2 s');
    expect(formatSeconds(0)).toBe('0,0 s');
  });
});

describe('formatRational limits', () => {
  it('rejects values with too many decimals', () => {
    expect(() => formatRational(rational(1n, 2n ** 21n))).toThrow(/Too many decimals/);
  });
});

describe('toSuperscript', () => {
  it.each([
    [0, '⁰'],
    [3, '³'],
    [12, '¹²'],
    [24, '²⁴'],
    [-1, '⁻¹'],
    [1234567890, '¹²³⁴⁵⁶⁷⁸⁹⁰'],
  ])('writes %i as %s', (exponent, expected) => {
    expect(toSuperscript(exponent)).toBe(expected);
  });

  it('uses the Unicode superscript code points', () => {
    expect([...toSuperscript(1234)].map((char) => char.codePointAt(0))).toEqual([
      0xb9, 0xb2, 0xb3, 0x2074,
    ]);
    expect(toSuperscript(-5).codePointAt(0)).toBe(0x207b);
  });

  it('rejects non-integers', () => {
    expect(() => toSuperscript(1.5)).toThrow(RangeError);
    expect(() => toSuperscript(NaN)).toThrow(RangeError);
    expect(() => toSuperscript(Number.MAX_SAFE_INTEGER + 1)).toThrow(RangeError);
  });
});

describe('formatPowerOfTen', () => {
  it('writes the base 10 with a superscript exponent', () => {
    expect(formatPowerOfTen(9)).toBe('10⁹');
    expect(formatPowerOfTen(24)).toBe('10²⁴');
    expect(formatPowerOfTen(-2)).toBe('10⁻²');
  });
});
