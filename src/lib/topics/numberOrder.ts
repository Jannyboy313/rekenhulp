import { formatFixed, formatRational } from '../format';
import { drawUntil, pick, randomInt, shuffle, type Rng } from '../random';
import {
  add,
  compare,
  decimalPlaces,
  negate,
  rational,
  subtract,
  type Rational,
} from '../rational';
import { choiceStep } from '../steps';
import type { Question } from '../types';

// Number order (spec §5.67): a chain in the right order, or the number between two bounds.
const MAX_ABSOLUTE = 20;
const MAX_SIGNIFICANT_DIGITS = 3;
const TENTH = rational(1n, 10n);
const TWENTIETH = rational(1n, 20n);

const absolute = (value: Rational) => (value.num < 0n ? negate(value) : value);

/** Digits of the number without the sign, the comma and leading zeros: 0,35 has 2. */
function significantDigits(value: Rational): number {
  const scaled = (absolute(value).num * 10n ** BigInt(decimalPlaces(value)!)) / value.den;
  return scaled.toString().length;
}

/**
 * The four chains of an order question, the right one first: the right chain, the chain ordered
 * by the numbers without their sign, and the right chain with the neighbouring pair `swaps[0]`
 * and the pair `swaps[1]` swapped. `values` are in ascending order.
 */
export function orderChains(
  values: readonly Rational[],
  ascending: boolean,
  swaps: readonly [number, number],
): string[] {
  const separator = ascending ? ' < ' : ' > ';
  const direction = ascending ? 1 : -1;
  const chain = (items: readonly Rational[]) => items.map(formatRational).join(separator);
  const right = ascending ? [...values] : [...values].reverse();
  const signTrap = [...values].sort((a, b) => direction * compare(absolute(a), absolute(b)));
  const swapped = swaps.map((index) => {
    const items = [...right];
    [items[index], items[index + 1]] = [items[index + 1]!, items[index]!];
    return chain(items);
  });
  return [chain(right), chain(signTrap), ...swapped];
}

/** `Welke rij klopt?` with the right chain, the sign trap and two neighbour swaps. */
export function orderQuestion(
  values: readonly Rational[],
  ascending: boolean,
  swaps: readonly [number, number],
  rng: Rng,
): Question {
  const [right, ...wrong] = orderChains(values, ascending, swaps);
  const shown = (ascending ? values : [...values].reverse()).map(formatRational);
  const [first, second] = values.map(formatRational);
  return {
    key: `numberOrder:order:${ascending ? 'up' : 'down'}:${values.map(formatRational).join(':')}`,
    topic: 'numberOrder',
    steps: [
      choiceStep({
        prompt: 'Welke rij klopt?',
        options: shuffle(rng, [right!, ...wrong]),
        answer: right!,
        explanation:
          `op de getallenlijn van ${ascending ? 'links naar rechts' : 'rechts naar links'}: ` +
          `${shown.join(', ')}. ${first} is kleiner dan ${second}: hoe verder onder nul, hoe kleiner`,
      }),
    ],
  };
}

/** `Welk getal ligt tussen −2,5 en −2,4?` for the lower bound `low` (1 decimal, negative). */
export function betweenQuestion(low: Rational): Question {
  const high = add(low, TENTH);
  const answer = add(low, TWENTIETH);
  const options = [
    subtract(low, TWENTIETH),
    answer,
    add(low, rational(3n, 20n)),
    negate(answer),
  ].sort(compare);
  return {
    key: `numberOrder:between:${formatRational(low)}`,
    topic: 'numberOrder',
    steps: [
      choiceStep({
        prompt: `Welk getal ligt tussen ${formatRational(low)} en ${formatRational(high)}?`,
        options: options.map(formatRational),
        answer: formatRational(answer),
        explanation:
          `${formatRational(low)} = ${formatFixed(low, 2)} en ${formatRational(high)} = ` +
          `${formatFixed(high, 2)} → ${formatRational(answer)} ligt ertussen`,
      }),
    ],
  };
}

function drawNumber(rng: Rng): Rational {
  const scale = 10 ** randomInt(rng, 0, 2);
  return rational(
    BigInt(randomInt(rng, -MAX_ABSOLUTE * scale, MAX_ABSOLUTE * scale)),
    BigInt(scale),
  );
}

function order(rng: Rng): Question {
  const ascending = rng() < 0.5;
  const { values, swaps } = drawUntil(() => {
    const values = Array.from({ length: 4 }, () => drawNumber(rng)).sort(compare);
    const negatives = values.filter((value) => value.num < 0n).length;
    const decimals = new Set(values.map(decimalPlaces));
    const swaps = shuffle(rng, [0, 1, 2]).slice(0, 2) as [number, number];
    const valid =
      values.every((value, i) => i === 0 || compare(values[i - 1]!, value) < 0) &&
      values.every((value) => significantDigits(value) <= MAX_SIGNIFICANT_DIGITS) &&
      // 3 and −3 would leave the sign trap without a single order.
      new Set(values.map((value) => formatRational(absolute(value)))).size === 4 &&
      negatives >= 2 &&
      negatives <= 3 &&
      decimals.size >= 2 &&
      new Set(orderChains(values, ascending, swaps)).size === 4;
    return valid ? { values, swaps } : null;
  });
  return orderQuestion(values, ascending, swaps, rng);
}

function between(rng: Rng): Question {
  // −0,1 is left out: its upper bound is 0 and the sign trap would equal a + 0,15.
  return betweenQuestion(rational(BigInt(-randomInt(rng, 2, 99)), 10n));
}

/** One of two forms, 50/50 (spec §5.67). */
export function generateNumberOrder(rng: Rng): Question {
  return pick(rng, [order, between])(rng);
}
