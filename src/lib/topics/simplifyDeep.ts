import { formatInteger as f } from '../format';
import { pick, randomInt, type Rng } from '../random';
import { fromInteger } from '../rational';
import { numberStep } from '../steps';
import type { Question } from '../types';

// Simplify the problem, deeper (spec §5.97).

const PAGE_COUNTS: readonly number[] = [25, 40, 60, 80, 100, 120, 150, 180];

function question(key: string, prompt: string, answer: number, explanation: string): Question {
  return {
    key: `simplifyDeep:${key}`,
    topic: 'simplifyDeep',
    steps: [
      numberStep({
        prompt,
        answer: fromInteger(answer),
        explanation: `Vereenvoudigen: ${explanation}`,
      }),
    ],
  };
}

/** The sum from a to b with an even number of terms: pairs of the outer numbers. */
export function rangeSumQuestion(a: number, b: number): Question {
  const terms = b - a + 1;
  const pair = a + b;
  const answer = (pair * terms) / 2;
  return question(
    `range:${a}:${b}`,
    `Wat is ${a} + ${a + 1} + ${a + 2} + … + ${b}?`,
    answer,
    `maak paren van de buitenste getallen: ${a} + ${b} = ${pair}, ${a + 1} + ${b - 1} = ${pair}, … → ${terms} getallen zijn ${terms / 2} paren van ${pair} → ${terms / 2} × ${pair} = ${f(answer)}`,
  );
}

/** 1 + 3 + … + (2n − 1) is n × n. */
export function oddSumQuestion(n: number): Question {
  const answer = n * n;
  return question(
    `odd:${n}`,
    `Wat is 1 + 3 + 5 + … + ${2 * n - 1}?`,
    answer,
    `1 = 1 × 1, 1 + 3 = 4 = 2 × 2, 1 + 3 + 5 = 9 = 3 × 3 → n getallen geven n × n; ${2 * n - 1} is het ${n}e oneven getal → ${n} × ${n} = ${f(answer)}`,
  );
}

/** Digits of the pages 1 to last: 1 to 9 have one, 10 to 99 two, from 100 three. */
export function pagesQuestion(last: number): Question {
  const answer = last <= 99 ? 9 + 2 * (last - 9) : 189 + 3 * (last - 99);
  const tail =
    last <= 99
      ? `10 t/m ${last}: ${last - 9} × 2 = ${2 * (last - 9)} → 9 + ${2 * (last - 9)}`
      : `10 t/m 99: 90 × 2 = 180 → 100 t/m ${last}: ${last - 99} × 3 = ${3 * (last - 99)} → 9 + 180 + ${3 * (last - 99)}`;
  return question(
    `pages:${last}`,
    `Hoeveel cijfers heb je nodig om de bladzijden 1 tot en met ${last} te nummeren?`,
    answer,
    `1 t/m 9: 9 × 1 = 9 cijfers → ${tail} = ${f(answer)}`,
  );
}

function generateRange(rng: Rng): Question {
  const a = randomInt(rng, 2, 30);
  const terms = 2 * randomInt(rng, 4, 15);
  return rangeSumQuestion(a, a + terms - 1);
}

function generateOdd(rng: Rng): Question {
  return oddSumQuestion(randomInt(rng, 10, 30));
}

function generatePages(rng: Rng): Question {
  return pagesQuestion(pick(rng, PAGE_COUNTS));
}

/** Range sums, odd sums and page numbering, each 1/3. */
export function generateSimplifyDeep(rng: Rng): Question {
  return pick(rng, [generateRange, generateOdd, generatePages])(rng);
}
