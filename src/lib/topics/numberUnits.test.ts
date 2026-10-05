import { describe, expect, it } from 'vitest';
import { GROUP_SEPARATOR, toSuperscript } from '../format';
import { createRng } from '../random';
import {
  compare,
  equals,
  fromInteger,
  multiply,
  parseDutchNumber,
  powerOfTen,
  rational,
} from '../rational';
import type { Question, Step } from '../types';
import { isNiceValue } from './measurement';
import { generateNumberUnits, MIN_POWER, NUMBER_LIMITS, NUMBER_UNITS } from './numberUnits';

const SAMPLES = 3000;

function sample(seed: number, count = SAMPLES): Question[] {
  const rng = createRng(seed);
  return Array.from({ length: count }, () => generateNumberUnits(rng));
}

function stepOf(question: Question): Step {
  return question.steps[0]!;
}

function expectedOf(question: Question): string {
  return stepOf(question).check('').expected;
}

/** What the user types for a formatted number: the keypad has no group separator. */
function typed(formatted: string): string {
  return formatted.replaceAll(GROUP_SEPARATOR, '');
}

const questions = sample(17);
const exponentOf = new Map(NUMBER_UNITS.map((unit) => [unit.symbol, unit.exponent]));
const nameToPower = questions.filter((q) => q.key.startsWith('numberUnits:power:'));
const powerToName = questions.filter((q) => q.key.startsWith('numberUnits:fromPower:'));
const nameToName = questions.filter((q) => q.key.includes('>'));

describe('NUMBER_UNITS', () => {
  it('follows the Dutch long scale from duizend to quadriljoen', () => {
    expect(NUMBER_UNITS.map((unit) => [unit.symbol, unit.exponent])).toEqual([
      ['duizend', 3],
      ['miljoen', 6],
      ['miljard', 9],
      ['biljoen', 12],
      ['biljard', 15],
      ['triljoen', 18],
      ['triljard', 21],
      ['quadriljoen', 24],
    ]);
  });
});

describe('generateNumberUnits', () => {
  it('creates single-step numeric questions that accept their own answer', () => {
    for (const question of questions) {
      expect(question.topic).toBe('numberUnits');
      expect(question.steps).toHaveLength(1);
      expect(stepOf(question).kind).toBe('number');
      const result = stepOf(question).check(typed(expectedOf(question)));
      expect(result.correct).toBe(true);
      expect(result.explanation).toBeTruthy();
    }
  });

  it('uses the three forms about equally often', () => {
    expect(nameToPower.length + powerToName.length + nameToName.length).toBe(SAMPLES);
    for (const form of [nameToPower, powerToName, nameToName]) {
      expect(form.length / SAMPLES).toBeGreaterThan(0.28);
      expect(form.length / SAMPLES).toBeLessThan(0.39);
    }
  });

  it('keeps every number in a prompt and every answer at most 100 000', () => {
    const limit = fromInteger(100_000);
    for (const question of questions) {
      // Superscript digits are not matched by \d, so 10⁹ yields just "10".
      const numbers = typed(stepOf(question).prompt).match(/\d+(,\d+)?/g) ?? [];
      for (const text of [...numbers, typed(expectedOf(question))]) {
        expect(compare(parseDutchNumber(text)!, limit)).toBeLessThanOrEqual(0);
      }
    }
  });

  it('is deterministic for a fixed seed', () => {
    const keys = (seed: number) => sample(seed, 50).map((question) => question.key);
    expect(keys(5)).toEqual(keys(5));
  });
});

// Rare keys (e.g. mantissa 1) are not in the 3000-sample set: look them up in a larger pool.
const pool = sample(99, 60_000);

function find(key: string): Question {
  const question = pool.find((candidate) => candidate.key === key);
  expect(question, key).toBeDefined();
  return question!;
}

function explanationOf(key: string): string {
  return stepOf(find(key)).check('').explanation!;
}

const SUPERSCRIPT_DIGITS = '⁰¹²³⁴⁵⁶⁷⁸⁹';
function fromSuperscript(text: string): number {
  return Number([...text].map((char) => SUPERSCRIPT_DIGITS.indexOf(char)).join(''));
}

describe('name → power', () => {
  it('asks for the exponent of the value', () => {
    for (const question of nameToPower) {
      const [, , value, symbol] = question.key.split(':');
      const [, promptValue, promptSymbol] = stepOf(question).prompt.match(/^(\d+) (\S+) = /)!;
      expect(promptValue).toBe(value);
      expect(promptSymbol).toBe(symbol);
      const exponent = exponentOf.get(promptSymbol!)! + promptValue!.length - 1;
      expect(expectedOf(question)).toBe(String(exponent));
      expect(stepOf(question).suffix).toBeUndefined();
      expect(stepOf(question).prompt).toMatch(/ = (\d(,\d+)? × )?10ⁿ\. n = \?$/);
      expect(stepOf(question).check('').explanation!.endsWith(`10${toSuperscript(exponent)}`)).toBe(
        true,
      );
    }
  });

  it('covers every name', () => {
    const names = new Set(nameToPower.map((question) => question.key.split(':')[3]));
    expect(names.size).toBe(NUMBER_UNITS.length);
  });

  it('asks for the bare name in about 40% of the cases', () => {
    const bare = nameToPower.filter((q) => q.key.startsWith('numberUnits:power:1:')).length;
    expect(bare / nameToPower.length).toBeGreaterThan(0.33);
    expect(bare / nameToPower.length).toBeLessThan(0.52);
  });

  it('explains a bare name via the previous name', () => {
    expect(stepOf(find('numberUnits:power:1:biljoen')).prompt).toBe('1 biljoen = 10ⁿ. n = ?');
    expect(explanationOf('numberUnits:power:1:biljoen')).toBe('1 biljoen = 1000 miljard = 10¹²');
    expect(explanationOf('numberUnits:power:1:duizend')).toBe('1 duizend = 1000 = 10³');
  });

  it('uses every value from 1 to 999 with 1 to 3 significant digits, trailing zeros included', () => {
    for (const question of nameToPower) {
      const value = Number(question.key.split(':')[2]);
      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThanOrEqual(999);
    }
    expect(nameToPower.some((q) => /^numberUnits:power:\d*0:/.test(q.key))).toBe(true);
  });

  it.each([
    ['numberUnits:power:7:miljard', '7 miljard = 7 × 10⁹'],
    [
      'numberUnits:power:250:miljoen',
      '250 miljoen = 2,5 × 10² × 10⁶ = 2,5 × 10⁸',
    ],
  ])('explains %s exactly', (key, explanation) => {
    expect(explanationOf(key)).toBe(explanation);
  });
});

describe('power → name', () => {
  it('converts a power of 10 exactly into the named unit', () => {
    for (const question of powerToName) {
      const [, , mantissa, keyExponent, keySymbol] = question.key.split(':');
      const prompt = stepOf(question).prompt;
      const [, coefficientText, powerText, symbol] = prompt.match(
        /^(?:(\d(?:,\d+)?) × )?10([⁰¹²³⁴⁵⁶⁷⁸⁹]+) = \? (\S+)$/,
      )!;
      const exponent = fromSuperscript(powerText!);
      expect(symbol).toBe(keySymbol);
      expect(String(exponent)).toBe(keyExponent);
      expect(exponent).toBeGreaterThanOrEqual(MIN_POWER);
      // Without a coefficient the prompt shows a bare power: the mantissa is 1.
      const coefficient = coefficientText
        ? parseDutchNumber(coefficientText)!
        : rational(1n, 1n);
      expect(equals(coefficient, rational(BigInt(mantissa!), 10n ** BigInt(mantissa!.length - 1)))).toBe(
        true,
      );
      const answer = multiply(coefficient, powerOfTen(exponent - exponentOf.get(symbol!)!));
      expect(equals(parseDutchNumber(typed(expectedOf(question)))!, answer)).toBe(true);
      expect(isNiceValue(answer, NUMBER_LIMITS.maxValueExponent)).toBe(true);
      expect(stepOf(question).suffix).toBe(symbol);
    }
  });

  it('covers every name, including duizend', () => {
    const names = new Set(powerToName.map((question) => question.key.split(':')[4]));
    expect([...names].sort()).toEqual(NUMBER_UNITS.map((unit) => unit.symbol).sort());
  });

  it.each([
    ['numberUnits:fromPower:25:9:miljoen', '10⁹ = 1000 miljoen → 2,5 × 1000 = 2500'],
    ['numberUnits:fromPower:25:5:miljoen', '10⁵ = 0,1 miljoen → 2,5 × 0,1 = 0,25'],
    ['numberUnits:fromPower:25:6:miljoen', '10⁶ = 1 miljoen'],
    ['numberUnits:fromPower:1:9:miljoen', '10⁹ = 1000 miljoen'],
    ['numberUnits:fromPower:1:6:miljoen', '10⁶ = 1 miljoen'],
  ])('explains %s exactly', (key, explanation) => {
    expect(explanationOf(key)).toBe(explanation);
  });
});

describe('name ↔ name', () => {
  it('converts only between neighbouring names', () => {
    for (const question of nameToName) {
      const [from, to] = question.key.split(':')[1]!.split('>');
      expect(Math.abs(exponentOf.get(from!)! - exponentOf.get(to!)!)).toBe(3);
      expect(stepOf(question).suffix).toBe(to);
    }
  });
});
