import { evaluate } from './evaluate';
import { formatExpr } from './format';
import type { BinaryOperator, Expr } from './parser';

/** After parentheses, the higher rank goes first (spec §8). */
const RANK: Record<BinaryOperator, number> = { '+': 1, '−': 1, '×': 2, ':': 2 };
const POWER_RANK = 3;

/** An operation whose operands are numbers, ready to be computed. */
interface Candidate {
  node: Expr;
  /** Number of enclosing groups: the innermost parentheses go first. */
  depth: number;
  rank: number;
  /** The whole expression with this operation replaced by `value`. */
  replace: (value: Expr) => Expr;
}

/** Collects the ready operations in reading order. */
function collect(
  expr: Expr,
  depth: number,
  rebuild: (node: Expr) => Expr,
  found: Candidate[],
): void {
  switch (expr.type) {
    case 'number':
      return;
    case 'group':
      if (expr.inner.type === 'number') {
        // '(3)': dropping the parentheses is a step of its own.
        found.push({ node: expr, depth: depth + 1, rank: POWER_RANK + 1, replace: rebuild });
        return;
      }
      // Once its content is a number, the group disappears: '(3 − 5)' becomes '−2'.
      collect(
        expr.inner,
        depth + 1,
        (inner) => rebuild(inner.type === 'number' ? inner : { type: 'group', inner }),
        found,
      );
      return;
    case 'power': {
      const { base, exponent } = expr;
      if (base.type === 'number' && exponent.type === 'number') {
        found.push({ node: expr, depth, rank: POWER_RANK, replace: rebuild });
        return;
      }
      collect(base, depth, (node) => rebuild({ type: 'power', base: node, exponent }), found);
      collect(exponent, depth, (node) => rebuild({ type: 'power', base, exponent: node }), found);
      return;
    }
    case 'binary': {
      const { operator, left, right } = expr;
      if (left.type === 'number' && right.type === 'number') {
        found.push({ node: expr, depth, rank: RANK[operator], replace: rebuild });
        return;
      }
      collect(
        left,
        depth,
        (node) => rebuild({ type: 'binary', operator, left: node, right }),
        found,
      );
      collect(
        right,
        depth,
        (node) => rebuild({ type: 'binary', operator, left, right: node }),
        found,
      );
      return;
    }
  }
}

/**
 * The expression after each single operation, ending with its value (spec §5.8): innermost
 * parentheses first, then powers, then × and : from left to right, then + and − from left to
 * right. Throws for an expression without a value. `explainEvaluation` also throws (via
 * formatRational) when an intermediate value has no finite decimal, which exact divisions
 * (§5.8) rule out.
 */
export function evaluationSteps(expr: Expr): Expr[] {
  const steps: Expr[] = [];
  let current = expr;
  while (current.type !== 'number') {
    const found: Candidate[] = [];
    collect(current, 0, (node) => node, found);
    // Strictly greater, so the leftmost of equals wins.
    const next = found.reduce<Candidate | null>(
      (best, candidate) =>
        best === null ||
        candidate.depth > best.depth ||
        (candidate.depth === best.depth && candidate.rank > best.rank)
          ? candidate
          : best,
      null,
    );
    const value = next === null ? null : evaluate(next.node);
    if (next === null || value === null) {
      throw new RangeError(`Cannot evaluate ${formatExpr(current)}`);
    }
    current = next.replace({ type: 'number', value });
    steps.push(current);
  }
  return steps;
}

/** '3 × (8 − 2) + 4 = 3 × 6 + 4 = 18 + 4 = 22' */
export function explainEvaluation(expr: Expr): string {
  return [expr, ...evaluationSteps(expr)].map(formatExpr).join(' = ');
}
