import { describe, expect, it } from 'vitest';
import { hasSlot, plain, SLOT } from './slot';

describe('slot', () => {
  it.each([
    ['7 × ' + SLOT + ' = 56', true],
    ['Hoeveel busjes zijn er nodig?', false],
    ['', false],
  ])('hasSlot(%j) is %s', (prompt, expected) => {
    expect(hasSlot(prompt)).toBe(expected);
  });

  it('plain turns every slot into a question mark and leaves a literal one alone', () => {
    expect(plain('3/4 = ' + SLOT + '/12')).toBe('3/4 = ?/12');
    expect(plain('Hoeveel is ' + SLOT + '?')).toBe('Hoeveel is ??');
    expect(plain('Zonder slot?')).toBe('Zonder slot?');
  });

  it('is a single character', () => {
    expect([...SLOT]).toHaveLength(1);
  });
});
