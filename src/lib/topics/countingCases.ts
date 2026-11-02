import { formatInteger as f } from '../format';
import { pick, randomInt, range, type Rng } from '../random';
import { fromInteger } from '../rational';
import { numberStep } from '../steps';
import type { Question } from '../types';

// Counting with conditions (spec §5.94). Every answer is a whole number.
const HEURISTIC = 'Systematisch tellen:';
const ORDINALS = ['1e', '2e', '3e'];
const PAIRS: readonly (readonly [string, string])[] = [
  ['Anna', 'Bram'],
  ['Chris', 'Dora'],
];

const product = (values: readonly number[]) => values.reduce((a, b) => a * b, 1);

/** 'Anna' 'Bram' → 'Anna en Bram'; numbers 1, 2, 3 → '1, 2 en 3'. */
function list(items: readonly (string | number)[]): string {
  return `${items.slice(0, -1).join(', ')} en ${items[items.length - 1]}`;
}

function question(key: string, prompt: string, answer: number, explanation: string): Question {
  return {
    key: `countingCases:${key}`,
    topic: 'countingCases',
    steps: [
      numberStep({
        prompt,
        answer: fromInteger(answer),
        explanation: `${HEURISTIC} ${explanation}`,
      }),
    ],
  };
}

/** Codes of k different digits from 1 to s: s × (s − 1) × … (k factors). */
export function codesOnceQuestion(s: number, k: number): Question {
  const choices = Array.from({ length: k }, (_, i) => s - i);
  const answer = product(choices);
  const text = choices
    .map((n, i) => (i === 0 ? `${n} keuzes voor het 1e cijfer` : `${n} voor het ${ORDINALS[i]}`))
    .join(', ');
  return question(
    `once:${s}:${k}`,
    `Hoeveel getallen van ${k} cijfers kun je maken met de cijfers ${list(range(1, s))}, als elk cijfer hoogstens één keer voorkomt?`,
    answer,
    `${text} → ${choices.join(' × ')} = ${f(answer)}`,
  );
}

/** Codes of k digits from 1 to s, digits may repeat: sᵏ. */
export function codesRepeatQuestion(s: number, k: number): Question {
  const answer = s ** k;
  return question(
    `repeat:${s}:${k}`,
    `Een slot heeft een code van ${k} cijfers uit ${list(range(1, s))}. Een cijfer mag vaker voorkomen. Hoeveel codes zijn er?`,
    answer,
    `${s} keuzes voor elk van de ${k} cijfers → ${Array.from({ length: k }, () => s).join(' × ')} = ${f(answer)}`,
  );
}

/** n people in a row, two of them next to each other: (n − 1)! × 2 (the pair is one block). */
export function togetherQuestion(n: number, pair: readonly [string, string]): Question {
  const [a, b] = pair;
  const arrangements = product(range(1, n - 1));
  const answer = arrangements * 2;
  const factors = range(1, n - 1).reverse().join(' × ');
  return question(
    `together:${n}`,
    `Op hoeveel manieren kunnen ${n} kinderen in een rij staan als ${a} en ${b} naast elkaar moeten staan?`,
    answer,
    `${a} en ${b} samen zijn 1 blok → ${n - 1} dingen in een rij: ${factors} = ${f(arrangements)} → het blok kan twee kanten op → ${f(arrangements)} × 2 = ${f(answer)}`,
  );
}

/** Codes once, codes repeating and together, each 1/3. */
export function generateCountingCases(rng: Rng): Question {
  switch (pick(rng, ['once', 'repeat', 'together'] as const)) {
    case 'once':
      return codesOnceQuestion(randomInt(rng, 4, 6), randomInt(rng, 2, 3));
    case 'repeat':
      return codesRepeatQuestion(randomInt(rng, 3, 5), randomInt(rng, 2, 3));
    case 'together':
      return togetherQuestion(randomInt(rng, 4, 5), pick(rng, PAIRS));
  }
}
