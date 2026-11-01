import { formatFraction, formatInteger, formatMixedNumber, formatRational, MINUS } from '../format';
import { gcd } from '../primes';
import { drawUntil, pick, randomInt, range, type Rng } from '../random';
import {
  add,
  compare,
  decimalPlaces,
  divide,
  fromInteger,
  isInteger,
  multiply,
  ONE,
  rational,
  subtract,
  type Rational,
} from '../rational';
import { SLOT } from '../slot';
import { fractionStep } from '../steps';
import type { Question } from '../types';
import { decimal } from './fractionNotation';

export const TEMPLATES = ['divide', 'multiply', 'percent', 'sum'] as const;
export type Template = (typeof TEMPLATES)[number];

const MAX_EXPECTED_DECIMALS = 3;

/** The expected answer: a decimal when it has at most 3 decimals, else a whole or mixed number. */
export function expectedText(value: Rational): string {
  const decimals = decimalPlaces(value);
  return decimals !== null && decimals <= MAX_EXPECTED_DECIMALS
    ? formatRational(value)
    : formatMixedNumber(value);
}

/** `3/4`, but a whole number as `1`. */
const fractionText = (value: Rational) =>
  isInteger(value) ? formatInteger(value.num) : formatFraction(value);

/** `p/q` as it comes out of a product, also when it is not in lowest terms. */
const rawFraction = (num: bigint, den: bigint) => `${formatInteger(num)}/${formatInteger(den)}`;

/** A chain of equal values without the repeats: `6/12 = 1/2 = 0,5`. */
const chain = (...texts: readonly string[]) =>
  texts.filter((text, index) => index === 0 || text !== texts[index - 1]).join(' = ');

/** `a/b × c/d = ac/bd = lowest = expected`. */
function productChain(left: Rational, right: Rational): string {
  const product = multiply(left, right);
  return chain(
    `${formatFraction(left)} × ${formatFraction(right)}`,
    rawFraction(left.num * right.num, left.den * right.den),
    fractionText(product),
    expectedText(product),
  );
}

interface Expression {
  /** The sum as shown, without the answer. */
  text: string;
  answer: Rational;
  explanation: string;
}

/** A proper fraction in lowest terms with a denominator from `denominators`. */
function properFraction(rng: Rng, denominators: readonly number[]): Rational {
  const q = pick(rng, denominators);
  const p = pick(
    rng,
    range(1, q - 1).filter((candidate) => gcd(candidate, q) === 1),
  );
  return rational(BigInt(p), BigInt(q));
}

/** `4 3/5 : 0,2`: a mixed number divided by 0,1, 0,2, 0,25 or 0,5. */
export function divideExpression(whole: number, fraction: Rational, divisor: Rational): Expression {
  const mixed = add(fromInteger(whole), fraction);
  const answer = divide(mixed, divisor);
  const inverse = divide(ONE, divisor);
  const unit = formatFraction(rational(1n, inverse.num));
  const shown = `${whole} ${formatFraction(fraction)}`;
  return {
    text: `${shown} : ${formatRational(divisor)}`,
    answer,
    explanation: `${formatRational(divisor)} = ${unit} → ${shown} : ${unit} = ${rawFraction(mixed.num, mixed.den)} × ${formatInteger(inverse.num)} = ${fractionText(answer)}`,
  };
}

/** `0,75 × 2/3` or `2/3 × 0,75`. */
export function multiplyExpression(
  factor: Rational,
  fraction: Rational,
  decimalFirst: boolean,
): Expression {
  const asFraction = rational(factor.num, factor.den);
  const [text, steps] = decimalFirst
    ? [
        `${formatRational(factor)} × ${formatFraction(fraction)}`,
        productChain(asFraction, fraction),
      ]
    : [
        `${formatFraction(fraction)} × ${formatRational(factor)}`,
        productChain(fraction, asFraction),
      ];
  return {
    text,
    answer: multiply(factor, fraction),
    explanation: `${formatRational(factor)} = ${formatFraction(asFraction)} → ${steps}`,
  };
}

/** `25% van 3/4` for a fraction, `25% van 4,8` for a decimal (`whole` is given as such). */
export function percentExpression(
  percent: number,
  whole: Rational,
  wholeIsFraction: boolean,
): Expression {
  const share = rational(BigInt(percent), 100n);
  const answer = multiply(share, whole);
  const head = `${percent}% = ${formatFraction(share)} → `;
  if (wholeIsFraction) {
    return {
      text: `${percent}% van ${formatFraction(whole)}`,
      answer,
      explanation: head + productChain(share, whole),
    };
  }
  const part = divide(whole, fromInteger(Number(share.den)));
  const times =
    share.num === 1n ? '' : ` → ${share.num} × ${formatRational(part)} = ${formatRational(answer)}`;
  return {
    text: `${percent}% van ${formatRational(whole)}`,
    answer,
    explanation: `${head}${formatRational(whole)} : ${share.den} = ${formatRational(part)}${times}`,
  };
}

/** `1/4 + 0,15` or `3/5 − 0,25`. */
export function sumExpression(fraction: Rational, term: Rational, plus: boolean): Expression {
  const answer = plus ? add(fraction, term) : subtract(fraction, term);
  const sign = plus ? '+' : MINUS;
  const converted = formatRational(fraction);
  return {
    text: `${formatFraction(fraction)} ${sign} ${formatRational(term)}`,
    answer,
    explanation: `${formatFraction(fraction)} = ${converted} → ${converted} ${sign} ${formatRational(term)} = ${formatRational(answer)}`,
  };
}

export function mixedQuestion(template: Template, expression: Expression): Question {
  return {
    key: `mixedNotation:${template}:${expression.text}`,
    topic: 'mixedNotation',
    steps: [
      fractionStep({
        prompt: `${expression.text} = ${SLOT}`,
        answer: expression.answer,
        expected: expectedText(expression.answer),
        explanation: expression.explanation,
      }),
    ],
  };
}

const DIVISORS = ['0,1', '0,2', '0,25', '0,5'].map(decimal);
const DECIMAL_FACTORS = ['0,2', '0,25', '0,4', '0,5', '0,6', '0,75', '0,8', '1,5', '2,5'].map(
  decimal,
);
const PERCENTAGES = [10, 20, 25, 50, 75];
const SUM_DENOMINATORS = [2, 4, 5, 8, 10, 20, 25];

function randomDivide(rng: Rng): Expression {
  return drawUntil(() => {
    const fraction = properFraction(rng, [2, 4, 5, 10]);
    const expression = divideExpression(randomInt(rng, 1, 9), fraction, pick(rng, DIVISORS));
    return isInteger(expression.answer) ? expression : null;
  });
}

function randomMultiply(rng: Rng): Expression {
  return drawUntil(() => {
    const fraction = properFraction(rng, range(2, 12));
    const expression = multiplyExpression(pick(rng, DECIMAL_FACTORS), fraction, rng() < 0.5);
    return expression.answer.den <= 20n ? expression : null;
  });
}

/** A decimal with exactly `decimals` decimals (the last one not 0) below `max`. */
function randomDecimal(rng: Rng, decimals: number, min: number, max: number): Rational {
  const scale = 10 ** decimals;
  const digits = drawUntil(() => {
    const value = randomInt(rng, Math.round(min * scale), max * scale - 1);
    return value % 10 === 0 ? null : value;
  });
  return rational(BigInt(digits), BigInt(scale));
}

function randomPercent(rng: Rng): Expression {
  const percent = pick(rng, PERCENTAGES);
  return rng() < 0.5
    ? percentExpression(percent, properFraction(rng, range(2, 10)), true)
    : percentExpression(percent, randomDecimal(rng, 1, 0.2, 10), false);
}

function randomSum(rng: Rng): Expression {
  return drawUntil(() => {
    const expression = sumExpression(
      properFraction(rng, SUM_DENOMINATORS),
      randomDecimal(rng, randomInt(rng, 1, 2), 0, 1),
      rng() < 0.5,
    );
    return compare(expression.answer, fromInteger(0)) > 0 ? expression : null;
  });
}

/** One question of the given template. */
export function buildMixedNotation(rng: Rng, template: Template): Question {
  switch (template) {
    case 'divide':
      return mixedQuestion(template, randomDivide(rng));
    case 'multiply':
      return mixedQuestion(template, randomMultiply(rng));
    case 'percent':
      return mixedQuestion(template, randomPercent(rng));
    case 'sum':
      return mixedQuestion(template, randomSum(rng));
  }
}

/** Four templates, each equally likely (spec §5.76). */
export function generateMixedNotation(rng: Rng): Question {
  return buildMixedNotation(rng, pick(rng, TEMPLATES));
}
