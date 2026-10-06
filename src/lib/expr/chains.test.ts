import { describe, expect, it } from 'vitest';
import { rational } from '../rational';
import { sameChains, toChains, type ChainExpr, type ChainOperator } from './chains';
import { parse, type Expr } from './parser';

const chains = (input: string): ChainExpr => toChains(parse(input)!);

function n(value: bigint): ChainExpr {
  return { type: 'number', value: rational(value) };
}

function chain(operator: ChainOperator, ...operands: ChainExpr[]): ChainExpr {
  return { type: 'chain', operator, operands };
}

function group(inner: ChainExpr): ChainExpr {
  return { type: 'group', inner };
}

function binary(operator: '−' | ':', left: ChainExpr, right: ChainExpr): ChainExpr {
  return { type: 'binary', operator, left, right };
}

describe('toChains', () => {
  it('joins consecutive + and × operands into one chain', () => {
    expect(chains('2+3+4')).toEqual(chain('+', n(2n), n(3n), n(4n)));
    expect(chains('2×3×4')).toEqual(chain('×', n(2n), n(3n), n(4n)));
    expect(chains('2×3+4×5')).toEqual(
      chain('+', chain('×', n(2n), n(3n)), chain('×', n(4n), n(5n))),
    );
  });

  it('starts a new chain inside parentheses', () => {
    expect(chains('(2+3)+4')).toEqual(chain('+', group(chain('+', n(2n), n(3n))), n(4n)));
    expect(chains('2+(3+4)')).toEqual(chain('+', n(2n), group(chain('+', n(3n), n(4n)))));
  });

  it('keeps − and : binary, so they break a chain', () => {
    expect(chains('20−5−3')).toEqual(binary('−', binary('−', n(20n), n(5n)), n(3n)));
    expect(chains('1+2−3+4')).toEqual(
      chain('+', binary('−', chain('+', n(1n), n(2n)), n(3n)), n(4n)),
    );
    expect(chains('2×3:4×5')).toEqual(
      chain('×', binary(':', chain('×', n(2n), n(3n)), n(4n)), n(5n)),
    );
  });

  it('keeps powers', () => {
    expect(chains('(2+3)^2')).toEqual({
      type: 'power',
      base: group(chain('+', n(2n), n(3n))),
      exponent: n(2n),
    });
  });

  it('absorbs only a left operand, like left-associative parsing', () => {
    const num = (value: bigint): Expr => ({ type: 'number', value: rational(value) });
    const rightNested: Expr = {
      type: 'binary',
      operator: '+',
      left: num(17n),
      right: { type: 'binary', operator: '+', left: num(25n), right: num(75n) },
    };
    expect(toChains(rightNested)).toEqual(chain('+', n(17n), chain('+', n(25n), n(75n))));
  });
});

describe('sameChains', () => {
  it('compares structure, operators and values', () => {
    expect(sameChains(chains('2+3×4'), chains('2 + 3 × 4'))).toBe(true);
    expect(sameChains(chains('0,5'), chains('0,50'))).toBe(true);
    expect(sameChains(chains('2+3'), chains('3+2'))).toBe(false);
    expect(sameChains(chains('2+3'), chains('2−3'))).toBe(false);
    expect(sameChains(chains('(2+3)'), chains('2+3'))).toBe(false);
    expect(sameChains(chains('2+3+4'), chains('2+3'))).toBe(false);
    expect(sameChains(chains('2^2'), chains('2^3'))).toBe(false);
    expect(sameChains(chains('0,5'), chains('1:2'))).toBe(false);
  });
});
