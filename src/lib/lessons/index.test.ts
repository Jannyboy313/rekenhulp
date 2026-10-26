import { describe, expect, it } from 'vitest';
import {
  FRACTIONS_SET,
  GEOMETRY_SET,
  MEASUREMENT_SET,
  NUMBER_SENSE_SET,
  NUMBERS_SET,
  OPERATIONS_SET,
  PROPORTIONS_SET,
  RELATIONS_SET,
  TABLES_SET,
} from '../sets';
import { FIXTURE_LESSON } from './fixture';
import { lessonFor } from './index';

describe('lessonFor', () => {
  it('finds the lesson of a set', () => {
    expect(lessonFor(TABLES_SET, [FIXTURE_LESSON])).toBe(FIXTURE_LESSON);
  });

  it('is undefined for a set without a lesson', () => {
    expect(lessonFor(MEASUREMENT_SET, [FIXTURE_LESSON])).toBeUndefined();
  });

  it('reads the real registry by default', () => {
    expect(lessonFor(TABLES_SET)).toBeUndefined();
    expect(lessonFor(NUMBERS_SET)?.topics.map((topic) => topic.id)).toEqual([
      'digitRules',
      'combinedRules',
      'chunking',
      'primes',
      'factorization',
      'gcd',
      'lcm',
      'squares',
    ]);
    expect(lessonFor(MEASUREMENT_SET)?.topics.map((topic) => topic.id)).toEqual([
      'metric',
      'area',
      'volume',
      'largeNumbers',
      'time',
      'speed',
      'metersPerSecond',
    ]);
    expect(lessonFor(PROPORTIONS_SET)?.topics.map((topic) => topic.id)).toEqual([
      'percentages',
      'priceChange',
      'percentChange',
      'ratios',
      'ratioProblems',
      'perUnit',
      'scale',
    ]);
    expect(lessonFor(OPERATIONS_SET)?.topics.map((topic) => topic.id)).toEqual([
      'orderOfOperations',
      'swapGroup',
      'distributive',
      'compensation',
      'complement',
      'splitting',
    ]);
    expect(lessonFor(NUMBER_SENSE_SET)?.topics.map((topic) => topic.id)).toEqual([
      'mentalOperations',
      'remainder',
      'negativeNumbers',
      'rounding',
      'powers',
      'negativeExponents',
      'roots',
      'scientificNotation',
    ]);
    expect(lessonFor(FRACTIONS_SET)?.topics.map((topic) => topic.id)).toEqual([
      'conversion',
      'knownFractions',
      'simplify',
      'addSubtract',
      'multiplyDivide',
      'partOf',
      'decimals',
    ]);
    expect(lessonFor(GEOMETRY_SET)?.topics.map((topic) => topic.id)).toEqual([
      'perimeterArea',
      'circle',
      'solids',
      'pythagoras',
      'angles',
      'clock',
      'symmetry',
      'quadrilaterals',
      'triangles',
    ]);
    expect(lessonFor(RELATIONS_SET)?.topics.map((topic) => topic.id)).toEqual([
      'mean',
      'median',
      'percentagePoints',
      'sequences',
      'formulas',
      'equations',
      'probability',
    ]);
  });
});
