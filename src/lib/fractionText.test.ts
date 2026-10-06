import { describe, expect, it } from 'vitest';
import { splitFractions } from './fractionText';

const text = (value: string) => ({ type: 'text', text: value });
const fraction = (num: string, den: string) => ({ type: 'fraction', num, den });

describe('splitFractions', () => {
  it.each([
    ['', []],
    ['7 : 2 = ?', [text('7 : 2 = ?')]],
    ['25/2', [fraction('25', '2')]],
    ['12,5 of 25/2', [text('12,5 of '), fraction('25', '2')]],
    ['−3/4', [text('−'), fraction('3', '4')]],
    ['−12 1/2', [text('−12 '), fraction('1', '2')]],
    ['12½% van 80 = ?', [text('12'), fraction('1', '2'), text('% van 80 = ?')]],
    ['12½% = 80 : 8 = 10', [text('12'), fraction('1', '2'), text('% = 80 : 8 = 10')]],
    ['1/3 en 2/3', [fraction('1', '3'), text(' en '), fraction('2', '3')]],
    ['1\u{202f}000/3', [fraction('1\u{202f}000', '3')]],
  ])('splits %j', (input, expected) => {
    expect(splitFractions(input)).toEqual(expected);
  });
});
