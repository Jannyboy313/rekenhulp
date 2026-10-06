import { formatInteger as f } from '../format';
import { pick, randomInt, randomIntWhere, type Rng } from '../random';
import { fromInteger } from '../rational';
import { numberStep } from '../steps';
import type { Question } from '../types';

// Smart calculation (spec §5.9).
export const MIN_ANSWER = 1;
export const MAX_ANSWER = 10_000;

export const STRATEGIES = [
  'compensateAdd',
  'compensateSubtract',
  'complement',
  'splitMultiply',
  'doubleHalve',
  'splitDivide',
] as const;
export type Strategy = (typeof STRATEGIES)[number];

interface Exercise {
  /** Without ' = ?'. */
  prompt: string;
  answer: number;
  explanation: string;
}

/** R ± d with R = k·m, m ∈ {10, 100, 1000}, k ∈ [1, 8] (k ≥ 2 for m = 10) and d ∈ [1, 3]. */
interface NearRound {
  value: number;
  round: number;
  offset: number;
  magnitude: number;
}

function nearRound(rng: Rng): NearRound {
  const magnitude = pick(rng, [10, 100, 1000]);
  const round = magnitude * randomInt(rng, magnitude === 10 ? 2 : 1, 8);
  const offset = randomInt(rng, 1, 3) * (rng() < 0.5 ? -1 : 1);
  return { value: round + offset, round, offset, magnitude };
}

/** '− 2' or '+ 2': adds `offset` in an explanation. */
function signed(offset: number): string {
  return `${offset < 0 ? '−' : '+'} ${Math.abs(offset)}`;
}

const notRound = (value: number) => value % 10 !== 0;

/** Split (×): a × factor = a : divisor × power, with a a multiple of the divisor. */
const SPLIT_FACTORS = [
  { factor: 25, divisor: 4, power: 100, minK: 3, maxK: 25 },
  { factor: 50, divisor: 2, power: 100, minK: 6, maxK: 50 },
  { factor: 125, divisor: 8, power: 1000, minK: 2, maxK: 10 },
] as const;

/** Split (:): a : divisor via steps that are easy to do mentally. */
const SPLIT_DIVISORS = [
  { divisor: 4, minQ: 13, maxQ: 99, steps: (a: string) => `${a} : 2 : 2` },
  { divisor: 5, minQ: 13, maxQ: 199, steps: (a: string) => `${a} × 2 : 10` },
  { divisor: 8, minQ: 13, maxQ: 99, steps: (a: string) => `${a} : 2 : 2 : 2` },
  { divisor: 25, minQ: 5, maxQ: 99, steps: (a: string) => `${a} × 4 : 100` },
] as const;

const BUILDERS: Record<Strategy, (rng: Rng) => Exercise> = {
  // 398 + 247 → 400 + 247 − 2
  compensateAdd(rng) {
    const a = nearRound(rng);
    // With k ≤ 8 this range is never empty, so the answer stays ≤ MAX_ANSWER without a redraw.
    const maxB = Math.min(10 * a.magnitude - 1, MAX_ANSWER - a.value);
    const b = randomIntWhere(rng, a.magnitude + 1, maxB, notRound);
    const answer = a.value + b;
    return {
      prompt: `${f(a.value)} + ${f(b)}`,
      answer,
      explanation: `${f(a.round)} + ${f(b)} ${signed(a.offset)} = ${f(answer)}`,
    };
  },
  // 5003 − 2998 → 5003 − 3000 + 2
  compensateSubtract(rng) {
    const b = nearRound(rng);
    // a lies beyond the next round number: the difference is not tiny and a − R stays positive.
    const a = randomInt(rng, b.round + b.magnitude, 10 * b.magnitude - 1);
    const answer = a - b.value;
    return {
      prompt: `${f(a)} − ${f(b.value)}`,
      answer,
      explanation: `${f(a)} − ${f(b.round)} ${signed(-b.offset)} = ${f(answer)}`,
    };
  },
  // 1000 − 463 → 463 + 537 = 1000
  complement(rng) {
    const total = pick(rng, [100, 1000]);
    // The answer is at least 11.
    const b = randomIntWhere(rng, total / 10 + 1, total - 11, notRound);
    const answer = total - b;
    return {
      prompt: `${f(total)} − ${f(b)}`,
      answer,
      explanation: `${f(b)} + ${f(answer)} = ${f(total)}`,
    };
  },
  // 48 × 25 → 48 : 4 × 100
  splitMultiply(rng) {
    const { factor, divisor, power, minK, maxK } = pick(rng, SPLIT_FACTORS);
    // Never a multiple of 10: 100 × 25 is not smart calculation.
    const a = divisor * randomIntWhere(rng, minK, maxK, (k) => (divisor * k) % 10 !== 0);
    const answer = a * factor;
    return {
      prompt: `${f(a)} × ${factor}`,
      answer,
      explanation: `${f(a)} : ${divisor} × ${f(power)} = ${f(answer)}`,
    };
  },
  // 35 × 18 → 70 × 9
  doubleHalve(rng) {
    // 2a × half is a table fact times 10: 2a ∈ {30, 50, …, 150} and half ∈ [6, 15].
    const a = 10 * randomInt(rng, 1, 7) + 5;
    // b = 2 × half is not a multiple of 10 exactly when half is not a multiple of 5.
    const half = randomIntWhere(rng, 6, 15, (value) => value % 5 !== 0);
    const answer = a * 2 * half;
    return {
      prompt: `${a} × ${2 * half}`,
      answer,
      explanation: `${2 * a} × ${half} = ${f(answer)}`,
    };
  },
  // 72 : 4 → 72 : 2 : 2
  splitDivide(rng) {
    const { divisor, minQ, maxQ, steps } = pick(rng, SPLIT_DIVISORS);
    const answer = randomInt(rng, minQ, maxQ);
    const a = f(divisor * answer);
    return { prompt: `${a} : ${divisor}`, answer, explanation: `${steps(a)} = ${f(answer)}` };
  },
};

/** One of six mental strategies, each equally likely (spec §5.9). */
export function generateSmartCalculation(rng: Rng): Question {
  const strategy = pick(rng, STRATEGIES);
  // Every builder stays within [MIN_ANSWER, MAX_ANSWER] by construction; no redraw needed.
  const { prompt, answer, explanation } = BUILDERS[strategy](rng);
  return {
    // The prompt alone, so a prompt never appears twice under two strategies (spec §5.9).
    key: `smartCalculation:${prompt}`,
    topic: 'smartCalculation',
    steps: [numberStep({ prompt: `${prompt} = ?`, answer: fromInteger(answer), explanation })],
  };
}
