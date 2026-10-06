import { INPUT_MODELS } from './inputModels';
import { MAX_INPUT_LENGTH, type KeypadKey } from './keypadInput';
import { keyDefs, type KeyDef } from './keys';
import type { AnswerKind, Topic } from './types';

/** Kladblok cells in a grid of 2 columns and 3 rows, in reading order (spec §3.6). */
export const NOTE_COUNT = 6;

/** A cell holds a few short sums; it clips on the left, so this only bounds the string. */
export const MAX_NOTE_LENGTH = 40;

export const EMPTY_NOTES: readonly string[] = Object.freeze(Array<string>(NOTE_COUNT).fill(''));

/** The expression keypad plus comma, = and a spatie in the place of OK (spec §3.6). */
export const NOTE_KEYS: readonly KeyDef[] = [
  ...INPUT_MODELS.expression.keys,
  ...keyDefs(',', '=', ' '),
];

/** Four columns like the expression keypad; the keys fill all five rows. */
export const NOTE_COLUMNS = 4;

/**
 * One key typed into a note: items (numbers or short sums like `12×7=84`) separated by single
 * spaces. Every key acts on the last item; the rules per key are in spec §3.6.
 */
export function applyNote(note: string, key: KeypadKey): string {
  if (key === 'backspace') return note.slice(0, -1);
  const next = note + noteKeyText(note.slice(note.lastIndexOf(' ') + 1), key);
  return next.length > MAX_NOTE_LENGTH ? note : next;
}

/** The text a key appends to the last item of a note; empty when the key is ignored. */
function noteKeyText(item: string, key: KeypadKey): string {
  const afterOperand = /[\d)]$/.test(item);
  // Where a number may start: the item start, after an operator, '(', '=' or a minus sign.
  const operandStart = /(^|[-+×:(=])$/.test(item);
  const number = /[\d,]*$/.exec(item)?.[0] ?? '';
  const numberFull = number.length >= MAX_INPUT_LENGTH;
  switch (key) {
    case ' ':
    case '+':
    case '×':
    case ':':
      return afterOperand ? key : '';
    case '-':
      // The operator after a number or ')'; otherwise the sign, but never after an operator.
      return afterOperand || /(^|[(=])$/.test(item) ? key : '';
    case '=':
      return afterOperand && !item.includes('=') ? key : '';
    case '(':
      return operandStart ? key : '';
    case ')':
      return afterOperand && count(item, '(') > count(item, ')') ? key : '';
    case ',':
      return !item.endsWith(')') && !number.includes(',') && !numberFull ? key : '';
    default:
      // Only digits are appended; any other key is ignored until handled explicitly above.
      return /^\d$/.test(key) && !item.endsWith(')') && !numberFull ? key : '';
  }
}

function count(text: string, char: string): number {
  return text.split(char).length - 1;
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
