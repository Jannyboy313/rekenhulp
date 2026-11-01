import { gcd, lcm } from '../primes';
import { pick, range, type Rng } from '../random';
import { fromInteger } from '../rational';
import { numberStep } from '../steps';
import type { Question } from '../types';

/** Remainder puzzles: the same remainder, groups, two remainders (spec §5.62). */
const SAME_REMAINDER_SETS: readonly (readonly number[])[] = [
  [2, 3],
  [3, 4],
  [4, 6],
  [2, 5],
  [3, 5],
  [4, 5],
  [2, 3, 4],
  [2, 3, 5],
  [2, 3, 4, 5],
  [3, 4, 5],
];
const MIN_GROUP = 3;
const MAX_GROUP = 8;
const MAX_GROUP_LCM = 40;
const MIN_MODULUS = 3;
const MAX_MODULUS = 9;
const MAX_SMALLEST = 60;
const MAX_BOUND = 200;
const BOUND_STEP = 10;

type Pair = readonly [number, number];

const GROUP_PAIRS: readonly Pair[] = range(MIN_GROUP, MAX_GROUP).flatMap((a) =>
  range(a + 1, MAX_GROUP)
    .filter((b) => lcm(a, b) <= MAX_GROUP_LCM)
    .map((b): Pair => [a, b]),
);

/** The smallest x ≥ 1 with x mod m1 = r1 and x mod m2 = r2 (coprime moduli, r1 ≥ 1). */
export function smallestWithRemainders(m1: number, r1: number, m2: number, r2: number): number {
  for (let x = r1; x <= m1 * m2 + r1; x += m1) if (x % m2 === r2) return x;
  throw new RangeError(`No solution for ${m1}, ${r1}, ${m2}, ${r2}`);
}

interface TwoRemainders {
  m1: number;
  r1: number;
  m2: number;
  r2: number;
}

/** Coprime m1 > m2 in [3, 9] with a smallest solution of at most 60. */
const TWO_REMAINDERS: readonly TwoRemainders[] = range(MIN_MODULUS, MAX_MODULUS).flatMap((m1) =>
  range(MIN_MODULUS, m1 - 1)
    .filter((m2) => gcd(m1, m2) === 1)
    .flatMap((m2) =>
      range(1, m1 - 1).flatMap((r1) =>
        range(1, m2 - 1)
          .filter((r2) => smallestWithRemainders(m1, r1, m2, r2) <= MAX_SMALLEST)
          .map((r2) => ({ m1, r1, m2, r2 })),
      ),
    ),
);

/** Multiples of 10 (lo ≥ 10, hi ≤ 200) with exactly one k × L + r (k ≥ 1) strictly between. */
function boundsFor(l: number, r: number): Bounds[] {
  const result: Bounds[] = [];
  for (let lo = BOUND_STEP; lo < MAX_BOUND; lo += BOUND_STEP) {
    for (let hi = lo + BOUND_STEP; hi <= MAX_BOUND; hi += BOUND_STEP) {
      const found: number[] = [];
      for (let value = l + r; value <= hi; value += l) if (value >= lo) found.push(value);
      const [value] = found;
      // A solution on a bound would be ambiguous ('tussen'), so it does not count as unique.
      if (found.length === 1 && value! > lo && value! < hi) result.push({ lo, hi, value: value! });
    }
  }
  return result;
}

interface Bounds {
  lo: number;
  hi: number;
  value: number;
}

interface Puzzle {
  divisors: readonly number[];
  r: number;
  bounds: readonly Bounds[];
}

/** Every divisor set with a remainder r in [1, min − 1] that has at least one valid window. */
function puzzles(sets: readonly (readonly number[])[]): Puzzle[] {
  return sets.flatMap((divisors) =>
    range(1, Math.min(...divisors) - 1)
      .map((r) => ({ divisors, r, bounds: boundsFor(divisors.reduce((a, b) => lcm(a, b)), r) }))
      .filter(({ bounds }) => bounds.length > 0),
  );
}

const SAME_PUZZLES = puzzles(SAME_REMAINDER_SETS);
const GROUP_PUZZLES = puzzles(GROUP_PAIRS);

function list(numbers: readonly number[]): string {
  return `${numbers.slice(0, -1).join(', ')} en ${numbers[numbers.length - 1]}`;
}

/** 'KGV van 2, 3, 4 en 5 = 60 → 60 + 1 = 61', or '2 × 60 + 1 = 121' for the second multiple. */
export function sameRemainderExplanation(
  divisors: readonly number[],
  remainder: number,
  value: number,
): string {
  const l = divisors.reduce((a, b) => lcm(a, b));
  const times = (value - remainder) / l;
  const multiple = times === 1 ? String(l) : `${times} × ${l}`;
  return `KGV van ${list(divisors)} = ${l} → ${multiple} + ${remainder} = ${value}`;
}

/** 'rest 2 bij 4: 2, 6, 10 → 10 : 3 = 3 rest 1 → 10' */
export function twoRemaindersExplanation(m1: number, r1: number, m2: number, r2: number): string {
  const x = smallestWithRemainders(m1, r1, m2, r2);
  const candidates = range(0, (x - r1) / m1).map((step) => r1 + step * m1);
  return `rest ${r1} bij ${m1}: ${candidates.join(', ')} → ${x} : ${m2} = ${Math.floor(x / m2)} rest ${r2} → ${x}`;
}

function generateSame(rng: Rng): Question {
  const { divisors, r, bounds } = pick(rng, SAME_PUZZLES);
  const { lo, hi, value } = pick(rng, bounds);
  return {
    key: `remainders:same:${divisors.join('-')}:${r}:${lo}:${hi}`,
    topic: 'remainders',
    steps: [
      numberStep({
        prompt: `Een getal tussen ${lo} en ${hi} geeft bij delen door ${list(divisors)} steeds rest ${r}. Welk getal is het?`,
        answer: fromInteger(value),
        explanation: sameRemainderExplanation(divisors, r, value),
      }),
    ],
  };
}

function generateGroups(rng: Rng): Question {
  const { divisors: pair, r, bounds } = pick(rng, GROUP_PUZZLES);
  const [a, b] = rng() < 0.5 ? pair : [pair[1]!, pair[0]!];
  const { lo, hi, value } = pick(rng, bounds);
  const over = r === 1 ? 'blijft er 1 kind over' : `blijven er ${r} kinderen over`;
  return {
    key: `remainders:groups:${pair[0]}:${pair[1]}:${r}:${lo}:${hi}`,
    topic: 'remainders',
    steps: [
      numberStep({
        prompt: `Bij groepjes van ${a} ${over}, bij groepjes van ${b} ook. Er zijn tussen de ${lo} en ${hi} kinderen. Hoeveel?`,
        answer: fromInteger(value),
        suffix: 'kinderen',
        explanation: sameRemainderExplanation(pair, r, value),
      }),
    ],
  };
}

function generateTwo(rng: Rng): Question {
  const { m1, r1, m2, r2 } = pick(rng, TWO_REMAINDERS);
  return {
    key: `remainders:two:${m1}:${r1}:${m2}:${r2}`,
    topic: 'remainders',
    steps: [
      numberStep({
        prompt: `Wat is het kleinste getal dat bij delen door ${m1} rest ${r1} geeft en bij delen door ${m2} rest ${r2}?`,
        answer: fromInteger(smallestWithRemainders(m1, r1, m2, r2)),
        explanation: twoRemaindersExplanation(m1, r1, m2, r2),
      }),
    ],
  };
}

/** `Een getal tussen 50 en 100 geeft bij delen door 2, 3, 4 en 5 steeds rest 1. Welk getal is het?` */
export function generateRemainders(rng: Rng): Question {
  return pick(rng, [generateSame, generateGroups, generateTwo])(rng);
}
