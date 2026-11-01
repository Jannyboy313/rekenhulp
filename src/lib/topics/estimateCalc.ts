import { formatRational } from '../format';
import { drawUntil, pick, randomInt, range, type Rng } from '../random';
import {
  compare,
  divide,
  fromInteger,
  hasAtMostDecimals,
  isInteger,
  multiply,
  powerOfTen,
  rational,
  type Rational,
} from '../rational';
import { choiceStep } from '../steps';
import type { Question } from '../types';

// Estimating calculations (spec §5.71): round the operands, calculate, pick the power of ten.
export type CalcOperator = '×' | ':';

/** The power-of-ten multipliers of the options (spec §5.52, used as in §5.71). */
const MULTIPLIER_SETS: readonly (readonly number[])[] = [
  [-1, 0, 1, 2],
  [-2, -1, 0, 1],
];

const DECIMAL_SHARE = 0.3;
/** Spec §5.71: rounded whole operands in [10, 900], dividend at most 9900, estimate at most 10 000. */
const MAX_ESTIMATE = fromInteger(10_000);
const MIN_DECIMAL = rational(1n, 10n);
const MAX_DECIMAL = fromInteger(99);
const MAX_WHOLE = 9900;

/** The sets whose options all have at most 2 decimals (spec §5.71). */
function usableSets(estimate: Rational): (readonly number[])[] {
  return MULTIPLIER_SETS.filter((set) =>
    set.every((exponent) => hasAtMostDecimals(multiply(estimate, powerOfTen(exponent)), 2)),
  );
}

const apply = (operator: CalcOperator, a: Rational, b: Rational) =>
  operator === '×' ? multiply(a, b) : divide(a, b);

/**
 * `Ongeveer hoeveel is 6189 : 31?` for the operands `moved` and the operands `rounded` they were
 * moved from; the options are powers of ten of the estimate with the rounded operands.
 */
export function estimateCalcQuestion(
  operator: CalcOperator,
  moved: readonly [Rational, Rational],
  rounded: readonly [Rational, Rational],
  rng: Rng,
): Question {
  const estimate = apply(operator, rounded[0], rounded[1]);
  const [a, b] = moved.map(formatRational) as [string, string];
  const [roundedA, roundedB] = rounded.map(formatRational) as [string, string];
  const shown = formatRational(estimate);
  return {
    key: `estimateCalc:${operator}:${a}:${b}`,
    topic: 'estimateCalc',
    steps: [
      choiceStep({
        prompt: `Ongeveer hoeveel is ${a} ${operator} ${b}?`,
        options: pick(rng, usableSets(estimate)).map((exponent) =>
          formatRational(multiply(estimate, powerOfTen(exponent))),
        ),
        answer: shown,
        explanation:
          `${a} ≈ ${roundedA} en ${b} ≈ ${roundedB} → ` +
          `${roundedA} ${operator} ${roundedB} = ${shown}`,
      }),
    ],
  };
}

/** The step of the digits of a decimal below 100: 3 significant digits, so 0,001 up to 0,1. */
function gridOf(value: Rational): Rational | null {
  if (compare(value, fromInteger(1)) < 0) return rational(1n, 1000n);
  if (compare(value, fromInteger(10)) < 0) return rational(1n, 100n);
  return compare(value, fromInteger(100)) < 0 ? rational(1n, 10n) : null;
}

/**
 * The numbers 3% to 10% above or below `value` that are not round: a whole number that does
 * not end in 0, or (for a decimal operand) a number with 2 or 3 significant digits in [0,1; 99].
 */
function movedCandidates(value: Rational, decimalOperand: boolean): Rational[] {
  const wholeOk = isInteger(value) && compare(value, fromInteger(MAX_WHOLE)) <= 0;
  const grid = decimalOperand ? gridOf(value) : wholeOk ? fromInteger(1) : null;
  if (grid === null) return [];
  const base = Number(divide(value, grid).num);
  const steps = range(Math.ceil((base * 9) / 10), Math.floor((base * 11) / 10)).filter((step) => {
    const distance = 100 * Math.abs(step - base);
    return distance >= 3 * base && distance <= 10 * base;
  });
  return steps
    .filter((step) => String(step).replace(/0+$/, '').length >= 2 && (decimalOperand || step >= 10))
    .map((step) => multiply(fromInteger(step), grid))
    .filter((moved) =>
      decimalOperand
        ? !isInteger(moved) && compare(moved, MIN_DECIMAL) >= 0 && compare(moved, MAX_DECIMAL) <= 0
        : moved.num % 10n !== 0n,
    );
}

const WHOLES = [1, 2, 3, 4, 5, 6, 7, 8, 9].flatMap((digit) => [digit * 10, digit * 100]);
const DECIMALS = [1, 2, 3, 4, 5, 6, 7, 8, 9].flatMap((digit) =>
  [rational(1n, 10n), fromInteger(1), fromInteger(10)].map((scale) =>
    multiply(fromInteger(digit), scale),
  ),
);
/** The rounded quotient: 2 to 9, 10 to 90 and 100 to 900. */
const QUOTIENTS = [...range(2, 9), ...range(1, 9).flatMap((digit) => [digit * 10, digit * 100])];

/** One estimate question (spec §5.71): `×` or `:`, 50/50. */
export function generateEstimateCalc(rng: Rng): Question {
  const operator = pick(rng, ['×', ':'] as const);
  // The index of the operand that becomes a decimal, in 30% of the exercises.
  const decimalIndex = rng() < DECIMAL_SHARE ? randomInt(rng, 0, 1) : null;
  const operand = (index: number) =>
    index === decimalIndex ? pick(rng, DECIMALS) : fromInteger(pick(rng, WHOLES));
  return drawUntil(() => {
    const second = operand(1);
    // A division is built backwards: the dividend is the divisor times the rounded quotient.
    const first =
      operator === '×' ? operand(0) : multiply(second, fromInteger(pick(rng, QUOTIENTS)));
    const estimate = apply(operator, first, second);
    if (compare(estimate, MAX_ESTIMATE) > 0 || usableSets(estimate).length === 0) return null;
    const candidates = [first, second].map((value, index) =>
      movedCandidates(value, index === decimalIndex),
    );
    if (candidates.some((list) => list.length === 0)) return null;
    const moved = candidates.map((list) => pick(rng, list)) as [Rational, Rational];
    return estimateCalcQuestion(operator, moved, [first, second], rng);
  });
}
