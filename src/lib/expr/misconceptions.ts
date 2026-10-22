import { fromInteger, multiply, power, type Rational } from '../rational';
import { applyOperator, exponentValue } from './evaluate';
import type { BinaryOperator, Expr } from './parser';
import { RANK } from './reduce';

/** Common order-of-operations mistakes (spec §3.4.1). */
export type Misconception = 'powerAsProduct' | 'leftToRight' | 'multiplyBeforeDivide';

/** Binding strength per operator: higher goes first, equal goes left to right. */
type Precedence = Readonly<Record<BinaryOperator, number>>;

const PRECEDENCE: Readonly<Record<Misconception, Precedence>> = {
  // The usual order: only the power itself is wrong (base × exponent).
  powerAsProduct: RANK,
  leftToRight: { '+': 1, '−': 1, '×': 1, ':': 1 },
  multiplyBeforeDivide: { '+': 1, '−': 1, '×': 3, ':': 2 },
};

/**
 * The value a learner gets with the misconception: the operators of each chain applied with
 * another precedence (groups stay groups), or a power taken as base × exponent. Null for a
 * division by zero or an invalid power. Never use this to judge answers: only to name mistakes.
 * The AST must be parser-shaped (left-associative chains, explicit groups), because the chain as
 * written is read back from its in-order walk.
 */
export function evaluateMisconception(expr: Expr, misconception: Misconception): Rational | null {
  switch (expr.type) {
    case 'number':
      return expr.value;
    case 'group':
      return evaluateMisconception(expr.inner, misconception);
    case 'power': {
      const base = evaluateMisconception(expr.base, misconception);
      const exponent = exponentValue(expr.exponent);
      if (base === null || exponent === null) return null;
      if (misconception === 'powerAsProduct') return multiply(base, fromInteger(exponent));
      return power(base, exponent);
    }
    case 'binary': {
      const operands: Rational[] = [];
      const operators: BinaryOperator[] = [];
      // In-order walk without entering groups: the chain as written.
      const collect = (node: Expr): boolean => {
        if (node.type === 'binary') {
          if (!collect(node.left)) return false;
          operators.push(node.operator);
          return collect(node.right);
        }
        const operand = evaluateMisconception(node, misconception);
        if (operand === null) return false;
        operands.push(operand);
        return true;
      };
      return collect(expr) ? applyChain(operands, operators, PRECEDENCE[misconception]) : null;
    }
  }
}

/** Applies the operators level by level, from the strongest, each level left to right. */
function applyChain(
  operands: readonly Rational[],
  operators: readonly BinaryOperator[],
  precedence: Precedence,
): Rational | null {
  const values = [...operands];
  const pending = [...operators];
  const levels = [...new Set(pending.map((operator) => precedence[operator]))].sort(
    (x, y) => y - x,
  );
  for (const level of levels) {
    let index = 0;
    while (index < pending.length) {
      const operator = pending[index]!;
      if (precedence[operator] !== level) {
        index++;
        continue;
      }
      const result = applyOperator(operator, values[index]!, values[index + 1]!);
      if (result === null) return null;
      values.splice(index, 2, result);
      pending.splice(index, 1);
    }
  }
  return values[0]!;
}
