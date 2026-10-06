import { describe, expect, it } from 'vitest';
import { rational } from '../rational';
import { tokenize } from './tokenizer';

describe('tokenize', () => {
  it('reads integers, decimal commas, operators and parentheses', () => {
    expect(tokenize('12 + 3,5 × (4 − 2) : 6 ^ 2')).toEqual([
      { type: 'number', value: rational(12n) },
      { type: 'operator', operator: '+' },
      { type: 'number', value: rational(7n, 2n) },
      { type: 'operator', operator: '×' },
      { type: 'open' },
      { type: 'number', value: rational(4n) },
      { type: 'operator', operator: '−' },
      { type: 'number', value: rational(2n) },
      { type: 'close' },
      { type: 'operator', operator: ':' },
      { type: 'number', value: rational(6n) },
      { type: 'operator', operator: '^' },
      { type: 'number', value: rational(2n) },
    ]);
  });

  it('reads the keypad hyphen as a minus', () => {
    expect(tokenize('5-3')).toEqual([
      { type: 'number', value: rational(5n) },
      { type: 'operator', operator: '−' },
      { type: 'number', value: rational(3n) },
    ]);
  });

  it('returns no tokens for empty or blank input', () => {
    expect(tokenize('')).toEqual([]);
    expect(tokenize('  ')).toEqual([]);
  });

  it.each(['2 x 3', '2*3', 'a', '2.5', '1/2', ',', '2,'])('rejects %j', (input) => {
    expect(tokenize(input)).toBeNull();
  });
});
