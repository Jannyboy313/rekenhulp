import { formatInteger, formatPrimeFactors } from '../format';
import { gcd, lcm, primeFactors, type PrimePower } from '../primes';
import { drawUntil, pick, randomInt, range, type Rng } from '../random';
import { fromInteger } from '../rational';
import { SLOT } from '../slot';
import { numberStep } from '../steps';
import type { Question } from '../types';
import { gcdListExplanation, lcmListExplanation } from './numberTheory';

/** Divisors: how many, three numbers, from a factorization (spec §5.60). */
const MIN_COUNT_NUMBER = 12;
const MAX_COUNT_NUMBER = 120;
const MIN_DIVISORS = 4;
const MAX_DIVISORS = 12;
const MAX_LCM_TERM = 20;
const MAX_LCM_OF_THREE = 360;
const MIN_COMMON_FACTOR = 2;
const MAX_COMMON_FACTOR = 25;
const MAX_GCD_TERM = 200;
const FACTORIZATION_PRIMES = [2, 3, 5, 7] as const;
const MAX_EXPONENT = 3;
const MAX_FACTORIZED = 1000;
const MAX_FACTORIZED_LCM = 2000;

type Kind = 'kgv' | 'ggd';

export function divisorCount(n: number): number {
  return primeFactors(n).reduce((count, { exponent }) => count * (exponent + 1), 1);
}

const COUNT_NUMBERS = range(MIN_COUNT_NUMBER, MAX_COUNT_NUMBER).filter(
  (n) => divisorCount(n) >= MIN_DIVISORS && divisorCount(n) <= MAX_DIVISORS,
);

/** Triples a < b < c in [2, 20], none a divisor of another, with lcm at most 360. */
const LCM_TRIPLES: readonly (readonly number[])[] = range(2, MAX_LCM_TERM).flatMap((a) =>
  range(a + 1, MAX_LCM_TERM).flatMap((b) =>
    range(b + 1, MAX_LCM_TERM)
      .filter(
        (c) =>
          b % a !== 0 && c % a !== 0 && c % b !== 0 && lcm(lcm(a, b), c) <= MAX_LCM_OF_THREE,
      )
      .map((c) => [a, b, c]),
  ),
);

/** 2^a × 3^b × 5^c × 7^d with at least one prime, exponents at most 3, at most 1000. */
const FACTORIZED_NUMBERS: readonly number[] = range(2, MAX_FACTORIZED).filter((n) =>
  primeFactors(n).every(
    ({ prime, exponent }) =>
      (FACTORIZATION_PRIMES as readonly number[]).includes(prime) && exponent <= MAX_EXPONENT,
  ),
);

function key(form: string, ...parts: (string | number)[]): string {
  return ['divisors', form, ...parts].join(':');
}

function question(k: string, prompt: string, answer: number, explanation: string): Question {
  return {
    key: k,
    topic: 'divisors',
    steps: [numberStep({ prompt, answer: fromInteger(answer), explanation })],
  };
}

/** '1 × 36, 2 × 18, 3 × 12, 4 × 9, 6 × 6 → 9 delers' */
export function countExplanation(n: number): string {
  const pairs: string[] = [];
  for (let d = 1; d * d <= n; d++) {
    if (n % d === 0) pairs.push(`${formatInteger(d)} × ${formatInteger(n / d)}`);
  }
  return `${pairs.join(', ')} → ${divisorCount(n)} delers`;
}

function generateCount(rng: Rng): Question {
  const n = pick(rng, COUNT_NUMBERS);
  return question(
    key('count', n),
    `Hoeveel delers heeft ${formatInteger(n)}?`,
    divisorCount(n),
    countExplanation(n),
  );
}

/** Three numbers g·p₁, g·p₂, g·p₃ with distinct pᵢ ≥ 2 and gcd(p₁, p₂, p₃) = 1. */
function ggdTriple(rng: Rng): number[] {
  return drawUntil(() => {
    const g = randomInt(rng, MIN_COMMON_FACTOR, MAX_COMMON_FACTOR);
    const factors = Array.from({ length: 3 }, () => randomInt(rng, 2, Math.floor(MAX_GCD_TERM / g)));
    if (new Set(factors).size !== 3 || gcd(gcd(factors[0]!, factors[1]!), factors[2]!) !== 1) {
      return null;
    }
    return factors.map((p) => g * p);
  });
}

function generateThree(rng: Rng): Question {
  const kind: Kind = rng() < 0.5 ? 'kgv' : 'ggd';
  const numbers = (kind === 'kgv' ? [...pick(rng, LCM_TRIPLES)] : ggdTriple(rng)).sort(
    (a, b) => a - b,
  );
  const [a, b, c] = numbers as [number, number, number];
  const answer = kind === 'kgv' ? lcm(lcm(a, b), c) : gcd(gcd(a, b), c);
  return question(
    key('three', kind, ...numbers),
    `${kind.toUpperCase()} van ${formatInteger(a)}, ${formatInteger(b)} en ${formatInteger(c)} = ${SLOT}`,
    answer,
    kind === 'kgv' ? lcmListExplanation(numbers) : gcdListExplanation(numbers),
  );
}

function exponentOf(factors: readonly PrimePower[], prime: number): number {
  return factors.find((factor) => factor.prime === prime)?.exponent ?? 0;
}

/** Per prime the lowest (GGD) or highest (KGV) exponent; primes with exponent 0 are dropped. */
function combine(kind: Kind, a: number, b: number): PrimePower[] {
  const [fa, fb] = [primeFactors(a), primeFactors(b)];
  const choose = kind === 'kgv' ? Math.max : Math.min;
  return FACTORIZATION_PRIMES.map((prime) => ({
    prime,
    exponent: choose(exponentOf(fa, prime), exponentOf(fb, prime)),
  })).filter(({ exponent }) => exponent > 0);
}

/** 'gemeenschappelijk: 2 × 3 → GGD = 6', 'hoogste machten: 2² × 3² × 5 × 7 → KGV = 1 260' */
export function factorizationExplanation(kind: Kind, a: number, b: number): string {
  const value = kind === 'kgv' ? lcm(a, b) : gcd(a, b);
  const label = kind === 'kgv' ? 'hoogste machten' : 'gemeenschappelijk';
  return `${label}: ${formatPrimeFactors(combine(kind, a, b))} → ${kind.toUpperCase()} = ${formatInteger(value)}`;
}

function generateFromFactorization(rng: Rng): Question {
  const kind: Kind = rng() < 0.5 ? 'kgv' : 'ggd';
  const [a, b] = drawUntil((): [number, number] | null => {
    const x = pick(rng, FACTORIZED_NUMBERS);
    const y = pick(rng, FACTORIZED_NUMBERS);
    if (x === y) return null;
    return (kind === 'kgv' ? lcm(x, y) <= MAX_FACTORIZED_LCM : gcd(x, y) >= 2) ? [x, y] : null;
  });
  const written = (n: number) => formatPrimeFactors(primeFactors(n));
  return question(
    key('factorization', kind, Math.min(a, b), Math.max(a, b)),
    `a = ${written(a)} en b = ${written(b)}. ${kind.toUpperCase()} van a en b = ${SLOT}`,
    kind === 'kgv' ? lcm(a, b) : gcd(a, b),
    factorizationExplanation(kind, a, b),
  );
}

/** `Hoeveel delers heeft 36?`, `KGV van 4, 6 en 10 = ?`, or from two factorizations. */
export function generateDivisors(rng: Rng): Question {
  const form = pick(rng, [generateCount, generateThree, generateFromFactorization]);
  return form(rng);
}
