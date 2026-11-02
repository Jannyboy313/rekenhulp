import { drawUntil, pick, randomInt, type Rng } from '../random';
import { textStep } from '../steps';
import type { Question } from '../types';
import { toBase } from './numberSystems';

// Calculating in other bases (spec §5.90).
type SumBase = 2 | 5;

const BASES: readonly SumBase[] = [2, 5];

const ADJECTIVES: Record<SumBase, string> = { 2: 'tweetallig', 5: 'vijftallig' };

/** Decimal terms in [min, max] with a sum of at most `cap`. */
const SUM_RANGES: Record<SumBase, { min: number; max: number; cap: number }> = {
  2: { min: 3, max: 31, cap: 63 },
  5: { min: 6, max: 60, cap: 124 },
};

/** Decimal values before `× 10`: two or three digits in the base. */
const TIMES_RANGES: Record<SumBase, { min: number; max: number }> = {
  2: { min: 3, max: 7 },
  5: { min: 6, max: 124 },
};

const stripLeadingZeros = (input: string) => input.replace(/^0+(?=.)/, '');

/** The number of carries in the column addition of two decimal values in the base. */
export function carries(a: number, b: number, base: SumBase): number {
  let count = 0;
  let carry = 0;
  let x = a;
  let y = b;
  while (x > 0 || y > 0 || carry > 0) {
    carry = (x % base) + (y % base) + carry >= base ? 1 : 0;
    count += carry;
    x = Math.floor(x / base);
    y = Math.floor(y / base);
  }
  return count;
}

/** `1 × 8 + 0 × 4 + 0 × 2 + 0 × 1` for the digits of a value. */
function expansion(value: number, base: SumBase): string {
  const digits = toBase(value, base);
  return [...digits]
    .map((char, index) => `${Number(char)} × ${base ** (digits.length - 1 - index)}`)
    .join(' + ');
}

/** `tweetallig → gewoon getal: 101 = 5 en 11 = 3 → 5 + 3 = 8 → 8 = 1 × 8 + … → 1000` */
export function sumExplanation(a: number, b: number, base: SumBase): string {
  const sum = a + b;
  return `${ADJECTIVES[base]} → gewoon getal: ${toBase(a, base)} = ${a} en ${toBase(b, base)} = ${b} → ${a} + ${b} = ${sum} → ${sum} = ${expansion(sum, base)} → ${toBase(sum, base)}`;
}

/** `× 10 in het vijftallig stelsel is × 5: elk cijfer schuift een plaats op → 243 wordt 2430` */
export function timesExplanation(value: number, base: SumBase): string {
  return `× 10 in het ${ADJECTIVES[base]} stelsel is × ${base}: elk cijfer schuift een plaats op → ${toBase(value, base)} wordt ${toBase(value * base, base)}`;
}

function generateSum(rng: Rng, base: SumBase): Question {
  const { min, max, cap } = SUM_RANGES[base];
  const { a, b } = drawUntil(() => {
    const x = randomInt(rng, min, max);
    const y = randomInt(rng, min, max);
    return x !== y && x + y <= cap && carries(x, y, base) > 0 ? { a: x, b: y } : null;
  });
  const adjective = ADJECTIVES[base];
  return {
    key: `baseArithmetic:sum:${base}:${a}:${b}`,
    topic: 'baseArithmetic',
    steps: [
      textStep({
        kind: 'baseDigits',
        prompt: `Tel op in het ${adjective} stelsel: ${toBase(a, base)} + ${toBase(b, base)}. Schrijf je antwoord ook ${adjective}.`,
        answer: toBase(a + b, base),
        normalize: stripLeadingZeros,
        explanation: sumExplanation(a, b, base),
      }),
    ],
  };
}

function generateTimes(rng: Rng, base: SumBase): Question {
  const { min, max } = TIMES_RANGES[base];
  const value = randomInt(rng, min, max);
  const adjective = ADJECTIVES[base];
  return {
    key: `baseArithmetic:times:${base}:${value}`,
    topic: 'baseArithmetic',
    steps: [
      textStep({
        kind: 'baseDigits',
        prompt: `Vermenigvuldig in het ${adjective} stelsel: ${toBase(value, base)} × 10. Schrijf je antwoord ook ${adjective}.`,
        answer: toBase(value * base, base),
        normalize: stripLeadingZeros,
        explanation: timesExplanation(value, base),
      }),
    ],
  };
}

/** `Tel op in het tweetallig stelsel: 101 + 11.` or `Vermenigvuldig in het vijftallig stelsel: 243 × 10.` */
export function generateBaseArithmetic(rng: Rng): Question {
  const base = pick(rng, BASES);
  return rng() < 0.5 ? generateSum(rng, base) : generateTimes(rng, base);
}
