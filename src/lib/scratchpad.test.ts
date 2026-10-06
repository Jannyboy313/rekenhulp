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
    ['writes all operators and parentheses', '(3+4)×2-6:3', '(3+4)×2-6:3'],
    ['ignores a space in an empty cell', ' 5', '5'],
    ['ignores a second space in a row', '5  6', '5 6'],
    ['ignores a space after an operator, = or (', '5+ 6=( ', '5+6=('],
    ['allows a space after )', '(1) 2', '(1) 2'],
    ['ignores a space after a comma', '5, ', '5,'],
    ['starts an item with a minus sign', '-5 -6', '-5 -6'],
    ['makes - the operator after a number or )', '5-(1)-2', '5-(1)-2'],
    ['allows a minus sign after ( and =', '(-3) 3-8=-5', '(-3) 3-8=-5'],
    ['ignores a minus after an operator or a minus sign', '3×-2 --4', '3×2 -4'],
    ['ignores +, × and : without a number before them', '+×:5', '5'],
    ['ignores a second operator in a row', '5+×:6', '5+6'],
    [
      'opens ( at the start, after an operator, (, = or a minus sign',
      '((1)) 2=(3) -(4)',
      '((1)) 2=(3) -(4)',
    ],
    ['ignores ( after a number, ) or a comma', '5(1 (2)( 3,(', '51 (2) 3,'],
    ['ignores ) without an open (', ')5) (1))', '5 (1)'],
    ['ignores ) after an operator', '(5+)', '(5+'],
    ['ignores ) directly after (', '(()', '(('],
    ['ignores a digit or comma directly after )', '(1)2,', '(1)'],
    ['allows one = per item', '1=1=1 2=2', '1=11 2=2'],
    ['ignores = without a number or ) before it', '=5 (=', '5 ('],
    ['allows one comma per number', '0,5+1,,5 ,5', '0,5+1,5 ,5'],
    ['counts parentheses per item', '(1 2)', '(1 2'],
    ['deletes a space like any other character', '5 <6', '56'],
    ['ignores keys that are not on the kladblok keypad', '5/^', '5'],
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
    for (const key of ['3', '+', '=', ' ', ',']) expect(typeText(`${start}12${key}`)).toBe(full);
    expect(typeText(`${start}12<`)).toBe(full.slice(0, -1));
  });

  it('never changes the notes it is given', () => {
    const notes = typeInto(2, ['7']);
    expect(applyNoteKey(notes, 2, '8')).toEqual(['', '', '78', '', '', '']);
    expect(notes).toEqual(['', '', '7', '', '', '']);
    expect(EMPTY_NOTES).toEqual(['', '', '', '', '', '']);
  });

  it('lays out the expression keys plus comma, = and a spatie in 5 full rows of 4', () => {
    expect(NOTE_COLUMNS).toBe(4);
    expect(NOTE_KEYS.map(({ key }) => key)).toEqual([
      '7', '8', '9', '+',
      '4', '5', '6', '-',
      '1', '2', '3', '×',
      '(', '0', ')', ':',
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
