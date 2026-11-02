import { MINUS } from '../format';
import { drawUntil, pick, randomInt, type Rng } from '../random';
import { fromInteger } from '../rational';
import { numberStep, textStep } from '../steps';
import type { Question } from '../types';
import { additiveValue, romanGroups, toRoman } from './romanNumerals';

/** Calculating with Roman numerals (spec §5.93). */
type Operator = '+' | typeof MINUS;

const LAST_YEAR = 2030;

/** A numeral has a subtractive pair when its value is not the plain sum of its symbols. */
const hasPair = (value: number): boolean => additiveValue(toRoman(value)) !== value;

const anyPair = (values: readonly number[]): boolean => values.some(hasPair);

/** `XIV = 14 en XXVIII = 28 → 14 + 28 = 42 = 40 + 2 = XL + II → XLII` */
export function arithmeticExplanation(
  a: number,
  operator: Operator,
  b: number,
  result: number,
): string {
  const groups = romanGroups(result);
  const breakdown =
    groups.length === 1
      ? ''
      : ` = ${groups.map(({ value }) => value).join(' + ')} = ${groups.map(({ symbols }) => symbols).join(' + ')}`;
  return `${toRoman(a)} = ${a} en ${toRoman(b)} = ${b} → ${a} ${operator} ${b} = ${result}${breakdown} → ${toRoman(result)}`;
}

/** `MCMXLV = 1945 en MMXXV = 2025 → 2025 − 1945 = 80` */
export function yearsExplanation(first: number, second: number): string {
  return `${toRoman(first)} = ${first} en ${toRoman(second)} = ${second} → ${second} ${MINUS} ${first} = ${second - first}`;
}

function sumQuestion(rng: Rng): Question {
  const { a, b } = drawUntil(() => {
    const a = randomInt(rng, 10, 99);
    const b = randomInt(rng, 10, 99);
    return a !== b && anyPair([a, b, a + b]) ? { a, b } : null;
  });
  return {
    key: `romanCalc:sum:${a}:${b}`,
    topic: 'romanCalc',
    steps: [
      textStep({
        kind: 'roman',
        prompt: `Tel op: ${toRoman(a)} + ${toRoman(b)}. Schrijf je antwoord met Romeinse cijfers.`,
        answer: toRoman(a + b),
        explanation: arithmeticExplanation(a, '+', b, a + b),
      }),
    ],
  };
}

function differenceQuestion(rng: Rng): Question {
  const { a, b } = drawUntil(() => {
    const a = randomInt(rng, 20, 99);
    const b = randomInt(rng, 10, a - 5);
    return anyPair([a, b, a - b]) ? { a, b } : null;
  });
  return {
    key: `romanCalc:difference:${a}:${b}`,
    topic: 'romanCalc',
    steps: [
      textStep({
        kind: 'roman',
        prompt: `Trek af: ${toRoman(a)} ${MINUS} ${toRoman(b)}. Schrijf je antwoord met Romeinse cijfers.`,
        answer: toRoman(a - b),
        explanation: arithmeticExplanation(a, MINUS, b, a - b),
      }),
    ],
  };
}

function yearsQuestion(rng: Rng): Question {
  const first = randomInt(rng, 1400, 1999);
  const second = first + randomInt(rng, 10, Math.min(120, LAST_YEAR - first));
  return {
    key: `romanCalc:years:${first}:${second}`,
    topic: 'romanCalc',
    steps: [
      numberStep({
        prompt: `Hoeveel jaar zit er tussen ${toRoman(first)} en ${toRoman(second)}?`,
        answer: fromInteger(second - first),
        suffix: 'jaar',
        explanation: yearsExplanation(first, second),
      }),
    ],
  };
}

export function generateRomanCalc(rng: Rng): Question {
  return pick(rng, [sumQuestion, differenceQuestion, yearsQuestion])(rng);
}
