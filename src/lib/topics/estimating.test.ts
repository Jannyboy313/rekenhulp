import { describe, expect, it } from 'vitest';
import { GROUP_SEPARATOR as S } from '../format';
import { createRng } from '../random';
import { hasAtMostDecimals, parseDutchNumber } from '../rational';
import type { Question } from '../types';
import { estimateOptions, estimatingQuestion, generateEstimating } from './estimating';
import { decimal, stepOf } from './testHelpers';

const SAMPLES = 2000;

const ask = (context: Parameters<typeof estimatingQuestion>[0], ...numbers: string[]) =>
  stepOf(estimatingQuestion(context, numbers.map(decimal), createRng(5)));

describe('estimateOptions', () => {
  it('always uses the one set whose options have at most 2 decimals', () => {
    for (let seed = 1; seed <= 50; seed++) {
      expect(estimateOptions(decimal('12,5'), 'km', createRng(seed))).toEqual([
        '1,25 km',
        '12,5 km',
        '125 km',
        '1250 km',
      ]);
    }
  });

  it('uses both sets when both fit', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 50; seed++) {
      seen.add(estimateOptions(decimal('36'), 'm', createRng(seed)).join(' | '));
    }
    expect(seen).toEqual(
      new Set(['3,6 m | 36 m | 360 m | 3600 m', '0,36 m | 3,6 m | 36 m | 360 m']),
    );
  });

  it('writes a large option with a group separator', () => {
    const options = new Set<string>();
    for (let seed = 1; seed <= 50; seed++) {
      for (const option of estimateOptions(decimal('2500'), 'stappen', createRng(seed))) {
        options.add(option);
      }
    }
    expect(options).toContain(`25${S}000 stappen`);
    expect(options).toContain('2500 stappen');
  });
});

describe('estimatingQuestion', () => {
  it('estimates the height of a flat', () => {
    const step = ask('flat', '12');
    expect(step.prompt).toBe('Een flat heeft 12 woonlagen. Hoe hoog is de flat ongeveer?');
    expect(step.check('36 m')).toEqual({
      correct: true,
      expected: '36 m',
      explanation: '1 woonlaag ≈ 3 m → 12 × 3 = 36 m',
    });
    expect(step.check('3,6 m').correct).toBe(false);
  });

  it('writes 0,5 uur as een half uur', () => {
    const step = ask('wandelen', '0,5');
    expect(step.prompt).toBe('Je wandelt een half uur. Hoe ver kom je ongeveer?');
    expect(step.check('').expected).toBe('2,5 km');
    expect(ask('wandelen', '2,5').check('').explanation).toBe(
      'wandelen ≈ 5 km/u → 2,5 × 5 = 12,5 km',
    );
    expect(ask('fietsen', '3').check('').explanation).toBe('fietsen ≈ 17 km/u → 3 × 17 = 51 km');
    expect(ask('fietsen', '3').check('').expected).toBe('51 km');
  });

  it('counts steps of 1 m', () => {
    const step = ask('stappen', '2,5');
    expect(step.prompt).toBe('Je loopt 2,5 km. Hoeveel stappen zet je ongeveer?');
    expect(step.check('').expected).toBe('2500 stappen');
    expect(step.check('').explanation).toBe('1 stap ≈ 1 m → 2,5 km = 2500 m = 2500 stappen');
  });

  it('weighs the water of an aquarium', () => {
    const step = ask('water', '80', '40', '50');
    expect(step.prompt).toBe(
      'Een aquarium is 80 cm lang, 40 cm breed en 50 cm hoog. Hoe zwaar is het water als het vol is, ongeveer?',
    );
    expect(step.check('').expected).toBe('160 kg');
    expect(step.check('').explanation).toBe(
      `80 × 40 × 50 = 160${S}000 cm³ = 160 L, 1 L water ≈ 1 kg → ongeveer 160 kg`,
    );
  });

  it('measures a row of adults', () => {
    const step = ask('mensen', '20');
    expect(step.prompt).toBe(
      '20 volwassenen liggen achter elkaar op de grond. Hoe lang is de rij ongeveer?',
    );
    expect(step.check('').expected).toBe('36 m');
    expect(step.check('').explanation).toBe('1 volwassene ≈ 1,80 m → 20 × 1,80 = 36 m');
  });
});

describe('generateEstimating', () => {
  const rng = createRng(23);
  const questions: Question[] = Array.from({ length: SAMPLES }, () => generateEstimating(rng));

  it('gives four unique ascending options with at most 2 decimals, the answer among them', () => {
    for (const question of questions) {
      const step = question.steps[0]!;
      expect(question.topic).toBe('estimating');
      expect(step.kind).toBe('choice');
      expect(new Set(step.options).size).toBe(4);
      expect(step.options).toContain(step.check('').expected);
      const values = step.options!.map((option) =>
        parseDutchNumber(option.split(' ')[0]!.replaceAll(S, ''))!,
      );
      for (const value of values) expect(hasAtMostDecimals(value, 2)).toBe(true);
      for (let index = 1; index < values.length; index++) {
        const [low, high] = [values[index - 1]!, values[index]!];
        expect(high.num * low.den).toBeGreaterThan(low.num * high.den);
      }
    }
  });

  it('uses all six contexts', () => {
    expect(new Set(questions.map((q) => q.key.split(':')[1]))).toEqual(
      new Set(['flat', 'wandelen', 'fietsen', 'stappen', 'water', 'mensen']),
    );
  });

  it('keeps the numbers within the spec ranges', () => {
    for (const question of questions) {
      const [, context, ...numbers] = question.key.split(':');
      const values = numbers.map((text) => parseDutchNumber(text)!);
      const asNumber = (value: (typeof values)[number]) => Number(value.num) / Number(value.den);
      const first = asNumber(values[0]!);
      if (context === 'flat') {
        expect(first).toBeGreaterThanOrEqual(4);
        expect(first).toBeLessThanOrEqual(20);
      }
      if (context === 'mensen') {
        expect(first).toBeGreaterThanOrEqual(5);
        expect(first).toBeLessThanOrEqual(50);
      }
      if (context === 'wandelen') expect([0.5, 1, 1.5, 2, 2.5, 3, 4]).toContain(first);
      if (context === 'fietsen') expect([0.5, 1, 2, 3, 4]).toContain(first);
      if (context === 'stappen') expect([0.5, 1, 1.5, 2, 2.5, 3, 5]).toContain(first);
      if (context === 'water') {
        expect([40, 50, 60, 80, 100]).toContain(first);
        expect([30, 40, 50]).toContain(asNumber(values[1]!));
        expect([30, 40, 50]).toContain(asNumber(values[2]!));
      }
    }
  });
});
