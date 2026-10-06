import { formatInteger, formatPrimeFactors } from '../format';
import { gcd, isPrime, lcm, primeFactors, smallestPrimeFactor } from '../primes';
import { pick, randomInt, type Rng } from '../random';
import { fromInteger } from '../rational';
import { booleanStep, factorizationStep, numberStep } from '../steps';
import type { Question, Step, Topic } from '../types';

/** LCM (spec §5.2). */
export const MIN_LCM_TERM = 2;
export const MAX_LCM_TERM = 60;
export const MAX_LCM = 300;
export const LCM_SHARED_FACTOR_SHARE = 0.75;

/** GCD: a = g·p and b = g·q, plus coprime composites (spec §5.3). */
export const MIN_COMMON_FACTOR = 2;
export const MAX_COMMON_FACTOR = 30;
export const MAX_GCD_TERM = 200;
export const GCD_COPRIME_SHARE = 0.1;
export const MIN_COPRIME_TERM = 10;

type Pair = readonly [number, number];

function range(min: number, max: number): number[] {
  return Array.from({ length: max - min + 1 }, (_, index) => min + index);
}

function question(topic: Topic, key: string, step: Step): Question {
  return { key: `${topic}:${key}`, topic, steps: [step] };
}

/** One key for both orders, so '12 en 18' and '18 en 12' count as the same question. */
function pairKey([a, b]: Pair): string {
  return `${Math.min(a, b)}:${Math.max(a, b)}`;
}

/** '12 = 2² × 3', or '13 is priem'. */
export function describeFactors(n: number): string {
  return isPrime(n)
    ? `${formatInteger(n)} is priem`
    : `${formatInteger(n)} = ${formatPrimeFactors(primeFactors(n))}`;
}

/** '2² × 3² = 36', or just '7' when the factorization is the number itself. */
function showFactorized(value: number): string {
  const factors = formatPrimeFactors(primeFactors(value));
  const number = formatInteger(value);
  return factors === number ? number : `${factors} = ${number}`;
}

/** All pairs a < b in [2, 60] with lcm ≤ 300 that do, or do not, share a factor. */
function lcmPairs(shareFactor: boolean): Pair[] {
  const pairs: Pair[] = [];
  for (let a = MIN_LCM_TERM; a <= MAX_LCM_TERM; a++) {
    for (let b = a + 1; b <= MAX_LCM_TERM; b++) {
      const shares = gcd(a, b) > 1;
      if (lcm(a, b) <= MAX_LCM && shares === shareFactor) pairs.push([a, b]);
    }
  }
  return pairs;
}

const SHARED_FACTOR_PAIRS = lcmPairs(true);
const COPRIME_PAIRS = lcmPairs(false);

/** `KGV van 12 en 18 = ?` */
export function generateLcm(rng: Rng): Question {
  const pair = pick(rng, rng() < LCM_SHARED_FACTOR_SHARE ? SHARED_FACTOR_PAIRS : COPRIME_PAIRS);
  const [a, b] = rng() < 0.5 ? pair : ([pair[1], pair[0]] as const);
  return question(
    'lcm',
    pairKey(pair),
    numberStep({
      prompt: `KGV van ${formatInteger(a)} en ${formatInteger(b)} = ?`,
      answer: fromInteger(lcm(a, b)),
      explanation: lcmExplanation(a, b),
    }),
  );
}

/** '12 = 2² × 3 en 18 = 2 × 3² → KGV = 2² × 3² = 36' */
export function lcmExplanation(a: number, b: number): string {
  return `${describeFactors(a)} en ${describeFactors(b)} → KGV = ${showFactorized(lcm(a, b))}`;
}

const COPRIME_CANDIDATES = range(MIN_COPRIME_TERM, MAX_GCD_TERM).filter((n) => !isPrime(n));

/** `GGD van 84 en 126 = ?` */
export function generateGcd(rng: Rng): Question {
  const pair = rng() < GCD_COPRIME_SHARE ? coprimeComposites(rng) : sharedFactorPair(rng);
  const [a, b] = pair;
  return question(
    'gcd',
    pairKey(pair),
    numberStep({
      prompt: `GGD van ${formatInteger(a)} en ${formatInteger(b)} = ?`,
      answer: fromInteger(gcd(a, b)),
      explanation: gcdExplanation(a, b),
    }),
  );
}

/** g·p and g·q with gcd(p, q) = 1, so the answer is g. Ordered, so both orders occur. */
function sharedFactorPair(rng: Rng): Pair {
  const g = randomInt(rng, MIN_COMMON_FACTOR, MAX_COMMON_FACTOR);
  const limit = Math.floor(MAX_GCD_TERM / g);
  const pairs: Pair[] = [];
  for (let p = 1; p <= limit; p++) {
    for (let q = 1; q <= limit; q++) {
      if (p !== q && gcd(p, q) === 1) pairs.push([g * p, g * q]);
    }
  }
  return pick(rng, pairs);
}

/** Two different composites without a common factor, e.g. 35 and 48. */
function coprimeComposites(rng: Rng): Pair {
  for (;;) {
    const a = pick(rng, COPRIME_CANDIDATES);
    const b = pick(rng, COPRIME_CANDIDATES);
    if (a !== b && gcd(a, b) === 1) return [a, b];
  }
}

/** '84 = 2² × 3 × 7 en 126 = 2 × 3² × 7 → GGD = 2 × 3 × 7 = 42' */
export function gcdExplanation(a: number, b: number): string {
  const divisor = gcd(a, b);
  const conclusion =
    divisor === 1
      ? 'geen gemeenschappelijke priemfactor, GGD = 1'
      : `GGD = ${showFactorized(divisor)}`;
  return `${describeFactors(a)} en ${describeFactors(b)} → ${conclusion}`;
}

/** Prime yes/no (spec §5.4). */
export const MIN_PRIME_CANDIDATE = 11;
export const MAX_PRIME_CANDIDATE = 199;
export const PRIME_SHARE = 0.5;
/** Share of the composites that is not divisible by 3: the ones that look prime. */
export const HARD_COMPOSITE_SHARE = 0.5;

const PRIME_CANDIDATES = range(MIN_PRIME_CANDIDATE, MAX_PRIME_CANDIDATE);
export const PRIMES: readonly number[] = PRIME_CANDIDATES.filter(isPrime);
/** Odd composites that are not divisible by 3 or 5. */
export const HARD_COMPOSITES: readonly number[] = [49, 77, 91, 119, 121, 133, 143, 161, 169, 187];
/** Odd multiples of 3 that are not divisible by 5: 21, 27, 33, …, 189. */
export const MULTIPLES_OF_THREE: readonly number[] = PRIME_CANDIDATES.filter(
  (n) => n % 2 === 1 && n % 3 === 0 && n % 5 !== 0,
);

/** `Is 91 een priemgetal?` */
export function generatePrime(rng: Rng): Question {
  const n =
    rng() < PRIME_SHARE
      ? pick(rng, PRIMES)
      : pick(rng, rng() < HARD_COMPOSITE_SHARE ? HARD_COMPOSITES : MULTIPLES_OF_THREE);
  return question(
    'prime',
    String(n),
    booleanStep({
      prompt: `Is ${formatInteger(n)} een priemgetal?`,
      answer: isPrime(n),
      explanation: primeExplanation(n),
    }),
  );
}

/** '91 = 7 × 13' with the smallest prime factor, or 'Geen deler tot en met √151' for a prime. */
export function primeExplanation(n: number): string {
  if (isPrime(n)) return `Geen deler tot en met √${formatInteger(n)}`;
  const factor = smallestPrimeFactor(n);
  return `${formatInteger(n)} = ${formatInteger(factor)} × ${formatInteger(n / factor)}`;
}

/** Prime factorization (spec §5.5). */
export const MIN_FACTORIZATION = 12;
export const MAX_FACTORIZATION = 200;
export const MIN_PRIME_FACTOR_COUNT = 3;

/** Prime factors counted with multiplicity: 84 = 2 × 2 × 3 × 7 → 4. */
export function primeFactorCount(n: number): number {
  return primeFactors(n).reduce((count, { exponent }) => count + exponent, 0);
}

export const FACTORIZATION_NUMBERS: readonly number[] = range(
  MIN_FACTORIZATION,
  MAX_FACTORIZATION,
).filter((n) => primeFactorCount(n) >= MIN_PRIME_FACTOR_COUNT);

/** `Ontbind 84 in priemfactoren` */
export function generateFactorization(rng: Rng): Question {
  const n = pick(rng, FACTORIZATION_NUMBERS);
  return question(
    'factorization',
    String(n),
    factorizationStep({
      prompt: `Ontbind ${formatInteger(n)} in priemfactoren`,
      value: n,
      explanation: divisionLadder(n),
    }),
  );
}

/** '84 : 2 = 42, 42 : 2 = 21, 21 : 3 = 7': divide by the smallest prime until a prime is left. */
export function divisionLadder(n: number): string {
  const steps: string[] = [];
  let rest = n;
  while (!isPrime(rest)) {
    const factor = smallestPrimeFactor(rest);
    steps.push(`${formatInteger(rest)} : ${formatInteger(factor)} = ${formatInteger(rest / factor)}`);
    rest /= factor;
  }
  return steps.join(', ');
}
