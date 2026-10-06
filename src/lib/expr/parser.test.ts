import { describe, expect, it } from 'vitest';
import { rational } from '../rational';
import { parse, type Expr } from './parser';

function num(value: bigint): Expr {
  return { type: 'number', value: rational(value) };
}

describe('parse', () => {
  it('parses a single number', () => {
    expect(parse('84')).toEqual(num(84n));
  });

  it('parses a product from left to right', () => {
    expect(parse('2×3×7')).toEqual({
      type: 'binary',
      operator: '×',
      left: { type: 'binary', operator: '×', left: num(2n), right: num(3n) },
      right: num(7n),
    });
  });

  it('binds ^ tighter than ×', () => {
    expect(parse('2^2×3')).toEqual({
      type: 'binary',
      operator: '×',
      left: { type: 'power', base: num(2n), exponent: num(2n) },
      right: num(3n),
    });
  });

  it('ignores whitespace', () => {
    expect(parse(' 2 ^ 2 × 3 ')).toEqual(parse('2^2×3'));
  });

  it('keeps decimals as exact numbers', () => {
    expect(parse('2,5')).toEqual({ type: 'number', value: rational(5n, 2n) });
  });

  it.each(['', '×', '2×', '×2', '2^', '^2', '2^3^4', '2××3', '2 3', '(2)', '2+3', '2:3', '-2', 'x'])(
    'rejects %j',
    (input) => {
      expect(parse(input)).toBeNull();
    },
  );
});
