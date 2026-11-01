import { describe, expect, it } from 'vitest';
import { createRng } from '../random';
import { fromInteger, hasAtMostDecimals, isInteger, rational } from '../rational';
import { hasSlot } from '../slot';
import type { Question } from '../types';
import { niceWholesBetween } from './niceWholes';
import {
  conversionQuestion,
  generatePermille,
  permilleOfQuestion,
  PERMILLES,
  whatPermilleQuestion,
} from './permille';
import { answerOf, decimal, stepOf, typed } from './testHelpers';

const SAMPLES = 2000;

function sample(): Question[] {
  const rng = createRng(53);
  return Array.from({ length: SAMPLES }, () => generatePermille(rng));
}

describe('niceWholesBetween', () => {
  it('keeps at most 2 significant digits inside the bounds', () => {
    const wholes = niceWholesBetween(20, 400);
    expect(wholes).toContain(20);
    expect(wholes).toContain(85);
    expect(wholes).toContain(400);
    expect(wholes).not.toContain(19);
    expect(wholes).not.toContain(357);
    expect(wholes).not.toContain(410);
    expect(new Set(wholes).size).toBe(wholes.length);
  });
});

describe('permille fixed cases', () => {
  it('3‰ van 4000', () => {
    const step = stepOf(permilleOfQuestion(3, 4000));
    expect(step.prompt).toBe('3‰ van 4000 = ?');
    expect(step.check('12')).toEqual({
      correct: true,
      expected: '12',
      explanation: '1‰ = 4000 : 1000 = 4 → 3‰ = 3 × 4 = 12',
    });
  });

  it('25‰ = ?%', () => {
    const step = stepOf(conversionQuestion('toPercent', fromInteger(25)));
    expect(step.prompt).toBe('25‰ = ?%');
    expect(step.suffix).toBe('%');
    expect(step.check('2,5')).toMatchObject({ correct: true, expected: '2,5' });
    expect(step.check('2,5').explanation).toBe('1% = 10‰ → 25 : 10 = 2,5');
  });

  it('0,5% = ?‰', () => {
    const step = stepOf(conversionQuestion('toPermille', decimal('0,5')));
    expect(step.prompt).toBe('0,5% = ?‰');
    expect(step.suffix).toBe('‰');
    expect(step.check('5').correct).toBe(true);
  });

  it('7‰ = ?', () => {
    const step = stepOf(conversionQuestion('toDecimal', fromInteger(7)));
    expect(step.prompt).toBe('7‰ = ?');
    expect(step.check('0,007')).toMatchObject({
      correct: true,
      explanation: '1‰ = 0,001 → 7‰ = 0,007',
    });
  });

  it('6 is ?‰ van 2000', () => {
    const step = stepOf(whatPermilleQuestion(3, 2000));
    expect(step.prompt).toBe('6 is ?‰ van 2000');
    expect(step.suffix).toBe('‰');
    expect(step.check('3')).toMatchObject({
      correct: true,
      explanation: '1‰ = 2000 : 1000 = 2 → 6 : 2 = 3',
    });
    expect(step.check('4').correct).toBe(false);
  });
});

describe('generatePermille', () => {
  const questions = sample();

  it('is a number step per question, with the unknown as the slot or a part of the prompt', () => {
    for (const question of questions) {
      expect(question.topic).toBe('permille');
      expect(question.steps).toHaveLength(1);
      expect(question.steps[0]!.kind).toBe('number');
    }
  });

  it('accepts its own expected answer', () => {
    for (const question of questions) {
      const step = question.steps[0]!;
      expect(step.check(typed(answerOf(question))).correct, step.prompt).toBe(true);
    }
  });

  it('uses all three forms with equal probability', () => {
    const forms = new Map<string, number>();
    for (const { key } of questions) {
      const form = key.split(':')[1]!;
      forms.set(form, (forms.get(form) ?? 0) + 1);
    }
    expect([...forms.keys()].sort()).toEqual(['convert', 'of', 'what']);
    for (const count of forms.values()) {
      expect(count / SAMPLES).toBeGreaterThan(0.28);
      expect(count / SAMPLES).toBeLessThan(0.38);
    }
  });

  it('draws part of a whole from the listed permilles and nice wholes with integer parts', () => {
    const wholes = new Set(niceWholesBetween(1000, 900_000));
    const seen = new Set<number>();
    for (const { key } of questions.filter(({ key }) => /:(of|what):/.test(key))) {
      const [, , permille, whole] = key.split(':').map(Number) as [number, number, number, number];
      expect(PERMILLES).toContain(permille);
      expect(wholes.has(whole), key).toBe(true);
      expect((whole * permille) % 1000, key).toBe(0);
      seen.add(permille);
    }
    expect(seen.size).toBe(PERMILLES.length);
  });

  it('answers the form of: the part of the whole', () => {
    for (const question of questions.filter(({ key }) => key.startsWith('permille:of:'))) {
      const [, , permille, whole] = question.key.split(':').map(Number) as [
        string,
        string,
        number,
        number,
      ];
      expect(isInteger(answerOf(question))).toBe(true);
      expect(answerOf(question)).toEqual(fromInteger((permille * whole) / 1000));
    }
  });

  it('keeps conversions within the spec ranges and directions', () => {
    const directions = new Set<string>();
    for (const question of questions.filter(({ key }) => key.includes(':convert:'))) {
      const [, , direction, shown] = question.key.split(':') as [string, string, string, string];
      directions.add(direction);
      const value = decimal(shown);
      if (direction === 'toPermille') {
        expect(['0,1', '0,2', '0,5', '1', '1,5', '2', '2,5', '5', '10', '12,5']).toContain(shown);
        expect(isInteger(answerOf(question))).toBe(true);
      } else {
        expect(isInteger(value)).toBe(true);
        expect(Number(shown)).toBeGreaterThanOrEqual(1);
        expect(Number(shown)).toBeLessThanOrEqual(99);
      }
      if (direction === 'toPercent') expect(hasAtMostDecimals(answerOf(question), 1)).toBe(true);
      if (direction === 'toDecimal') {
        expect(answerOf(question)).toEqual(rational(BigInt(shown), 1000n));
      }
    }
    expect([...directions].sort()).toEqual(['toDecimal', 'toPercent', 'toPermille']);
  });

  it('writes the unknown as the slot, never a literal question mark', () => {
    for (const { steps } of questions) expect(hasSlot(steps[0]!.prompt)).toBe(true);
    for (const { steps } of questions) expect(steps[0]!.prompt).not.toContain('?');
  });

  it('keeps the key stable and free of the slot', () => {
    for (const question of questions) {
      expect(question.key).toMatch(/^permille:(of|what|convert):/);
    }
    const first = generatePermille(createRng(7));
    expect(generatePermille(createRng(7)).key).toBe(first.key);
  });
});
