import { describe, expect, it } from 'vitest';
import { gcd, isPrime, lcm } from '../primes';
import { createRng, type Rng } from '../random';
import type { Generator, Question, Step } from '../types';
import {
  gcdExplanation,
  GCD_COPRIME_SHARE,
  generateGcd,
  generateLcm,
  LCM_SHARED_FACTOR_SHARE,
  lcmExplanation,
  MAX_COMMON_FACTOR,
  MAX_GCD_TERM,
  MAX_LCM,
  MAX_LCM_TERM,
  MIN_COMMON_FACTOR,
  MIN_COPRIME_TERM,
  MIN_LCM_TERM,
} from './numberTheory';

const SAMPLES = 3000;

function sample(generator: Generator, seed: number, count = SAMPLES): Question[] {
  const rng: Rng = createRng(seed);
  return Array.from({ length: count }, () => generator(rng));
}

function stepOf(question: Question): Step {
  return question.steps[0]!;
}

function expectedOf(question: Question): string {
  return stepOf(question).check('').expected;
}

/** The two numbers in prompt order, e.g. 'KGV van 12 en 18 = ?' → [12, 18]. */
function termsOf(question: Question, name: 'KGV' | 'GGD'): [number, number] {
  const match = new RegExp(`^${name} van (\\d+) en (\\d+) = \\?$`).exec(stepOf(question).prompt);
  expect(match, stepOf(question).prompt).not.toBeNull();
  return [Number(match![1]), Number(match![2])];
}

function share(questions: Question[], predicate: (question: Question) => boolean): number {
  return questions.filter(predicate).length / questions.length;
}

describe('generateLcm', () => {
  const questions = sample(generateLcm, 7);

  it('asks for the LCM of two different numbers in range', () => {
    for (const question of questions) {
      const [a, b] = termsOf(question, 'KGV');
      expect(question.topic).toBe('lcm');
      expect(question.key).toBe(`lcm:${Math.min(a, b)}:${Math.max(a, b)}`);
      expect(a).not.toBe(b);
      for (const term of [a, b]) {
        expect(term).toBeGreaterThanOrEqual(MIN_LCM_TERM);
        expect(term).toBeLessThanOrEqual(MAX_LCM_TERM);
      }
      expect(lcm(a, b)).toBeLessThanOrEqual(MAX_LCM);
      expect(expectedOf(question)).toBe(String(lcm(a, b)));
      expect(stepOf(question).check(expectedOf(question))).toEqual({
        correct: true,
        expected: String(lcm(a, b)),
        explanation: lcmExplanation(a, b),
      });
    }
  });

  it('makes most pairs share a factor', () => {
    const shared = share(questions, (q) => gcd(...termsOf(q, 'KGV')) > 1);
    expect(shared).toBeGreaterThan(LCM_SHARED_FACTOR_SHARE - 0.04);
    expect(shared).toBeLessThan(LCM_SHARED_FACTOR_SHARE + 0.04);
  });

  it('puts the larger number first about half of the time', () => {
    const largerFirst = share(questions, (q) => {
      const [a, b] = termsOf(q, 'KGV');
      return a > b;
    });
    expect(largerFirst).toBeGreaterThan(0.45);
    expect(largerFirst).toBeLessThan(0.55);
  });

  it('is deterministic for a fixed seed', () => {
    const keys = (seed: number) => sample(generateLcm, seed, 50).map((q) => q.key);
    expect(keys(5)).toEqual(keys(5));
  });
});

describe('lcmExplanation', () => {
  it.each([
    [12, 18, '12 = 2² × 3 en 18 = 2 × 3² → KGV = 2² × 3² = 36'],
    [4, 13, '4 = 2² en 13 is priem → KGV = 2² × 13 = 52'],
    [8, 4, '8 = 2³ en 4 = 2² → KGV = 2³ = 8'],
  ])('explains the LCM of %i and %i', (a, b, expected) => {
    expect(lcmExplanation(a, b)).toBe(expected);
  });
});

describe('generateGcd', () => {
  const questions = sample(generateGcd, 11);
  const coprime = questions.filter((q) => expectedOf(q) === '1');
  const shared = questions.filter((q) => expectedOf(q) !== '1');

  it('asks for the GCD and accepts its own answer', () => {
    for (const question of questions) {
      const [a, b] = termsOf(question, 'GGD');
      expect(question.topic).toBe('gcd');
      expect(question.key).toBe(`gcd:${Math.min(a, b)}:${Math.max(a, b)}`);
      expect(a).not.toBe(b);
      expect(Math.max(a, b)).toBeLessThanOrEqual(MAX_GCD_TERM);
      expect(expectedOf(question)).toBe(String(gcd(a, b)));
      expect(stepOf(question).check(expectedOf(question))).toEqual({
        correct: true,
        expected: String(gcd(a, b)),
        explanation: gcdExplanation(a, b),
      });
    }
  });

  it('makes about 10% of the pairs coprime composites', () => {
    expect(coprime.length / SAMPLES).toBeGreaterThan(GCD_COPRIME_SHARE - 0.025);
    expect(coprime.length / SAMPLES).toBeLessThan(GCD_COPRIME_SHARE + 0.025);
    for (const question of coprime) {
      for (const term of termsOf(question, 'GGD')) {
        expect(term).toBeGreaterThanOrEqual(MIN_COPRIME_TERM);
        expect(isPrime(term)).toBe(false);
      }
    }
  });

  it('uses every common factor from 2 to 30 for the other pairs', () => {
    const factors = new Set(shared.map((q) => Number(expectedOf(q))));
    const expected = Array.from(
      { length: MAX_COMMON_FACTOR - MIN_COMMON_FACTOR + 1 },
      (_, index) => MIN_COMMON_FACTOR + index,
    );
    expect([...factors].sort((x, y) => x - y)).toEqual(expected);
  });

  it('is deterministic for a fixed seed', () => {
    const keys = (seed: number) => sample(generateGcd, seed, 50).map((q) => q.key);
    expect(keys(5)).toEqual(keys(5));
  });
});

describe('gcdExplanation', () => {
  it.each([
    [84, 126, '84 = 2² × 3 × 7 en 126 = 2 × 3² × 7 → GGD = 2 × 3 × 7 = 42'],
    [35, 48, '35 = 5 × 7 en 48 = 2⁴ × 3 → geen gemeenschappelijke priemfactor, GGD = 1'],
    [13, 26, '13 is priem en 26 = 2 × 13 → GGD = 13'],
    [24, 40, '24 = 2³ × 3 en 40 = 2³ × 5 → GGD = 2³ = 8'],
  ])('explains the GCD of %i and %i', (a, b, expected) => {
    expect(gcdExplanation(a, b)).toBe(expected);
  });
});
