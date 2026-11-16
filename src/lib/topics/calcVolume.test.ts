import { describe, expect, it } from 'vitest';
import { GROUP_SEPARATOR } from '../format';
import { createRng } from '../random';
import { fromInteger, multiply, rational, roundHalfUp, type Rational } from '../rational';
import { hasSlot } from '../slot';
import type { Question } from '../types';
import {
  containerQuestion,
  cylinderQuestion,
  generateCalcVolume,
  sphereQuestion,
} from './calcVolume';
import { nearBoundary, ROUNDING_SENTENCE } from './roundedAnswer';
import { answerOf, decimal, stepOf } from './testHelpers';

const PI = decimal('3,14');

describe('question text (spec §5.99)', () => {
  it.each<[() => Question, string, string, string, string]>([
    [
      () => sphereQuestion(6, 'radius'),
      'Een bol heeft een straal van 6 cm. De inhoud van een bol is 4/3 × π × straal³. Neem π = 3,14. Hoe groot is de inhoud? Rond af op een heel getal.',
      '904',
      'cm³',
      '4 : 3 × 3,14 × 6³ = 904,32 → 904',
    ],
    [
      () => sphereQuestion(12, 'diameter'),
      'Een bol heeft een diameter van 24 cm. De inhoud van een bol is 4/3 × π × straal³. Neem π = 3,14. Hoe groot is de inhoud? Rond af op een heel getal.',
      '7235',
      'cm³',
      'straal = 24 : 2 = 12 → 4 : 3 × 3,14 × 12³ = 7234,56 → 7235',
    ],
    [
      () => sphereQuestion(2, 'radius'),
      'Een bol heeft een straal van 2 cm. De inhoud van een bol is 4/3 × π × straal³. Neem π = 3,14. Hoe groot is de inhoud? Rond af op een heel getal.',
      '33',
      'cm³',
      '4 : 3 × 3,14 × 2³ = 33,493… → 33',
    ],
    [
      () => cylinderQuestion(35, 'radius', 12),
      'Een cilinder heeft een straal van 3,5 cm en een hoogte van 12 cm. Hoe groot is de inhoud? Neem π = 3,14. Rond af op een heel getal.',
      '462',
      'cm³',
      '3,14 × 3,5² × 12 = 461,58 → 462',
    ],
    [
      () => cylinderQuestion(35, 'diameter', 12),
      'Een cilinder heeft een diameter van 7 cm en een hoogte van 12 cm. Hoe groot is de inhoud? Neem π = 3,14. Rond af op een heel getal.',
      '462',
      'cm³',
      'straal = 7 : 2 = 3,5 → 3,14 × 3,5² × 12 = 461,58 → 462',
    ],
    [
      () => containerQuestion(85, 35, 42),
      'Een bak is 85 cm lang, 35 cm breed en 42 cm hoog. Hoeveel liter past erin? Rond af op een heel getal.',
      '125',
      'L',
      `85 × 35 × 42 = 124${GROUP_SEPARATOR}950 cm³ = 124,95 L → 125`,
    ],
    [
      () => containerQuestion(50, 24, 25),
      'Een bak is 50 cm lang, 24 cm breed en 25 cm hoog. Hoeveel liter past erin? Rond af op een heel getal.',
      '30',
      'L',
      `50 × 24 × 25 = 30${GROUP_SEPARATOR}000 cm³ = 30 L`,
    ],
  ])('%#', (build, prompt, answer, suffix, explanation) => {
    const step = stepOf(build());
    expect(step.prompt).toBe(prompt);
    expect(step.suffix).toBe(suffix);
    expect(step.check(answer.replaceAll(GROUP_SEPARATOR, '')).correct).toBe(true);
    expect(step.check('').expected).toBe(answer);
    expect(step.check('1').explanation).toBe(explanation);
  });

  it('has keys of the form, the variant and the numbers', () => {
    expect(sphereQuestion(6, 'diameter').key).toBe('calcVolume:sphere:diameter:6');
    expect(cylinderQuestion(35, 'radius', 12).key).toBe('calcVolume:cylinder:radius:35:12');
    expect(containerQuestion(85, 35, 42).key).toBe('calcVolume:container:85:35:42');
  });

  it('refuses a cylinder whose diameter is not whole', () => {
    expect(() => cylinderQuestion(37, 'diameter', 12)).toThrow(RangeError);
  });
});

describe('generateCalcVolume', () => {
  const rng = createRng(9901);
  const questions = Array.from({ length: 3000 }, () => generateCalcVolume(rng));
  const parts = ({ key }: Question) => key.split(':').slice(1);
  const of = (form: string) => questions.filter((question) => parts(question)[0] === form);

  function exact(question: Question): Rational {
    const [form, a, b, c] = parts(question);
    if (form === 'sphere') {
      return multiply(rational(4n, 3n), multiply(PI, fromInteger(Number(b) ** 3)));
    }
    if (form === 'cylinder') {
      const radius = rational(BigInt(Number(b)), 10n);
      return multiply(PI, multiply(multiply(radius, radius), fromInteger(Number(c))));
    }
    return rational(BigInt(Number(a) * Number(b) * Number(c)), 1000n);
  }

  it('creates single-step number questions with a whole rounded answer', () => {
    for (const question of questions) {
      expect(question.topic).toBe('calcVolume');
      expect(question.steps).toHaveLength(1);
      const step = stepOf(question);
      expect(step.kind).toBe('number');
      const expected = step.check('').expected.replaceAll(GROUP_SEPARATOR, '');
      expect(expected, question.key).toMatch(/^\d+$/);
      expect(step.check(expected).correct, question.key).toBe(true);
      expect(step.check('1').explanation, question.key).toBeTruthy();
      expect(answerOf(question), question.key).toEqual(roundHalfUp(exact(question), 0));
      expect(nearBoundary(exact(question), 0), question.key).toBe(false);
    }
  });

  it('asks the rounding last, in a prompt without a slot of at most 170 characters', () => {
    for (const { steps, key } of questions) {
      const { prompt } = steps[0]!;
      expect(prompt.endsWith(` ${ROUNDING_SENTENCE[0]}`), key).toBe(true);
      expect(hasSlot(prompt), key).toBe(false);
      expect(prompt.length, key).toBeLessThanOrEqual(170);
    }
  });

  it('uses sphere, cylinder and container a third each', () => {
    for (const form of ['sphere', 'cylinder', 'container']) {
      expect(Math.abs(of(form).length / questions.length - 1 / 3), form).toBeLessThan(0.04);
    }
  });

  it('draws spheres with a whole radius in [2, 12], as radius or diameter', () => {
    const seen = new Set<string>();
    for (const question of of('sphere')) {
      const [, given, r] = parts(question);
      expect(Number(r)).toBeGreaterThanOrEqual(2);
      expect(Number(r)).toBeLessThanOrEqual(12);
      seen.add(given!);
      expect(question.steps[0]!.suffix).toBe('cm³');
    }
    expect([...seen].sort()).toEqual(['diameter', 'radius']);
  });

  it('draws cylinders with a radius of one decimal or an odd diameter, height in [5, 30]', () => {
    const seen = new Set<string>();
    for (const question of of('cylinder')) {
      const [, given, tenths, h] = parts(question).map((part, index) =>
        index < 2 ? part : Number(part),
      ) as [string, string, number, number];
      expect(h).toBeGreaterThanOrEqual(5);
      expect(h).toBeLessThanOrEqual(30);
      expect(tenths).toBeGreaterThanOrEqual(15);
      expect(tenths).toBeLessThanOrEqual(95);
      expect(tenths % 10).not.toBe(0);
      if (given === 'diameter') expect(tenths % 10).toBe(5);
      seen.add(given);
    }
    expect([...seen].sort()).toEqual(['diameter', 'radius']);
  });

  it('draws containers in range, length ≥ width, at most one multiple of 10', () => {
    for (const question of of('container')) {
      const [l, b, h] = parts(question).slice(1).map(Number) as [number, number, number];
      expect(l).toBeGreaterThanOrEqual(30);
      expect(l).toBeLessThanOrEqual(120);
      expect(b).toBeGreaterThanOrEqual(20);
      expect(b).toBeLessThanOrEqual(60);
      expect(h).toBeGreaterThanOrEqual(20);
      expect(h).toBeLessThanOrEqual(60);
      expect(l).toBeGreaterThanOrEqual(b);
      expect([l, b, h].filter((size) => size % 10 === 0).length).toBeLessThanOrEqual(1);
      expect(question.steps[0]!.suffix).toBe('L');
    }
  });
});
