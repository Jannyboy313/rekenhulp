import { formatInteger as f, MINUS } from '../format';
import { drawUntil, pick, randomInt, type Rng } from '../random';
import { fromInteger } from '../rational';
import { numberStep } from '../steps';
import { exactTip, type Diagnose } from '../tips';
import type { Question } from '../types';

// Sequences (spec §5.35).
export type Geometric = 'times2' | 'times3' | 'half';
export type Figurate = 'driehoeksgetallen' | 'kwadraatgetallen';

/** The positions of the n-th term question. */
export const NTH_TERMS: readonly number[] = [10, 12, 15, 20, 25, 30, 50, 100];

/** Four terms from `start`, each from the previous one. */
function terms(start: number, next: (term: number) => number): number[] {
  const result = [start];
  for (let i = 1; i < 4; i++) result.push(next(result[i - 1]!));
  return result;
}

function shown(values: readonly number[]): string {
  return `${values.map((value) => f(value)).join(', ')}, …`;
}

function sequenceStep(prompt: string, answer: number, explanation: string, diagnose?: Diagnose) {
  return numberStep({ prompt, answer: fromInteger(answer), explanation, diagnose });
}

/** Four terms from `start` with a signed `difference`; asks the fifth. */
export function arithmeticNextQuestion(start: number, difference: number): Question {
  const shownTerms = terms(start, (term) => term + difference);
  const last = shownTerms[3]!;
  const answer = last + difference;
  const sign = difference > 0 ? '+' : MINUS;
  return {
    key: `sequences:next:arithmetic:${start}:${difference}`,
    topic: 'sequences',
    steps: [
      sequenceStep(
        `${shown(shownTerms)} Wat is het volgende getal?`,
        answer,
        `${sign}${Math.abs(difference)} → ${f(last)} ${sign} ${Math.abs(difference)} = ${f(answer)}`,
      ),
    ],
  };
}

const GEOMETRIC: Readonly<Record<Geometric, { operator: string; apply: (n: number) => number }>> = {
  times2: { operator: '× 2', apply: (n) => n * 2 },
  times3: { operator: '× 3', apply: (n) => n * 3 },
  half: { operator: ': 2', apply: (n) => n / 2 },
};

export function geometricNextQuestion(start: number, kind: Geometric): Question {
  const { operator, apply } = GEOMETRIC[kind];
  const shownTerms = terms(start, apply);
  const last = shownTerms[3]!;
  const answer = apply(last);
  return {
    key: `sequences:next:${kind}:${start}`,
    topic: 'sequences',
    steps: [
      sequenceStep(
        `${shown(shownTerms)} Wat is het volgende getal?`,
        answer,
        `${operator} → ${f(last)} ${operator} = ${f(answer)}`,
      ),
    ],
  };
}

/** The `n`-th term of an arithmetic sequence. The mistake: n steps from the first term. */
export function nthTermQuestion(start: number, difference: number, n: number): Question {
  const steps = n - 1;
  const answer = start + steps * difference;
  return {
    key: `sequences:nth:arithmetic:${start}:${difference}:${n}`,
    topic: 'sequences',
    steps: [
      sequenceStep(
        `${shown(terms(start, (term) => term + difference))} Wat is het ${n}e getal?`,
        answer,
        `van het 1e naar het ${n}e getal zijn ${steps} stappen van ${difference} → ${f(start)} + ${steps} × ${difference} = ${f(answer)}`,
        exactTip(
          fromInteger(start + n * difference),
          `Van het 1e naar het ${n}e getal zijn ${steps} stappen, geen ${n}.`,
        ),
      ),
    ],
  };
}

const FIGURATE = {
  driehoeksgetallen: { label: 'Driehoeksgetallen', first: [1, 3, 6, 10], noun: 'driehoeksgetal' },
  kwadraatgetallen: { label: 'Kwadraatgetallen', first: [1, 4, 9, 16], noun: 'kwadraatgetal' },
} as const;

export function figurateQuestion(kind: Figurate, n: number): Question {
  const { label, first, noun } = FIGURATE[kind];
  const triangular = kind === 'driehoeksgetallen';
  const answer = triangular ? (n * (n + 1)) / 2 : n * n;
  return {
    key: `sequences:figurate:${kind}:${n}`,
    topic: 'sequences',
    steps: [
      sequenceStep(
        `${label}: ${shown(first)} Wat is het ${n}e ${noun}?`,
        answer,
        triangular
          ? `1 + 2 + … + ${n} = ${n} × ${n + 1} : 2 = ${f(answer)}`
          : `${n} × ${n} = ${f(answer)}`,
      ),
    ],
  };
}

/** A start and a signed difference whose five terms all lie in [−50, 100]. */
function drawArithmetic(rng: Rng): Question {
  const { start, difference } = drawUntil(() => {
    const start = randomInt(rng, -20, 50);
    const size = randomInt(rng, 2, 15);
    const difference = rng() < 0.3 ? -size : size;
    const end = start + 4 * difference;
    return Math.min(start, end) >= -50 && Math.max(start, end) <= 100
      ? { start, difference }
      : null;
  });
  return arithmeticNextQuestion(start, difference);
}

function drawGeometric(rng: Rng): Question {
  switch (pick(rng, ['times2', 'times3', 'half'] as const)) {
    case 'times2':
      return geometricNextQuestion(randomInt(rng, 1, 12), 'times2');
    case 'times3':
      return geometricNextQuestion(randomInt(rng, 1, 5), 'times3');
    case 'half':
      return geometricNextQuestion(16 * randomInt(rng, 1, 10), 'half');
  }
}

function drawNthTerm(rng: Rng): Question {
  const { start, difference, n } = drawUntil(() => {
    const start = randomInt(rng, 1, 20);
    const difference = randomInt(rng, 2, 10);
    const n = pick(rng, NTH_TERMS);
    return start + (n - 1) * difference <= 1000 ? { start, difference, n } : null;
  });
  return nthTermQuestion(start, difference, n);
}

/** Next term, n-th term and figurate numbers, each 1/3; next term arithmetic or geometric 1/2. */
export function generateSequences(rng: Rng): Question {
  switch (pick(rng, ['next', 'nth', 'figurate'] as const)) {
    case 'next':
      return rng() < 0.5 ? drawArithmetic(rng) : drawGeometric(rng);
    case 'nth':
      return drawNthTerm(rng);
    case 'figurate':
      return figurateQuestion(
        rng() < 0.5 ? 'driehoeksgetallen' : 'kwadraatgetallen',
        randomInt(rng, 5, 20),
      );
  }
}
