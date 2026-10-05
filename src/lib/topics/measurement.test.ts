import { describe, expect, it } from 'vitest';
import { GROUP_SEPARATOR as S } from '../format';
import { createRng } from '../random';
import {
  compare,
  decimalPlaces,
  equals,
  fromInteger,
  multiply,
  parseDutchNumber,
  powerOfTen,
  rational,
  type Rational,
} from '../rational';
import type { Generator, Question } from '../types';
import {
  AREA_UNITS,
  conversionExplanation,
  conversionPairs,
  conversionQuestion,
  generateArea,
  generateLength,
  generateMass,
  generateTime,
  generateVolume,
  isNiceValue,
  largerTimeValues,
  LENGTH_UNITS,
  MASS_UNITS,
  MAX_LARGER_TIME_VALUE,
  MAX_SMALLER_TIME_VALUE,
  METRIC_LIMITS,
  randomMantissa,
  randomScaleConversion,
  TIME_DENOMINATORS,
  TIME_PAIRS,
  TIME_UNITS,
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

function expectedOf(question: Question): string {
  // `expected` does not depend on the input.
  return question.steps[0]!.check('').expected;
}

/** What the user types for a formatted number: the keypad has no group separator. */
function typed(formatted: string): string {
  return formatted.replaceAll(S, '');
}

function sample(generate: Generator, seed: number, count = SAMPLES): Question[] {
  const rng = createRng(seed);
  return Array.from({ length: count }, () => generate(rng));
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

describe('randomScaleConversion (custom limits)', () => {
  const limits = { maxShift: 3, maxValueExponent: 5 };
  const rng = createRng(9);
  const conversions = Array.from({ length: SAMPLES }, () =>
    randomScaleConversion(rng, MASS_UNITS, limits),
  );

  it('respects the custom shift and value range', () => {
    for (const { from, to, value, answer } of conversions) {
      const shift = from.exponent - to.exponent;
      expect(Math.abs(shift)).toBeLessThanOrEqual(3);
      expect(isNiceValue(value, 5)).toBe(true);
      expect(isNiceValue(answer, 5)).toBe(true);
      expect(equals(answer, multiply(value, powerOfTen(shift)))).toBe(true);
    }
  });

  it('rejects a maxShift larger than maxValueExponent', () => {
    expect(() =>
      randomScaleConversion(createRng(1), MASS_UNITS, { maxShift: 6, maxValueExponent: 5 }),
    ).toThrow(/maxShift must not exceed maxValueExponent/);
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

describe('conversionQuestion', () => {
  it('asks for the value in the target unit, which is also the suffix', () => {
    const question = conversionQuestion('volume', 'L', 'cm³', rational(7n, 2n), fromInteger(3500));
    expect(question.key).toBe('volume:L>cm³:7/2');
    expect(question.topic).toBe('volume');
    expect(question.steps).toHaveLength(1);
    const step = question.steps[0]!;
    expect(step.kind).toBe('number');
    expect(step.prompt).toBe('3,5 L = ? cm³');
    expect(step.suffix).toBe('cm³');
    expect(step.check('3500')).toEqual({
      correct: true,
      expected: '3500',
      explanation: '1 L = 1000 cm³ → 3,5 × 1000 = 3500',
    });
    expect(step.check('350').correct).toBe(false);
  });
});

describe.each([
  ['volume', generateVolume, VOLUME_UNITS],
  ['area', generateArea, AREA_UNITS],
  ['length', generateLength, LENGTH_UNITS],
  ['mass', generateMass, MASS_UNITS],
] as const)('%s generator', (topic, generate, units) => {
  const questions = sample(generate, 11);

  it('creates single-step conversions on its topic', () => {
    for (const question of questions) {
      expect(question.topic).toBe(topic);
      expect(question.key.startsWith(`${topic}:`)).toBe(true);
      expect(question.steps).toHaveLength(1);
      const step = question.steps[0]!;
      expect(step.kind).toBe('number');
      expect(symbols(units)).toContain(step.suffix);
      expect(step.prompt.endsWith(` = ? ${step.suffix}`)).toBe(true);
    }
  });

  it('accepts its own expected answer and explains it', () => {
    for (const question of questions) {
      const result = question.steps[0]!.check(typed(expectedOf(question)));
      expect(result.correct).toBe(true);
      expect(result.explanation?.startsWith('1 ')).toBe(true);
    }
  });

  it('uses every unit as source and as target', () => {
    const from = new Set<string>();
    const to = new Set<string>();
    for (const { key } of questions) {
      const [source, target] = key.split(':')[1]!.split('>');
      from.add(source!);
      to.add(target!);
    }
    expect([...from].sort()).toEqual(symbols(units).sort());
    expect([...to].sort()).toEqual(symbols(units).sort());
  });

  it('is deterministic for a fixed seed', () => {
    const keys = (seed: number) => sample(generate, seed, 50).map((question) => question.key);
    expect(keys(5)).toEqual(keys(5));
  });
});

describe('volume generator', () => {
  it('includes the factor-1 links between capacity and cubic units', () => {
    const pairs = new Set(sample(generateVolume, 12).map(({ key }) => key.split(':')[1]));
    expect(pairs.has('ml>cm³') || pairs.has('cm³>ml')).toBe(true);
    expect(pairs.has('L>dm³') || pairs.has('dm³>L')).toBe(true);
  });
});

describe('time units', () => {
  it('lists the units with their length in seconds', () => {
    expect(TIME_UNITS.map((unit) => [unit.symbol, unit.seconds])).toEqual([
      ['s', 1],
      ['min', 60],
      ['uur', 3600],
      ['dag', 86_400],
    ]);
  });

  it('converts between all units except s and dag', () => {
    expect(TIME_PAIRS.map(([larger, smaller]) => `${larger.symbol}>${smaller.symbol}`)).toEqual([
      'min>s',
      'uur>min',
      'dag>uur',
      'uur>s',
      'dag>min',
    ]);
  });
});

describe('largerTimeValues', () => {
  const unit = (symbol: string) => TIME_UNITS.find((candidate) => candidate.symbol === symbol)!;

  it('allows quarters of an hour', () => {
    expect(largerTimeValues(unit('uur'), unit('min'), 4)).toContainEqual(rational(9n, 4n));
  });

  it('includes even tenths, which have a reduced denominator of 5', () => {
    const values = largerTimeValues(unit('uur'), unit('min'), 10);
    expect(values).toContainEqual(rational(1n, 5n));
    expect(values).not.toContainEqual(rational(1n, 2n));
  });

  it('has no tenths of a day, because 2,4 uur is not whole', () => {
    expect(largerTimeValues(unit('dag'), unit('uur'), 10)).toEqual([]);
  });

  it('keeps every candidate within the value rules', () => {
    for (const [larger, smaller] of TIME_PAIRS) {
      for (const denominator of TIME_DENOMINATORS) {
        for (const value of largerTimeValues(larger, smaller, denominator)) {
          expect(BigInt(denominator) % value.den).toBe(0n);
          for (const earlier of TIME_DENOMINATORS.slice(0, TIME_DENOMINATORS.indexOf(denominator))) {
            expect(BigInt(earlier) % value.den).not.toBe(0n);
          }
          expect(compare(value, fromInteger(MAX_LARGER_TIME_VALUE))).toBeLessThanOrEqual(0);
          const smallerValue = multiply(value, fromInteger(larger.seconds / smaller.seconds));
          expect(smallerValue.den).toBe(1n);
          expect(smallerValue.num).toBeLessThanOrEqual(BigInt(MAX_SMALLER_TIME_VALUE));
        }
      }
    }
  });
});

describe('generateTime', () => {
  const questions = sample(generateTime, 13);
  const seconds = new Map(TIME_UNITS.map((unit) => [unit.symbol, unit.seconds]));

  function parts(question: Question) {
    const [, pair, fraction] = question.key.split(':');
    const [from, to] = pair!.split('>') as [string, string];
    const [num, den] = fraction!.split('/');
    return {
      from,
      to,
      value: rational(BigInt(num!), BigInt(den!)),
      answer: parseDutchNumber(typed(expectedOf(question)))!,
    };
  }

  it('creates single-step time conversions that accept their own answer', () => {
    for (const question of questions) {
      expect(question.topic).toBe('time');
      expect(question.steps).toHaveLength(1);
      const step = question.steps[0]!;
      expect(step.kind).toBe('number');
      expect(step.suffix).toBe(parts(question).to);
      expect(step.prompt.endsWith(` = ? ${step.suffix}`)).toBe(true);
      expect(step.check('').explanation?.startsWith('1 ')).toBe(true);
      expect(step.check(typed(expectedOf(question))).correct).toBe(true);
    }
  });

  it('converts exactly', () => {
    for (const question of questions) {
      const { from, to, value, answer } = parts(question);
      expect(
        equals(
          multiply(value, fromInteger(seconds.get(from)!)),
          multiply(answer, fromInteger(seconds.get(to)!)),
        ),
      ).toBe(true);
    }
  });

  it('uses the ten directed pairs and never s ↔ dag', () => {
    const pairs = new Set(questions.map((question) => `${parts(question).from}>${parts(question).to}`));
    expect(pairs.size).toBe(10);
    expect(pairs.has('s>dag')).toBe(false);
    expect(pairs.has('dag>s')).toBe(false);
  });

  it('keeps both values to at most 2 decimals and the smaller-unit value whole', () => {
    for (const question of questions) {
      const { from, to, value, answer } = parts(question);
      expect(decimalPlaces(value)!).toBeLessThanOrEqual(2);
      expect(decimalPlaces(answer)!).toBeLessThanOrEqual(2);
      const smallerValue = seconds.get(from)! < seconds.get(to)! ? value : answer;
      expect(smallerValue.den).toBe(1n);
    }
  });

  it('uses whole numbers, halves, quarters and tenths in the larger unit', () => {
    const denominators = new Set<bigint>();
    for (const question of questions) {
      const { from, to, value, answer } = parts(question);
      denominators.add((seconds.get(from)! > seconds.get(to)! ? value : answer).den);
    }
    expect([...denominators].sort((a, b) => Number(a - b))).toEqual([1n, 2n, 4n, 5n, 10n]);
  });
});
