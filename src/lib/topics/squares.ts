import { formatInteger } from '../format';
import { randomInt, type Rng } from '../random';
import { divide, equals, fromInteger } from '../rational';
import { numberStep } from '../steps';
import { positiveInteger, type Diagnose } from '../tips';
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
        diagnose: form === 'square' ? squareTip(n) : rootTip(n),
      }),
    ],
  };
}

/** n² answered with n × 2 (spec §3.4.1). */
export function squareTip(n: number): Diagnose {
  const shown = formatInteger(n);
  return (given) =>
    equals(given, fromInteger(2 * n))
      ? `${shown}² is ${shown} × ${shown}, niet ${shown} × 2.`
      : undefined;
}

/** √ answered with half the square, or with another number: show what that number squares to. */
export function rootTip(n: number): Diagnose {
  const square = formatInteger(n * n);
  return (given) => {
    if (equals(given, divide(fromInteger(n * n), fromInteger(2)))) {
      return `√${square} is het getal dat keer zichzelf ${square} geeft, niet de helft.`;
    }
    const value = positiveInteger(given);
    // Larger numbers get the factor-of-ten fallback; their square would be unreadable anyway.
    if (value === null || value > 10_000) return undefined;
    return `${formatInteger(value)} × ${formatInteger(value)} = ${formatInteger(value * value)}, niet ${square}.`;
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
