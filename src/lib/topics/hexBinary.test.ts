import { describe, expect, it } from 'vitest';
import { createRng } from '../random';
import { generateHexBinary } from './hexBinary';
import { stepOf } from './testHelpers';
import type { Question } from '../types';

const SAMPLES = 1000;

function sample(seed: number): Question[] {
  const rng = createRng(seed);
  return Array.from({ length: SAMPLES }, () => generateHexBinary(rng));
}

function parts(question: Question): { direction: string; value: number } {
  const [, direction, value] = question.key.split(':');
  return { direction: direction!, value: Number(value) };
}

/** The question for a key, drawn with the rng until it turns up. */
function find(direction: string, value: number): Question {
  const rng = createRng(1);
  for (let attempt = 0; attempt < 200000; attempt++) {
    const question = generateHexBinary(rng);
    if (question.key === `hexBinary:${direction}:${value}`) return question;
  }
  throw new Error(`no question for ${direction}:${value}`);
}

describe('generateHexBinary', () => {
  const questions = sample(11);

  it('draws values in [32, 255] with a letter in the hex numeral, in both directions', () => {
    const seen = new Set<string>();
    for (const question of questions) {
      const { direction, value } = parts(question);
      seen.add(direction);
      expect(question.topic).toBe('hexBinary');
      expect(value).toBeGreaterThanOrEqual(32);
      expect(value).toBeLessThanOrEqual(255);
      expect(value.toString(16).toUpperCase()).toMatch(/[A-F]/);
    }
    expect([...seen].sort()).toEqual(['toBinary', 'toHex']);
  });

  it('asks the numeral it has not shown, without leading zeros, in the right kind', () => {
    for (const question of questions) {
      const { direction, value } = parts(question);
      const step = stepOf(question);
      expect(step.kind).toBe('baseDigits');
      if (direction === 'toHex') {
        expect(step.prompt).toBe(
          `Schrijf het tweetallige getal ${value.toString(2)} in het zestientallig stelsel.`,
        );
      } else {
        expect(step.prompt).toBe(
          `Schrijf het zestientallige getal ${value.toString(16).toUpperCase()} in het tweetallig stelsel.`,
        );
      }
      expect(step.prompt).not.toContain('?');
      expect(step.prompt.length).toBeLessThanOrEqual(170);
    }
  });

  it('accepts its own answer, and the answer with leading zeros', () => {
    for (const question of questions) {
      const { direction, value } = parts(question);
      const step = stepOf(question);
      const expected = direction === 'toHex' ? value.toString(16).toUpperCase() : value.toString(2);
      expect(step.check(expected)).toMatchObject({ correct: true, expected });
      expect(step.check(`0${expected}`).correct).toBe(true);
    }
  });

  it('rejects a wrong answer', () => {
    for (const question of questions) {
      const { direction, value } = parts(question);
      const other = value === 255 ? 254 : value + 1;
      const wrong = direction === 'toHex' ? other.toString(16).toUpperCase() : other.toString(2);
      expect(stepOf(question).check(wrong).correct).toBe(false);
    }
  });

  it('explains the answer and ends with it', () => {
    for (const question of questions) {
      const { direction, value } = parts(question);
      const step = stepOf(question);
      const expected = direction === 'toHex' ? value.toString(16).toUpperCase() : value.toString(2);
      const explanation = step.check('').explanation;
      expect(explanation).toBeTruthy();
      expect(explanation!.endsWith(`→ ${expected}`)).toBe(true);
    }
  });

  it('draws both directions for many distinct keys, each key with one question', () => {
    const byKey = new Map<string, string>();
    for (const question of questions) {
      const prompt = stepOf(question).prompt;
      const previous = byKey.get(question.key);
      if (previous !== undefined) expect(previous).toBe(prompt);
      byKey.set(question.key, prompt);
    }
    expect(byKey.size).toBeGreaterThan(150);
  });
});

describe('hexBinary explanations', () => {
  it.each<[string, number, string, string]>([
    [
      'toHex',
      183,
      'B7',
      'groepjes van 4 vanaf rechts: 1011 | 0111 → 1011 = 11 = B en 0111 = 7 → B7',
    ],
    ['toHex', 62, '3E', 'groepjes van 4 vanaf rechts: 0011 | 1110 → 0011 = 3 en 1110 = 14 = E → 3E'],
    ['toBinary', 62, '111110', '3 = 0011 en E = 14 = 1110 → 0011 1110 → 111110'],
  ])('%s %i → %s', (direction, value, answer, explanation) => {
    const step = stepOf(find(direction, value));
    expect(step.check('').explanation).toBe(explanation);
    expect(step.check(answer).correct).toBe(true);
  });

  it('writes a zero group as 0', () => {
    expect(stepOf(find('toHex', 160)).check('').explanation).toBe(
      'groepjes van 4 vanaf rechts: 1010 | 0000 → 1010 = 10 = A en 0000 = 0 → A0',
    );
  });
});
