import { describe, expect, it } from 'vitest';
import {
  formatDuration,
  formatInput,
  formatInteger,
  formatRational,
  formatSeconds,
  GROUP_SEPARATOR as S,
  MINUS,
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
