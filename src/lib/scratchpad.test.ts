import { describe, expect, it } from 'vitest';
import { INPUT_MODELS } from './inputModels';
import type { KeypadKey } from './keypadInput';
import {
  applyNoteKey,
  EMPTY_NOTES,
  NOTE_COUNT,
  NOTE_KEYS,
  nextNote,
  SHORT_NOTE_COUNT,
  SHORT_SCREEN_QUERY,
  showsScratchpad,
} from './scratchpad';

function typeInto(index: number, keys: KeypadKey[]): readonly string[] {
  return keys.reduce((notes, key) => applyNoteKey(notes, index, key), EMPTY_NOTES);
}

describe('scratchpad', () => {
  it('has four empty cells, and two on short screens', () => {
    expect(NOTE_COUNT).toBe(4);
    expect(SHORT_NOTE_COUNT).toBe(2);
    expect(EMPTY_NOTES).toEqual(['', '', '', '']);
    expect(SHORT_SCREEN_QUERY).toBe('(max-height: 759px)');
  });

  it('moves Volgende through the shown cells in reading order, then back to the answer', () => {
    expect([0, 1, 2, 3].map((index) => nextNote(index, NOTE_COUNT))).toEqual([1, 2, 3, null]);
    expect([0, 1].map((index) => nextNote(index, SHORT_NOTE_COUNT))).toEqual([1, null]);
  });

  it('types into one cell with the number reducer', () => {
    expect(typeInto(1, ['9', '0', '0'])).toEqual(['', '900', '', '']);
    expect(typeInto(1, ['9', '0', '0', 'backspace'])).toEqual(['', '90', '', '']);
    expect(typeInto(0, ['5', '-'])).toEqual(['-5', '', '', '']);
    expect(typeInto(3, ['0', ',', '2', '5', ','])).toEqual(['', '', '', '0,25']);
  });

  it('never changes the notes it is given', () => {
    const notes = typeInto(2, ['7']);
    expect(applyNoteKey(notes, 2, '8')).toEqual(['', '', '78', '']);
    expect(notes).toEqual(['', '', '7', '']);
    expect(EMPTY_NOTES).toEqual(['', '', '', '']);
  });

  it('uses the number keys', () => {
    expect(NOTE_KEYS).toBe(INPUT_MODELS.number.keys);
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
