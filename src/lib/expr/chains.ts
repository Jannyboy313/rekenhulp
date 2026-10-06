import { equals, type Rational } from '../rational';
import type { Expr } from './parser';

export type ChainOperator = '+' | '×';

/**
 * The AST with chains (spec §7): within one parenthesis level, consecutive + operands form one
 * n-ary sum chain and consecutive × operands one product chain. − and : stay binary: they are
 * not chainable for the commutative and associative properties.
 */
export type ChainExpr =
  | { type: 'number'; value: Rational }
  | { type: 'chain'; operator: ChainOperator; operands: readonly ChainExpr[] }
  | { type: 'binary'; operator: '−' | ':'; left: ChainExpr; right: ChainExpr }
  | { type: 'power'; base: ChainExpr; exponent: ChainExpr }
  | { type: 'group'; inner: ChainExpr };

export function toChains(expr: Expr): ChainExpr {
  switch (expr.type) {
    case 'number':
      return expr;
    case 'group':
      return { type: 'group', inner: toChains(expr.inner) };
    case 'power':
      return { type: 'power', base: toChains(expr.base), exponent: toChains(expr.exponent) };
    case 'binary': {
      const { operator } = expr;
      if (operator === '−' || operator === ':') {
        return { type: 'binary', operator, left: toChains(expr.left), right: toChains(expr.right) };
      }
      return { type: 'chain', operator, operands: chainOperands(expr, operator) };
    }
  }
}

/**
 * Left-associative parsing nests a chain in its left operand: (a + b) + c gives a, b, c. A
 * right operand never continues the chain, so a + (b + c) without its group stays nested.
 */
function chainOperands(expr: Expr, operator: ChainOperator): ChainExpr[] {
  return expr.type === 'binary' && expr.operator === operator
    ? [...chainOperands(expr.left, operator), toChains(expr.right)]
    : [toChains(expr)];
}

/** Structural equality: same shape, same operators, equal numbers. */
export function sameChains(a: ChainExpr, b: ChainExpr): boolean {
  switch (a.type) {
    case 'number':
      return b.type === 'number' && equals(a.value, b.value);
    case 'group':
      return b.type === 'group' && sameChains(a.inner, b.inner);
    case 'power':
      return b.type === 'power' && sameChains(a.base, b.base) && sameChains(a.exponent, b.exponent);
    case 'binary':
      return (
        b.type === 'binary' &&
        a.operator === b.operator &&
        sameChains(a.left, b.left) &&
        sameChains(a.right, b.right)
      );
    case 'chain':
      return (
        b.type === 'chain' &&
        a.operator === b.operator &&
        a.operands.length === b.operands.length &&
        a.operands.every((operand, index) => sameChains(operand, b.operands[index]!))
      );
  }
}
