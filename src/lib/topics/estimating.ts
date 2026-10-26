import { formatRational } from '../format';
import { pick, randomInt, type Rng } from '../random';
import {
  fromInteger,
  hasAtMostDecimals,
  multiply,
  powerOfTen,
  rational,
  type Rational,
} from '../rational';
import { choiceStep } from '../steps';
import type { Question } from '../types';

/** The power-of-ten multipliers of the options (spec §5.52). */
const MULTIPLIER_SETS: readonly (readonly number[])[] = [
  [-1, 0, 1, 2],
  [-2, -1, 0, 1],
];

/**
 * The answer `c` and three powers of ten of it, in ascending order. One of the two multiplier
 * sets at random; a set whose options would have more than 2 decimals is not used.
 */
export function estimateOptions(c: Rational, unit: string, rng: Rng): string[] {
  const usable = MULTIPLIER_SETS.filter((set) =>
    set.every((exponent) => hasAtMostDecimals(multiply(c, powerOfTen(exponent)), 2)),
  );
  return pick(rng, usable).map(
    (exponent) => `${formatRational(multiply(c, powerOfTen(exponent)))} ${unit}`,
  );
}

export type EstimateContext = 'flat' | 'wandelen' | 'fietsen' | 'stappen' | 'water' | 'mensen';

interface Estimate {
  prompt(numbers: readonly Rational[]): string;
  answer(numbers: readonly Rational[]): Rational;
  unit: string;
  explanation(numbers: readonly Rational[], answer: Rational): string;
}

const show = formatRational;
const hours = (value: Rational) => (show(value) === '0,5' ? 'een half uur' : `${show(value)} uur`);
const HUMAN = rational(9n, 5n);

const ESTIMATES: Readonly<Record<EstimateContext, Estimate>> = {
  flat: {
    prompt: ([floors]) => `Een flat heeft ${show(floors!)} woonlagen. Hoe hoog is de flat ongeveer?`,
    answer: ([floors]) => multiply(floors!, fromInteger(3)),
    unit: 'm',
    explanation: ([floors], answer) => `1 woonlaag ≈ 3 m → ${show(floors!)} × 3 = ${show(answer)} m`,
  },
  wandelen: {
    prompt: ([time]) => `Je wandelt ${hours(time!)}. Hoe ver kom je ongeveer?`,
    answer: ([time]) => multiply(time!, fromInteger(5)),
    unit: 'km',
    explanation: ([time], answer) => `wandelen ≈ 5 km/u → ${show(time!)} × 5 = ${show(answer)} km`,
  },
  fietsen: {
    prompt: ([time]) => `Je fietst ${hours(time!)}. Hoe ver kom je ongeveer?`,
    answer: ([time]) => multiply(time!, fromInteger(17)),
    unit: 'km',
    explanation: ([time], answer) => `fietsen ≈ 17 km/u → ${show(time!)} × 17 = ${show(answer)} km`,
  },
  stappen: {
    prompt: ([km]) => `Je loopt ${show(km!)} km. Hoeveel stappen zet je ongeveer?`,
    answer: ([km]) => multiply(km!, fromInteger(1000)),
    unit: 'stappen',
    explanation: ([km], answer) =>
      `1 stap ≈ 1 m → ${show(km!)} km = ${show(answer)} m = ${show(answer)} stappen`,
  },
  water: {
    prompt: ([length, width, height]) =>
      `Een aquarium is ${show(length!)} cm lang, ${show(width!)} cm breed en ${show(height!)} cm hoog. Hoe zwaar is het water als het vol is, ongeveer?`,
    answer: ([length, width, height]) =>
      multiply(multiply(length!, width!), multiply(height!, rational(1n, 1000n))),
    unit: 'kg',
    explanation: ([length, width, height], answer) =>
      `${show(length!)} × ${show(width!)} × ${show(height!)} = ${show(multiply(multiply(length!, width!), height!))} cm³ = ${show(answer)} L, 1 L water ≈ 1 kg → ongeveer ${show(answer)} kg`,
  },
  mensen: {
    prompt: ([people]) =>
      `${show(people!)} volwassenen liggen achter elkaar op de grond. Hoe lang is de rij ongeveer?`,
    answer: ([people]) => multiply(people!, HUMAN),
    unit: 'm',
    explanation: ([people], answer) =>
      `1 volwassene ≈ 1,80 m → ${show(people!)} × 1,80 = ${show(answer)} m`,
  },
};

/** `Een flat heeft 12 woonlagen. Hoe hoog is de flat ongeveer?` with four options. */
export function estimatingQuestion(
  context: EstimateContext,
  numbers: readonly Rational[],
  rng: Rng,
): Question {
  const { prompt, answer, unit, explanation } = ESTIMATES[context];
  const value = answer(numbers);
  return {
    key: `estimating:${context}:${numbers.map(show).join(':')}`,
    topic: 'estimating',
    steps: [
      choiceStep({
        prompt: prompt(numbers),
        options: estimateOptions(value, unit, rng),
        answer: `${show(value)} ${unit}`,
        explanation: explanation(numbers, value),
      }),
    ],
  };
}

const tenths = (count: number) => rational(BigInt(count), 10n);

export function generateEstimating(rng: Rng): Question {
  const number = (...values: readonly (number | Rational)[]) =>
    pick(rng, values.map((value) => (typeof value === 'number' ? fromInteger(value) : value)));
  const context = pick(rng, [
    'flat',
    'wandelen',
    'fietsen',
    'stappen',
    'water',
    'mensen',
  ] as const);
  const numbers = {
    flat: [fromInteger(randomInt(rng, 4, 20))],
    wandelen: [number(tenths(5), 1, tenths(15), 2, tenths(25), 3, 4)],
    fietsen: [number(tenths(5), 1, 2, 3, 4)],
    stappen: [number(tenths(5), 1, tenths(15), 2, tenths(25), 3, 5)],
    water: [number(40, 50, 60, 80, 100), number(30, 40, 50), number(30, 40, 50)],
    mensen: [fromInteger(randomInt(rng, 5, 50))],
  }[context];
  return estimatingQuestion(context, numbers, rng);
}
