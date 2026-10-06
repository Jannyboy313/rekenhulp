import { formatInteger } from '../format';
import { randomInt, type Rng } from '../random';
import { fromInteger } from '../rational';
import { numberStep } from '../steps';
import type { Question } from '../types';

// Squares and square roots (spec §5.7).
export const MIN_BASE = 2;
export const MAX_BASE = 25;
/** 11² to 25² are the squares worth memorising. */
export const MIN_MEMORISE_BASE = 11;
export const MEMORISE_SHARE = 0.7;

/** `17² = ?` or `√289 = ?` */
export function generateSquares(rng: Rng): Question {
  const n =
    rng() < MEMORISE_SHARE
      ? randomInt(rng, MIN_MEMORISE_BASE, MAX_BASE)
      : randomInt(rng, MIN_BASE, MIN_MEMORISE_BASE - 1);
  const square = n * n;
  const form = rng() < 0.5 ? 'square' : 'root';
  return {
    key: `squares:${form}:${n}`,
    topic: 'squares',
    steps: [
      numberStep({
        prompt: form === 'square' ? `${formatInteger(n)}² = ?` : `√${formatInteger(square)} = ?`,
        answer: fromInteger(form === 'square' ? square : n),
        explanation: squareExplanation(n),
      }),
    ],
  };
}

/** '7² = 7 × 7 = 49', '20² = 20 × 20 = 400', or by splitting off the tens: '17² = 17 × 10 + …'. */
export function squareExplanation(n: number): string {
  const square = formatInteger(n * n);
  const units = n % 10;
  const tens = n - units;
  if (n <= 10 || units === 0) return `${n}² = ${n} × ${n} = ${square}`;
  const first = formatInteger(n * tens);
  const second = formatInteger(n * units);
  return `${n}² = ${n} × ${tens} + ${n} × ${units} = ${first} + ${second} = ${square}`;
}
