import { add, divide, multiply, power, subtract, type Rational } from '../rational';
import type { Expr } from './parser';

/** Larger exponents never occur in an exercise; the cap keeps a typed 2^999999 cheap. */
export const MAX_EXPONENT = 10;

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
      const exponent = evaluate(expr.exponent);
      if (base === null || exponent === null || exponent.den !== 1n) return null;
      if (exponent.num < 0n || exponent.num > BigInt(MAX_EXPONENT)) return null;
      return power(base, Number(exponent.num));
    }
    case 'binary': {
      const left = evaluate(expr.left);
      const right = evaluate(expr.right);
      if (left === null || right === null) return null;
      switch (expr.operator) {
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
  }
}
