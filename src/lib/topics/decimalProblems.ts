import { formatEuro, formatFraction, formatInteger, formatMoney, formatRational } from '../format';
import { drawUntil, pick, randomInt, range, type Rng } from '../random';
import {
  compare,
  decimalPlaces,
  divide,
  fromInteger,
  multiply,
  rational,
  subtract,
  type Rational,
} from '../rational';
import { numberStep } from '../steps';
import type { Question } from '../types';
import { decimal } from './fractionNotation';

export const FORMS = ['price', 'priceBack', 'length'] as const;
export type Form = (typeof FORMS)[number];

/** Spec §5.78: the weights in kg. */
export const WEIGHTS = ['0,1', '0,2', '0,25', '0,3', '0,4', '0,5', '0,75', '1,2', '1,5', '2,5'].map(
  decimal,
);
/** A price per kilo is a multiple of € 0,10 in [1, 30]. */
export const PRICES = range(10, 300).map((tenths) => rational(BigInt(tenths), 10n));

/** The cost of a weight at a price per kilo, when it is a whole number of cents. */
const exactCost = (price: Rational, weight: Rational) => {
  const cost = multiply(price, weight);
  return (decimalPlaces(cost) ?? 3) <= 2 ? cost : null;
};

export const PRICE_PRODUCTS = [
  { name: 'Kaas', verb: 'kost' },
  { name: 'Gehakt', verb: 'kost' },
  { name: 'Druiven', verb: 'kosten' },
  { name: 'Noten', verb: 'kosten' },
] as const;
export const PRICE_BACK_PRODUCTS = ['appels', 'peren', 'tomaten'] as const;

/** `Kaas kost € 14 per kilo. Wat kost 0,25 kg?` */
export function priceQuestion(
  product: (typeof PRICE_PRODUCTS)[number],
  price: Rational,
  weight: Rational,
): Question {
  const cost = exactCost(price, weight)!;
  const { num: p, den: q } = weight;
  const unit = divide(price, fromInteger(Number(q)));
  const times = p === 1n ? '' : ` → ${p} × ${formatMoney(unit)} = ${formatMoney(cost)}`;
  return {
    key: `decimalProblems:price:${product.name}:${formatRational(price)}:${formatRational(weight)}`,
    topic: 'decimalProblems',
    steps: [
      numberStep({
        prompt: `${product.name} ${product.verb} ${formatEuro(price)} per kilo. Wat kost ${formatRational(weight)} kg?`,
        answer: cost,
        prefix: '€',
        expected: formatMoney(cost),
        explanation: `${formatRational(weight)} kg = ${formatFraction(weight)} kilo → ${formatMoney(price)} : ${q} = ${formatMoney(unit)}${times}`,
      }),
    ],
  };
}

/** `1,5 kg appels kost € 3,60. Wat kost 1 kg?` */
export function priceBackQuestion(product: string, price: Rational, weight: Rational): Question {
  const total = exactCost(price, weight)!;
  const { num: p, den: q } = weight;
  const part = divide(total, fromInteger(Number(p)));
  const middle = p === 1n ? '' : ` → ${formatRational(rational(1n, q))} kg = ${formatMoney(part)}`;
  return {
    key: `decimalProblems:priceBack:${product}:${formatRational(price)}:${formatRational(weight)}`,
    topic: 'decimalProblems',
    steps: [
      numberStep({
        prompt: `${formatRational(weight)} kg ${product} kost ${formatEuro(total)}. Wat kost 1 kg?`,
        answer: price,
        prefix: '€',
        expected: formatMoney(price),
        explanation: `${formatRational(weight)} kg = ${formatEuro(total)}${middle} → 1 kg = ${formatMoney(price)}`,
      }),
    ],
  };
}

export const PIECES = ['0,2', '0,25', '0,3', '0,4', '0,5', '0,6', '0,75'].map(decimal);
export const MAX_WHOLE_LENGTH = 6;
export const COUNT_MATERIALS = [
  { name: 'plank', verb: 'zaag' },
  { name: 'lint', verb: 'knip' },
] as const;

/** `Een plank van 2,4 m zaag je in stukken van 0,3 m. Hoeveel stukken krijg je?` */
export function pieceCountQuestion(
  material: (typeof COUNT_MATERIALS)[number],
  count: number,
  piece: Rational,
): Question {
  const total = multiply(piece, fromInteger(count));
  const scale = 10n ** BigInt(decimalPlaces(piece)!);
  const scaled = (value: Rational) => formatInteger(multiply(value, rational(scale)).num);
  return {
    key: `decimalProblems:length:count:${material.name}:${formatRational(total)}:${formatRational(piece)}`,
    topic: 'decimalProblems',
    steps: [
      numberStep({
        prompt: `Een ${material.name} van ${formatRational(total)} m ${material.verb} je in stukken van ${formatRational(piece)} m. Hoeveel stukken krijg je?`,
        answer: fromInteger(count),
        suffix: 'stukken',
        explanation: `${formatRational(total)} : ${formatRational(piece)} = ${scaled(total)} : ${scaled(piece)} = ${count}`,
      }),
    ],
  };
}

export const LINT_LENGTHS = [2, 3, 5, 10];

/** `Van een lint van 5 m knip je 6 stukken van 0,45 m. Hoeveel m blijft er over?` */
export function pieceRestQuestion(lint: number, count: number, piece: Rational): Question {
  const used = multiply(piece, fromInteger(count));
  const rest = subtract(fromInteger(lint), used);
  return {
    key: `decimalProblems:length:rest:${lint}:${count}:${formatRational(piece)}`,
    topic: 'decimalProblems',
    steps: [
      numberStep({
        prompt: `Van een lint van ${lint} m knip je ${count} stukken van ${formatRational(piece)} m. Hoeveel m blijft er over?`,
        answer: rest,
        suffix: 'm',
        explanation: `${count} × ${formatRational(piece)} = ${formatRational(used)} → ${lint} − ${formatRational(used)} = ${formatRational(rest)}`,
      }),
    ],
  };
}

function randomPrice(rng: Rng) {
  return drawUntil(() => {
    const price = pick(rng, PRICES);
    const weight = pick(rng, WEIGHTS);
    return exactCost(price, weight) === null ? null : ([price, weight] as const);
  });
}

function randomLength(rng: Rng): Question {
  if (rng() < 0.5) {
    const [count, piece] = drawUntil(() => {
      const count = randomInt(rng, 3, 20);
      const piece = pick(rng, PIECES);
      return compare(multiply(piece, fromInteger(count)), fromInteger(MAX_WHOLE_LENGTH)) <= 0
        ? ([count, piece] as const)
        : null;
    });
    return pieceCountQuestion(pick(rng, COUNT_MATERIALS), count, piece);
  }
  const [lint, count, piece] = drawUntil(() => {
    const lint = pick(rng, LINT_LENGTHS);
    const count = randomInt(rng, 2, 8);
    const piece = rational(BigInt(5 * randomInt(rng, 3, 30)), 100n);
    return compare(multiply(piece, fromInteger(count)), fromInteger(lint)) < 0
      ? ([lint, count, piece] as const)
      : null;
  });
  return pieceRestQuestion(lint, count, piece);
}

/** One question of the given form. */
export function buildDecimalProblem(rng: Rng, form: Form): Question {
  switch (form) {
    case 'price': {
      const [price, weight] = randomPrice(rng);
      return priceQuestion(pick(rng, PRICE_PRODUCTS), price, weight);
    }
    case 'priceBack': {
      const [price, weight] = randomPrice(rng);
      return priceBackQuestion(pick(rng, PRICE_BACK_PRODUCTS), price, weight);
    }
    case 'length':
      return randomLength(rng);
  }
}

/** Three forms, each equally likely (spec §5.78). */
export function generateDecimalProblems(rng: Rng): Question {
  return buildDecimalProblem(rng, pick(rng, FORMS));
}
