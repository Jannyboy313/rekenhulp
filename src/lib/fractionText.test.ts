import { describe, expect, it } from 'vitest';
import { splitFractions, splitNoteFractions } from './fractionText';

const text = (value: string) => ({ type: 'text', text: value });
const fraction = (num: string, den: string, mixed = false) => ({
  type: 'fraction',
  num,
  den,
  mixed,
});

describe('splitFractions', () => {
  it.each([
    ['', []],
    ['7 : 2 = ?', [text('7 : 2 = ?')]],
    ['25/2', [fraction('25', '2')]],
    ['12,5 of 25/2', [text('12,5 of '), fraction('25', '2')]],
    ['−3/4', [text('−'), fraction('3', '4')]],
    ['−12 1/2', [text('−12'), fraction('1', '2', true)]],
    ['12½% van 80 = ?', [text('12'), fraction('1', '2', true), text('% van 80 = ?')]],
    ['12½% = 80 : 8 = 10', [text('12'), fraction('1', '2', true), text('% = 80 : 8 = 10')]],
    ['1/3 en 2/3', [fraction('1', '3'), text(' en '), fraction('2', '3')]],
    ['1\u{202f}000/3', [fraction('1\u{202f}000', '3')]],
    ['½', [fraction('1', '2')]],
    ['3  1/2', [text('3  '), fraction('1', '2')]],
    ['3/4 = ?/12', [fraction('3', '4'), text(' = '), fraction('?', '12')]],
    ['9/12 = 3/?', [fraction('9', '12'), text(' = '), fraction('3', '?')]],
    ['Hoeveel is het geheel?', [text('Hoeveel is het geheel?')]],
  ])('splits %j', (input, expected) => {
    expect(splitFractions(input)).toEqual(expected);
  });
});

describe('splitNoteFractions', () => {
  const note = (num: string, den: string | null) => ({ type: 'fraction', num, den });

  it.each([
    ['', []],
    ['2³=8 −5 0,25', [text('2³=8 −5 0,25')]],
    ['_3/4', [note('3', '4')]],
    ['−_3/4+1', [text('−'), note('3', '4'), text('+1')]],
    ['12×_7/2=42', [text('12×'), note('7', '2'), text('=42')]],
    // A mixed number: the whole part is the text run right before the fraction.
    ['1_2/3', [text('1'), note('2', '3')]],
    ['_7/4=1_3/4', [note('7', '4'), text('=1'), note('3', '4')]],
    // A space separates items, so a fraction after it is its own item (spec §3.6).
    ['12 _3/4', [text('12 '), note('3', '4')]],
    ['_1/2 _3/4 ', [note('1', '2'), text(' '), note('3', '4'), text(' ')]],
    // Unfinished: no denominator yet is null, an empty one is ''.
    ['_', [note('', null)]],
    ['_3', [note('3', null)]],
    ['_3/', [note('3', '')]],
    ['12×_7/', [text('12×'), note('7', '')]],
  ])('splits %j', (input, expected) => {
    expect(splitNoteFractions(input)).toEqual(expected);
  });
});
