import { MAX_INPUT_LENGTH, type KeypadKey } from './keypadInput';
import { keyDefs, type KeyDef } from './keys';
import type { AnswerKind, Topic } from './types';

/** Kladblok cells in a grid of 2 columns and 3 rows, in reading order (spec §3.6). */
export const NOTE_COUNT = 6;

/** A cell holds a few short sums; it clips on the left, so this only bounds the string. */
export const MAX_NOTE_LENGTH = 40;

export const EMPTY_NOTES: readonly string[] = Object.freeze(Array<string>(NOTE_COUNT).fill(''));

/**
 * The expression keypad with ^ and breuk instead of the parentheses, plus comma, = and a spatie in
 * the place of OK (spec §3.6). Listed on its own, so a change to the expression keypad does not
 * break this layout.
 */
// prettier-ignore
export const NOTE_KEYS: readonly KeyDef[] = keyDefs(
  '7', '8', '9', '+',
  '4', '5', '6', '-',
  '1', '2', '3', '×',
  '^', '0', '/', ':',
  'backspace', ',', '=', ' ',
);

/** Four columns like the expression keypad; the keys fill all five rows. */
export const NOTE_COLUMNS = 4;

/**
 * One key typed into a note: items (numbers or short sums like `12×7=84`) separated by single
 * spaces. Every key acts on the last item; the rules per key are in spec §3.6. A note stores a
 * fraction as `_3/4`: the breuk key writes `_` to open it and `/` to move to the denominator, so
 * `1_3/4` is a mixed number and backspace undoes one breuk press at a time.
 */
function applyNote(note: string, key: KeypadKey): string {
  if (key === 'backspace') return note.slice(0, -1);
  const next = note + noteKeyText(note.slice(note.lastIndexOf(' ') + 1), key);
  return next.length > MAX_NOTE_LENGTH ? note : next;
}

/** The text a key appends to the last item of a note; empty when the key is ignored. */
function noteKeyText(item: string, key: KeypadKey): string {
  const number = /[\d,]*$/.exec(item)?.[0] ?? '';
  const numberFull = number.length >= MAX_INPUT_LENGTH;
  const before = item.charAt(item.length - number.length - 1);
  // An exponent, numerator or denominator: integer digits only, and no ^ or breuk after it.
  const numberIsPart = before === '^' || before === '_' || before === '/';
  const inNumerator = before === '_';
  // A digit that may end a number: an open numerator still needs its denominator.
  const afterDigit = /\d$/.test(item) && !inNumerator;
  switch (key) {
    case ' ':
    case '+':
    case '×':
    case ':':
      return afterDigit ? key : '';
    case '-':
      // The operator after a number; otherwise the sign, at the item start or after '=' or an
      // operator. A '-' after a digit is the operator, so '5--3' is possible but '--' is not.
      return afterDigit || /(^|[+×:=]|\d-)$/.test(item) ? key : '';
    case '=':
      return afterDigit ? key : '';
    case '^':
      return afterDigit && !numberIsPart ? key : '';
    case '/':
      if (inNumerator) return number === '' ? '' : '/';
      return !numberIsPart && !number.includes(',') ? '_' : '';
    case ',':
      return !numberIsPart && !number.includes(',') && !numberFull ? key : '';
    default:
      // Only digits are appended; any other key is ignored until handled explicitly above.
      return /^\d$/.test(key) && !numberFull ? key : '';
  }
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
