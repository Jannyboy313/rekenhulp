import { describe, expect, it } from 'vitest';
import { GROUP_SEPARATOR as S } from '../format';
import { createRng } from '../random';
import {
  decimalPlaces,
  equals,
  fromInteger,
  multiply,
  powerOfTen,
  rational,
  type Rational,
} from '../rational';
import {
  AREA_UNITS,
  conversionExplanation,
  conversionPairs,
  isNiceValue,
  LENGTH_UNITS,
  MASS_UNITS,
  METRIC_LIMITS,
  randomMantissa,
  randomScaleConversion,
  VOLUME_UNITS,
  type ScaleUnit,
} from './measurement';

const SAMPLES = 1000;

function significantDigits(value: Rational): number {
  const scaled = multiply(value, powerOfTen(decimalPlaces(value)!));
  return scaled.num.toString().replace(/0+$/, '').length;
}

function symbols(units: readonly ScaleUnit[]): string[] {
  return units.map((unit) => unit.symbol);
}

describe('unit scales', () => {
  it('lists the units from the spec', () => {
    expect(symbols(VOLUME_UNITS)).toEqual(['mm³', 'ml', 'cm³', 'cl', 'dl', 'L', 'dm³', 'hl', 'm³']);
    expect(symbols(AREA_UNITS)).toEqual(['mm²', 'cm²', 'dm²', 'm²', 'are', 'ha', 'km²']);
    expect(symbols(LENGTH_UNITS)).toEqual(['mm', 'cm', 'dm', 'm', 'km']);
    expect(symbols(MASS_UNITS)).toEqual(['mg', 'g', 'kg', 'ton']);
  });

  it('puts capacity and cubic units on one scale', () => {
    const exponent = (symbol: string) => VOLUME_UNITS.find((unit) => unit.symbol === symbol)!.exponent;
    expect(exponent('cm³')).toBe(exponent('ml'));
    expect(exponent('dm³')).toBe(exponent('L'));
    expect(exponent('m³') - exponent('L')).toBe(3);
    expect(exponent('hl') - exponent('L')).toBe(2);
    expect(exponent('cm³') - exponent('mm³')).toBe(3);
  });

  it('steps area by 100, length by 10 up to m, and mass by 1000', () => {
    expect(AREA_UNITS.map((unit) => unit.exponent)).toEqual([-6, -4, -2, 0, 2, 4, 6]);
    expect(LENGTH_UNITS.map((unit) => unit.exponent)).toEqual([-3, -2, -1, 0, 3]);
    expect(MASS_UNITS.map((unit) => unit.exponent)).toEqual([-3, 0, 3, 6]);
  });
});

describe('conversionPairs', () => {
  it.each([
    ['volume', VOLUME_UNITS, 68],
    ['area', AREA_UNITS, 30],
    ['length', LENGTH_UNITS, 20],
    ['mass', MASS_UNITS, 10],
  ] as const)('lists the ordered pairs within a factor 10⁶ for %s', (_name, units, count) => {
    const pairs = conversionPairs(units);
    expect(pairs).toHaveLength(count);
    for (const [from, to] of pairs) {
      expect(from).not.toBe(to);
      expect(Math.abs(from.exponent - to.exponent)).toBeLessThanOrEqual(METRIC_LIMITS.maxShift);
    }
  });

  it('leaves out pairs that are too far apart', () => {
    const names = (units: readonly ScaleUnit[]) =>
      conversionPairs(units).map(([from, to]) => `${from.symbol}>${to.symbol}`);
    expect(names(VOLUME_UNITS)).not.toContain('mm³>m³');
    expect(names(VOLUME_UNITS)).toContain('cm³>m³');
    expect(names(MASS_UNITS)).not.toContain('ton>mg');
    expect(names(MASS_UNITS)).toContain('ton>g');
  });

  it('accepts a smaller maximum shift', () => {
    expect(conversionPairs(MASS_UNITS, 3)).toHaveLength(6);
  });
});

describe('isNiceValue', () => {
  it.each([
    ['0,001', rational(1n, 1000n), true],
    ['0,125', rational(1n, 8n), true],
    ['10 000 000', rational(10_000_000n), true],
    ['0,0005', rational(1n, 2000n), false],
    ['0,1255', rational(251n, 2000n), false],
    ['10 000 001', rational(10_000_001n), false],
    ['1/3', rational(1n, 3n), false],
    ['0', rational(0n), false],
  ])('judges %s', (_label, value, expected) => {
    expect(isNiceValue(value)).toBe(expected);
  });

  it('accepts a smaller maximum', () => {
    expect(isNiceValue(rational(100_000n), 5)).toBe(true);
    expect(isNiceValue(rational(100_001n), 5)).toBe(false);
  });
});

describe('randomMantissa', () => {
  const rng = createRng(3);
  const mantissas = Array.from({ length: SAMPLES }, () => randomMantissa(rng));

  it('has 1 to 3 digits and never ends in 0', () => {
    for (const mantissa of mantissas) {
      expect(Number.isInteger(mantissa)).toBe(true);
      expect(mantissa).toBeGreaterThanOrEqual(1);
      expect(mantissa).toBeLessThanOrEqual(999);
      expect(mantissa % 10).not.toBe(0);
    }
  });

  it('uses each digit count about equally often', () => {
    for (const digits of [1, 2, 3]) {
      const share = mantissas.filter((m) => String(m).length === digits).length / SAMPLES;
      expect(share).toBeGreaterThan(0.28);
      expect(share).toBeLessThan(0.39);
    }
  });
});

describe.each([
  ['volume', VOLUME_UNITS],
  ['area', AREA_UNITS],
  ['length', LENGTH_UNITS],
  ['mass', MASS_UNITS],
] as const)('randomScaleConversion (%s)', (_name, units) => {
  const rng = createRng(7);
  const conversions = Array.from({ length: SAMPLES }, () => randomScaleConversion(rng, units));

  it('converts exactly between two different units of the scale', () => {
    for (const { from, to, value, answer } of conversions) {
      expect(units).toContain(from);
      expect(units).toContain(to);
      expect(from).not.toBe(to);
      expect(Math.abs(from.exponent - to.exponent)).toBeLessThanOrEqual(METRIC_LIMITS.maxShift);
      expect(equals(answer, multiply(value, powerOfTen(from.exponent - to.exponent)))).toBe(true);
    }
  });

  it('keeps the source value and the answer within the value rules', () => {
    for (const { value, answer } of conversions) {
      expect(isNiceValue(value)).toBe(true);
      expect(isNiceValue(answer)).toBe(true);
      expect(significantDigits(value)).toBeLessThanOrEqual(3);
    }
  });

  it('covers every pair', () => {
    const seen = new Set(conversions.map(({ from, to }) => `${from.symbol}>${to.symbol}`));
    expect(seen.size).toBe(conversionPairs(units).length);
  });
});

describe('conversionExplanation', () => {
  it('multiplies when converting to a smaller unit', () => {
    expect(conversionExplanation('L', 'cm³', rational(7n, 2n), fromInteger(3500))).toBe(
      '1 L = 1000 cm³ → 3,5 × 1000 = 3500',
    );
  });

  it('divides when converting to a larger unit', () => {
    expect(conversionExplanation('min', 'uur', fromInteger(135), rational(9n, 4n))).toBe(
      '1 uur = 60 min → 135 : 60 = 2,25',
    );
  });

  it('only states the fact for a factor-1 link', () => {
    expect(conversionExplanation('dm³', 'L', rational(7n, 2n), rational(7n, 2n))).toBe('1 dm³ = 1 L');
  });

  it('groups large factors and results', () => {
    expect(conversionExplanation('m³', 'cm³', rational(7n, 20n), fromInteger(350_000))).toBe(
      `1 m³ = 1${S}000${S}000 cm³ → 0,35 × 1${S}000${S}000 = 350${S}000`,
    );
  });

  it('rejects units that do not differ by an integer factor', () => {
    expect(() => conversionExplanation('a', 'b', fromInteger(2), fromInteger(3))).toThrow(RangeError);
  });
});
