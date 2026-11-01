import { describe, expect, it } from 'vitest';
import { gcd, lcm } from '../primes';
import { createRng } from '../random';
import type { Question } from '../types';
import {
  generateRemainders,
  sameRemainderExplanation,
  smallestWithRemainders,
  twoRemaindersExplanation,
} from './remainders';
import { answerOf, stepOf, typed } from './testHelpers';

const SAMPLES = 6000;

const rng = createRng(62);
const questions: Question[] = Array.from({ length: SAMPLES }, () => generateRemainders(rng));

function withForm(form: string): Question[] {
  return questions.filter((question) => question.key.split(':')[1] === form);
}

function answer(question: Question): number {
  return Number(typed(answerOf(question)));
}

/** The values kL + r with k ≥ 1 strictly between lo and hi. */
function solutions(l: number, r: number, lo: number, hi: number): number[] {
  const found: number[] = [];
  for (let value = l + r; value < hi; value += l) if (value > lo) found.push(value);
  return found;
}

const SETS = ['2-3', '3-4', '4-6', '2-5', '3-5', '4-5', '2-3-4', '2-3-5', '2-3-4-5', '3-4-5'];

describe('remainders: same remainder', () => {
  const rows = withForm('same');

  it('uses the listed divisor sets and bounds with exactly one solution', () => {
    const seenSets = new Set<string>();
    for (const question of rows) {
      const [, , setText, rText, loText, hiText] = question.key.split(':');
      const divisors = setText!.split('-').map(Number);
      const [r, lo, hi] = [rText, loText, hiText].map(Number) as [number, number, number];
      const l = divisors.reduce(lcm);
      const step = stepOf(question);
      seenSets.add(setText!);
      expect(question.topic).toBe('remainders');
      expect(step.kind).toBe('number');
      expect(step.suffix).toBeUndefined();
      expect(SETS).toContain(setText);
      expect(l).toBeLessThanOrEqual(60);
      expect(r).toBeGreaterThanOrEqual(1);
      expect(r).toBeLessThanOrEqual(Math.min(...divisors) - 1);
      expect(lo % 10).toBe(0);
      expect(hi % 10).toBe(0);
      expect(hi).toBeLessThanOrEqual(200);
      expect(lo).toBeLessThan(hi);
      const found = solutions(l, r, lo, hi);
      expect(found).toHaveLength(1);
      for (const bound of [lo, hi]) expect(bound % l === r && bound > l).toBe(false);
      expect(answer(question)).toBe(found[0]);
      const list =
        divisors.length === 2
          ? `${divisors[0]} en ${divisors[1]}`
          : `${divisors.slice(0, -1).join(', ')} en ${divisors[divisors.length - 1]}`;
      expect(step.prompt).toBe(
        `Een getal tussen ${lo} en ${hi} geeft bij delen door ${list} steeds rest ${r}. Welk getal is het?`,
      );
    }
    expect([...seenSets].sort()).toEqual([...SETS].sort());
  });

  it('writes the explanation with the LCM', () => {
    expect(sameRemainderExplanation([2, 3, 4, 5], 1, 61)).toBe(
      'KGV van 2, 3, 4 en 5 = 60 → 60 + 1 = 61',
    );
    expect(sameRemainderExplanation([4, 5], 1, 21)).toBe('KGV van 4 en 5 = 20 → 20 + 1 = 21');
    expect(sameRemainderExplanation([2, 3, 4, 5], 1, 121)).toBe(
      'KGV van 2, 3, 4 en 5 = 60 → 2 × 60 + 1 = 121',
    );
  });
});

describe('remainders: groups', () => {
  const rows = withForm('groups');

  it('uses two group sizes from [3, 8] with lcm at most 40 and a unique count', () => {
    for (const question of rows) {
      const [, , aText, bText, rText, loText, hiText] = question.key.split(':');
      const [a, b, r, lo, hi] = [aText, bText, rText, loText, hiText].map(Number) as number[] as [
        number,
        number,
        number,
        number,
        number,
      ];
      const step = stepOf(question);
      expect(step.suffix).toBe('kinderen');
      for (const size of [a, b]) {
        expect(size).toBeGreaterThanOrEqual(3);
        expect(size).toBeLessThanOrEqual(8);
      }
      expect(a).not.toBe(b);
      expect(lcm(a, b)).toBeLessThanOrEqual(40);
      expect(r).toBeGreaterThanOrEqual(1);
      expect(r).toBeLessThan(Math.min(a, b));
      expect(hi).toBeLessThanOrEqual(200);
      const found = solutions(lcm(a, b), r, lo, hi);
      expect(found).toHaveLength(1);
      expect(answer(question)).toBe(found[0]);
      const over = r === 1 ? 'blijft er 1 kind over' : `blijven er ${r} kinderen over`;
      const first = step.prompt.match(/groepjes van (\d+)/)![1];
      const second = step.prompt.match(/bij groepjes van (\d+) ook/)![1];
      expect([Number(first), Number(second)].sort()).toEqual([a, b].sort());
      expect(step.prompt).toBe(
        `Bij groepjes van ${first} ${over}, bij groepjes van ${second} ook. Er zijn tussen de ${lo} en ${hi} kinderen. Hoeveel?`,
      );
    }
    expect(rows.length / SAMPLES).toBeGreaterThan(0.3);
  });
});

describe('remainders: two remainders', () => {
  const rows = withForm('two');

  it('uses coprime moduli in [3, 9] and the smallest solution of at most 60', () => {
    const remainders = new Set<number>();
    for (const question of rows) {
      const [, , m1Text, r1Text, m2Text, r2Text] = question.key.split(':');
      const [m1, r1, m2, r2] = [m1Text, r1Text, m2Text, r2Text].map(Number) as [
        number,
        number,
        number,
        number,
      ];
      const step = stepOf(question);
      expect(gcd(m1, m2)).toBe(1);
      expect(m1).toBeGreaterThan(m2);
      for (const m of [m1, m2]) {
        expect(m).toBeGreaterThanOrEqual(3);
        expect(m).toBeLessThanOrEqual(9);
      }
      expect(r1).toBeGreaterThanOrEqual(1);
      expect(r1).toBeLessThanOrEqual(m1 - 1);
      expect(r2).toBeGreaterThanOrEqual(1);
      expect(r2).toBeLessThanOrEqual(m2 - 1);
      const x = answer(question);
      expect(x).toBeLessThanOrEqual(60);
      expect(x % m1).toBe(r1);
      expect(x % m2).toBe(r2);
      for (let smaller = 1; smaller < x; smaller++) {
        expect(smaller % m1 === r1 && smaller % m2 === r2).toBe(false);
      }
      expect(step.prompt).toBe(
        `Wat is het kleinste getal dat bij delen door ${m1} rest ${r1} geeft en bij delen door ${m2} rest ${r2}?`,
      );
      remainders.add(r1);
    }
    expect(rows.length / SAMPLES).toBeGreaterThan(0.3);
    expect(remainders.size).toBeGreaterThan(3);
  });

  it('gives the spec answer and explanation', () => {
    expect(smallestWithRemainders(4, 2, 3, 1)).toBe(10);
    expect(twoRemaindersExplanation(4, 2, 3, 1)).toBe(
      'rest 2 bij 4: 2, 6, 10 → 10 : 3 = 3 rest 1 → 10',
    );
  });
});

describe('remainders: forms', () => {
  it('uses the three forms equally', () => {
    for (const form of ['same', 'groups', 'two']) {
      const share = withForm(form).length / SAMPLES;
      expect(share, form).toBeGreaterThan(0.3);
      expect(share, form).toBeLessThan(0.37);
    }
  });
});
