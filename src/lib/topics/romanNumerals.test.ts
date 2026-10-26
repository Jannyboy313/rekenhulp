import { describe, expect, it } from 'vitest';
import { createRng } from '../random';
import type { Question } from '../types';
import {
  additiveValue,
  generateRomanNumerals,
  romanGroups,
  toRoman,
} from './romanNumerals';
import { stepOf } from './testHelpers';

const SAMPLES = 1000;
const SYMBOLS: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
const PAIRS = ['IV', 'IX', 'XL', 'XC', 'CD', 'CM'];

function sample(seed: number): Question[] {
  const rng = createRng(seed);
  return Array.from({ length: SAMPLES }, () => generateRomanNumerals(rng));
}

function parts(question: Question): { direction: string; value: number } {
  const [, direction, value] = question.key.split(':');
  return { direction: direction!, value: Number(value) };
}

/** The question for a value, drawn with the rng until it has the wanted key. */
function find(direction: string, value: number): Question {
  const rng = createRng(1);
  for (let attempt = 0; attempt < 200000; attempt++) {
    const question = generateRomanNumerals(rng);
    if (question.key === `romanNumerals:${direction}:${value}`) return question;
  }
  throw new Error(`no question for ${direction}:${value}`);
}

describe('toRoman', () => {
  it.each<[number, string]>([
    [1, 'I'],
    [4, 'IV'],
    [9, 'IX'],
    [14, 'XIV'],
    [40, 'XL'],
    [88, 'LXXXVIII'],
    [90, 'XC'],
    [99, 'XCIX'],
    [100, 'C'],
    [1888, 'MDCCCLXXXVIII'],
    [1994, 'MCMXCIV'],
    [2024, 'MMXXIV'],
    [2030, 'MMXXX'],
  ])('writes %i as %s', (value, numeral) => {
    expect(toRoman(value)).toBe(numeral);
  });

  it('writes every value up to 3999 with at most three equal symbols in a row', () => {
    for (let value = 1; value <= 3999; value++) {
      const numeral = toRoman(value);
      expect(numeral).not.toMatch(/(.)\1{3}/);
      // Reference reading: a smaller symbol before a larger one is subtracted.
      let total = 0;
      for (let i = 0; i < numeral.length; i++) {
        const current = SYMBOLS[numeral[i]!]!;
        const next = SYMBOLS[numeral[i + 1] ?? ''] ?? 0;
        total += current < next ? -current : current;
      }
      expect(total).toBe(value);
    }
  });
});

describe('additiveValue and romanGroups', () => {
  it.each<[string, number]>([
    ['XIV', 16],
    ['MCMXCIV', 2216],
    ['IIII', 4],
  ])('adds up all symbols of %s: %i', (numeral, total) => {
    expect(additiveValue(numeral)).toBe(total);
  });

  it('splits a value into the symbols of its decimal places, high to low', () => {
    expect(romanGroups(1994)).toEqual([
      { symbols: 'M', value: 1000 },
      { symbols: 'CM', value: 900 },
      { symbols: 'XC', value: 90 },
      { symbols: 'IV', value: 4 },
    ]);
    expect(romanGroups(2024)).toEqual([
      { symbols: 'MM', value: 2000 },
      { symbols: 'XX', value: 20 },
      { symbols: 'IV', value: 4 },
    ]);
    expect(romanGroups(1000)).toEqual([{ symbols: 'M', value: 1000 }]);
  });
});

describe('generateRomanNumerals', () => {
  const questions = sample(11);

  it('draws both directions and both ranges, each numeral with a subtractive pair', () => {
    const seen = new Set<string>();
    for (const question of questions) {
      const { direction, value } = parts(question);
      expect(question.topic).toBe('romanNumerals');
      const year = value >= 1000;
      seen.add(`${direction}:${year}`);
      expect(year ? value <= 2030 : value >= 1 && value <= 100).toBe(true);
      expect(PAIRS.some((pair) => toRoman(value).includes(pair))).toBe(true);
    }
    expect(seen.size).toBe(4);
  });

  it('accepts its own answer, with the right kind and without a slot', () => {
    for (const question of questions) {
      const { direction, value } = parts(question);
      const step = stepOf(question);
      expect(step.kind).toBe(direction === 'to' ? 'number' : 'roman');
      const expected = direction === 'to' ? String(value) : toRoman(value);
      expect(step.check(expected).correct).toBe(true);
      expect(step.check(expected).expected).toBe(expected);
      expect(step.prompt).not.toContain('?');
      if (direction === 'to') {
        expect(additiveValue(step.prompt.match(/Schrijf (\S+) als/)![1]!)).toBeGreaterThan(value);
      }
    }
  });

  it('words the prompts', () => {
    expect(stepOf(find('to', 1994)).prompt).toBe('Schrijf MCMXCIV als gewoon getal.');
    expect(stepOf(find('from', 1994)).prompt).toBe('Schrijf 1994 met Romeinse cijfers.');
  });

  it.each<[string, number, string]>([
    ['to', 1994, 'MCMXCIV = M + CM + XC + IV = 1000 + 900 + 90 + 4 = 1994'],
    ['to', 9, 'IX = 9'],
    ['from', 2024, '2024 = 2000 + 20 + 4 = MM + XX + IV → MMXXIV'],
    ['from', 9, '9 = IX'],
  ])('explains %s %i', (direction, value, explanation) => {
    expect(stepOf(find(direction, value)).check('').explanation).toBe(explanation);
  });

  it.each<[number, string, string | undefined]>([
    [4, 'IIII', 'De waarde klopt, maar gebruik de aftrekregel: 4 = IV.'],
    [
      1994,
      'MDCCCCLXXXXIIII',
      'De waarde klopt, maar gebruik de aftrekregel: 900 = CM, 90 = XC en 4 = IV.',
    ],
    [1994, 'MCMLXXXXIIII', undefined],
    [14, 'XVI', undefined],
    [14, 'IIIIX', undefined],
  ])('tips from decimal %i, %s', (value, input, tip) => {
    expect(stepOf(find('from', value)).check(input).tip).toBe(tip);
  });

  it('gives no tip for the canonical numeral', () => {
    const result = stepOf(find('from', 4)).check('IV');
    expect(result.correct).toBe(true);
    expect(result.tip).toBeUndefined();
  });

  it.each<[string, number, string | undefined]>([
    ['XIV', 16, 'Een kleiner teken vóór een groter teken trek je af: IV = 4, niet 6.'],
    ['MCMXCIV', 2216, 'Een kleiner teken vóór een groter teken trek je af: CM = 900, niet 1100.'],
    ['XIV', 15, undefined],
  ])('tips to decimal %s answered with %i', (numeral, given, tip) => {
    const value = additiveValue(numeral) === 16 ? 14 : 1994;
    expect(stepOf(find('to', value)).check(String(given)).tip).toBe(tip);
  });
});
