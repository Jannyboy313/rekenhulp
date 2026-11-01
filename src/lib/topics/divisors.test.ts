import { describe, expect, it } from 'vitest';
import { gcd, isPrime, lcm, primeFactors } from '../primes';
import { createRng } from '../random';
import { fromInteger } from '../rational';
import type { Question } from '../types';
import {
  countExplanation,
  divisorCount,
  factorizationExplanation,
  generateDivisors,
} from './divisors';
import { answerOf, stepOf, typed } from './testHelpers';

const SAMPLES = 4000;

const rng = createRng(60);
const questions: Question[] = Array.from({ length: SAMPLES }, () => generateDivisors(rng));

function withForm(form: string): Question[] {
  return questions.filter((question) => question.key.split(':')[1] === form);
}

function numbersOf(question: Question, skip: number): number[] {
  return question.key.split(':').slice(skip).map(Number);
}

const SUPERSCRIPTS: Record<string, string> = { '²': '2', '³': '3' };

/** '2² × 3 × 5' → 60 */
function parseFactorization(text: string): number {
  return text.split(' × ').reduce((product, term) => {
    const base = Number(term.replace(/[²³]/, ''));
    const exponent = Number(SUPERSCRIPTS[term.slice(-1)] ?? 1);
    return product * base ** exponent;
  }, 1);
}

describe('divisors', () => {
  it('accepts its own answer and has no suffix', () => {
    for (const question of questions) {
      const step = stepOf(question);
      expect(question.topic).toBe('divisors');
      expect(step.kind).toBe('number');
      expect(step.suffix).toBeUndefined();
      expect(step.check(typed(answerOf(question))).correct).toBe(true);
    }
  });

  it('uses the three forms equally', () => {
    for (const form of ['count', 'three', 'factorization']) {
      const share = withForm(form).length / SAMPLES;
      expect(share, form).toBeGreaterThan(0.29);
      expect(share, form).toBeLessThan(0.38);
    }
  });

  it('counts the divisors of composites in [12, 120] with 4 to 12 divisors', () => {
    const rows = withForm('count');
    for (const question of rows) {
      const [n] = numbersOf(question, 2) as [number];
      expect(isPrime(n)).toBe(false);
      expect(n).toBeGreaterThanOrEqual(12);
      expect(n).toBeLessThanOrEqual(120);
      const count = divisorCount(n);
      expect(count).toBeGreaterThanOrEqual(4);
      expect(count).toBeLessThanOrEqual(12);
      expect(stepOf(question).prompt).toBe(`Hoeveel delers heeft ${n}?`);
      expect(answerOf(question)).toEqual(fromInteger(count));
    }
    expect(new Set(rows.map((question) => question.key)).size).toBeGreaterThan(40);
  });

  it('counts correctly', () => {
    expect(divisorCount(36)).toBe(9);
    expect(divisorCount(12)).toBe(6);
    expect(divisorCount(100)).toBe(9);
    expect(countExplanation(36)).toBe('1 × 36, 2 × 18, 3 × 12, 4 × 9, 6 × 6 → 9 delers');
    expect(countExplanation(12)).toBe('1 × 12, 2 × 6, 3 × 4 → 6 delers');
  });

  it('asks KGV and GGD of three numbers within the spec ranges', () => {
    const rows = withForm('three');
    const kinds = new Set<string>();
    for (const question of rows) {
      const kind = question.key.split(':')[2]!;
      const numbers = numbersOf(question, 3);
      const [a, b, c] = numbers as [number, number, number];
      kinds.add(kind);
      expect(new Set(numbers).size).toBe(3);
      expect(numbers).toEqual([...numbers].sort((x, y) => x - y));
      const prompt = stepOf(question).prompt;
      expect(prompt).toBe(`${kind.toUpperCase()} van ${a}, ${b} en ${c} = ?`);
      if (kind === 'kgv') {
        for (const n of numbers) {
          expect(n).toBeGreaterThanOrEqual(2);
          expect(n).toBeLessThanOrEqual(20);
          for (const other of numbers) if (other !== n) expect(other % n).not.toBe(0);
        }
        expect(lcm(lcm(a, b), c)).toBeLessThanOrEqual(360);
        expect(answerOf(question)).toEqual(fromInteger(lcm(lcm(a, b), c)));
      } else {
        const g = gcd(gcd(a, b), c);
        expect(g).toBeGreaterThanOrEqual(2);
        expect(g).toBeLessThanOrEqual(25);
        expect(c).toBeLessThanOrEqual(200);
        for (const n of numbers) expect(n / g).toBeGreaterThanOrEqual(2);
        expect(answerOf(question)).toEqual(fromInteger(g));
      }
    }
    expect([...kinds].sort()).toEqual(['ggd', 'kgv']);
  });

  it('explains three numbers with three factorizations', () => {
    const kgv = withForm('three').find((q) => q.key.split(':')[2] === 'kgv')!;
    expect(stepOf(kgv).check('0').explanation).toMatch(/^.+, .+ en .+ → KGV = /);
    const ggd = withForm('three').find((q) => q.key.split(':')[2] === 'ggd')!;
    expect(stepOf(ggd).check('0').explanation).toMatch(/^.+, .+ en .+ → GGD = /);
  });

  it('asks from a factorization with primes 2, 3, 5, 7 and exponents at most 3', () => {
    const rows = withForm('factorization');
    const kinds = new Set<string>();
    for (const question of rows) {
      const kind = question.key.split(':')[2]!;
      const [a, b] = numbersOf(question, 3) as [number, number];
      kinds.add(kind);
      for (const n of [a, b]) {
        expect(n).toBeGreaterThan(1);
        expect(n).toBeLessThanOrEqual(1000);
        for (const { prime, exponent } of primeFactors(n)) {
          expect([2, 3, 5, 7]).toContain(prime);
          expect(exponent).toBeLessThanOrEqual(3);
        }
      }
      expect(a).not.toBe(b);
      const prompt = stepOf(question).prompt;
      const match = /^a = (.+) en b = (.+)\. (KGV|GGD) van a en b = \?$/.exec(prompt)!;
      expect(match, prompt).not.toBeNull();
      expect([parseFactorization(match[1]!), parseFactorization(match[2]!)].sort((x, y) => x - y)).toEqual(
        [a, b],
      );
      expect(match[3]).toBe(kind.toUpperCase());
      if (kind === 'kgv') {
        expect(lcm(a, b)).toBeLessThanOrEqual(2000);
        expect(answerOf(question)).toEqual(fromInteger(lcm(a, b)));
      } else {
        expect(gcd(a, b)).toBeGreaterThanOrEqual(2);
        expect(answerOf(question)).toEqual(fromInteger(gcd(a, b)));
      }
    }
    expect([...kinds].sort()).toEqual(['ggd', 'kgv']);
  });

  it('writes the factorization explanations of the spec', () => {
    expect(factorizationExplanation('ggd', 2 * 2 * 3 * 5, 2 * 3 * 3 * 7)).toBe(
      'gemeenschappelijk: 2 × 3 → GGD = 6',
    );
    expect(factorizationExplanation('kgv', 2 * 2 * 3 * 5, 2 * 3 * 3 * 7)).toBe(
      'hoogste machten: 2² × 3² × 5 × 7 → KGV = 1260',
    );
  });
});
