import { describe, expect, it } from 'vitest';
import { evaluate } from '../expr/evaluate';
import { parse } from '../expr/parser';
import { GROUP_SEPARATOR, formatRational } from '../format';
import { createRng } from '../random';
import { hasAtMostDecimals, equals } from '../rational';
import {
  DERIVATIONS,
  drawDerivedFact,
  generateDerivedFacts,
  MAX_PRODUCT,
  variantsOf,
} from './derivedFacts';
import { answerOf, stepOf, typed } from './testHelpers';

const SAMPLES = 3000;
const rng = createRng(64);
const facts = Array.from({ length: SAMPLES }, () => drawDerivedFact(rng));

describe('drawDerivedFact (spec §5.64)', () => {
  it('has a given fact a × b with a in [13, 99], b in [12, 49], no multiples of 10, product ≤ 5000', () => {
    for (const { a, b } of facts) {
      expect(a).toBeGreaterThanOrEqual(13);
      expect(a).toBeLessThanOrEqual(99);
      expect(b).toBeGreaterThanOrEqual(12);
      expect(b).toBeLessThanOrEqual(49);
      expect(a % 10).not.toBe(0);
      expect(b % 10).not.toBe(0);
      expect(a * b).toBeLessThanOrEqual(MAX_PRODUCT);
    }
  });

  it('asks a sum whose value is the answer, with at most 2 decimals', () => {
    for (const { asked, answer } of facts) {
      const value = evaluate(parse(asked.replaceAll(GROUP_SEPARATOR, ''))!)!;
      expect(equals(value, answer), asked).toBe(true);
      expect(hasAtMostDecimals(answer, 2)).toBe(true);
    }
  });

  it('uses every derivation about equally often and every variant', () => {
    for (const derivation of DERIVATIONS) {
      const share = facts.filter((f) => f.derivation === derivation).length / SAMPLES;
      expect(share).toBeGreaterThan(0.2);
      expect(share).toBeLessThan(0.3);
    }
    const variants = (derivation: string) =>
      new Set(facts.filter((f) => f.derivation === derivation).map((f) => f.variant));
    expect(variants('oneMoreLess')).toEqual(new Set([0, 1, 2, 3]));
    expect(variants('inverse')).toEqual(new Set([0, 1]));
    expect(variants('doubleHalve')).toEqual(new Set([0, 1, 2]));
    expect(variants('factorOfTen')).toEqual(new Set([0, 1, 2]));
  });

  it('halves only an even b', () => {
    for (const f of facts.filter((x) => x.derivation === 'doubleHalve' && x.variant > 0)) {
      expect(f.b % 2).toBe(0);
    }
  });

  it('gives the fixed cases of the spec for 37 × 24 = 888', () => {
    const cases = [
      ['oneMoreLess', 0, '37 × 25', '925', '37 × 25 = 37 × 24 + 37 = 888 + 37 = 925'],
      ['inverse', 0, '888 : 24', '37', '888 : 24 = 37, want 37 × 24 = 888'],
      ['doubleHalve', 2, '74 × 12', '888', '74 × 12 = 37 × 2 × 24 : 2 = 888'],
      ['factorOfTen', 1, '3,7 × 24', '88,8', '3,7 × 24 = 888 : 10 = 88,8'],
    ] as const;
    for (const [derivation, variant, asked, answer, explanation] of cases) {
      const found = variantsOf(37, 24)[derivation][variant]!;
      expect(found.asked).toBe(asked);
      expect(formatRational(found.answer)).toBe(answer);
      expect(found.explanation).toBe(explanation);
    }
  });
});

describe('generateDerivedFacts', () => {
  const questions = Array.from({ length: SAMPLES }, () => generateDerivedFacts(rng));

  it('states the given fact, accepts the answer and has a stable key', () => {
    for (const question of questions) {
      const step = stepOf(question);
      expect(question.topic).toBe('derivedFacts');
      expect(step.kind).toBe('number');
      expect(step.prompt).toMatch(/^\d+ × \d+ = [\d ]+\. Hoeveel is [^=]+\?$/);
      expect(step.check(typed(answerOf(question))).correct).toBe(true);
      expect(step.check('').explanation).toContain('=');
      expect(question.key).toMatch(/^derivedFacts:\d+ × \d+:[a-zA-Z]+:\d$/);
    }
  });

});
