import { describe, expect, it } from 'vitest';
import { createRng } from '../random';
import { fromBase, generateNumberSystems, toBase, type Base } from './numberSystems';
import { stepOf } from './testHelpers';
import type { Question } from '../types';

const SAMPLES = 1000;

function sample(seed: number): Question[] {
  const rng = createRng(seed);
  return Array.from({ length: SAMPLES }, () => generateNumberSystems(rng));
}

function parts(question: Question): { direction: string; base: Base; value: number } {
  const [, direction, base, value] = question.key.split(':');
  return { direction: direction!, base: Number(base) as Base, value: Number(value) };
}

const RANGES: Record<Base, [number, number]> = { 2: [5, 63], 5: [6, 124], 16: [26, 255] };

/** The question for a value, drawn with the rng until it has the wanted key. */
function find(direction: string, base: Base, value: number): Question {
  const rng = createRng(1);
  for (let attempt = 0; attempt < 200000; attempt++) {
    const question = generateNumberSystems(rng);
    if (question.key === `numberSystems:${direction}:${base}:${value}`) return question;
  }
  throw new Error(`no question for ${direction}:${base}:${value}`);
}

describe('toBase and fromBase', () => {
  it.each<[number, Base, string]>([
    [11, 2, '1011'],
    [73, 5, '243'],
    [180, 16, 'B4'],
    [26, 16, '1A'],
    [255, 16, 'FF'],
  ])('writes %i in base %i as %s', (value, base, digits) => {
    expect(toBase(value, base)).toBe(digits);
    expect(fromBase(digits, base)).toBe(value);
  });

  it('round-trips every value of every range', () => {
    for (const base of [2, 5, 16] as const) {
      const [min, max] = RANGES[base];
      for (let value = min; value <= max; value++) {
        expect(fromBase(toBase(value, base), base)).toBe(value);
      }
    }
  });
});

describe('generateNumberSystems', () => {
  const questions = sample(7);

  it('draws every base and both directions, within the ranges', () => {
    const seen = new Set<string>();
    for (const question of questions) {
      const { direction, base, value } = parts(question);
      seen.add(`${direction}:${base}`);
      expect(question.topic).toBe('numberSystems');
      expect(value).toBeGreaterThanOrEqual(RANGES[base][0]);
      expect(value).toBeLessThanOrEqual(RANGES[base][1]);
      if (base === 16) expect(toBase(value, 16)).toMatch(/[A-F]/);
    }
    expect(seen.size).toBe(6);
  });

  it('accepts its own answer, with the right kind', () => {
    for (const question of questions) {
      const { direction, base, value } = parts(question);
      const step = stepOf(question);
      expect(step.kind).toBe(direction === 'to' ? 'number' : 'baseDigits');
      const expected = direction === 'to' ? String(value) : toBase(value, base);
      expect(step.check(expected).correct).toBe(true);
      expect(step.check(expected).expected).toBe(expected);
      expect(step.prompt).not.toContain('?');
    }
  });

  it('asks to decimal for the value of the digits in the prompt', () => {
    for (const question of questions) {
      const { direction, base, value } = parts(question);
      if (direction !== 'to') continue;
      const digits = stepOf(question).prompt.match(/getal (\S+) als/)![1]!;
      expect(fromBase(digits, base)).toBe(value);
    }
  });

  it('words the prompts', () => {
    expect(stepOf(find('to', 2, 11)).prompt).toBe(
      'Schrijf het tweetallige getal 1011 als gewoon getal.',
    );
    expect(stepOf(find('to', 5, 73)).prompt).toBe(
      'Schrijf het vijftallige getal 243 als gewoon getal.',
    );
    expect(stepOf(find('from', 16, 180)).prompt).toBe('Schrijf 180 in het zestientallig stelsel.');
    expect(stepOf(find('from', 2, 11)).prompt).toBe('Schrijf 11 in het tweetallig stelsel.');
  });

  it.each<[string, Base, number, string]>([
    ['to', 2, 11, '1 × 8 + 0 × 4 + 1 × 2 + 1 × 1 = 8 + 2 + 1 = 11'],
    ['to', 5, 73, '2 × 25 + 4 × 5 + 3 × 1 = 50 + 20 + 3 = 73'],
    ['to', 16, 180, 'B = 11: 11 × 16 + 4 × 1 = 176 + 4 = 180'],
    ['to', 16, 175, 'A = 10, F = 15: 10 × 16 + 15 × 1 = 160 + 15 = 175'],
    ['from', 2, 11, '11 = 8 + 2 + 1 = 1 × 8 + 0 × 4 + 1 × 2 + 1 × 1 → 1011'],
    ['from', 5, 73, '73 = 2 × 25 + 4 × 5 + 3 × 1 → 243'],
    ['from', 16, 180, '180 = 11 × 16 + 4 × 1 en B = 11 → B4'],
  ])('explains %s base %i, %i', (direction, base, value, explanation) => {
    expect(stepOf(find(direction, base, value)).check('').explanation).toBe(explanation);
  });

  it('leaves out the middle part when only one digit is non-zero', () => {
    // Base 2 values start at 5, so 8 and 32 are in range; 160 is A0.
    expect(stepOf(find('to', 2, 8)).check('').explanation).toBe(
      '1 × 8 + 0 × 4 + 0 × 2 + 0 × 1 = 8',
    );
    expect(stepOf(find('to', 16, 160)).check('').explanation).toBe('A = 10: 10 × 16 + 0 × 1 = 160');
    expect(stepOf(find('from', 2, 32)).check('').explanation).toBe(
      '32 = 1 × 32 + 0 × 16 + 0 × 8 + 0 × 4 + 0 × 2 + 0 × 1 → 100000',
    );
  });

  it('ignores leading zeros and gives no tip for a wrong digit string', () => {
    const step = stepOf(find('from', 2, 11));
    expect(step.check('01011').correct).toBe(true);
    const wrong = step.check('1012');
    expect(wrong.correct).toBe(false);
    expect(wrong.tip).toBeUndefined();
  });
});
