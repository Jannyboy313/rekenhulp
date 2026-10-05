import { describe, expect, it } from 'vitest';
import { NO_BREAK_SPACE } from '../format';
import { createRng } from '../random';
import type { Question, Step } from '../types';
import { NICE_WHOLES } from './percentages';
import {
  divideExplanation,
  generateRatios,
  MAX_RATIO_TERM,
  MAX_SCALED_ANSWER,
  MAX_SCALED_TERM,
  MAX_TOTAL,
  missingTermExplanation,
  SCALING_CONTEXTS,
  scalingExplanation,
  type ScalingContext,
} from './ratios';

const SAMPLES = 3000;

function sample(seed: number, count = SAMPLES): Question[] {
  const rng = createRng(seed);
  return Array.from({ length: count }, () => generateRatios(rng));
}

function stepOf(question: Question): Step {
  return question.steps[0]!;
}

function expectedOf(question: Question): string {
  return stepOf(question).check('').expected;
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

function formOf(question: Question): string {
  return question.key.split(':')[1]!;
}

function context(id: string): ScalingContext {
  return SCALING_CONTEXTS.find((candidate) => candidate.id === id)!;
}

const questions = sample(31);
const missing = questions.filter((q) => formOf(q) === 'missing');
const scaling = questions.filter((q) => formOf(q) === 'scale');
const dividing = questions.filter((q) => formOf(q) === 'divide');

describe('generateRatios', () => {
  it('creates single-step integer questions that accept their own answer', () => {
    for (const question of questions) {
      expect(question.topic).toBe('ratios');
      expect(question.steps).toHaveLength(1);
      expect(stepOf(question).kind).toBe('number');
      expect(expectedOf(question)).toMatch(/^\d+$/);
      const result = stepOf(question).check(expectedOf(question));
      expect(result.correct).toBe(true);
      expect(result.explanation).toBeTruthy();
    }
  });

  it('uses the three forms about equally often', () => {
    expect(missing.length + scaling.length + dividing.length).toBe(SAMPLES);
    for (const form of [missing, scaling, dividing]) {
      expect(form.length / SAMPLES).toBeGreaterThan(0.28);
      expect(form.length / SAMPLES).toBeLessThan(0.39);
    }
  });

  it('is deterministic for a fixed seed', () => {
    const keys = (seed: number) => sample(seed, 50).map((question) => question.key);
    expect(keys(5)).toEqual(keys(5));
  });
});

describe('missing term', () => {
  function parts(question: Question) {
    const [a, b, c, d, position] = question.key.split(':').slice(2).map(Number) as [
      number,
      number,
      number,
      number,
      number,
    ];
    return { terms: [a, b, c, d] as const, position };
  }

  it('keeps the two ratios equal and within range', () => {
    for (const question of missing) {
      const { terms, position } = parts(question);
      const [a, b, c, d] = terms;
      expect(a * d).toBe(b * c);
      expect(a).not.toBe(b);
      expect(a).not.toBe(c);
      expect(Math.min(a, b)).toBeGreaterThanOrEqual(1);
      expect(Math.max(a, b)).toBeLessThanOrEqual(MAX_RATIO_TERM);
      expect(Math.max(c, d)).toBeLessThanOrEqual(MAX_SCALED_TERM);
      expect(expectedOf(question)).toBe(String(terms[position]));
      const shown = terms.map((term, index) => (index === position ? '?' : String(term)));
      expect(stepOf(question).prompt).toBe(`${shown[0]} : ${shown[1]} = ${shown[2]} : ${shown[3]}`);
      expect(stepOf(question).check('').explanation).toBe(missingTermExplanation(terms, position));
    }
  });

  it('puts the unknown in each of the four positions about equally often', () => {
    for (const position of [0, 1, 2, 3]) {
      const share = missing.filter((q) => parts(q).position === position).length / missing.length;
      expect(share).toBeGreaterThan(0.2);
      expect(share).toBeLessThan(0.3);
    }
  });

  it('also uses left sides that are not simplified', () => {
    expect(missing.some((q) => gcd(parts(q).terms[0], parts(q).terms[1]) > 1)).toBe(true);
  });

  it.each([
    [[3, 5, 12, 20], 3, '3 : 5 = 12 : 20 (× 4)'],
    [[3, 5, 12, 20], 0, '12 : 20 = 3 : 5 (: 4)'],
    [[4, 6, 10, 15], 3, '4 : 6 = 2 : 3 = 10 : 15'],
    [[4, 6, 10, 15], 1, '10 : 15 = 2 : 3 = 4 : 6'],
  ] as const)('explains %j with the unknown at %i', (terms, position, expected) => {
    expect(missingTermExplanation(terms, position)).toBe(expected);
  });
});

describe('scaling', () => {
  function parts(question: Question) {
    const [, , id, a, amount, b] = question.key.split(':');
    return { context: context(id!), a: Number(a), amount: Number(amount), b: Number(b) };
  }

  it('scales a nice amount to a whole answer', () => {
    for (const question of scaling) {
      const { context, a, amount, b } = parts(question);
      expect(a).not.toBe(b);
      for (const count of [a, b]) {
        expect(count).toBeGreaterThanOrEqual(2);
        expect(count).toBeLessThanOrEqual(MAX_RATIO_TERM);
      }
      expect(NICE_WHOLES).toContain(amount);
      expect(amount).toBeLessThanOrEqual(context.maxAmount);
      expect((amount * gcd(a, b)) % a).toBe(0);
      const answer = (amount * b) / a;
      expect(answer).toBeLessThanOrEqual(MAX_SCALED_ANSWER);
      expect(expectedOf(question)).toBe(String(answer));
      const step = stepOf(question);
      expect(step.prompt).toBe(context.prompt(a, amount, b));
      expect(step.prefix).toBe(context.prefix);
      expect(step.suffix).toBe(context.suffix);
      expect(step.check('').explanation).toBe(scalingExplanation(a, amount, b));
    }
  });

  it('uses every context', () => {
    expect(new Set(scaling.map((q) => parts(q).context.id)).size).toBe(SCALING_CONTEXTS.length);
  });

  it('writes the contexts in Dutch', () => {
    expect(context('pasta').prompt(4, 300, 6)).toBe(
      'Voor 4 personen: 300 g pasta. Hoeveel g voor 6 personen?',
    );
    expect(context('milk').prompt(4, 500, 6)).toBe(
      'Voor 4 personen: 500 ml melk. Hoeveel ml voor 6 personen?',
    );
    expect(context('notebooks').prompt(3, 12, 5)).toBe(
      `3 schriften kosten €${NO_BREAK_SPACE}12. Hoeveel kosten 5 schriften?`,
    );
    expect(context('notebooks').prefix).toBe('€');
  });

  it.each([
    [4, 300, 6, '4 → 300, 2 → 150, 6 → 450'],
    [4, 300, 8, '4 → 300, 8 → 600'],
    [8, 600, 4, '8 → 600, 4 → 300'],
    [3, 90, 5, '3 → 90, 1 → 30, 5 → 150'],
  ])('explains %i → %i, then %i with a ratio table', (a, amount, b, expected) => {
    expect(scalingExplanation(a, amount, b)).toBe(expected);
  });
});

describe('dividing in ratio', () => {
  function parts(question: Question) {
    const [, , total, a, b, size] = question.key.split(':');
    return { total: Number(total), a: Number(a), b: Number(b), largest: size === 'largest' };
  }

  it('divides the total in a simplified ratio', () => {
    for (const question of dividing) {
      const { total, a, b, largest } = parts(question);
      expect(a).not.toBe(b);
      expect(gcd(a, b)).toBe(1);
      expect(Math.max(a, b)).toBeLessThanOrEqual(MAX_RATIO_TERM);
      expect(total % (a + b)).toBe(0);
      expect(total / (a + b)).toBeGreaterThanOrEqual(2);
      expect(total).toBeLessThanOrEqual(MAX_TOTAL);
      const asked = largest ? Math.max(a, b) : Math.min(a, b);
      expect(expectedOf(question)).toBe(String((total / (a + b)) * asked));
      expect(stepOf(question).prompt).toBe(
        `Verdeel ${total} in de verhouding ${a} : ${b}. Hoe groot is het ${largest ? 'grootste' : 'kleinste'} deel?`,
      );
      expect(stepOf(question).check('').explanation).toBe(divideExplanation(total, a, b, asked));
    }
  });

  it('asks for the largest part about half of the time', () => {
    const share = dividing.filter((q) => parts(q).largest).length / dividing.length;
    expect(share).toBeGreaterThan(0.43);
    expect(share).toBeLessThan(0.57);
  });

  it.each([
    [60, 2, 3, 3, '2 + 3 = 5 delen → 1 deel = 60 : 5 = 12 → 3 delen = 36'],
    [60, 2, 3, 2, '2 + 3 = 5 delen → 1 deel = 60 : 5 = 12 → 2 delen = 24'],
    [40, 1, 4, 1, '1 + 4 = 5 delen → 1 deel = 40 : 5 = 8'],
  ])('explains dividing %i in %i : %i', (total, a, b, asked, expected) => {
    expect(divideExplanation(total, a, b, asked)).toBe(expected);
  });
});
