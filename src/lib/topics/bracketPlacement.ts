import { evaluate } from '../expr/evaluate';
import { formatExpr } from '../expr/format';
import { parse, type BinaryOperator, type Expr } from '../expr/parser';
import { explainEvaluation } from '../expr/reduce';
import { drawUntil, pick, randomInt, type Rng } from '../random';
import { equals, fromInteger, isInteger, type Rational } from '../rational';
import type { Question, Step } from '../types';

// Bracket placement (spec §5.63).
const OPERATORS: readonly BinaryOperator[] = ['+', '−', '×', ':'];
const MAX_TARGET = 200;

export const OTHER_TOKENS = 'Gebruik dezelfde getallen en bewerkingen in dezelfde volgorde.';

export interface BracketExercise {
  numbers: readonly number[];
  operators: readonly BinaryOperator[];
  /** The generated placement: parentheses round numbers `from` to `to` (0-based, `from < to`). */
  from: number;
  to: number;
  target: number;
  /** Without parentheses: `3 + 4 × 5 − 2`. */
  flat: string;
  /** With the generated parentheses: `(3 + 4) × 5 − 2`. */
  placed: string;
}

/** Every division is exact and has a divisor that is not 0. */
function divisionsExact(expr: Expr): boolean {
  switch (expr.type) {
    case 'number':
      return true;
    case 'group':
      return divisionsExact(expr.inner);
    case 'power':
      return false;
    case 'binary': {
      if (expr.operator === ':') {
        const value = evaluate(expr);
        if (value === null || !isInteger(value)) return false;
      }
      return divisionsExact(expr.left) && divisionsExact(expr.right);
    }
  }
}

function writeOut(
  numbers: readonly number[],
  operators: readonly BinaryOperator[],
  from?: number,
  to?: number,
): string {
  return numbers
    .map((n, i) => `${i === from ? '(' : ''}${n}${i === to ? ')' : ''}`)
    .flatMap((text, i) => (i === 0 ? [text] : [operators[i - 1]!, text]))
    .join(' ');
}

/** Redraws until a single pair of parentheses changes the value to an integer target. */
export function drawBracketExercise(rng: Rng): BracketExercise {
  return drawUntil(() => {
    const count = randomInt(rng, 3, 4);
    const numbers = Array.from({ length: count }, () => randomInt(rng, 1, 12));
    const operators = Array.from({ length: count - 1 }, () => pick(rng, OPERATORS));
    if (!operators.some((op) => op === '×' || op === ':')) return null;
    const from = randomInt(rng, 0, count - 2);
    const to = randomInt(rng, from + 1, count - 1);
    const flat = writeOut(numbers, operators);
    const placed = writeOut(numbers, operators, from, to);
    const flatExpr = parse(flat);
    const placedExpr = parse(placed);
    if (flatExpr === null || placedExpr === null) return null;
    if (!divisionsExact(flatExpr) || !divisionsExact(placedExpr)) return null;
    const flatValue = evaluate(flatExpr);
    const target = evaluate(placedExpr);
    if (flatValue === null || target === null || equals(flatValue, target)) return null;
    if (!isInteger(target) || target.num < 0n || target.num > BigInt(MAX_TARGET)) return null;
    return { numbers, operators, from, to, target: Number(target.num), flat, placed };
  });
}

/** The numbers and operators of an expression read without parentheses; null with a power. */
function flatten(expr: Expr, numbers: Rational[], operators: BinaryOperator[]): boolean {
  switch (expr.type) {
    case 'number':
      numbers.push(expr.value);
      return true;
    case 'group':
      return flatten(expr.inner, numbers, operators);
    case 'power':
      return false;
    case 'binary': {
      if (!flatten(expr.left, numbers, operators)) return false;
      operators.push(expr.operator);
      return flatten(expr.right, numbers, operators);
    }
  }
}

interface BracketStepOptions {
  numbers: readonly number[];
  operators: readonly BinaryOperator[];
  target: number;
  /** The generated placement, shown as the correct answer. */
  placed: string;
}

/**
 * Any placement of parentheses is correct when the input has the prompt's numbers and operators
 * in order and its value is the target (spec §5.63).
 */
export function bracketStep({ numbers, operators, target, placed }: BracketStepOptions): Step {
  const placedExpr = parse(placed)!;
  const expected = formatExpr(placedExpr);
  const explanation = explainEvaluation(placedExpr);
  const goal = fromInteger(target);
  const wanted = numbers.map(fromInteger);
  return {
    kind: 'expression',
    prompt: `Zet haakjes zodat het klopt: ${writeOut(numbers, operators)} = ${target}`,
    check(input) {
      const given = parse(input);
      // Validation keeps unparsable input away; should it get here, it is simply wrong.
      if (given === null) return { correct: false, expected, explanation };
      const givenNumbers: Rational[] = [];
      const givenOperators: BinaryOperator[] = [];
      const sameTokens =
        flatten(given, givenNumbers, givenOperators) &&
        givenNumbers.length === wanted.length &&
        givenNumbers.every((n, i) => equals(n, wanted[i]!)) &&
        givenOperators.every((op, i) => op === operators[i]);
      if (!sameTokens) return { correct: false, expected, explanation: OTHER_TOKENS };
      const value = evaluate(given);
      if (value !== null && equals(value, goal)) return { correct: true, expected, explanation };
      return { correct: false, expected, explanation: unequal(given, target) };
    },
  };
}

/** `3 + 4 × (5 − 2) = 3 + 4 × 3 = 3 + 12 = 15 ≠ 33`; without the steps when they do not exist. */
function unequal(given: Expr, target: number): string {
  try {
    return `${explainEvaluation(given)} ≠ ${target}`;
  } catch {
    // A division by zero, or a quotient without a finite decimal.
    return `${formatExpr(given)} ≠ ${target}`;
  }
}

/** `Zet haakjes zodat het klopt: 3 + 4 × 5 − 2 = 33`. */
export function generateBracketPlacement(rng: Rng): Question {
  const { numbers, operators, target, flat, placed } = drawBracketExercise(rng);
  return {
    key: `bracketPlacement:${flat} = ${target}`,
    topic: 'bracketPlacement',
    steps: [bracketStep({ numbers, operators, target, placed })],
  };
}
