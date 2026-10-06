import { describe, expect, it } from 'vitest';
import { formatInteger } from '../format';
import { createRng } from '../random';
import { NO, YES } from '../steps';
import type { Question, Step } from '../types';
import {
  checkRule,
  COMBINED_FACTORS,
  divisibilityExplanation,
  DIVISORS,
  generateDivisibility,
  isCombined,
  MAX_DIGITS,
  MAX_SHORT_DIGITS,
  MIN_DIGITS,
  NEAR_MISS_REMAINDERS,
  SHORT_NUMBER_DIVISORS,
  type Divisor,
  type RuleDivisor,
} from './divisibility';

const SAMPLES = 3000;
const RULE_DIVISORS: readonly RuleDivisor[] = [2, 3, 4, 5, 7, 8, 9, 11, 13];

function sample(seed: number, count = SAMPLES): Question[] {
  const rng = createRng(seed);
  return Array.from({ length: count }, () => generateDivisibility(rng));
}

function stepOf(question: Question): Step {
  return question.steps[0]!;
}

function parts(question: Question): { n: number; divisor: Divisor } {
  const [, n, divisor] = question.key.split(':');
  return { n: Number(n), divisor: Number(divisor) as Divisor };
}

const questions = sample(41);

describe('generateDivisibility', () => {
  it('asks a Ja/Nee question about a number of the right length', () => {
    for (const question of questions) {
      const { n, divisor } = parts(question);
      const step = stepOf(question);
      expect(question.topic).toBe('divisibility');
      expect(step.kind).toBe('boolean');
      expect(DIVISORS).toContain(divisor);
      expect(step.prompt).toBe(`Is ${formatInteger(n)} deelbaar door ${divisor}?`);
      const maxDigits = SHORT_NUMBER_DIVISORS.includes(divisor) ? MAX_SHORT_DIGITS : MAX_DIGITS;
      expect(String(n).length).toBeGreaterThanOrEqual(MIN_DIGITS);
      expect(String(n).length).toBeLessThanOrEqual(maxDigits);
      const expected = n % divisor === 0 ? YES : NO;
      expect(step.check(expected)).toEqual({
        correct: true,
        expected,
        explanation: divisibilityExplanation(n, divisor),
      });
    }
  });

  it('makes half of the numbers divisible', () => {
    const divisible = questions.filter((q) => parts(q).n % parts(q).divisor === 0).length;
    expect(divisible / SAMPLES).toBeGreaterThan(0.46);
    expect(divisible / SAMPLES).toBeLessThan(0.54);
  });

  it('makes every non-divisible number a close call', () => {
    for (const question of questions) {
      const { n, divisor } = parts(question);
      const remainder = n % divisor;
      if (remainder === 0) continue;
      expect(NEAR_MISS_REMAINDERS[divisor].flat()).toContain(remainder);
      if (isCombined(divisor)) {
        const [first, second] = COMBINED_FACTORS[divisor];
        expect(n % first === 0, `${n} / ${divisor}`).not.toBe(n % second === 0);
      }
    }
  });

  it('uses every divisor and every allowed number length', () => {
    expect(new Set(questions.map((q) => parts(q).divisor))).toEqual(new Set(DIVISORS));
    const lengths = (short: boolean) =>
      new Set(
        questions
          .filter((q) => SHORT_NUMBER_DIVISORS.includes(parts(q).divisor) === short)
          .map((q) => String(parts(q).n).length),
      );
    expect(lengths(false)).toEqual(new Set([3, 4, 5]));
    expect(lengths(true)).toEqual(new Set([3, 4]));
  });

  it('is deterministic for a fixed seed', () => {
    const keys = (seed: number) => sample(seed, 50).map((q) => q.key);
    expect(keys(5)).toEqual(keys(5));
  });
});

describe('divisibilityExplanation', () => {
  it.each([
    [2718, 2, 'Laatste cijfer 8 → deelbaar door 2'],
    [305, 5, 'Laatste cijfer 5 → deelbaar door 5'],
    [2718, 9, 'Cijfersom 2 + 7 + 1 + 8 = 18 → deelbaar door 9'],
    [2718, 4, 'Laatste twee cijfers 18 → niet deelbaar door 4'],
    [2718, 8, 'Laatste drie cijfers 718 → niet deelbaar door 8'],
    [2718, 11, 'Alternerende som 2 − 7 + 1 − 8 = −12 → niet deelbaar door 11'],
    [2718, 7, '2718 = 2100 + 560 + 56 + rest 2 → niet deelbaar door 7'],
    [2716, 7, '2716 = 2100 + 560 + 56 → deelbaar door 7'],
    [1001, 13, '1001 = 910 + 91 → deelbaar door 13'],
    [
      1246,
      6,
      'Deelbaar door 2 (laatste cijfer 6) en niet deelbaar door 3 (cijfersom 1 + 2 + 4 + 6 = 13) → niet deelbaar door 6',
    ],
    [
      1236,
      12,
      'Deelbaar door 3 (cijfersom 1 + 2 + 3 + 6 = 12) en deelbaar door 4 (laatste twee cijfers 36) → deelbaar door 12',
    ],
    [
      2716,
      14,
      'Deelbaar door 2 (laatste cijfer 6) en deelbaar door 7 (2716 = 2100 + 560 + 56) → deelbaar door 14',
    ],
    [
      2715,
      15,
      'Deelbaar door 3 (cijfersom 2 + 7 + 1 + 5 = 15) en deelbaar door 5 (laatste cijfer 5) → deelbaar door 15',
    ],
  ] as const)('explains %i and %i', (n, divisor, expected) => {
    expect(divisibilityExplanation(n, divisor)).toBe(expected);
  });
});

/** Re-derives the verdict from the numbers in the reason alone, so a wrong reason fails. */
function evidenceSaysDivisible(n: number, divisor: RuleDivisor, reason: string): boolean {
  const lastDigits = /^laatste (?:cijfer|twee cijfers|drie cijfers) (\d+)$/.exec(reason);
  if (lastDigits) {
    const digits = lastDigits[1]!;
    const width = divisor === 4 ? 2 : divisor === 8 ? 3 : 1;
    expect(digits).toBe(String(n).slice(-width));
    return Number(digits) % divisor === 0;
  }
  const digitSum = /^cijfersom (.+) = (\d+)$/.exec(reason);
  if (digitSum) {
    const terms = digitSum[1]!.split(' + ');
    expect(terms.join('')).toBe(String(n));
    const sum = Number(digitSum[2]);
    expect(sum).toBe(terms.reduce((total, digit) => total + Number(digit), 0));
    return sum % divisor === 0;
  }
  const alternating = /^alternerende som (.+) = (−?\d+)$/.exec(reason);
  if (alternating) {
    const tokens = alternating[1]!.split(' ');
    let sum = Number(tokens[0]);
    for (let i = 1; i < tokens.length; i += 2) {
      sum += (tokens[i] === '−' ? -1 : 1) * Number(tokens[i + 1]);
    }
    expect(tokens.filter((_, i) => i % 2 === 0).join('')).toBe(String(n));
    expect(Number(alternating[2]!.replace('−', '-'))).toBe(sum);
    return sum % divisor === 0;
  }
  const chunked = /^(\d+) = (.+)$/.exec(reason);
  if (chunked) {
    expect(Number(chunked[1])).toBe(n);
    const terms = chunked[2]!.split(' + ');
    const last = terms.at(-1)!;
    const rest = last.startsWith('rest ') ? Number(last.slice('rest '.length)) : 0;
    const multiples = (rest > 0 ? terms.slice(0, -1) : terms).map(Number);
    for (const multiple of multiples) {
      expect(multiple).toBeGreaterThan(0);
      expect(multiple % divisor).toBe(0);
    }
    expect(multiples.reduce((total, multiple) => total + multiple, rest)).toBe(n);
    expect(rest).toBeLessThan(divisor);
    return rest === 0;
  }
  throw new Error(`Unknown reason: ${reason}`);
}

describe('every reachable case', () => {
  it('states evidence that agrees with actual divisibility for every 3- and 4-digit number', () => {
    for (let n = 100; n <= 9999; n++) {
      for (const divisor of RULE_DIVISORS) {
        const { divisible, reason } = checkRule(n, divisor);
        const message = `${n} / ${divisor}: ${reason}`;
        expect(divisible, message).toBe(n % divisor === 0);
        expect(evidenceSaysDivisible(n, divisor, reason), message).toBe(divisible);
      }
    }
  });

  it('applies the digit rules to 5-digit numbers too', () => {
    for (let n = 10_000; n <= 99_999; n += 7) {
      for (const divisor of [2, 3, 4, 5, 8, 9, 11] as const) {
        const { divisible, reason } = checkRule(n, divisor);
        expect(evidenceSaysDivisible(n, divisor, reason), `${n} / ${divisor}`).toBe(divisible);
      }
    }
  });

  it('concludes correctly for every divisor and combines the right rules', () => {
    for (let n = 100; n <= 9999; n++) {
      for (const divisor of DIVISORS) {
        const text = divisibilityExplanation(n, divisor);
        const verdict = n % divisor === 0 ? 'deelbaar' : 'niet deelbaar';
        expect(text.endsWith(` → ${verdict} door ${divisor}`), text).toBe(true);
        if (!isCombined(divisor)) continue;
        const stated = [...text.matchAll(/(niet deelbaar|deelbaar) door (\d+) \(([^)]+)\)/gi)];
        expect(stated.map((match) => Number(match[2])), text).toEqual([...COMBINED_FACTORS[divisor]]);
        for (const [, partVerdict, factor, reason] of stated) {
          const rule = checkRule(n, Number(factor) as RuleDivisor);
          expect(partVerdict!.toLowerCase() === 'deelbaar', text).toBe(rule.divisible);
          expect(reason, text).toBe(rule.reason);
        }
      }
    }
  });
});
