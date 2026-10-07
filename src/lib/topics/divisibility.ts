import { formatInteger, MINUS } from '../format';
import { pick, randomInt, type Rng } from '../random';
import { booleanStep } from '../steps';
import type { Question } from '../types';

/** Divisors with a rule of their own (spec §5.6). 7 and 13 use chunking. */
export type RuleDivisor = 2 | 3 | 4 | 5 | 7 | 8 | 9 | 11 | 13;
/** Divisors that combine the rules of two coprime factors. */
type CombinedDivisor = 6 | 12 | 14 | 15;
export type Divisor = RuleDivisor | CombinedDivisor;

/** 2 to 15 without 10, like the tables. */
export const DIVISORS: readonly Divisor[] = [2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14, 15];

export const COMBINED_FACTORS: Record<CombinedDivisor, readonly [RuleDivisor, RuleDivisor]> = {
  6: [2, 3],
  12: [3, 4],
  14: [2, 7],
  15: [3, 5],
};

/** No digit rule, so these get at most 4 digits. */
export const SHORT_NUMBER_DIVISORS: readonly Divisor[] = [7, 13, 14];
export const MIN_DIGITS = 3;
export const MAX_DIGITS = 5;
export const MAX_SHORT_DIGITS = 4;
const DIVISIBLE_SHARE = 0.5;

/** Remainders of the non-divisible numbers: close calls, in one or two groups (spec §5.6). */
export const NEAR_MISS_REMAINDERS: Record<Divisor, readonly (readonly number[])[]> = {
  2: [[1]],
  3: [[1, 2]],
  4: [[2]],
  5: [[1, 2, 3, 4]],
  6: [[2, 4], [3]],
  7: [[1, 2, 5, 6]],
  8: [[2, 4, 6]],
  9: [[1, 2, 7, 8]],
  11: [[1, 2, 9, 10]],
  12: [
    [4, 8],
    [3, 6, 9],
  ],
  13: [[1, 2, 11, 12]],
  14: [[2, 4, 6, 8, 10, 12], [7]],
  15: [
    [5, 10],
    [3, 6, 9, 12],
  ],
};

export function isCombined(divisor: Divisor): divisor is CombinedDivisor {
  return divisor in COMBINED_FACTORS;
}

/** `Is 2718 deelbaar door 9?` */
export function generateDivisibility(rng: Rng): Question {
  const divisor = pick(rng, DIVISORS);
  const maxDigits = SHORT_NUMBER_DIVISORS.includes(divisor) ? MAX_SHORT_DIGITS : MAX_DIGITS;
  const digits = randomInt(rng, MIN_DIGITS, maxDigits);
  const min = 10 ** (digits - 1);
  const max = 10 ** digits - 1;
  const remainder =
    rng() < DIVISIBLE_SHARE ? 0 : pick(rng, pick(rng, NEAR_MISS_REMAINDERS[divisor]));
  const quotient = randomInt(
    rng,
    Math.ceil((min - remainder) / divisor),
    Math.floor((max - remainder) / divisor),
  );
  const n = divisor * quotient + remainder;
  return {
    key: `divisibility:${n}:${divisor}`,
    topic: 'divisibility',
    steps: [
      booleanStep({
        prompt: `Is ${formatInteger(n)} deelbaar door ${divisor}?`,
        answer: remainder === 0,
        explanation: divisibilityExplanation(n, divisor),
      }),
    ],
  };
}

interface RuleCheck {
  divisible: boolean;
  /** Lowercase evidence, e.g. 'cijfersom 2 + 7 + 1 + 8 = 18'. */
  reason: string;
}

/** The rule of one divisor as it applies to n. */
export function checkRule(n: number, divisor: RuleDivisor): RuleCheck {
  const digits = String(n);
  const divisible = n % divisor === 0;
  switch (divisor) {
    case 2:
    case 5:
      return { divisible, reason: `laatste cijfer ${digits.slice(-1)}` };
    case 4:
      return { divisible, reason: `laatste twee cijfers ${digits.slice(-2)}` };
    case 8:
      return { divisible, reason: `laatste drie cijfers ${digits.slice(-3)}` };
    case 3:
    case 9:
      return { divisible, reason: `cijfersom ${digitSum(digits)}` };
    case 11:
      return { divisible, reason: `alternerende som ${alternatingSum(digits)}` };
    case 7:
    case 13:
      return { divisible, reason: chunks(n, divisor) };
  }
}

/** '2 + 7 + 1 + 8 = 18' */
function digitSum(digits: string): string {
  const values = [...digits].map(Number);
  return `${values.join(' + ')} = ${values.reduce((sum, value) => sum + value, 0)}`;
}

/** '2 − 7 + 1 − 8 = −12': plus at the leftmost digit, then alternating. */
function alternatingSum(digits: string): string {
  const values = [...digits].map(Number);
  const terms = values.map((value, index) =>
    index === 0 ? String(value) : `${index % 2 === 1 ? MINUS : '+'} ${value}`,
  );
  const sum = values.reduce(
    (total, value, index) => (index % 2 === 0 ? total + value : total - value),
    0,
  );
  return `${terms.join(' ')} = ${formatInteger(sum)}`;
}

/** Chunking ('happen'): one multiple per non-zero digit of the quotient, then the remainder. */
function chunks(n: number, divisor: number): string {
  const quotient = String(Math.floor(n / divisor));
  const remainder = n % divisor;
  const parts = [...quotient]
    .map((digit, index) => divisor * Number(digit) * 10 ** (quotient.length - 1 - index))
    .filter((part) => part > 0)
    .map(formatInteger);
  if (remainder > 0) parts.push(`rest ${remainder}`);
  return `${formatInteger(n)} = ${parts.join(' + ')}`;
}

function verdict(divisible: boolean): string {
  return divisible ? 'deelbaar' : 'niet deelbaar';
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * 'Cijfersom 2 + 7 + 1 + 8 = 18 → deelbaar door 9', or for a combined divisor both rules:
 * 'Deelbaar door 2 (laatste cijfer 6) en niet deelbaar door 3 (…) → niet deelbaar door 6'.
 */
export function divisibilityExplanation(n: number, divisor: Divisor): string {
  const conclusion = `${verdict(n % divisor === 0)} door ${divisor}`;
  if (!isCombined(divisor)) return `${capitalize(checkRule(n, divisor).reason)} → ${conclusion}`;
  const parts = COMBINED_FACTORS[divisor].map((factor) => {
    const { divisible, reason } = checkRule(n, factor);
    return `${verdict(divisible)} door ${factor} (${reason})`;
  });
  return `${capitalize(parts.join(' en '))} → ${conclusion}`;
}
