import { describe, expect, it } from 'vitest';
import { rational } from '../rational';
import { parse, type BinaryOperator, type Expr } from './parser';

function num(value: bigint): Expr {
  return { type: 'number', value: rational(value) };
}

function bin(operator: BinaryOperator, left: Expr, right: Expr): Expr {
  return { type: 'binary', operator, left, right };
}

function group(inner: Expr): Expr {
  return { type: 'group', inner };
}

function pow(base: Expr, exponent: Expr): Expr {
  return { type: 'power', base, exponent };
}

describe('parse', () => {
  it('parses a single number', () => {
    expect(parse('84')).toEqual(num(84n));
  });

  it('parses a product from left to right', () => {
    expect(parse('2×3×7')).toEqual(bin('×', bin('×', num(2n), num(3n)), num(7n)));
  });

  it('binds ^ tighter than ×', () => {
    expect(parse('2^2×3')).toEqual(bin('×', pow(num(2n), num(2n)), num(3n)));
  });

  it('ignores whitespace', () => {
    expect(parse(' 2 ^ 2 × 3 ')).toEqual(parse('2^2×3'));
  });

  it('keeps decimals as exact numbers', () => {
    expect(parse('2,5')).toEqual({ type: 'number', value: rational(5n, 2n) });
  });

  it('binds × and : tighter than + and −', () => {
    expect(parse('2+3×4')).toEqual(bin('+', num(2n), bin('×', num(3n), num(4n))));
    expect(parse('2−6:3')).toEqual(bin('−', num(2n), bin(':', num(6n), num(3n))));
  });

  it('groups equal priorities from left to right', () => {
    expect(parse('20−5−3')).toEqual(bin('−', bin('−', num(20n), num(5n)), num(3n)));
    expect(parse('20:4×5')).toEqual(bin('×', bin(':', num(20n), num(4n)), num(5n)));
    expect(parse('1+2−3+4')).toEqual(
      bin('+', bin('−', bin('+', num(1n), num(2n)), num(3n)), num(4n)),
    );
  });

  it('keeps explicit parentheses as groups', () => {
    expect(parse('(2+3)×4')).toEqual(bin('×', group(bin('+', num(2n), num(3n))), num(4n)));
    expect(parse('(2)')).toEqual(group(num(2n)));
    expect(parse('17+(25+75)')).toEqual(
      bin('+', num(17n), group(bin('+', num(25n), num(75n)))),
    );
  });

  it('reads a minus at the start or after ( as a negative literal', () => {
    expect(parse('-7-(-12)')).toEqual(bin('−', num(-7n), num(-12n)));
    expect(parse('5×(−3)+8')).toEqual(bin('+', bin('×', num(5n), num(-3n)), num(8n)));
    expect(parse('(−3+5)×2')).toEqual(bin('×', group(bin('+', num(-3n), num(5n))), num(2n)));
    // Parentheses around just a negative literal are its notation, at any depth.
    expect(parse('((−3))')).toEqual(num(-3n));
  });

  it('raises a negative literal as a whole', () => {
    expect(parse('(−4)^2−10')).toEqual(bin('−', pow(num(-4n), num(2n)), num(10n)));
    // Spec §7: −3² parses as (−3)², which is why §5.8 never generates it.
    expect(parse('−3^2')).toEqual(pow(num(-3n), num(2n)));
  });

  it('reads superscript exponents and parenthesized exponents', () => {
    expect(parse('(2 + 3)² − 4')).toEqual(
      bin('−', pow(group(bin('+', num(2n), num(3n))), num(2n)), num(4n)),
    );
    expect(parse('2^(1+1)')).toEqual(pow(num(2n), group(bin('+', num(1n), num(1n)))));
    expect(parse('2^(−1)')).toEqual(pow(num(2n), num(-1n)));
  });

  it.each([
    '',
    '×',
    '2×',
    '×2',
    '2^',
    '^2',
    '2^3^4',
    '2××3',
    '2 3',
    'x',
    '(',
    '()',
    '(2',
    '2)',
    '2(3)',
    '(2)(3)',
    '(2+)',
    '2×−3',
    '2+−3',
    '−−2',
    '−(2)',
    '2^−1',
  ])('rejects %j', (input) => {
    expect(parse(input)).toBeNull();
  });
});
