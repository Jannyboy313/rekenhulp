import { describe, expect, it } from 'vitest';
import { rational } from '../rational';
import { evaluate } from './evaluate';
import { parse } from './parser';

function value(input: string) {
  return evaluate(parse(input)!);
}

describe('evaluate', () => {
  it.each([
    ['2+3×4', 14n],
    ['20−5−3', 12n],
    ['20:4×5', 25n],
    ['(2+3)^2', 25n],
    ['(2 + 3)² − 4 × 5', 5n],
    ['-7-(-12)', 5n],
    ['(-4)^2-10', 6n],
    ['-3^2', 9n],
    ['2^3', 8n],
    ['5^0', 1n],
    ['2^10', 1024n],
  ])('%s = %s', (input, expected) => {
    expect(value(input)).toEqual(rational(expected));
  });

  it('keeps fractions exact', () => {
    expect(value('7:2')).toEqual(rational(7n, 2n));
    expect(value('1:3+1:6')).toEqual(rational(1n, 2n));
    expect(value('2,5×4')).toEqual(rational(10n));
  });

  it.each(['5:0', '5:(2−2)', '1:0+3', '2^11', '2^(1:2)', '2^(-1)'])(
    'has no value for %j',
    (input) => {
      expect(value(input)).toBeNull();
    },
  );
});
