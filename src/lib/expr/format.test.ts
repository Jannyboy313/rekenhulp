import { describe, expect, it } from 'vitest';
import { rational } from '../rational';
import { formatExpr } from './format';
import { parse, type Expr } from './parser';

function num(value: bigint): Expr {
  return { type: 'number', value: rational(value) };
}

const INPUTS: [string, string][] = [
  ['2+3×4', '2 + 3 × 4'],
  ['20-5-3', '20 − 5 − 3'],
  ['20:4×5', '20 : 4 × 5'],
  ['(2+3)^2-4×5', '(2 + 3)² − 4 × 5'],
  ['2^3', '2³'],
  ['-7-(-12)', '−7 − (−12)'],
  ['5×(-3)+8', '5 × (−3) + 8'],
  ['(-4)^2-10', '(−4)² − 10'],
  ['(-3+5)×2', '(−3 + 5) × 2'],
  ['17+(25+75)', '17 + (25 + 75)'],
  ['2,5×4', '2,5 × 4'],
  ['2^(1+1)', '2^(1 + 1)'],
  ['2^(-2)', '2^(−2)'],
  ['(-2,5)×2', '−2,5 × 2'],
];

describe('formatExpr', () => {
  it.each(INPUTS)('writes %j as %j', (input, expected) => {
    expect(formatExpr(parse(input)!)).toBe(expected);
  });

  it.each(INPUTS)('writes %j so that it parses back unchanged', (input) => {
    const expr = parse(input)!;
    expect(parse(formatExpr(expr))).toEqual(expr);
  });

  it('puts a negative literal in parentheses unless it is a first term', () => {
    const minus3 = num(-3n);
    expect(formatExpr(minus3)).toBe('−3');
    expect(formatExpr({ type: 'binary', operator: '×', left: num(5n), right: minus3 })).toBe(
      '5 × (−3)',
    );
    expect(formatExpr({ type: 'binary', operator: '×', left: minus3, right: num(5n) })).toBe(
      '−3 × 5',
    );
  });

  it('always puts a negative power base in parentheses, never −3²', () => {
    expect(formatExpr({ type: 'power', base: num(-3n), exponent: num(2n) })).toBe('(−3)²');
  });
});
