import { describe, expect, it } from 'vitest';
import { evaluate } from '../expr/evaluate';
import { formatExpr } from '../expr/format';
import { parse, type Expr } from '../expr/parser';
import { formatRational } from '../format';
import { createRng } from '../random';
import {
  CUBE_SHARE,
  generateExpression,
  generateFromTemplate,
  generateOrderOfOperations,
  MAX_ANSWER,
  MAX_LITERAL,
  MAX_POWER_BASE,
  MIN_LITERAL,
  MIN_POWER_BASE,
  NEGATIVE_SHARE,
  TEMPLATES,
} from './orderOfOperations';

const SAMPLES = 3000;

/** Literals in reading order; exponents are not literals. */
function literals(expr: Expr): bigint[] {
  switch (expr.type) {
    case 'number':
      return [expr.value.num];
    case 'group':
      return literals(expr.inner);
    case 'power':
      return literals(expr.base);
    case 'binary':
      return [...literals(expr.left), ...literals(expr.right)];
  }
}

function nodes(expr: Expr): Expr[] {
  switch (expr.type) {
    case 'number':
      return [expr];
    case 'group':
      return [expr, ...nodes(expr.inner)];
    case 'power':
      return [expr, ...nodes(expr.base), ...nodes(expr.exponent)];
    case 'binary':
      return [expr, ...nodes(expr.left), ...nodes(expr.right)];
  }
}

const abs = (value: bigint) => (value < 0n ? -value : value);

/** The checks of spec §5.8 that every generated expression must pass. */
function expectValid(expr: Expr) {
  const operations = nodes(expr).filter((node) => node.type === 'binary' || node.type === 'power');
  expect(operations.length).toBeGreaterThanOrEqual(2);
  expect(operations.length).toBeLessThanOrEqual(5);
  for (const literal of literals(expr)) {
    const size = abs(literal);
    expect(size).toBeGreaterThanOrEqual(BigInt(MIN_LITERAL));
    expect(size).toBeLessThanOrEqual(BigInt(MAX_LITERAL));
  }
  for (const node of nodes(expr)) {
    if (node.type === 'group') expect(evaluate(node)!.num).not.toBe(0n);
    if (node.type === 'binary' && node.operator === ':') {
      const quotient = evaluate(node)!;
      expect(quotient.den).toBe(1n);
      expect(abs(quotient.num)).toBeGreaterThanOrEqual(2n);
      expect(abs(evaluate(node.right)!.num)).toBeGreaterThanOrEqual(2n);
    }
    if (node.type === 'binary' && node.operator === '×') {
      for (const factor of [node.left, node.right]) {
        const value = evaluate(factor)!;
        expect(value.den === 1n && abs(value.num) === 1n).toBe(false);
      }
    }
    if (node.type === 'power') {
      const base = evaluate(node.base)!;
      const exponent = node.exponent.type === 'number' ? Number(node.exponent.value.num) : NaN;
      const size = abs(base.num);
      expect(base.den).toBe(1n);
      expect(size).toBeGreaterThanOrEqual(BigInt(MIN_POWER_BASE));
      expect(size).toBeLessThanOrEqual(BigInt(MAX_POWER_BASE[exponent]!));
    }
  }
  const answer = evaluate(expr)!;
  expect(answer.den).toBe(1n);
  expect(answer.num <= BigInt(MAX_ANSWER) && answer.num >= BigInt(-MAX_ANSWER)).toBe(true);
}

const rng = createRng(17);
const expressions = Array.from({ length: SAMPLES }, () => generateExpression(rng));

describe('generateExpression', () => {
  it('meets spec §5.8 for every exercise', () => {
    for (const expr of expressions) expectValid(expr);
  });

  it('formats every expression so that it parses back unchanged', () => {
    for (const expr of expressions) expect(parse(formatExpr(expr))).toEqual(expr);
  });

  it('puts 1 or 2 negative literals in 30% of the exercises', () => {
    const negatives = expressions.map((expr) => literals(expr).filter((n) => n < 0n).length);
    const share = negatives.filter((count) => count > 0).length / SAMPLES;
    expect(share).toBeGreaterThan(NEGATIVE_SHARE - 0.04);
    expect(share).toBeLessThan(NEGATIVE_SHARE + 0.04);
    expect(Math.max(...negatives)).toBe(2);
    const withNegatives = negatives.filter((count) => count > 0);
    const twoShare = withNegatives.filter((count) => count === 2).length / withNegatives.length;
    expect(twoShare).toBeGreaterThan(0.42);
    expect(twoShare).toBeLessThan(0.58);
  });

  it('cubes 25% of the powers', () => {
    const powers = expressions.flatMap((expr) =>
      nodes(expr).filter((node) => node.type === 'power'),
    );
    const cubes = powers.filter(
      (node) => node.type === 'power' && evaluate(node.exponent)?.num === 3n,
    ).length;
    expect(cubes / powers.length).toBeGreaterThan(CUBE_SHARE - 0.05);
    expect(cubes / powers.length).toBeLessThan(CUBE_SHARE + 0.05);
  });

  it('never writes a negative power base without parentheses (no −3²)', () => {
    for (const expr of expressions) expect(formatExpr(expr)).not.toMatch(/−\d+[²³]/);
  });
});

describe('generateFromTemplate', () => {
  it.each(TEMPLATES.map((template, index) => [index, template] as const))(
    'generates valid exercises from template %i',
    (index, template) => {
      const templateRng = createRng(100 + index);
      for (let i = 0; i < 200; i++) {
        const expr = generateFromTemplate(templateRng, template);
        expectValid(expr);
        expect(parse(formatExpr(expr))).toEqual(expr);
      }
    },
  );

  // Without a predrawn base, (a + b)² would mostly get bases 10–12 (spec §5.8).
  it('spreads the power base evenly in the sum template (a + b)² − c × d', () => {
    const templateRng = createRng(7);
    const basesByExponent = new Map<number, bigint[]>();
    for (let i = 0; i < 2000; i++) {
      for (const node of nodes(generateFromTemplate(templateRng, TEMPLATES[3]!))) {
        if (node.type !== 'power') continue;
        const exponent = Number(evaluate(node.exponent)!.num);
        const bases = basesByExponent.get(exponent) ?? [];
        bases.push(abs(evaluate(node.base)!.num));
        basesByExponent.set(exponent, bases);
      }
    }
    for (const exponent of [2, 3]) {
      const bases = basesByExponent.get(exponent) ?? [];
      const max = MAX_POWER_BASE[exponent]!;
      const options = max - MIN_POWER_BASE + 1;
      for (let base = MIN_POWER_BASE; base <= max; base++) {
        const share = bases.filter((value) => value === BigInt(base)).length / bases.length;
        expect(share, `base ${base}, exponent ${exponent}`).toBeGreaterThan(0.75 / options);
        expect(share, `base ${base}, exponent ${exponent}`).toBeLessThan(1.25 / options);
      }
    }
  });

  it('has the 10 templates of spec §5.8', () => {
    expect(TEMPLATES).toHaveLength(10);
  });
});

describe('generateOrderOfOperations', () => {
  it('asks for the value and explains it step by step', () => {
    const questionRng = createRng(23);
    for (let i = 0; i < 1000; i++) {
      const question = generateOrderOfOperations(questionRng);
      const step = question.steps[0]!;
      expect(question.topic).toBe('orderOfOperations');
      expect(question.steps).toHaveLength(1);
      expect(step.kind).toBe('number');
      expect(step.prompt.endsWith(' = ?')).toBe(true);
      const text = step.prompt.slice(0, -' = ?'.length);
      expect(question.key).toBe(`orderOfOperations:${text}`);
      const answer = evaluate(parse(text)!)!;
      const expected = formatRational(answer);
      const result = step.check(String(answer.num));
      expect(result.correct).toBe(true);
      expect(result.expected).toBe(expected);
      expect(result.explanation?.startsWith(`${text} = `)).toBe(true);
      expect(result.explanation?.endsWith(` = ${expected}`)).toBe(true);
    }
  });
});
