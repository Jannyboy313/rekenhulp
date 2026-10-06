import { formatInteger, formatRational } from '../format';
import { pick, randomInt, type Rng } from '../random';
import {
  compare,
  decimalPlaces,
  divide,
  equals,
  fromInteger,
  multiply,
  powerOfTen,
  rational,
  type Rational,
} from '../rational';
import { numberStep } from '../steps';
import { firstTip, powerOfTenShift, type Diagnose } from '../tips';
import type { Generator, Question, Topic } from '../types';

/** A unit on a decimal scale: one unit is 10^exponent base units (spec §5.10, §5.14). */
export interface ScaleUnit {
  symbol: string;
  exponent: number;
}

/** Base unit ml (= cm³): capacity and cubic units share one scale. */
export const VOLUME_UNITS: readonly ScaleUnit[] = [
  { symbol: 'mm³', exponent: -3 },
  { symbol: 'ml', exponent: 0 },
  { symbol: 'cm³', exponent: 0 },
  { symbol: 'cl', exponent: 1 },
  { symbol: 'dl', exponent: 2 },
  { symbol: 'L', exponent: 3 },
  { symbol: 'dm³', exponent: 3 },
  { symbol: 'hl', exponent: 5 },
  { symbol: 'm³', exponent: 6 },
];

/** Base unit m². are = dam², ha = hm². */
export const AREA_UNITS: readonly ScaleUnit[] = [
  { symbol: 'mm²', exponent: -6 },
  { symbol: 'cm²', exponent: -4 },
  { symbol: 'dm²', exponent: -2 },
  { symbol: 'm²', exponent: 0 },
  { symbol: 'are', exponent: 2 },
  { symbol: 'ha', exponent: 4 },
  { symbol: 'km²', exponent: 6 },
];

/** Base unit m. No dam/hm (spec §11.10). */
export const LENGTH_UNITS: readonly ScaleUnit[] = [
  { symbol: 'mm', exponent: -3 },
  { symbol: 'cm', exponent: -2 },
  { symbol: 'dm', exponent: -1 },
  { symbol: 'm', exponent: 0 },
  { symbol: 'km', exponent: 3 },
];

/** Base unit g. No cg/dg (spec §11.10). */
export const MASS_UNITS: readonly ScaleUnit[] = [
  { symbol: 'mg', exponent: -3 },
  { symbol: 'g', exponent: 0 },
  { symbol: 'kg', exponent: 3 },
  { symbol: 'ton', exponent: 6 },
];

export interface ScaleLimits {
  /** Largest factor between the two units, as a power of 10. */
  maxShift: number;
  /**
   * Source values and answers are at most 10^maxValueExponent.
   * maxShift must not exceed this, otherwise some mantissas have no valid exponent.
   */
  maxValueExponent: number;
}

/** Spec §5.10: units at most a factor 10⁶ apart, values in [0,001; 10 000 000]. */
export const METRIC_LIMITS: ScaleLimits = { maxShift: 6, maxValueExponent: 7 };

/** Values have at most 3 decimals, so the smallest allowed value is 0,001. */
export const MAX_DECIMALS = 3;

export interface ScaleConversion {
  from: ScaleUnit;
  to: ScaleUnit;
  value: Rational;
  answer: Rational;
}

/** Ordered pairs of different units at most `maxShift` powers of 10 apart. */
export function conversionPairs(
  units: readonly ScaleUnit[],
  maxShift: number = METRIC_LIMITS.maxShift,
): [ScaleUnit, ScaleUnit][] {
  return units.flatMap((from) =>
    units
      .filter((to) => to !== from && Math.abs(from.exponent - to.exponent) <= maxShift)
      .map((to): [ScaleUnit, ScaleUnit] => [from, to]),
  );
}

/** In [0,001; 10^maxValueExponent] with at most 3 decimals. */
export function isNiceValue(
  value: Rational,
  maxValueExponent: number = METRIC_LIMITS.maxValueExponent,
): boolean {
  const decimals = decimalPlaces(value);
  return (
    decimals !== null &&
    decimals <= MAX_DECIMALS &&
    compare(value, powerOfTen(-MAX_DECIMALS)) >= 0 &&
    compare(value, powerOfTen(maxValueExponent)) <= 0
  );
}

/** An integer with 1 to 3 significant digits, e.g. 7, 35 or 125 (never 30 or 120). */
export function randomMantissa(rng: Rng): number {
  const digits = randomInt(rng, 1, 3);
  for (;;) {
    const mantissa = randomInt(rng, 10 ** (digits - 1), 10 ** digits - 1);
    if (mantissa % 10 !== 0) return mantissa;
  }
}

export function randomScaleConversion(
  rng: Rng,
  units: readonly ScaleUnit[],
  limits: ScaleLimits = METRIC_LIMITS,
): ScaleConversion {
  if (limits.maxShift > limits.maxValueExponent) {
    throw new RangeError('maxShift must not exceed maxValueExponent');
  }
  const [from, to] = pick(rng, conversionPairs(units, limits.maxShift));
  const factor = powerOfTen(from.exponent - to.exponent);
  const mantissa = fromInteger(randomMantissa(rng));
  const options: { value: Rational; answer: Rational }[] = [];
  for (let exponent = -MAX_DECIMALS; exponent <= limits.maxValueExponent; exponent++) {
    const value = multiply(mantissa, powerOfTen(exponent));
    const answer = multiply(value, factor);
    if (isNiceValue(value, limits.maxValueExponent) && isNiceValue(answer, limits.maxValueExponent)) {
      options.push({ value, answer });
    }
  }
  return { from, to, ...pick(rng, options) };
}

/**
 * "1 L = 1000 cm³ → 3,5 × 1000 = 3500" or "1 uur = 60 min → 135 : 60 = 2,25" (spec §5.10).
 * The two units must differ by an integer factor, in either direction.
 * `value` must be non-zero; the factor is derived from answer / value.
 */
export function conversionExplanation(
  from: string,
  to: string,
  value: Rational,
  answer: Rational,
): string {
  const ratio = divide(answer, value);
  if (equals(ratio, fromInteger(1))) return `1 ${from} = 1 ${to}`;
  const [shownValue, shownAnswer] = [formatRational(value), formatRational(answer)];
  if (ratio.den === 1n) {
    const factor = formatInteger(ratio.num);
    return `1 ${from} = ${factor} ${to} → ${shownValue} × ${factor} = ${shownAnswer}`;
  }
  if (ratio.num !== 1n) throw new RangeError('Units must differ by an integer factor');
  const factor = formatInteger(ratio.den);
  return `1 ${to} = ${factor} ${from} → ${shownValue} : ${factor} = ${shownAnswer}`;
}

const ONE = fromInteger(1);

/**
 * × and : swapped (spec §3.4.1): the value divided by the factor instead of multiplied, or the
 * other way round. Units with factor 1 (ml and cm³) have no such mistake.
 */
export function swappedConversionTip(value: Rational, answer: Rational): Diagnose {
  const ratio = divide(answer, value);
  return (given) => {
    if (equals(ratio, ONE) || !equals(given, divide(value, ratio))) return undefined;
    return compare(ratio, ONE) > 0
      ? `Naar een kleinere eenheid wordt het getal groter: vermenigvuldig met ${formatRational(ratio)}.`
      : `Naar een grotere eenheid wordt het getal kleiner: deel door ${formatRational(divide(ONE, ratio))}.`;
  };
}

/** Area always; volume only between cubic units, because L, dl, … are no cubes of a length. */
function lengthFactorDimensions(topic: Topic, from: string, to: string): 2 | 3 | null {
  if (topic === 'area') return 2;
  if (topic === 'volume' && from.endsWith('³') && to.endsWith('³')) return 3;
  return null;
}

/** The length factor used for area or volume: 3 m² = 30 dm² instead of 300 (spec §3.4.1). */
export function lengthFactorTip(dimensions: 2 | 3, value: Rational, answer: Rational): Diagnose {
  const shift = powerOfTenShift(answer, value);
  return (given) => {
    if (shift === null || shift % dimensions !== 0) return undefined;
    if (!equals(given, multiply(value, powerOfTen(shift / dimensions)))) return undefined;
    return dimensions === 2
      ? 'Bij oppervlakte is elke stap ×100 (10 × 10), niet ×10.'
      : 'Bij kubieke eenheden is elke stap ×1000 (10 × 10 × 10), niet ×10.';
  };
}

/**
 * `3,5 L = ? cm³`, with the target unit as input suffix (spec §5.10). `tips` are tried before the
 * shared conversion tips: the length factor, then × and : swapped.
 */
export function conversionQuestion(
  topic: Topic,
  from: string,
  to: string,
  value: Rational,
  answer: Rational,
  tips: readonly Diagnose[] = [],
): Question {
  const dimensions = lengthFactorDimensions(topic, from, to);
  const diagnose = firstTip(
    ...tips,
    ...(dimensions === null ? [] : [lengthFactorTip(dimensions, value, answer)]),
    swappedConversionTip(value, answer),
  );
  return {
    key: `${topic}:${from}>${to}:${value.num}/${value.den}`,
    topic,
    steps: [
      numberStep({
        prompt: `${formatRational(value)} ${from} = ? ${to}`,
        answer,
        suffix: to,
        explanation: conversionExplanation(from, to, value, answer),
        diagnose,
      }),
    ],
  };
}

function scaleGenerator(topic: Topic, units: readonly ScaleUnit[]): Generator {
  return (rng) => {
    const { from, to, value, answer } = randomScaleConversion(rng, units);
    return conversionQuestion(topic, from.symbol, to.symbol, value, answer);
  };
}

export const generateVolume = scaleGenerator('volume', VOLUME_UNITS);
export const generateArea = scaleGenerator('area', AREA_UNITS);
export const generateLength = scaleGenerator('length', LENGTH_UNITS);
export const generateMass = scaleGenerator('mass', MASS_UNITS);

export interface TimeUnit {
  symbol: string;
  seconds: number;
}

const SECOND: TimeUnit = { symbol: 's', seconds: 1 };
const MINUTE: TimeUnit = { symbol: 'min', seconds: 60 };
const HOUR: TimeUnit = { symbol: 'uur', seconds: 3600 };
const DAY: TimeUnit = { symbol: 'dag', seconds: 86_400 };

export const TIME_UNITS: readonly TimeUnit[] = [SECOND, MINUTE, HOUR, DAY];

/** [larger, smaller]. s ↔ dag (factor 86 400) is left out (spec §5.10). */
export const TIME_PAIRS: readonly (readonly [TimeUnit, TimeUnit])[] = [
  [MINUTE, SECOND],
  [HOUR, MINUTE],
  [DAY, HOUR],
  [HOUR, SECOND],
  [DAY, MINUTE],
];

export const MAX_LARGER_TIME_VALUE = 100;
export const MAX_SMALLER_TIME_VALUE = 10_000;
/** Whole numbers, halves, quarters and tenths in the larger unit. */
export const TIME_DENOMINATORS: readonly number[] = [1, 2, 4, 10];

/** How many smaller units make one larger unit. */
function timeFactor(larger: TimeUnit, smaller: TimeUnit): Rational {
  return fromInteger(larger.seconds / smaller.seconds);
}

/**
 * Values in the larger unit at most 100 that belong to this denominator group, i.e. this is the first
 * denominator of TIME_DENOMINATORS that their reduced denominator divides (so the group of 10 also
 * holds fifths, e.g. 0,2). Only values that give a whole number of at most 10 000 in the smaller
 * unit are included.
 */
export function largerTimeValues(
  larger: TimeUnit,
  smaller: TimeUnit,
  denominator: number,
): Rational[] {
  const factor = timeFactor(larger, smaller);
  const earlier = TIME_DENOMINATORS.slice(0, TIME_DENOMINATORS.indexOf(denominator));
  const values: Rational[] = [];
  for (let numerator = 1; numerator <= MAX_LARGER_TIME_VALUE * denominator; numerator++) {
    const value = rational(BigInt(numerator), BigInt(denominator));
    if (BigInt(denominator) % value.den !== 0n) continue;
    if (earlier.some((d) => BigInt(d) % value.den === 0n)) continue;
    const smallerValue = multiply(value, factor);
    if (smallerValue.den === 1n && smallerValue.num <= BigInt(MAX_SMALLER_TIME_VALUE)) {
      values.push(value);
    }
  }
  return values;
}

// Per pair: the candidate values per denominator, without empty groups. Computed once.
const TIME_VALUE_GROUPS: readonly Rational[][][] = TIME_PAIRS.map(([larger, smaller]) =>
  TIME_DENOMINATORS.map((denominator) => largerTimeValues(larger, smaller, denominator)).filter(
    (group) => group.length > 0,
  ),
);

export function generateTime(rng: Rng): Question {
  const index = randomInt(rng, 0, TIME_PAIRS.length - 1);
  const [larger, smaller] = TIME_PAIRS[index]!;
  const largerValue = pick(rng, pick(rng, TIME_VALUE_GROUPS[index]!));
  const smallerValue = multiply(largerValue, timeFactor(larger, smaller));
  return rng() < 0.5
    ? conversionQuestion('time', larger.symbol, smaller.symbol, largerValue, smallerValue)
    : conversionQuestion('time', smaller.symbol, larger.symbol, smallerValue, largerValue);
}
