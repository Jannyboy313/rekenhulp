import { describe, expect, it } from 'vitest';
import { evaluate } from './evaluate';
import { parse } from './parser';
import { evaluationSteps, explainEvaluation } from './reduce';

const CASES: [string, string][] = [
  ['12', '12'],
  ['3+4×5', '3 + 4 × 5 = 3 + 20 = 23'],
  ['3×(8-2)+4', '3 × (8 − 2) + 4 = 3 × 6 + 4 = 18 + 4 = 22'],
  ['20:4×5', '20 : 4 × 5 = 5 × 5 = 25'],
  ['2+3×4-6:2', '2 + 3 × 4 − 6 : 2 = 2 + 12 − 6 : 2 = 2 + 12 − 3 = 14 − 3 = 11'],
  ['(2+3)^2-4×5', '(2 + 3)² − 4 × 5 = 5² − 4 × 5 = 25 − 4 × 5 = 25 − 20 = 5'],
  ['(1+2)×(3+4×5)', '(1 + 2) × (3 + 4 × 5) = (1 + 2) × (3 + 20) = 3 × (3 + 20) = 3 × 23 = 69'],
  ['-7-(-12)', '−7 − (−12) = 5'],
  ['2×(3-5)', '2 × (3 − 5) = 2 × (−2) = −4'],
  ['(3-5)^2', '(3 − 5)² = (−2)² = 4'],
  ['7×100-7×2', '7 × 100 − 7 × 2 = 700 − 7 × 2 = 700 − 14 = 686'],
  ['2×(3)', '2 × (3) = 2 × 3 = 6'],
  ['(5)+3', '(5) + 3 = 5 + 3 = 8'],
  ['2^(1+1)', '2^(1 + 1) = 2² = 4'],
];

describe('explainEvaluation', () => {
  it.each(CASES)('explains %j as %j', (input, expected) => {
    expect(explainEvaluation(parse(input)!)).toBe(expected);
  });
});

describe('evaluationSteps', () => {
  it.each(CASES)('ends %j with its value', (input) => {
    const expr = parse(input)!;
    const last = evaluationSteps(expr).at(-1) ?? expr;
    expect(last).toEqual({ type: 'number', value: evaluate(expr) });
  });

  it('throws for an expression without a value', () => {
    expect(() => evaluationSteps(parse('1:0+3')!)).toThrow(RangeError);
    expect(() => evaluationSteps(parse('2^(3-5)')!)).toThrow(RangeError);
  });
});
