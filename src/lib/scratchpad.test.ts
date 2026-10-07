import { describe, expect, it } from 'vitest';
import type { KeypadKey } from './keypadInput';
import {
  applyNoteKey,
  EMPTY_NOTES,
  MAX_NOTE_LENGTH,
  NOTE_COLUMNS,
  NOTE_COUNT,
  NOTE_KEYS,
  showsScratchpad,
} from './scratchpad';

function typeInto(index: number, keys: KeypadKey[]): readonly string[] {
  return keys.reduce((notes, key) => applyNoteKey(notes, index, key), EMPTY_NOTES);
}

function typeNote(keys: KeypadKey[]): string {
  return typeInto(0, keys)[0] ?? '';
}

/** One key per character: 'backspace' is written as '<'. */
function typeText(text: string): string {
  return typeNote([...text].map((char) => (char === '<' ? 'backspace' : (char as KeypadKey))));
}

describe('scratchpad', () => {
  it('has six empty cells', () => {
    expect(NOTE_COUNT).toBe(6);
    expect(EMPTY_NOTES).toEqual(['', '', '', '', '', '']);
  });

  it('types into one cell', () => {
    expect(typeInto(1, ['9', '0', '0'])).toEqual(['', '900', '', '', '', '']);
    expect(typeInto(1, ['9', '0', '0', 'backspace'])).toEqual(['', '90', '', '', '', '']);
    expect(typeInto(5, ['0', ',', '2', '5', ','])).toEqual(['', '', '', '', '', '0,25']);
  });

  it.each<[string, string, string]>([
    ['separates items with a space', '12 7 84', '12 7 84'],
    ['writes a sum with its result', '12×7=84', '12×7=84'],
    ['writes all operators', '3+4×2-6:3', '3+4×2-6:3'],
    ['ignores a space in an empty cell', ' 5', '5'],
    ['ignores a second space in a row', '5  6', '5 6'],
    ['ignores a space after an operator or =', '5+ 6= ', '5+6='],
    ['ignores a space after a comma', '5, ', '5,'],
    ['ignores a space after ^ or /', '2^ 3 4/ 5', '2^3 4/5'],
    ['starts an item with a minus sign', '-5 -6', '-5 -6'],
    ['makes - the operator after a number', '5-1-2', '5-1-2'],
    ['allows a minus sign after =', '3-8=-5', '3-8=-5'],
    ['allows a minus sign after an operator', '19×-1 1+-2 6:-3 5--3', '19×-1 1+-2 6:-3 5--3'],
    ['ignores a second minus sign in a row', '--4 5---3 1=--2', '-4 5--3 1=-2'],
    ['ignores a minus after ^ or /', '2^-3 1/-4', '2^3 1/4'],
    ['ignores +, × and : without a number before them', '+×:5', '5'],
    ['ignores a second operator in a row', '5+×:6', '5+6'],
    ['writes a power with its result', '2^3=8 0,5^2', '2^3=8 0,5^2'],
    ['ignores ^ without a number before it', '^2 3+^', '2 3+'],
    ['ignores ^ in an exponent or a denominator', '2^3^4 3/4^2', '2^34 3/42'],
    ['writes fractions, also signed and in sums', '3/4 -3/4 1+3/4=7/4', '3/4 -3/4 1+3/4=7/4'],
    ['ignores / without a number before it', '/2 3+/', '2 3+'],
    ['ignores / after a number with a comma', '0,5/2', '0,52'],
    ['ignores / in a denominator or an exponent', '3/4/5 2^3/4', '3/45 2^34'],
    ['ignores a comma in an exponent or a denominator', '2^,3, 3/,4,', '2^3 3/4'],
    ['ignores ^ and / after a comma', '5,^/', '5,'],
    ['allows = more than once per item', '3+4=7=7,0 2=2', '3+4=7=7,0 2=2'],
    ['ignores a second = in a row', '1==1', '1=1'],
    ['ignores = without a number before it', '=5 6+=', '5 6+'],
    ['allows one comma per number', '0,5+1,,5 ,5', '0,5+1,5 ,5'],
    ['deletes a space like any other character', '5 <6', '56'],
    ['ignores parentheses, which are not on the kladblok keypad', '(5)', '5'],
  ])('%s', (_, keys, expected) => {
    expect(typeText(keys)).toBe(expected);
  });

  it('limits each number to 12 digits and comma, without the sign', () => {
    expect(typeText('-' + '1'.repeat(13))).toBe('-' + '1'.repeat(12));
    expect(typeText('1'.repeat(11) + ',,1')).toBe('1'.repeat(11) + ',');
    expect(typeText('1'.repeat(12) + '+1')).toBe('1'.repeat(12) + '+1');
  });

  it('limits a cell to 40 characters', () => {
    // 19 times "1 " is 38 characters, so "12" fills the cell.
    const start = '1 '.repeat(19);
    const full = typeText(`${start}12`);
    expect(full).toHaveLength(MAX_NOTE_LENGTH);
    for (const key of ['3', '+', '=', ' ', ',', '^', '/']) {
      expect(typeText(`${start}12${key}`)).toBe(full);
    }
    expect(typeText(`${start}12<`)).toBe(full.slice(0, -1));
  });

  it('never changes the notes it is given', () => {
    const notes = typeInto(2, ['7']);
    expect(applyNoteKey(notes, 2, '8')).toEqual(['', '', '78', '', '', '']);
    expect(notes).toEqual(['', '', '7', '', '', '']);
    expect(EMPTY_NOTES).toEqual(['', '', '', '', '', '']);
  });

  it('swaps the parentheses for ^ and breuk and adds comma, = and a spatie, in 5 rows of 4', () => {
    expect(NOTE_COLUMNS).toBe(4);
    expect(NOTE_KEYS.map(({ key }) => key)).toEqual([
      '7', '8', '9', '+',
      '4', '5', '6', '-',
      '1', '2', '3', '×',
      '^', '0', '/', ':',
      'backspace', ',', '=', ' ',
    ]);
  });

  it('is shown for keypad steps, except for tables', () => {
    expect(showsScratchpad('percentages', 'number')).toBe(true);
    expect(showsScratchpad('percentages', 'fraction')).toBe(true);
    expect(showsScratchpad('factorization', 'factorization')).toBe(true);
    expect(showsScratchpad('tables', 'number')).toBe(false);
    expect(showsScratchpad('prime', 'boolean')).toBe(false);
    expect(showsScratchpad('divisibility', 'boolean')).toBe(false);
  });
});
