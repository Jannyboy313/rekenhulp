import { evaluate } from '../expr/evaluate';
import { formatExpr } from '../expr/format';
import type { BinaryOperator, Expr } from '../expr/parser';
import { explainEvaluation } from '../expr/reduce';
import { pick, randomInt, shuffle, type Rng } from '../random';
import { fromInteger, negate } from '../rational';
import { numberStep } from '../steps';
import type { Question } from '../types';

// Order of operations (spec §5.8).
export const MIN_LITERAL = 1;
export const MAX_LITERAL = 20;
export const MAX_ANSWER = 500;
/** Share of exercises with 1 or 2 negative literals. */
export const NEGATIVE_SHARE = 0.3;
/** Share of exercises whose power slot has exponent 3 instead of 2. */
export const CUBE_SHARE = 0.25;
export const MIN_POWER_BASE = 2;
/** Largest absolute power base per exponent: [2, 12] squared, [2, 5] cubed. */
export const MAX_POWER_BASE: Readonly<Record<number, number>> = { 2: 12, 3: 5 };
/** Every template reaches a valid draw within a few hundred attempts. */
const MAX_ATTEMPTS = 10_000;

/**
 * Builds an expression from a literal source and a power slot. The shapes must be the parser's
 * (left-associative chains, explicit groups); the tests check parse(formatExpr(e)) equals e.
 */
export type Template = (literal: () => Expr, power: (base: Expr) => Expr) => Expr;

function binary(operator: BinaryOperator, left: Expr, right: Expr): Expr {
  return { type: 'binary', operator, left, right };
}

function group(inner: Expr): Expr {
  return { type: 'group', inner };
}

export const TEMPLATES: readonly Template[] = [
  // a + b × c
  (n) => binary('+', n(), binary('×', n(), n())),
  // a × (b − c) + d
  (n) => binary('+', binary('×', n(), group(binary('−', n(), n()))), n()),
  // a − b : c × d
  (n) => binary('−', n(), binary('×', binary(':', n(), n()), n())),
  // (a + b)² − c × d
  (n, p) => binary('−', p(group(binary('+', n(), n()))), binary('×', n(), n())),
  // a² + b × c − d
  (n, p) => binary('−', binary('+', p(n()), binary('×', n(), n())), n()),
  // a : b + c × (d − e)
  (n) => binary('+', binary(':', n(), n()), binary('×', n(), group(binary('−', n(), n())))),
  // a × b − c : d
  (n) => binary('−', binary('×', n(), n()), binary(':', n(), n())),
  // (a − b) × c + d²
  (n, p) => binary('+', binary('×', group(binary('−', n(), n())), n()), p(n())),
  // a − (b + c) : d
  (n) => binary('−', n(), binary(':', group(binary('+', n(), n())), n())),
  // a × (b + c²) − d
  (n, p) => binary('−', binary('×', n(), group(binary('+', n(), p(n())))), n()),
];

function literal(value: number): Expr {
  return { type: 'number', value: fromInteger(value) };
}

/** A random exercise expression from a random template. */
export function generateExpression(rng: Rng): Expr {
  return generateFromTemplate(rng, pick(rng, TEMPLATES));
}

/** Draws values until spec §5.8 holds; the negatives and the exponent are decided once. */
export function generateFromTemplate(rng: Rng, template: Template): Expr {
  const negatives = rng() < NEGATIVE_SHARE ? (rng() < 0.5 ? 1 : 2) : 0;
  const exponent = rng() < CUBE_SHARE ? 3 : 2;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const expr = template(
      () => literal(randomInt(rng, MIN_LITERAL, MAX_LITERAL)),
      (base) => ({ type: 'power', base, exponent: literal(exponent) }),
    );
    const candidate = negateLiterals(rng, expr, negatives);
    if (isValid(candidate)) return candidate;
  }
  throw new Error('No valid order-of-operations exercise found');
}

/** Literals in the expression; exponents do not count. */
function literalCount(expr: Expr): number {
  switch (expr.type) {
    case 'number':
      return 1;
    case 'group':
      return literalCount(expr.inner);
    case 'power':
      return literalCount(expr.base);
    case 'binary':
      return literalCount(expr.left) + literalCount(expr.right);
  }
}

/** Negates `count` literals at random positions; exponents stay positive. */
function negateLiterals(rng: Rng, expr: Expr, count: number): Expr {
  if (count === 0) return expr;
  const positions = new Set(shuffle(rng, [...Array(literalCount(expr)).keys()]).slice(0, count));
  let index = 0;
  const visit = (node: Expr): Expr => {
    switch (node.type) {
      case 'number': {
        const negative = positions.has(index);
        index++;
        return negative ? { type: 'number', value: negate(node.value) } : node;
      }
      case 'group':
        return { type: 'group', inner: visit(node.inner) };
      case 'power':
        return { type: 'power', base: visit(node.base), exponent: node.exponent };
      case 'binary': {
        const left = visit(node.left);
        return { type: 'binary', operator: node.operator, left, right: visit(node.right) };
      }
    }
  };
  return visit(expr);
}

/** Spec §5.8: an integer answer within ±500, exact divisions, power bases in range. */
function isValid(expr: Expr): boolean {
  const value = evaluate(expr);
  if (value === null || value.den !== 1n) return false;
  const size = value.num < 0n ? -value.num : value.num;
  return size <= BigInt(MAX_ANSWER) && partsValid(expr);
}

function partsValid(expr: Expr): boolean {
  switch (expr.type) {
    case 'number':
      return true;
    case 'group':
      return partsValid(expr.inner);
    case 'power': {
      const base = evaluate(expr.base);
      const exponent = expr.exponent.type === 'number' ? Number(expr.exponent.value.num) : NaN;
      const max = MAX_POWER_BASE[exponent];
      if (base === null || base.den !== 1n || max === undefined) return false;
      const size = base.num < 0n ? -base.num : base.num;
      return size >= BigInt(MIN_POWER_BASE) && size <= BigInt(max) && partsValid(expr.base);
    }
    case 'binary': {
      if (expr.operator === ':' && evaluate(expr)?.den !== 1n) return false;
      return partsValid(expr.left) && partsValid(expr.right);
    }
  }
}

/** `3 × (8 − 2) + 4 = ?`, explained one operation at a time. */
export function generateOrderOfOperations(rng: Rng): Question {
  const expr = generateExpression(rng);
  const text = formatExpr(expr);
  return {
    key: `orderOfOperations:${text}`,
    topic: 'orderOfOperations',
    steps: [
      numberStep({
        prompt: `${text} = ?`,
        answer: evaluate(expr)!,
        explanation: explainEvaluation(expr),
      }),
    ],
  };
}
