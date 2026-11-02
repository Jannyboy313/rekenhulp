import { MINUS, toSuperscript } from '../format';
import { drawUntil, pick, randomInt, range, type Rng } from '../random';
import { fromInteger } from '../rational';
import { numberStep } from '../steps';
import type { Question } from '../types';
import { toBase, type Base } from './numberSystems';

// Understanding number systems (spec §5.91).
const BASES: readonly Base[] = [2, 5, 16];

const NAMES: Record<Base, string> = { 2: 'tweetallig', 5: 'vijftallig', 16: 'zestientallig' };

/** Digit counts for the largest number: base 2 has 3–8 digits, base 5 2–4, base 16 2. */
const LARGEST_DIGITS: Record<Base, readonly number[]> = {
  2: range(3, 8),
  5: range(2, 4),
  16: [2],
};

/** Decimal values whose digit count is asked. */
const DIGIT_RANGES: Record<Base, readonly [number, number]> = {
  2: [10, 255],
  5: [26, 624],
  16: [200, 4000],
};

/** Values of 4-digit (base 2) or 3-digit (base 5, 16) numerals; base 16 needs a letter. */
const PLACE_RANGES: Record<Base, readonly [number, number]> = {
  2: [8, 15],
  5: [25, 124],
  16: [256, 2559],
};

/** `1111 = 8 + 4 + 2 + 1 = 15, of 2⁴ − 1 = 16 − 1 = 15`; base 16 names its letters first. */
export function largestExplanation(base: Base, digits: number): string {
  const value = base ** digits - 1;
  const numeral = toBase(value, base);
  const terms = [...numeral].map((char, index) => {
    const place = base ** (digits - 1 - index);
    return base === 2 ? String(place) : `${parseInt(char, base)} × ${place}`;
  });
  const letters = [...new Set(numeral)]
    .filter((char) => /[A-F]/.test(char))
    .map((char) => `${char} = ${parseInt(char, 16)}`)
    .join(', ');
  const prefix = letters === '' ? '' : `${letters}: `;
  return `${prefix}${numeral} = ${terms.join(' + ')} = ${value}, of ${base}${toSuperscript(digits)} ${MINUS} 1 = ${base ** digits} ${MINUS} 1 = ${value}`;
}

/** `64 = 2⁶ en 128 = 2⁷ → 100 zit tussen 64 en 128 → 7 cijfers` */
export function digitCountExplanation(value: number, base: Base): string {
  const digits = toBase(value, base).length;
  const low = base ** (digits - 1);
  const high = base ** digits;
  return `${low} = ${base}${toSuperscript(digits - 1)} en ${high} = ${base}${toSuperscript(digits)} → ${value} zit tussen ${low} en ${high} → ${digits} cijfers`;
}

/** The value of the first digit at its place, e.g. 213 in base 5 gives 50. */
export function firstDigitValue(value: number, base: Base): number {
  const place = base ** (toBase(value, base).length - 1);
  return Math.floor(value / place) * place;
}

/** `het eerste van 3 cijfers staat op de plaats van 5 × 5 = 25 → 2 × 25 = 50` */
export function placeValueExplanation(value: number, base: Base): string {
  const digits = toBase(value, base).length;
  const place = base ** (digits - 1);
  const chain = Array.from({ length: digits - 1 }, () => base).join(' × ');
  const first = Math.floor(value / place);
  return `het eerste van ${digits} cijfers staat op de plaats van ${chain} = ${place} → ${first} × ${place} = ${firstDigitValue(value, base)}`;
}

function generateLargest(rng: Rng): Question {
  const base = pick(rng, BASES);
  const digits = pick(rng, LARGEST_DIGITS[base]);
  return {
    key: `baseReasoning:largest:${base}:${digits}`,
    topic: 'baseReasoning',
    steps: [
      numberStep({
        prompt: `Wat is het grootste getal dat je met ${digits} cijfers in het ${NAMES[base]} stelsel kunt schrijven? Geef je antwoord als gewoon getal.`,
        answer: fromInteger(base ** digits - 1),
        explanation: largestExplanation(base, digits),
      }),
    ],
  };
}

function generateDigits(rng: Rng): Question {
  const base = pick(rng, BASES);
  const [min, max] = DIGIT_RANGES[base];
  const value = randomInt(rng, min, max);
  return {
    key: `baseReasoning:digits:${base}:${value}`,
    topic: 'baseReasoning',
    steps: [
      numberStep({
        prompt: `Hoeveel cijfers heeft het getal ${value} in het ${NAMES[base]} stelsel?`,
        answer: fromInteger(toBase(value, base).length),
        explanation: digitCountExplanation(value, base),
      }),
    ],
  };
}

function generatePlace(rng: Rng): Question {
  const base = pick(rng, BASES);
  const [min, max] = PLACE_RANGES[base];
  const value = drawUntil(() => {
    const drawn = randomInt(rng, min, max);
    return base === 16 && !/[A-F]/.test(toBase(drawn, 16)) ? null : drawn;
  });
  return {
    key: `baseReasoning:place:${base}:${value}`,
    topic: 'baseReasoning',
    steps: [
      numberStep({
        prompt: `Wat is de waarde van het eerste cijfer in het ${NAMES[base]}e getal ${toBase(value, base)}? Geef je antwoord als gewoon getal.`,
        answer: fromInteger(firstDigitValue(value, base)),
        explanation: placeValueExplanation(value, base),
      }),
    ],
  };
}

/** Largest number, digit count or place value, each equally likely (spec §5.91). */
export function generateBaseReasoning(rng: Rng): Question {
  return pick(rng, [generateLargest, generateDigits, generatePlace])(rng);
}
