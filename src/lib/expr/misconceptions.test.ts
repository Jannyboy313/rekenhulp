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
    ['2^3-1', 'powerAsProduct', '5'],
    ['2×(3+4×5)', 'leftToRight', '70'],
    ['5-(-3)^2', 'powerAsProduct', '11'],
    ['2×(3+(-4)^2)', 'powerAsProduct', '-10'],
  ] as const)('%s with %s is %s', (input, misconception, expected) => {
    expect(value(input, misconception)).toEqual(parseDutchNumber(expected));
  });

  it('is null for a division by zero', () => {
    expect(value('10:(5-5)', 'leftToRight')).toBeNull();
  });

  it.each(['2^11', '2^(1:2)', '2^(3-5)'])('is null for the invalid exponent in %s', (input) => {
    expect(evaluate(parse(input)!)).toBeNull();
    const all = ['powerAsProduct', 'leftToRight', 'multiplyBeforeDivide'] as const;
    for (const misconception of all) expect(value(input, misconception)).toBeNull();
  });

  it.each([
    ['2+3+4', 'leftToRight'],
    ['10-3+4', 'leftToRight'],
    ['12:3×2', 'leftToRight'],
    ['8:2:2', 'leftToRight'],
    ['2+3+4', 'multiplyBeforeDivide'],
    ['10-3+4', 'multiplyBeforeDivide'],
    ['8:2:2', 'multiplyBeforeDivide'],
    ['6×7', 'multiplyBeforeDivide'],
  ] as const)('%s with %s equals the real value, as the precedence cannot matter', (input, m) => {
    expect(value(input, m)).toEqual(evaluate(parse(input)!));
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
