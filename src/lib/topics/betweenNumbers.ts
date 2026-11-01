import { formatFraction, formatInteger, formatMixedNumber, formatRational } from '../format';
import { gcd, lcm } from '../primes';
import { drawUntil, pick, randomInt, range, type Rng } from '../random';
import {
  add,
  compare,
  decimalPlaces,
  fromInteger,
  multiply,
  rational,
  subtract,
  type Rational,
} from '../rational';
import { fractionStep, numberStep } from '../steps';
import type { Question } from '../types';
import {
  absDifference,
  decimal,
  decimalShown,
  fractionShown,
  type Shown,
} from './fractionNotation';
import { expectedText } from './mixedNotation';

export const FORMS = ['middle', 'jumps', 'marks'] as const;
export type Form = (typeof FORMS)[number];

const half = rational(1n, 2n);

/** The middle of two numbers must have a denominator of at most this, unless it is a decimal. */
export const MAX_MIDDLE_DENOMINATOR = 48;
export const MIN_GAP = rational(1n, 20n);
/** Two decimals are at most this far apart. */
export const MAX_DECIMAL_GAP = rational(1n);

/** `p/q` with the numerator written over the common denominator `den`. */
const over = (value: Rational, den: bigint) =>
  `${formatInteger((value.num * den) / value.den)}/${den}`;

/** `1/4 = 6/24 en 1/3 = 8/24 → midden 7/24`, with a decimal first written as a fraction. */
function fractionRoute(low: Shown, high: Shown, middle: Rational, expected: string): string {
  const den = 2n * BigInt(lcm(Number(low.value.den), Number(high.value.den)));
  const asFraction = (shown: Shown) =>
    shown.fraction ? '' : `${shown.text} = ${formatFraction(shown.value)} → `;
  const shown = (value: Shown) => `${formatFraction(value.value)} = ${over(value.value, den)}`;
  const result = formatFraction(middle);
  return `${asFraction(low)}${asFraction(high)}${shown(low)} en ${shown(high)} → midden ${result}${result === expected ? '' : ` = ${expected}`}`;
}

/** `(2,7 + 3,05) : 2 = 5,75 : 2 = 2,875`, with a fraction first written as a decimal. */
function decimalRoute(low: Shown, high: Shown, middle: Rational): string {
  const asDecimal = (shown: Shown) =>
    shown.fraction ? `${shown.text} = ${formatRational(shown.value)} → ` : '';
  const [a, b] = [low, high].map(({ value }) => formatRational(value));
  return `${asDecimal(low)}${asDecimal(high)}(${a} + ${b}) : 2 = ${formatRational(add(low.value, high.value))} : 2 = ${formatRational(middle)}`;
}

/** `Welk getal ligt precies midden tussen 1/4 en 1/3?` The numbers are shown in ascending order. */
export function middleQuestion(first: Shown, second: Shown): Question {
  const [low, high] = compare(first.value, second.value) <= 0 ? [first, second] : [second, first];
  const middle = multiply(add(low.value, high.value), half);
  const expected = expectedText(middle);
  // A fraction pair is explained with fractions, a decimal pair with decimals, a mixed pair in
  // the notation in which the middle is a decimal (fractions when it has no finite decimal).
  const useFractions =
    low.fraction === high.fraction ? low.fraction : decimalPlaces(middle) === null;
  const explanation = useFractions
    ? fractionRoute(low, high, middle, expected)
    : decimalRoute(low, high, middle);
  return {
    key: `betweenNumbers:middle:${low.text}:${high.text}`,
    topic: 'betweenNumbers',
    steps: [
      fractionStep({
        prompt: `Welk getal ligt precies midden tussen ${low.text} en ${high.text}?`,
        answer: middle,
        expected,
        explanation,
      }),
    ],
  };
}

export const JUMP_DECIMALS = [
  '0,05',
  '0,1',
  '0,15',
  '0,2',
  '0,25',
  '0,3',
  '0,4',
  '0,5',
  '0,75',
].map(decimal);
export const JUMP_DENOMINATORS = [2, 3, 4, 5, 8];

/** `Je springt op de getallenlijn van 1,2 naar 3 in sprongen van 0,15. Hoeveel sprongen zijn dat?` */
export function jumpsQuestion(
  start: Rational,
  jump: Rational,
  count: number,
  fractionJump: boolean,
): Question {
  const end = add(start, multiply(jump, fromInteger(count)));
  const diff = subtract(end, start);
  const shown = (value: Rational) =>
    fractionJump ? formatMixedNumber(value) : formatRational(value);
  const jumpText = fractionJump ? formatFraction(jump) : formatRational(jump);
  const subtraction = start.num === 0n ? '' : `${shown(end)} − ${shown(start)} = ${shown(diff)} → `;
  const scale = rational(fractionJump ? 1n : 10n ** BigInt(decimalPlaces(jump)!));
  const scaled = (value: Rational) => formatInteger(multiply(value, scale).num);
  const division = fractionJump
    ? `${shown(diff)} : ${jumpText} = ${shown(diff)} × ${formatInteger(jump.den)} = ${count}`
    : `${shown(diff)} : ${jumpText} = ${scaled(diff)} : ${scaled(jump)} = ${count}`;
  return {
    key: `betweenNumbers:jumps:${shown(start)}:${jumpText}:${count}`,
    topic: 'betweenNumbers',
    steps: [
      numberStep({
        prompt: `Je springt op de getallenlijn van ${shown(start)} naar ${shown(end)} in sprongen van ${jumpText}. Hoeveel sprongen zijn dat?`,
        answer: fromInteger(count),
        explanation: subtraction + division,
      }),
    ],
  };
}

export const MARK_PIECES = [4, 5, 8, 10, 20];

/** `De getallenlijn van 2 tot 3 is in 8 gelijke stukjes verdeeld. Welk getal staat bij het 5e streepje na 2?` */
export function marksQuestion(whole: number, pieces: number, mark: number): Question {
  const part = rational(BigInt(mark), BigInt(pieces));
  const answer = add(fromInteger(whole), part);
  const expected = expectedText(answer);
  const raw = `${mark}/${pieces}`;
  const rawMixed = whole === 0 ? raw : `${whole} ${raw}`;
  const steps = [rawMixed, formatMixedNumber(answer), expected].filter(
    (text, index, texts) => index === 0 || text !== texts[index - 1],
  );
  return {
    key: `betweenNumbers:marks:${whole}:${pieces}:${mark}`,
    topic: 'betweenNumbers',
    steps: [
      fractionStep({
        prompt: `De getallenlijn van ${whole} tot ${whole + 1} is in ${pieces} gelijke stukjes verdeeld. Welk getal staat bij het ${mark}e streepje na ${whole}?`,
        answer,
        expected,
        explanation: `1 stukje = 1/${pieces} → ${whole} + ${raw} = ${steps.join(' = ')}`,
      }),
    ],
  };
}

function randomProperFraction(rng: Rng): Shown {
  const q = randomInt(rng, 2, 12);
  const p = pick(
    rng,
    range(1, q - 1).filter((candidate) => gcd(candidate, q) === 1),
  );
  return fractionShown(p, q);
}

/** 1 or 2 decimals, the last one not 0, between `min` and `max` hundredths. */
function randomDecimal(rng: Rng, minHundredths: number, maxHundredths: number): Shown {
  const decimals = randomInt(rng, 1, 2);
  const step = decimals === 1 ? 10 : 1;
  const digits = drawUntil(() => {
    const value = randomInt(rng, Math.ceil(minHundredths / step), Math.floor(maxHundredths / step));
    return value % 10 === 0 ? null : value * step;
  });
  return decimalShown(rational(BigInt(digits), 100n));
}

function randomMiddle(rng: Rng): Question {
  const variant = pick(rng, ['fractions', 'decimals', 'mixed'] as const);
  const [first, second] = drawUntil(() => {
    const pair =
      variant === 'fractions'
        ? ([randomProperFraction(rng), randomProperFraction(rng)] as const)
        : variant === 'decimals'
          ? ([randomDecimal(rng, 5, 2000), randomDecimal(rng, 5, 2000)] as const)
          : ([randomProperFraction(rng), randomDecimal(rng, 5, 99)] as const);
    const gap = absDifference(pair[0].value, pair[1].value);
    if (compare(gap, MIN_GAP) < 0) return null;
    if (variant === 'decimals' && compare(gap, MAX_DECIMAL_GAP) > 0) return null;
    const middle = multiply(add(pair[0].value, pair[1].value), half);
    const readable = decimalPlaces(middle) !== null || middle.den <= BigInt(MAX_MIDDLE_DENOMINATOR);
    return readable ? pair : null;
  });
  return middleQuestion(first, second);
}

function randomJumps(rng: Rng): Question {
  const count = randomInt(rng, 4, 30);
  if (rng() < 0.3) {
    // A whole or half start in [0, 10].
    const start = add(fromInteger(randomInt(rng, 0, 9)), rng() < 0.5 ? half : fromInteger(0));
    const jump = rational(1n, BigInt(pick(rng, JUMP_DENOMINATORS)));
    return jumpsQuestion(start, jump, count, true);
  }
  const tenths = drawUntil(() => {
    const value = randomInt(rng, 1, 99);
    return value % 10 === 0 ? null : value;
  });
  return jumpsQuestion(rational(BigInt(tenths), 10n), pick(rng, JUMP_DECIMALS), count, false);
}

function randomMarks(rng: Rng): Question {
  const pieces = pick(rng, MARK_PIECES);
  const mark = drawUntil(() => {
    const candidate = randomInt(rng, 1, pieces - 1);
    return 2 * candidate === pieces ? null : candidate;
  });
  return marksQuestion(randomInt(rng, 0, 9), pieces, mark);
}

/** One question of the given form. */
export function buildBetweenNumbers(rng: Rng, form: Form): Question {
  switch (form) {
    case 'middle':
      return randomMiddle(rng);
    case 'jumps':
      return randomJumps(rng);
    case 'marks':
      return randomMarks(rng);
  }
}

/** Three forms, each equally likely (spec §5.79). */
export function generateBetweenNumbers(rng: Rng): Question {
  return buildBetweenNumbers(rng, pick(rng, FORMS));
}
