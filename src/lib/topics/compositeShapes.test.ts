import { describe, expect, it } from 'vitest';
import { createRng } from '../random';
import { fromInteger } from '../rational';
import type { Question } from '../types';
import {
  areQuestion,
  cornerQuestion,
  factorPairs,
  fixedAreaQuestion,
  generateCompositeShapes,
  pathQuestion,
} from './compositeShapes';
import { answerOf, decimal, stepOf } from './testHelpers';

describe('question text', () => {
  it.each<[string, () => Question, string, string, string, string]>([
    [
      'hoek eruit, omtrek',
      () => cornerQuestion(8, 6, 3, 2, 'omtrek'),
      'Uit een rechthoek van 8 m bij 6 m is een hoek van 3 m bij 2 m weggehaald. Hoe groot is de omtrek?',
      '28',
      'm',
      'omtrek: de hoek verschuift twee zijden naar binnen, de omtrek blijft 2 × (8 + 6) = 28',
    ],
    [
      'hoek eruit, oppervlakte',
      () => cornerQuestion(8, 6, 3, 2, 'oppervlakte'),
      'Uit een rechthoek van 8 m bij 6 m is een hoek van 3 m bij 2 m weggehaald. Hoe groot is de oppervlakte?',
      '42',
      'm²',
      'oppervlakte: 8 × 6 − 3 × 2 = 42',
    ],
    [
      'pad 1 m',
      () => pathQuestion(10, 6, decimal('1')),
      'Een gazon van 10 m bij 6 m heeft rondom een pad van 1 m breed. Hoe groot is de oppervlakte van het pad?',
      '36',
      'm²',
      '12 × 8 − 10 × 6 = 96 − 60 = 36',
    ],
    [
      'pad 0,5 m',
      () => pathQuestion(10, 6, decimal('0,5')),
      'Een gazon van 10 m bij 6 m heeft rondom een pad van 0,5 m breed. Hoe groot is de oppervlakte van het pad?',
      '17',
      'm²',
      '11 × 7 − 10 × 6 = 77 − 60 = 17',
    ],
    [
      'pad 2 m',
      () => pathQuestion(20, 12, decimal('2')),
      'Een gazon van 20 m bij 12 m heeft rondom een pad van 2 m breed. Hoe groot is de oppervlakte van het pad?',
      '144',
      'm²',
      '24 × 16 − 20 × 12 = 384 − 240 = 144',
    ],
    [
      'hectare',
      () => areQuestion(250, 80, 'hectare'),
      'Een weiland is 250 m lang en 80 m breed. Hoeveel hectare is dat?',
      '2',
      'ha',
      '250 × 80 = 20 000 m² = 2 ha',
    ],
    [
      'are',
      () => areQuestion(250, 80, 'are'),
      'Een weiland is 250 m lang en 80 m breed. Hoeveel are is dat?',
      '200',
      'are',
      '250 × 80 = 20 000 m² = 200 are',
    ],
    [
      'hectare met decimalen',
      () => areQuestion(20, 30, 'hectare'),
      'Een weiland is 20 m lang en 30 m breed. Hoeveel hectare is dat?',
      '0,06',
      'ha',
      '20 × 30 = 600 m² = 0,06 ha',
    ],
    [
      'kleinste omtrek',
      () => fixedAreaQuestion(24, 'kleinste'),
      'Een rechthoek heeft een oppervlakte van 24 cm². De zijden zijn hele cm. Wat is de kleinste mogelijke omtrek?',
      '20',
      'cm',
      '1 × 24, 2 × 12, 3 × 8, 4 × 6 → 4 × 6: 2 × (4 + 6) = 20',
    ],
    [
      'grootste omtrek',
      () => fixedAreaQuestion(24, 'grootste'),
      'Een rechthoek heeft een oppervlakte van 24 cm². De zijden zijn hele cm. Wat is de grootste mogelijke omtrek?',
      '50',
      'cm',
      '1 × 24, 2 × 12, 3 × 8, 4 × 6 → 1 × 24: 2 × (1 + 24) = 50',
    ],
  ])('%s', (_label, make, prompt, answer, suffix, explanation) => {
    const step = stepOf(make());
    expect(step.kind).toBe('number');
    expect(step.prompt).toBe(prompt);
    expect(step.suffix).toBe(suffix);
    expect(step.check(answer).correct).toBe(true);
    expect(step.check('').expected).toBe(answer);
    expect(step.check('1').explanation).toBe(explanation);
  });

  it('has keys of the form and the numbers', () => {
    expect(cornerQuestion(8, 6, 3, 2, 'omtrek').key).toBe('compositeShapes:corner:omtrek:8:6:3:2');
    expect(pathQuestion(10, 6, decimal('0,5')).key).toBe('compositeShapes:path:10:6:0,5');
    expect(areQuestion(250, 80, 'hectare').key).toBe('compositeShapes:are:hectare:250:80');
    expect(fixedAreaQuestion(24, 'kleinste').key).toBe('compositeShapes:fixed:kleinste:24');
    expect(fixedAreaQuestion(24, 'kleinste').topic).toBe('compositeShapes');
  });

  it('lists the factor pairs of an area', () => {
    expect(factorPairs(24)).toEqual([
      [1, 24],
      [2, 12],
      [3, 8],
      [4, 6],
    ]);
    expect(factorPairs(36)).toHaveLength(5);
  });
});

describe('generateCompositeShapes', () => {
  const rng = createRng(7101);
  const questions = Array.from({ length: 4000 }, () => generateCompositeShapes(rng));
  const parts = ({ key }: Question) => key.split(':').slice(1);
  const of = (form: string) => questions.filter((question) => parts(question)[0] === form);

  it('creates single-step number questions that accept their own answer', () => {
    for (const question of questions) {
      expect(question.topic).toBe('compositeShapes');
      expect(question.steps).toHaveLength(1);
      const step = stepOf(question);
      expect(step.kind).toBe('number');
      const result = step.check(step.check('').expected);
      expect(result.correct, question.key).toBe(true);
      expect(result.explanation, question.key).toBeTruthy();
    }
  });

  it('uses the four forms about a quarter each', () => {
    for (const form of ['corner', 'path', 'are', 'fixed']) {
      expect(Math.abs(of(form).length / questions.length - 0.25), form).toBeLessThan(0.04);
    }
  });

  it('draws corners within the ranges, asking area or perimeter 50/50', () => {
    const corners = of('corner').map(parts);
    for (const [, , l, b, c, d] of corners) {
      expect(Number(l)).toBeGreaterThanOrEqual(5);
      expect(Number(l)).toBeLessThanOrEqual(20);
      expect(Number(b)).toBeGreaterThanOrEqual(4);
      expect(Number(b)).toBeLessThanOrEqual(15);
      expect(Number(c)).toBeGreaterThanOrEqual(1);
      expect(Number(c)).toBeLessThanOrEqual(Number(l) - 2);
      expect(Number(d)).toBeGreaterThanOrEqual(1);
      expect(Number(d)).toBeLessThanOrEqual(Number(b) - 2);
    }
    const omtrek = corners.filter(([, measure]) => measure === 'omtrek').length / corners.length;
    expect(Math.abs(omtrek - 0.5)).toBeLessThan(0.06);
    for (const question of of('corner')) {
      const [, , l, b, c, d] = parts(question).map(Number);
      const isPerimeter = parts(question)[1] === 'omtrek';
      expect(answerOf(question), question.key).toEqual(
        fromInteger(isPerimeter ? 2 * (l! + b!) : l! * b! - c! * d!),
      );
    }
  });

  it('draws paths with every width and the right area', () => {
    const widths = new Set<string>();
    for (const question of of('path')) {
      const [, l, b, w] = parts(question);
      widths.add(w!);
      expect(Number(l)).toBeGreaterThanOrEqual(4);
      expect(Number(l)).toBeLessThanOrEqual(20);
      expect(Number(b)).toBeGreaterThanOrEqual(3);
      expect(Number(b)).toBeLessThanOrEqual(12);
      const width = Number(w!.replace(',', '.'));
      const area = (Number(l) + 2 * width) * (Number(b) + 2 * width) - Number(l) * Number(b);
      expect(answerOf(question), question.key).toEqual(decimal(String(area).replace('.', ',')));
    }
    expect(widths).toEqual(new Set(['0,5', '1', '2']));
  });

  it('draws are and hectare 50/50 with sides in tens in [20, 500] and at most 2 decimals', () => {
    const lands = of('are').map(parts);
    const hectares = lands.filter(([, unit]) => unit === 'hectare').length / lands.length;
    expect(Math.abs(hectares - 0.5)).toBeLessThan(0.06);
    for (const question of of('are')) {
      const [, unit, l, b] = parts(question);
      for (const side of [Number(l), Number(b)]) {
        expect(side % 10).toBe(0);
        expect(side).toBeGreaterThanOrEqual(20);
        expect(side).toBeLessThanOrEqual(500);
      }
      const answer = answerOf(question);
      expect(answer.den === 1n || 100n % answer.den === 0n, question.key).toBe(true);
      const divisor = unit === 'are' ? 100 : 10_000;
      expect(answer, question.key).toEqual(
        decimal(String((Number(l) * Number(b)) / divisor).replace('.', ',')),
      );
    }
  });

  it('draws fixed areas in [12, 100] with at least three factor pairs, kleinste or grootste', () => {
    const fixed = of('fixed').map(parts);
    const smallest = fixed.filter(([, kind]) => kind === 'kleinste').length / fixed.length;
    expect(Math.abs(smallest - 0.5)).toBeLessThan(0.06);
    for (const question of of('fixed')) {
      const [, kind, area] = parts(question);
      const pairs = factorPairs(Number(area));
      expect(Number(area)).toBeGreaterThanOrEqual(12);
      expect(Number(area)).toBeLessThanOrEqual(100);
      expect(pairs.length, question.key).toBeGreaterThanOrEqual(3);
      const perimeters = pairs.map(([a, b]) => 2 * (a + b));
      const target = kind === 'kleinste' ? Math.min(...perimeters) : Math.max(...perimeters);
      expect(answerOf(question), question.key).toEqual(fromInteger(target));
    }
  });

  it('is deterministic for a fixed seed', () => {
    const seeded = (seed: number) => {
      const random = createRng(seed);
      return Array.from({ length: 50 }, () => generateCompositeShapes(random).key);
    };
    expect(seeded(7)).toEqual(seeded(7));
    expect(seeded(7)).not.toEqual(seeded(8));
  });
});
