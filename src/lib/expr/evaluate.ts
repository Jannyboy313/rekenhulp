import { add, divide, multiply, power, subtract, type Rational } from '../rational';
import type { BinaryOperator, Expr } from './parser';

/** Exercises use exponents 2 and 3; spec §7 gives anything outside [0, 10] no value. */
const MAX_EXPONENT = 10;

/**
 * The exact value of an expression (spec §7). Null for a division by zero, and for an exponent
 * that is not an integer in [0, MAX_EXPONENT].
 */
export function evaluate(expr: Expr): Rational | null {
  switch (expr.type) {
    case 'number':
      return expr.value;
    case 'group':
      return evaluate(expr.inner);
    case 'power': {
      const base = evaluate(expr.base);
      const exponent = exponentValue(expr.exponent);
      if (base === null || exponent === null) return null;
      return power(base, exponent);
    }
    case 'binary': {
      const left = evaluate(expr.left);
      const right = evaluate(expr.right);
      if (left === null || right === null) return null;
      return applyOperator(expr.operator, left, right);
    }
  }
}

/** The value of an exponent when it is an integer in [0, MAX_EXPONENT], otherwise null. */
export function exponentValue(exponent: Expr): number | null {
  const value = evaluate(exponent);
  if (value === null || value.den !== 1n) return null;
  if (value.num < 0n || value.num > BigInt(MAX_EXPONENT)) return null;
  return Number(value.num);
}

/** `left operator right`; null for a division by zero. */
export function applyOperator(
  operator: BinaryOperator,
  left: Rational,
  right: Rational,
): Rational | null {
  switch (operator) {
    case '+':
      return add(left, right);
    case '−':
      return subtract(left, right);
    case '×':
      return multiply(left, right);
    case ':':
      return right.num === 0n ? null : divide(left, right);
  }
}
