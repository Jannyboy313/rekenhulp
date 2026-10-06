import { describe, expect, it } from 'vitest';
import { createRng } from '../random';
import { equals, parseDutchNumber } from '../rational';
import { generateExpression } from '../topics/orderOfOperations';
import { evaluate } from './evaluate';
import { evaluateMisconception, type Misconception } from './misconceptions';
import { parse, type Expr } from './parser';

const value = (input: string, misconception: Misconception) =>
  evaluateMisconception(parse(input)!, misconception);

describe('evaluateMisconception', () => {
  it.each([
    ['2+3×4', 'leftToRight', '20'],
    ['20-12:4×2', 'leftToRight', '4'],
    ['20-12:4×2', 'multiplyBeforeDivide', '18,5'],
    ['3^2+1', 'powerAsProduct', '7'],
    ['(2+3)^2-4×2', 'leftToRight', '42'],
    ['2×(3+4×5)', 'leftToRight', '70'],
  ] as const)('%s with %s is %s', (input, misconception, expected) => {
    expect(value(input, misconception)).toEqual(parseDutchNumber(expected));
  });

  it('is null for a division by zero', () => {
    expect(value('10:(5-5)', 'leftToRight')).toBeNull();
  });

  it('matches evaluate when the misconception does not apply', () => {
    const hasPower = (expr: Expr): boolean =>
      expr.type === 'power' ||
      (expr.type === 'group' && hasPower(expr.inner)) ||
      (expr.type === 'binary' && (hasPower(expr.left) || hasPower(expr.right)));
    const rng = createRng(5);
    for (let i = 0; i < 1000; i++) {
      const expr = generateExpression(rng);
      const real = evaluate(expr)!;
      if (!hasPower(expr)) {
        expect(equals(evaluateMisconception(expr, 'powerAsProduct')!, real)).toBe(true);
      }
    }
  });
});
