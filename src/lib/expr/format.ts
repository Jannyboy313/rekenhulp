import { formatRational, toSuperscript } from '../format';
import type { Expr } from './parser';

/**
 * Prompt text for an expression (spec §8): spaces around binary operators, groups in
 * parentheses, whole exponents in superscript. A negative literal gets parentheses
 * (`5 × (−3)`), except as the first term of the expression or of a group, where unary minus is
 * allowed (`−7 − (−12)`, `(−3 + 5)`). As a power base it always gets them: `(−4)²` (§5.8).
 */
export function formatExpr(expr: Expr): string {
  return write(expr, true);
}

function write(expr: Expr, first: boolean): string {
  switch (expr.type) {
    case 'number': {
      const text = formatRational(expr.value);
      return isNegative(expr) && !first ? `(${text})` : text;
    }
    case 'group':
      return `(${write(expr.inner, true)})`;
    case 'power':
      return write(expr.base, first && !isNegative(expr.base)) + exponentText(expr.exponent);
    case 'binary':
      return `${write(expr.left, first)} ${expr.operator} ${write(expr.right, false)}`;
  }
}

function isNegative(expr: Expr): boolean {
  return expr.type === 'number' && expr.value.num < 0n;
}

/** '²' for a whole exponent; anything else keeps the caret: '^(1 + 1)'. */
function exponentText(exponent: Expr): string {
  return exponent.type === 'number' && exponent.value.den === 1n && exponent.value.num >= 0n
    ? toSuperscript(Number(exponent.value.num))
    : `^${write(exponent, false)}`;
}
