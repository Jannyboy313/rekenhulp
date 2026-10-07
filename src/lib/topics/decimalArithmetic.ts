import { formatInteger, formatRational, MINUS } from '../format';
import { drawUntil, pick, randomInt, randomIntWhere, shuffle, type Rng } from '../random';
import {
  add,
  compare,
  decimalPlaces,
  equals,
  fromInteger,
  multiply,
  powerOfTen,
  subtract,
  type Rational,
} from '../rational';
import { numberStep } from '../steps';
import { powerOfTenShift, type Diagnose } from '../tips';
import type { Question } from '../types';
import { formatFixed } from './rounding';

// Decimal arithmetic (spec §5.22).
export const DECIMAL_FORMS = ['addSubtract', 'multiply', 'divide'] as const;
export type DecimalForm = (typeof DECIMAL_FORMS)[number];

/** p of the factor p × 10⁻ⁱ; q of the other factor is in [2, 9]. */
export const MULTIPLY_DIGITS: readonly number[] = [2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 15, 25];
/** p of the quotient and q of the divisor: [2, 12] without 10. */
export const DIVIDE_DIGITS: readonly number[] = [2, 3, 4, 5, 6, 7, 8, 9, 11, 12];

const HUNDRED = fromInteger(100);
const THOUSAND = fromInteger(1000);

/** digits × 10^exponent, exactly. */
function scaled(digits: number, exponent: number): Rational {
  return multiply(fromInteger(digits), powerOfTen(exponent));
}

/** Decimals of a value that terminates; every value in this topic does. */
function decimalsOf(value: Rational): number {
  const decimals = decimalPlaces(value);
  if (decimals === null) throw new RangeError('Value has no finite decimal representation');
  return decimals;
}

/**
 * A positive number below 100 with exactly `decimals` decimals (0 to 2), at most 3 significant
 * digits and no trailing zero after the comma.
 */
function randomDecimal(rng: Rng, decimals: number): Rational {
  const max = decimals === 0 ? 99 : 999;
  const digits = randomIntWhere(rng, 1, max, (n) => decimals === 0 || n % 10 !== 0);
  return scaled(digits, -decimals);
}

/** The digits of both numbers aligned on the right, as whole numbers are (spec §3.4.1). */
function rightAligned(a: Rational, b: Rational, subtracting: boolean): Rational {
  const decimalsA = decimalsOf(a);
  const decimalsB = decimalsOf(b);
  const digitsA = multiply(a, powerOfTen(decimalsA));
  const digitsB = multiply(b, powerOfTen(decimalsB));
  const combined = subtracting ? subtract(digitsA, digitsB) : add(digitsA, digitsB);
  return multiply(combined, powerOfTen(-Math.max(decimalsA, decimalsB)));
}

/** `4,7 + 0,35 = ?` or `5 − 0,25 = ?`; a subtraction has a > b. */
export function addSubtractQuestion(a: Rational, b: Rational, subtracting: boolean): Question {
  const answer = subtracting ? subtract(a, b) : add(a, b);
  const decimals = Math.max(decimalsOf(a), decimalsOf(b));
  const operator = subtracting ? MINUS : '+';
  const aligned = `${formatFixed(a, decimals)} ${operator} ${formatFixed(b, decimals)}`;
  const wrong = rightAligned(a, b, subtracting);
  const diagnose: Diagnose = (given) =>
    wrong.num > 0n && !equals(wrong, answer) && equals(given, wrong)
      ? `Zet de komma's onder elkaar: ${aligned}.`
      : undefined;
  return {
    key: `decimalArithmetic:${subtracting ? 'subtract' : 'add'}:${formatRational(a)}:${formatRational(b)}`,
    topic: 'decimalArithmetic',
    steps: [
      numberStep({
        prompt: `${formatRational(a)} ${operator} ${formatRational(b)} = ?`,
        answer,
        explanation: `${aligned} = ${formatRational(answer)}`,
        diagnose,
      }),
    ],
  };
}

/** A factor digits × 10^−decimals. */
export interface DecimalFactor {
  digits: number;
  decimals: number;
}

function factorValue({ digits, decimals }: DecimalFactor): Rational {
  return scaled(digits, -decimals);
}

/** `0,3 × 0,4 = ?`, in the order given. */
export function multiplyQuestion(first: DecimalFactor, second: DecimalFactor): Question {
  const a = factorValue(first);
  const b = factorValue(second);
  const answer = multiply(a, b);
  const together = first.decimals + second.decimals;
  const unit = together === 1 ? 'decimaal' : 'decimalen';
  const sum = `${first.decimals} + ${second.decimals} = ${together}`;
  const ascending = compare(a, b) <= 0;
  const low = ascending ? a : b;
  const high = ascending ? b : a;
  const diagnose: Diagnose = (given) => {
    const shift = powerOfTenShift(given, answer);
    return shift !== null && shift > 0
      ? `De uitkomst heeft evenveel decimalen als beide getallen samen: ${sum}.`
      : undefined;
  };
  return {
    key: `decimalArithmetic:multiply:${formatRational(low)}:${formatRational(high)}`,
    topic: 'decimalArithmetic',
    steps: [
      numberStep({
        prompt: `${formatRational(a)} × ${formatRational(b)} = ?`,
        answer,
        explanation:
          `${first.digits} × ${second.digits} = ${formatInteger(first.digits * second.digits)}; ` +
          `${sum} ${unit} → ${formatRational(answer)}`,
        diagnose,
      }),
    ],
  };
}

/** `2,5 : 0,05 = ?`: the quotient p × 10ˢ and the divisor q × 10ᵗ. */
export function divideQuestion(p: number, s: number, q: number, t: number): Question {
  const quotient = scaled(p, s);
  const divisor = scaled(q, t);
  const dividend = multiply(quotient, divisor);
  const sum = `${formatRational(dividend)} : ${formatRational(divisor)}`;
  const factor = powerOfTen(decimalsOf(divisor));
  const madeWhole =
    `${formatRational(multiply(dividend, factor))} : ` + formatRational(multiply(divisor, factor));
  const wholeDivisor = divisor.den === 1n;
  const diagnose: Diagnose = (given) =>
    !wholeDivisor && powerOfTenShift(given, quotient) !== null
      ? `Maak eerst van de deler een heel getal: ${sum} = ${madeWhole}.`
      : undefined;
  return {
    key: `decimalArithmetic:divide:${formatRational(dividend)}:${formatRational(divisor)}`,
    topic: 'decimalArithmetic',
    steps: [
      numberStep({
        prompt: `${sum} = ?`,
        answer: quotient,
        explanation: wholeDivisor
          ? `${formatInteger(p * q)} : ${q} = ${p} → ${sum} = ${formatRational(quotient)}`
          : `${sum} = ${madeWhole} = ${formatRational(quotient)} (beide × ${formatRational(factor)})`,
        diagnose,
      }),
    ],
  };
}

function addSubtractForm(rng: Rng): Question {
  return drawUntil(() => {
    const [decimalsA = 0, decimalsB = 1] = shuffle(rng, [0, 1, 2]);
    const a = randomDecimal(rng, decimalsA);
    const b = randomDecimal(rng, decimalsB);
    if (rng() < 0.5) {
      return compare(add(a, b), HUNDRED) < 0 ? addSubtractQuestion(a, b, false) : null;
    }
    // Different numbers of decimals and no trailing zeros, so a and b are never equal.
    return compare(a, b) > 0 ? addSubtractQuestion(a, b, true) : addSubtractQuestion(b, a, true);
  });
}

function multiplyForm(rng: Rng): Question {
  const { i, j } = drawUntil(() => {
    const i = randomInt(rng, 0, 2);
    const j = randomInt(rng, 0, 2);
    return i + j >= 1 && i + j <= 3 ? { i, j } : null;
  });
  const p = { digits: pick(rng, MULTIPLY_DIGITS), decimals: i };
  const q = { digits: randomInt(rng, 2, 9), decimals: j };
  return rng() < 0.5 ? multiplyQuestion(p, q) : multiplyQuestion(q, p);
}

function divideForm(rng: Rng): Question {
  return drawUntil(() => {
    const p = pick(rng, DIVIDE_DIGITS);
    const q = pick(rng, DIVIDE_DIGITS);
    const s = randomInt(rng, -2, 1);
    const t = randomInt(rng, -2, 0);
    const quotient = scaled(p, s);
    const divisor = scaled(q, t);
    const dividend = multiply(quotient, divisor);
    if (dividend.den === 1n && divisor.den === 1n) return null;
    if ([dividend, divisor, quotient].some((part) => decimalsOf(part) > 3)) return null;
    return compare(dividend, THOUSAND) < 0 ? divideQuestion(p, s, q, t) : null;
  });
}

const BUILDERS: Record<DecimalForm, (rng: Rng) => Question> = {
  addSubtract: addSubtractForm,
  multiply: multiplyForm,
  divide: divideForm,
};

/** One question of the given form. */
export function buildDecimalArithmetic(rng: Rng, form: DecimalForm): Question {
  return BUILDERS[form](rng);
}

/** One of three forms, each equally likely (spec §5.22). */
export function generateDecimalArithmetic(rng: Rng): Question {
  return buildDecimalArithmetic(rng, pick(rng, DECIMAL_FORMS));
}
