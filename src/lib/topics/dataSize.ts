import { formatRational } from '../format';
import { pick, randomInt, type Rng } from '../random';
import { SLOT } from '../slot';
import { fromInteger, multiply, rational, type Rational } from '../rational';
import { numberStep } from '../steps';
import type { Question } from '../types';
import { conversionExplanation } from './measurement';

export const DATA_UNITS: readonly string[] = ['kB', 'MB', 'GB', 'TB'];

/** Every step is ×1024 (spec §5.46). */
export const DATA_FACTOR = 1024;

/** The value in the larger unit; the smaller value (256 … 8192) is then a whole number. */
export const LARGER_VALUES: readonly Rational[] = [
  rational(1n, 4n),
  rational(1n, 2n),
  fromInteger(1),
  rational(3n, 2n),
  fromInteger(2),
  fromInteger(3),
  fromInteger(4),
  fromInteger(8),
];

/** `3 GB = ? MB` for neighbouring units, `from` and `to` in either order. No topic tips. */
export function dataSizeQuestion(from: string, to: string, value: Rational): Question {
  const toSmaller = DATA_UNITS.indexOf(from) > DATA_UNITS.indexOf(to);
  const factor = fromInteger(DATA_FACTOR);
  const answer = toSmaller ? multiply(value, factor) : multiply(value, rational(1n, 1024n));
  return {
    key: `dataSize:${from}>${to}:${value.num}/${value.den}`,
    topic: 'dataSize',
    steps: [
      numberStep({
        prompt: `${formatRational(value)} ${from} = ${SLOT} ${to}`,
        answer,
        suffix: to,
        explanation: conversionExplanation(from, to, value, answer),
      }),
    ],
  };
}

export function generateDataSize(rng: Rng): Question {
  const index = randomInt(rng, 0, DATA_UNITS.length - 2);
  const [smaller, larger] = [DATA_UNITS[index]!, DATA_UNITS[index + 1]!];
  const largerValue = pick(rng, LARGER_VALUES);
  return rng() < 0.5
    ? dataSizeQuestion(larger, smaller, largerValue)
    : dataSizeQuestion(smaller, larger, multiply(largerValue, fromInteger(DATA_FACTOR)));
}
