import { formatInteger, MINUS } from '../format';
import { drawUntil, pick, randomInt, range, type Rng } from '../random';
import { fromInteger } from '../rational';
import { SLOT } from '../slot';
import { numberStep } from '../steps';
import type { Question } from '../types';
import { divisibilityExplanation, type Divisor } from './divisibility';

/** Missing digit, and smallest/largest number with a divisor (spec §5.61). */
const DIGIT_DIVISORS: readonly Divisor[] = [3, 4, 6, 8, 9, 11, 12];
const RANGE_DIVISORS = [3, 4, 6, 7, 8, 9, 11, 12, 13, 15];
const MIN_DIGITS = 3;
const MAX_DIGITS = 5;
const BOUNDS = range(2, 9).map((hundreds) => hundreds * 100);
const DIGIT_WORDS: Record<number, string> = { 3: 'drie', 4: 'vier' };

type RangeKind = 'smallest' | 'largest' | 'above';

/** The digits 0–9 that make the number divisible when put at `slot`. */
export function fittingDigits(digits: readonly number[], slot: number, divisor: number): number[] {
  return range(0, 9).filter((digit) => {
    const filled = digits.map((value, index) => (index === slot ? digit : value));
    return Number(filled.join('')) % divisor === 0;
  });
}

/** The number written with a slot for the missing digit; five digits are grouped (spec §8). */
function withSlot(digits: readonly number[], slot: number): string {
  let seen = 0;
  return [...formatInteger(Number(digits.join('')))]
    .map((char) => (/\d/.test(char) && seen++ === slot ? SLOT : char))
    .join('');
}

/** '3 + 7 + 2 = 12': the known digits of the number. */
function knownDigitSum(digits: readonly number[], slot: number): { text: string; sum: number } {
  const known = digits.filter((_, index) => index !== slot);
  const sum = known.reduce((total, digit) => total + digit, 0);
  return { text: `${known.join(' + ')} = ${sum}`, sum };
}

/**
 * The rule of §5.6 with the answer filled in: 'Cijfersom 3 + 7 + 2 = 12 → 12 + 6 = 18 is
 * deelbaar door 9 → 6'. `digits` holds the answer at `slot`.
 */
export function missingDigitExplanation(
  digits: readonly number[],
  slot: number,
  divisor: Divisor,
): string {
  const answer = digits[slot]!;
  const filled = Number(digits.join(''));
  if (divisor === 3 || divisor === 9) {
    const { text, sum } = knownDigitSum(digits, slot);
    return `Cijfersom ${text} → ${sum} + ${answer} = ${sum + answer} is deelbaar door ${divisor} → ${answer}`;
  }
  return `${divisibilityExplanation(filled, divisor)} → ${answer}`;
}

function generateDigit(rng: Rng): Question {
  const divisor = pick(rng, DIGIT_DIVISORS);
  const length = randomInt(rng, MIN_DIGITS, MAX_DIGITS);
  const { digits, slot, fits } = drawUntil(() => {
    const min = 10 ** (length - 1);
    const quotient = randomInt(rng, Math.ceil(min / divisor), Math.floor((10 * min - 1) / divisor));
    const digits = [...String(quotient * divisor)].map(Number);
    const slot = randomInt(rng, 1, length - 1);
    const fits = fittingDigits(digits, slot, divisor);
    return fits.length < 10 ? { digits, slot, fits } : null;
  });
  const choice = fits.length === 1 ? 'only' : rng() < 0.5 ? 'smallest' : 'largest';
  const answer = choice === 'largest' ? Math.max(...fits) : Math.min(...fits);
  const masked = digits.map((digit, index) => (index === slot ? '_' : digit)).join('');
  const ending =
    choice === 'only' ? '' : ` Geef het ${choice === 'smallest' ? 'kleinste' : 'grootste'}.`;
  return {
    key: `missingDigit:digit:${masked}:${divisor}:${choice}`,
    topic: 'missingDigit',
    steps: [
      numberStep({
        prompt: `${withSlot(digits, slot)} is deelbaar door ${divisor}. Welk cijfer staat op de lege plek?${ending}`,
        answer: fromInteger(answer),
        explanation: missingDigitExplanation(
          digits.map((digit, index) => (index === slot ? answer : digit)),
          slot,
          divisor,
        ),
      }),
    ],
  };
}

/** The smallest multiple from `bound` up, the largest up to `bound`, or the smallest above it. */
export function rangeAnswer(kind: RangeKind, bound: number, divisor: number): number {
  const down = Math.floor(bound / divisor) * divisor;
  if (kind === 'largest') return down;
  return kind === 'smallest' && down === bound ? bound : down + divisor;
}

/** '1000 : 6 = 166 rest 4 → 1000 + 2 = 1002', '9999 : 7 = 1428 rest 3 → 9999 − 3 = 9996' */
export function rangeExplanation(kind: RangeKind, bound: number, divisor: number): string {
  const rest = bound % divisor;
  const division = `${formatInteger(bound)} : ${divisor} = ${Math.floor(bound / divisor)} rest ${rest}`;
  const answer = formatInteger(rangeAnswer(kind, bound, divisor));
  if (kind === 'largest') {
    return rest === 0
      ? `${division} → ${answer}`
      : `${division} → ${formatInteger(bound)} ${MINUS} ${rest} = ${answer}`;
  }
  if (kind === 'smallest' && rest === 0) return `${division} → ${answer}`;
  return `${division} → ${formatInteger(bound)} + ${divisor - rest} = ${answer}`;
}

function rangePrompt(kind: RangeKind, bound: number, divisor: number): string {
  if (kind === 'above') {
    return `Wat is het kleinste getal boven ${formatInteger(bound)} dat deelbaar is door ${divisor}?`;
  }
  const digits = String(bound).length;
  return `Wat is het ${kind === 'smallest' ? 'kleinste' : 'grootste'} getal van ${DIGIT_WORDS[digits]} cijfers dat deelbaar is door ${divisor}?`;
}

function generateRange(rng: Rng): Question {
  const kind = pick<RangeKind>(rng, ['smallest', 'largest', 'above']);
  const divisor = pick(rng, RANGE_DIVISORS);
  const digits = randomInt(rng, 3, 4);
  const bound =
    kind === 'above' ? pick(rng, BOUNDS) : kind === 'smallest' ? 10 ** (digits - 1) : 10 ** digits - 1;
  return {
    key: `missingDigit:range:${kind}:${bound}:${divisor}`,
    topic: 'missingDigit',
    steps: [
      numberStep({
        prompt: rangePrompt(kind, bound, divisor),
        answer: fromInteger(rangeAnswer(kind, bound, divisor)),
        explanation: rangeExplanation(kind, bound, divisor),
      }),
    ],
  };
}

/** `3?72 is deelbaar door 9. Welk cijfer staat op de lege plek?` or the smallest/largest number. */
export function generateMissingDigit(rng: Rng): Question {
  return rng() < 0.5 ? generateDigit(rng) : generateRange(rng);
}
