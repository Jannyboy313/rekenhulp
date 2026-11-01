import { formatInteger, formatRational } from '../format';
import { drawUntil, pick, randomInt, type Rng } from '../random';
import { fromInteger, rational, type Rational } from '../rational';
import { SLOT } from '../slot';
import { numberStep } from '../steps';
import type { Question } from '../types';
import { niceWholesBetween } from './niceWholes';

/** Spec §5.53. */
export const PERMILLES: readonly number[] = [1, 2, 3, 4, 5, 8, 10, 12, 15, 20, 25, 50];
export const CONVERTED_PERCENTAGES: readonly Rational[] = [
  rational(1n, 10n),
  rational(1n, 5n),
  rational(1n, 2n),
  fromInteger(1),
  rational(3n, 2n),
  fromInteger(2),
  rational(5n, 2n),
  fromInteger(5),
  fromInteger(10),
  rational(25n, 2n),
];

const WHOLES = niceWholesBetween(1000, 900_000);

export type PermilleForm = 'of' | 'convert' | 'what';
const FORMS: readonly PermilleForm[] = ['of', 'convert', 'what'];

export type ConversionDirection = 'toPercent' | 'toPermille' | 'toDecimal';
const DIRECTIONS: readonly ConversionDirection[] = ['toPercent', 'toPermille', 'toDecimal'];

/** `3‰ van 4000 = ?` */
export function permilleOfQuestion(permille: number, whole: number): Question {
  const onePermille = formatRational(rational(BigInt(whole), 1000n));
  const part = (permille * whole) / 1000;
  return {
    key: `permille:of:${permille}:${whole}`,
    topic: 'permille',
    steps: [
      numberStep({
        prompt: `${permille}‰ van ${formatInteger(whole)} = ${SLOT}`,
        answer: fromInteger(part),
        explanation: `1‰ = ${formatInteger(whole)} : 1000 = ${onePermille} → ${permille}‰ = ${permille} × ${onePermille} = ${formatInteger(part)}`,
      }),
    ],
  };
}

/** `6 is ?‰ van 2000` */
export function whatPermilleQuestion(permille: number, whole: number): Question {
  const onePermille = formatRational(rational(BigInt(whole), 1000n));
  const part = (permille * whole) / 1000;
  return {
    key: `permille:what:${permille}:${whole}`,
    topic: 'permille',
    steps: [
      numberStep({
        prompt: `${formatInteger(part)} is ${SLOT}‰ van ${formatInteger(whole)}`,
        answer: fromInteger(permille),
        suffix: '‰',
        explanation: `1‰ = ${formatInteger(whole)} : 1000 = ${onePermille} → ${formatInteger(part)} : ${onePermille} = ${permille}`,
      }),
    ],
  };
}

/** `25‰ = ?%`, `0,5% = ?‰` and `7‰ = ?`. `value` is in % for toPermille, else in ‰. */
export function conversionQuestion(direction: ConversionDirection, value: Rational): Question {
  const shown = formatRational(value);
  const key = `permille:convert:${direction}:${shown}`;
  if (direction === 'toPercent') {
    const answer = rational(value.num, value.den * 10n);
    return {
      key,
      topic: 'permille',
      steps: [
        numberStep({
          prompt: `${shown}‰ = ${SLOT}%`,
          answer,
          suffix: '%',
          explanation: `1% = 10‰ → ${shown} : 10 = ${formatRational(answer)}`,
        }),
      ],
    };
  }
  if (direction === 'toPermille') {
    const answer = rational(value.num * 10n, value.den);
    return {
      key,
      topic: 'permille',
      steps: [
        numberStep({
          prompt: `${shown}% = ${SLOT}‰`,
          answer,
          suffix: '‰',
          explanation: `1% = 10‰ → ${shown} × 10 = ${formatRational(answer)}`,
        }),
      ],
    };
  }
  const answer = rational(value.num, value.den * 1000n);
  return {
    key,
    topic: 'permille',
    steps: [
      numberStep({
        prompt: `${shown}‰ = ${SLOT}`,
        answer,
        explanation: `1‰ = 0,001 → ${shown}‰ = ${formatRational(answer)}`,
      }),
    ],
  };
}

/** A permille and a whole whose part is an integer. */
function drawPartOfWhole(rng: Rng): readonly [number, number] {
  return drawUntil(() => {
    const permille = pick(rng, PERMILLES);
    const whole = pick(rng, WHOLES);
    return (whole * permille) % 1000 === 0 ? ([permille, whole] as const) : null;
  });
}

export function generatePermille(rng: Rng): Question {
  switch (pick(rng, FORMS)) {
    case 'of':
      return permilleOfQuestion(...drawPartOfWhole(rng));
    case 'what':
      return whatPermilleQuestion(...drawPartOfWhole(rng));
    case 'convert': {
      const direction = pick(rng, DIRECTIONS);
      const value =
        direction === 'toPermille'
          ? pick(rng, CONVERTED_PERCENTAGES)
          : fromInteger(randomInt(rng, 1, 99));
      return conversionQuestion(direction, value);
    }
  }
}
