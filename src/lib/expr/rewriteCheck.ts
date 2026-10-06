import { add, equals, rational, subtract, type Rational } from '../rational';
import { sameChains, toChains, type ChainExpr, type ChainOperator } from './chains';
import { evaluate } from './evaluate';
import type { BinaryOperator, Expr } from './parser';

export type Property = 'commutative' | 'associative' | 'distributive';

export const PROPERTIES: readonly Property[] = ['commutative', 'associative', 'distributive'];

/** Why a rewrite is rejected; spec §5.11 has the Dutch messages, §7.1 the order. */
export type RewriteReason =
  | 'valueOnly'
  | 'unchanged'
  | 'valueChanged'
  | 'noProperty'
  | 'otherProperty'
  | 'notForMinusOrDivide'
  | 'multipleSteps';

/** `detected`: every property of which the step is a single valid application. */
export type RewriteResult =
  | { valid: true; detected: Property[]; reason: null }
  | { valid: false; detected: [Property, ...Property[]]; reason: 'otherProperty' }
  | { valid: false; detected: Property[]; reason: Exclude<RewriteReason, 'otherProperty'> };

/** Whether `rewritten` is a single valid application of `property` to `original` (§7.1). */
export function checkRewrite(
  originalInput: Expr,
  rewrittenInput: Expr,
  property: Property | 'any',
): RewriteResult {
  const reject = (reason: Exclude<RewriteReason, 'otherProperty'>): RewriteResult => ({
    valid: false,
    detected: [],
    reason,
  });
  const original = dropRedundantGroups(originalInput);
  const rewritten = dropRedundantGroups(rewrittenInput);
  if (rewritten.type === 'number') return reject('valueOnly');
  if (sameChains(toChains(stripGroups(original)), toChains(stripGroups(rewritten)))) {
    return reject('unchanged');
  }
  const before = evaluate(original);
  const after = evaluate(rewritten);
  if (before === null || after === null || !equals(before, after)) return reject('valueChanged');

  const [from, to] = differenceRoot(toChains(original), toChains(rewritten));
  const detected = PROPERTIES.filter((candidate) => DETECTORS[candidate](from, to));
  if (property === 'any' ? detected.length > 0 : detected.includes(property)) {
    return { valid: true, detected, reason: null };
  }
  const [first, ...rest] = detected;
  if (first !== undefined) {
    return { valid: false, detected: [first, ...rest], reason: 'otherProperty' };
  }
  const reordered = from.type === 'binary' && isPermutation(numbers(from), numbers(to));
  if (reordered) return reject('notForMinusOrDivide');
  if (isOnlyRewrittenOrWorkedOut(from, to)) return reject('noProperty');
  return reject('multipleSteps');
}

/**
 * The AST without the parentheses that cannot matter (spec §7.1, step 0): around the whole
 * expression, directly inside other parentheses, around a number or a power, and around a `×`
 * or `:` term of `+` or `−`. Parentheses around a sum, or around a product inside a product,
 * stay: they are what the associative property is about.
 */
function dropRedundantGroups(
  expr: Expr,
  parent: BinaryOperator | 'group' | 'power' | null = null,
): Expr {
  switch (expr.type) {
    case 'number':
      return expr;
    case 'power':
      return {
        type: 'power',
        base: dropRedundantGroups(expr.base, 'power'),
        exponent: dropRedundantGroups(expr.exponent, 'power'),
      };
    case 'binary':
      return {
        ...expr,
        left: dropRedundantGroups(expr.left, expr.operator),
        right: dropRedundantGroups(expr.right, expr.operator),
      };
    case 'group': {
      const inner = dropRedundantGroups(expr.inner, 'group');
      const redundant =
        parent === null ||
        parent === 'group' ||
        inner.type === 'number' ||
        inner.type === 'power' ||
        (inner.type === 'binary' &&
          (inner.operator === '×' || inner.operator === ':') &&
          (parent === '+' || parent === '−'));
      return redundant ? inner : { type: 'group', inner };
    }
  }
}

/**
 * A single number written differently, or a single part worked out into a number; no property
 * applied yet. Written differently: `98` → `(100 − 2)`, or `98` → `49 × 2` within a chain.
 * Worked out: `(40 + 3)` → `43`, or `37 × 4` → `148` within a chain (`25 × 37 × 4` → `25 × 148`).
 */
function isOnlyRewrittenOrWorkedOut(from: ChainExpr, to: ChainExpr): boolean {
  if (from.type === 'number' || to.type === 'number') return true;
  if (from.type !== 'chain' || to.type !== 'chain' || from.operator !== to.operator) return false;
  const shortest = Math.min(from.operands.length, to.operands.length);
  let prefix = 0;
  while (prefix < shortest && sameChains(from.operands[prefix]!, to.operands[prefix]!)) {
    prefix++;
  }
  let suffix = 0;
  while (
    suffix < shortest - prefix &&
    sameChains(
      from.operands[from.operands.length - 1 - suffix]!,
      to.operands[to.operands.length - 1 - suffix]!,
    )
  ) {
    suffix++;
  }
  const remainsOneNumber = (operands: readonly ChainExpr[]) => {
    const remaining = operands.slice(prefix, operands.length - suffix);
    return remaining.length === 1 && remaining[0]!.type === 'number';
  };
  return remainsOneNumber(from.operands) || remainsOneNumber(to.operands);
}

/** The AST without parentheses: what remains is the order of evaluation. */
function stripGroups(expr: Expr): Expr {
  switch (expr.type) {
    case 'number':
      return expr;
    case 'group':
      return stripGroups(expr.inner);
    case 'power':
      return { type: 'power', base: stripGroups(expr.base), exponent: stripGroups(expr.exponent) };
    case 'binary':
      return { ...expr, left: stripGroups(expr.left), right: stripGroups(expr.right) };
  }
}

function children(expr: ChainExpr): readonly ChainExpr[] {
  switch (expr.type) {
    case 'number':
      return [];
    case 'group':
      return [expr.inner];
    case 'power':
      return [expr.base, expr.exponent];
    case 'binary':
      return [expr.left, expr.right];
    case 'chain':
      return expr.operands;
  }
}

/** Same type, operator and number of children; numbers must also be equal. */
function sameNode(a: ChainExpr, b: ChainExpr): boolean {
  if (a.type === 'number' || b.type === 'number') return sameChains(a, b);
  const operator = (expr: ChainExpr) => ('operator' in expr ? expr.operator : null);
  return (
    a.type === b.type && operator(a) === operator(b) && children(a).length === children(b).length
  );
}

// Limitation: a step that changes the length of an enclosing chain
// (7 × 98 + 1 → 7 × 90 + 7 × 8 + 1) is not recognised; no template puts the property below
// the root.
/** The smallest pair of subtrees that contains every difference; outside it all is identical. */
function differenceRoot(a: ChainExpr, b: ChainExpr): [ChainExpr, ChainExpr] {
  if (!sameNode(a, b)) return [a, b];
  const left = children(a);
  const right = children(b);
  const differing = left.flatMap((child, index) =>
    sameChains(child, right[index]!) ? [] : [index],
  );
  if (differing.length !== 1) return [a, b];
  const index = differing[0]!;
  return differenceRoot(left[index]!, right[index]!);
}

const DETECTORS: Record<Property, (from: ChainExpr, to: ChainExpr) => boolean> = {
  commutative: isCommutative,
  associative: isAssociative,
  distributive: (from, to) => isExpansion(from, to, true) || isExpansion(to, from, false),
};

/** One chain whose operands are permuted; the operands themselves are unchanged. */
function isCommutative(from: ChainExpr, to: ChainExpr): boolean {
  return (
    from.type === 'chain' &&
    to.type === 'chain' &&
    from.operator === to.operator &&
    isPermutation(from.operands, to.operands) &&
    !from.operands.every((operand, index) => sameChains(operand, to.operands[index]!))
  );
}

/**
 * One chain whose operands, flattened through groups of the same operator, keep their order.
 * The grouping differs: step 2 of checkRewrite already rejected an unchanged order.
 */
function isAssociative(from: ChainExpr, to: ChainExpr): boolean {
  if (from.type !== 'chain' || to.type !== 'chain' || from.operator !== to.operator) return false;
  const before = flatten(from, from.operator);
  const after = flatten(to, to.operator);
  return (
    before.length === after.length &&
    before.every((operand, index) => sameChains(operand, after[index]!))
  );
}

function flatten(expr: ChainExpr, operator: ChainOperator): ChainExpr[] {
  if (expr.type === 'group') {
    return expr.inner.type === 'chain' && expr.inner.operator === operator
      ? flatten(expr.inner, operator)
      : [expr];
  }
  return expr.type === 'chain' && expr.operator === operator
    ? expr.operands.flatMap((operand) => flatten(operand, operator))
    : [expr];
}

/** `t₁ ± t₂`: a sum of two terms, or a difference. */
interface TwoTerms {
  operator: '+' | '−';
  first: ChainExpr;
  second: ChainExpr;
}

function twoTerms(expr: ChainExpr): TwoTerms | null {
  if (expr.type === 'chain' && expr.operator === '+' && expr.operands.length === 2) {
    return { operator: '+', first: expr.operands[0]!, second: expr.operands[1]! };
  }
  if (expr.type === 'binary' && expr.operator === '−') {
    return { operator: '−', first: expr.left, second: expr.right };
  }
  return null;
}

/** The two factors of `a × b`; null for anything else. */
function twoFactors(expr: ChainExpr): [ChainExpr, ChainExpr] | null {
  return expr.type === 'chain' && expr.operator === '×' && expr.operands.length === 2
    ? [expr.operands[0]!, expr.operands[1]!]
    : null;
}

/** t in `F × t` or `t × F`; a bare `F` counts as `F × 1`. Null when F is not a factor. */
function otherFactor(product: ChainExpr, factor: ChainExpr): ChainExpr | null {
  const factors = twoFactors(product);
  if (factors === null) {
    return sameChains(product, factor) ? { type: 'number', value: rational(1n) } : null;
  }
  if (sameChains(factors[0], factor)) return factors[1];
  return sameChains(factors[1], factor) ? factors[0] : null;
}

/**
 * Whether `expanded` is `F×t₁ ± F×t₂` for `product` = `F × S` or `S × F` (spec §7.1), with the
 * factor on either side in each term. S is `(t₁ ± t₂)`; with `allowSplit` also a number literal
 * n = t₁ ± t₂ of two number literals. Reversed (factor out), S must be a group.
 */
function isExpansion(product: ChainExpr, expanded: ChainExpr, allowSplit: boolean): boolean {
  const factors = twoFactors(product);
  const terms = twoTerms(expanded);
  if (factors === null || terms === null) return false;
  const choices: [ChainExpr, ChainExpr][] = [factors, [factors[1], factors[0]]];
  return choices.some(([factor, sum]) => {
    const t1 = otherFactor(terms.first, factor);
    const t2 = otherFactor(terms.second, factor);
    if (t1 === null || t2 === null) return false;
    if (sum.type === 'group') {
      const inner = twoTerms(sum.inner);
      return (
        inner !== null &&
        inner.operator === terms.operator &&
        sameChains(inner.first, t1) &&
        sameChains(inner.second, t2)
      );
    }
    return (
      allowSplit &&
      sum.type === 'number' &&
      t1.type === 'number' &&
      t2.type === 'number' &&
      equals(combine(terms.operator, t1.value, t2.value), sum.value)
    );
  });
}

function combine(operator: '+' | '−', a: Rational, b: Rational): Rational {
  return operator === '+' ? add(a, b) : subtract(a, b);
}

function numbers(expr: ChainExpr): ChainExpr[] {
  return expr.type === 'number' ? [expr] : children(expr).flatMap(numbers);
}

/** The same items in any order, compared structurally. */
function isPermutation(a: readonly ChainExpr[], b: readonly ChainExpr[]): boolean {
  if (a.length !== b.length) return false;
  const unused = [...b];
  for (const item of a) {
    const index = unused.findIndex((candidate) => sameChains(candidate, item));
    if (index < 0) return false;
    unused.splice(index, 1);
  }
  return true;
}
