import { INPUT_MODELS, okSpan, type KeyDef } from './inputModels';
import type { KeypadKey } from './keypadInput';
import type { AnswerKind, Topic } from './types';

/** Kladblok cells in a grid of 2 columns and 3 rows, in reading order (spec §3.6). */
export const NOTE_COUNT = 6;

/** A cell holds a few numbers; it clips on the left, so this only bounds the string. */
export const MAX_NOTE_LENGTH = 40;

export const EMPTY_NOTES: readonly string[] = Object.freeze(Array<string>(NOTE_COUNT).fill(''));

/** The standard number keypad, with a spatie in the place of OK (spec §3.6). */
export const NOTE_KEYS: readonly KeyDef[] = [
  ...INPUT_MODELS.number.keys,
  { key: ' ', label: 'spatie', span: okSpan(INPUT_MODELS.number.keys) },
];

/**
 * One key typed into a note: numbers separated by single spaces. Every key except backspace
 * edits the last number with the number reducer, so `−` and `,` apply to that number only.
 */
export function applyNote(note: string, key: KeypadKey): string {
  if (key === 'backspace') return note.slice(0, -1);
  const start = note.lastIndexOf(' ') + 1;
  const last = note.slice(start);
  // A space only ends a number that has a digit: never leading, never two in a row.
  const next =
    key === ' '
      ? /\d/.test(last)
        ? `${note} `
        : note
      : note.slice(0, start) + INPUT_MODELS.number.apply(last, key);
  return next.length > MAX_NOTE_LENGTH ? note : next;
}

/** New notes with one key typed into cell `index`. */
export function applyNoteKey(
  notes: readonly string[],
  index: number,
  key: KeypadKey,
): readonly string[] {
  return notes.map((note, i) => (i === index ? applyNote(note, key) : note));
}

/** Tables are practised from memory, and Ja/Nee steps have no keypad (spec §3.6). */
export function showsScratchpad(topic: Topic, kind: AnswerKind): boolean {
  return topic !== 'tables' && kind !== 'boolean';
}

/** How KeypadAnswer hands the keypad to the kladblok. */
export interface ScratchpadInput {
  /** A cell is active: the keypad types there, with a spatie instead of OK. */
  active: boolean;
  onkey(key: KeypadKey): void;
  /** The answer field was tapped while a cell was active. */
  onfocusanswer(): void;
}
