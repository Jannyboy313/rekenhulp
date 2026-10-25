import { describe, expect, it } from 'vitest';
import { withUnits } from './units';

describe('withUnits', () => {
  it.each([
    ['45', '€', undefined, '€ 45'],
    ['126', undefined, 'cm²', '126 cm²'],
    ['25', undefined, '%', '25%'],
    ['12 1/2', undefined, '%', '12 1/2%'],
    ['250', '1\u{a0}:', undefined, '1\u{a0}: 250'],
    ['7', undefined, undefined, '7'],
    ['7', '', '', '7'],
  ])('writes %j with prefix %j and suffix %j as %j', (text, prefix, suffix, expected) => {
    expect(withUnits(text, prefix, suffix)).toBe(expected);
  });
});
