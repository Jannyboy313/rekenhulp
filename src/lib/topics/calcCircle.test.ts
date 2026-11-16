import { describe, expect, it } from 'vitest';
import { GROUP_SEPARATOR } from '../format';
import { createRng } from '../random';
import {
  divide,
  equals,
  fromInteger,
  multiply,
  rational,
  roundHalfUp,
  type Rational,
} from '../rational';
import { hasSlot } from '../slot';
import type { Question } from '../types';
import {
  circleAreaQuestion,
  circleBackQuestion,
  circumferenceQuestion,
  generateCalcCircle,
} from './calcCircle';
import { nearBoundary, ROUNDING_SENTENCE } from './roundedAnswer';
import { answerOf, decimal, stepOf, typed } from './testHelpers';

const PI = decimal('3,14');

describe('question text (spec §5.98)', () => {
  it.each<[() => Question, string, string, string, string]>([
    [
      () => circumferenceQuestion(75, 'diameter', 'cm'),
      'Een cirkel heeft een diameter van 7,5 cm. Hoe groot is de omtrek? Neem π = 3,14. Rond af op 1 decimaal.',
      '23,6',
      'cm',
      '3,14 × 7,5 = 23,55 → 23,6',
    ],
    [
      () => circumferenceQuestion(37, 'radius', 'm'),
      'Een cirkel heeft een straal van 3,7 m. Hoe groot is de omtrek? Neem π = 3,14. Rond af op 1 decimaal.',
      '23,2',
      'm',
      'diameter = 2 × 3,7 = 7,4 → 3,14 × 7,4 = 23,236 → 23,2',
    ],
    [
      () => circumferenceQuestion(25, 'radius', 'cm'),
      'Een cirkel heeft een straal van 2,5 cm. Hoe groot is de omtrek? Neem π = 3,14. Rond af op 1 decimaal.',
      '15,7',
      'cm',
      'diameter = 2 × 2,5 = 5 → 3,14 × 5 = 15,7',
    ],
    [
      () => circleAreaQuestion(65, 'radius', 'm'),
      'Een cirkel heeft een straal van 6,5 m. Hoe groot is de oppervlakte? Neem π = 3,14. Rond af op 1 decimaal.',
      '132,7',
      'm²',
      '3,14 × 6,5² = 132,665 → 132,7',
    ],
    [
      () => circleAreaQuestion(75, 'diameter', 'cm'),
      'Een cirkel heeft een diameter van 7,5 cm. Hoe groot is de oppervlakte? Neem π = 3,14. Rond af op 1 decimaal.',
      '44,2',
      'cm²',
      'straal = 7,5 : 2 = 3,75 → 3,14 × 3,75² = 44,15625 → 44,2',
    ],
    [
      () => circleBackQuestion(40, 'diameter', 'cm'),
      'Een cirkel heeft een omtrek van 40 cm. Hoe groot is de diameter? Neem π = 3,14. Rond af op 1 decimaal.',
      '12,7',
      'cm',
      '40 : 3,14 = 12,738… → 12,7',
    ],
    [
      () => circleBackQuestion(40, 'radius', 'cm'),
      'Een cirkel heeft een omtrek van 40 cm. Hoe groot is de straal? Neem π = 3,14. Rond af op 1 decimaal.',
      '6,4',
      'cm',
      'diameter = 40 : 3,14 = 12,738… → straal = 6,369… → 6,4',
    ],
  ])('%#', (build, prompt, answer, suffix, explanation) => {
    const step = stepOf(build());
    expect(step.prompt).toBe(prompt);
    expect(step.suffix).toBe(suffix);
    expect(step.check(answer).correct).toBe(true);
    expect(step.check('').expected).toBe(answer);
    expect(step.check('1').explanation).toBe(explanation);
  });

  it('has keys of the form, the variant, the unit and the number', () => {
    expect(circumferenceQuestion(75, 'diameter', 'cm').key).toBe(
      'calcCircle:circumference:diameter:cm:75',
    );
    expect(circleAreaQuestion(65, 'radius', 'm').key).toBe('calcCircle:area:radius:m:65');
    expect(circleBackQuestion(40, 'radius', 'cm').key).toBe('calcCircle:back:radius:cm:40');
  });
});

describe('generateCalcCircle', () => {
  const rng = createRng(9801);
  const questions = Array.from({ length: 3000 }, () => generateCalcCircle(rng));
  const parts = ({ key }: Question) => key.split(':').slice(1);

  /** The exact value, worked out again from the key. */
  function exact(question: Question): Rational {
    const [form, variant, , text] = parts(question);
    const number = Number(text);
    if (form === 'back') {
      const diameter = divide(fromInteger(number), PI);
      return variant === 'diameter' ? diameter : divide(diameter, fromInteger(2));
    }
    const length = rational(BigInt(number), 10n);
    if (form === 'circumference') {
      return multiply(PI, variant === 'diameter' ? length : multiply(fromInteger(2), length));
    }
    const radius = variant === 'radius' ? length : divide(length, fromInteger(2));
    return multiply(PI, multiply(radius, radius));
  }

  it('creates single-step number questions with a rounded answer of 1 decimal', () => {
    for (const question of questions) {
      expect(question.topic).toBe('calcCircle');
      expect(question.steps).toHaveLength(1);
      const step = stepOf(question);
      expect(step.kind).toBe('number');
      const { expected } = step.check('');
      expect(expected.replaceAll(GROUP_SEPARATOR, ''), question.key).toMatch(/^\d+,\d$/);
      expect(step.check(expected.replaceAll(GROUP_SEPARATOR, '')).correct, question.key).toBe(true);
      expect(step.check('1').explanation, question.key).toBeTruthy();
      expect(answerOf(question), question.key).toEqual(roundHalfUp(exact(question), 1));
    }
  });

  it('asks the rounding last, in a prompt without a slot of at most 170 characters', () => {
    for (const { steps, key } of questions) {
      const { prompt } = steps[0]!;
      expect(prompt.endsWith(` Neem π = 3,14. ${ROUNDING_SENTENCE[1]}`), key).toBe(true);
      expect(hasSlot(prompt), key).toBe(false);
      expect(prompt.length, key).toBeLessThanOrEqual(170);
    }
  });

  it('rejects the unrounded value and stays clear of a rounding boundary', () => {
    for (const question of questions) {
      const value = exact(question);
      expect(nearBoundary(value, 1), question.key).toBe(false);
      // The value with three decimals, as someone who did not round would type it.
      const unrounded = roundHalfUp(value, 3);
      if (!equals(unrounded, answerOf(question))) {
        expect(question.steps[0]!.check(typed(unrounded)).correct, question.key).toBe(false);
      }
    }
  });

  it('uses the three forms a third each, both variants and both units', () => {
    const seen = new Set<string>();
    for (const form of ['circumference', 'area', 'back']) {
      const of = questions.filter((question) => parts(question)[0] === form);
      expect(Math.abs(of.length / questions.length - 1 / 3), form).toBeLessThan(0.04);
      for (const question of of) seen.add(parts(question).slice(0, 3).join(':'));
    }
    expect(seen.size).toBe(12);
  });

  it('keeps the numbers in range', () => {
    for (const question of questions) {
      const [form, , unit, text] = parts(question);
      const number = Number(text);
      expect(['cm', 'm']).toContain(unit);
      if (form === 'back') {
        expect(number).toBeGreaterThanOrEqual(10);
        expect(number).toBeLessThanOrEqual(200);
      } else {
        // Tenths: one decimal that is not whole, in [1,5; 25].
        expect(number).toBeGreaterThanOrEqual(15);
        expect(number).toBeLessThan(250);
        expect(number % 10).not.toBe(0);
      }
      const suffix = question.steps[0]!.suffix;
      expect(suffix).toBe(form === 'area' ? `${unit}²` : unit);
    }
  });
});
