import { describe, expect, it } from 'vitest';
import { INPUT_MODELS, okSpan } from './inputModels';
import type { KeypadKey } from './keypadInput';
import {
  applyNoteKey,
  EMPTY_NOTES,
  MAX_NOTE_LENGTH,
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

describe('scratchpad', () => {
  it('has six empty cells', () => {
    expect(NOTE_COUNT).toBe(6);
    expect(EMPTY_NOTES).toEqual(['', '', '', '', '', '']);
  });

  it('types into one cell with the number reducer', () => {
    expect(typeInto(1, ['9', '0', '0'])).toEqual(['', '900', '', '', '', '']);
    expect(typeInto(1, ['9', '0', '0', 'backspace'])).toEqual(['', '90', '', '', '', '']);
    expect(typeInto(0, ['5', '-'])).toEqual(['-5', '', '', '', '', '']);
    expect(typeInto(5, ['0', ',', '2', '5', ','])).toEqual(['', '', '', '', '', '0,25']);
  });

  it.each<[string, KeypadKey[], string]>([
    ['separates numbers with a space', ['1', '2', ' ', '7', ' ', '8', '4'], '12 7 84'],
    ['ignores a space in an empty cell', [' ', '5'], '5'],
    ['ignores a second space in a row', ['5', ' ', ' ', '6'], '5 6'],
    ['ignores a space before the first digit of a number', ['5', ' ', '-', ' '], '5 -'],
    ['toggles the minus of the last number only', ['5', ' ', '6', '-'], '5 -6'],
    ['allows one comma per number', ['0', ',', '5', ' ', '1', ',', ','], '0,5 1,'],
    ['deletes a space like any other character', ['5', ' ', 'backspace', '6'], '56'],
    ['ignores keys that are not on the number keypad', ['5', '×', '/', '^'], '5'],
  ])('%s', (_, keys, expected) => {
    expect(typeNote(keys)).toBe(expected);
  });

  it('limits each number to 12 digits and a cell to 40 characters', () => {
    expect(typeNote(Array<KeypadKey>(13).fill('1'))).toBe('1'.repeat(12));
    // 19 times "1 " is 38 characters, so "12" fills the cell.
    const start: KeypadKey[] = Array.from({ length: 19 }, () => ['1', ' '] as KeypadKey[]).flat();
    const full = typeNote([...start, '1', '2']);
    expect(full).toHaveLength(MAX_NOTE_LENGTH);
    expect(typeNote([...start, '1', '2', '3'])).toBe(full);
    expect(typeNote([...start, '1', '2', '-'])).toBe(full);
    expect(typeNote([...start, '1', '2', 'backspace'])).toBe(full.slice(0, -1));
  });

  it('never changes the notes it is given', () => {
    const notes = typeInto(2, ['7']);
    expect(applyNoteKey(notes, 2, '8')).toEqual(['', '', '78', '', '', '']);
    expect(notes).toEqual(['', '', '7', '', '', '']);
    expect(EMPTY_NOTES).toEqual(['', '', '', '', '', '']);
  });

  it('uses the number keys with a spatie in the place of OK', () => {
    const numberKeys = INPUT_MODELS.number.keys;
    expect(NOTE_KEYS.slice(0, -1)).toEqual(numberKeys);
    expect(NOTE_KEYS.at(-1)).toEqual({ key: ' ', label: 'spatie', span: okSpan(numberKeys) });
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
