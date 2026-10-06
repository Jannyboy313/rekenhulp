import { INPUT_MODELS, type KeyDef } from './inputModels';
import type { KeypadKey } from './keypadInput';
import type { AnswerKind, Topic } from './types';

/** Kladblok cells in a 2×2 grid, in reading order (spec §3.6). */
export const NOTE_COUNT = 4;

/** Short screens show only the top row, so the keypad stays on screen (spec §3.6). */
export const SHORT_NOTE_COUNT = 2;

/** Viewports lower than 760 px; see the height estimate in the kladblok plan. */
export const SHORT_SCREEN_QUERY = '(max-height: 759px)';

export const EMPTY_NOTES: readonly string[] = Object.freeze(Array<string>(NOTE_COUNT).fill(''));

/** The kladblok holds numbers only and types them on the standard number keypad. */
export const NOTE_KEYS: readonly KeyDef[] = INPUT_MODELS.number.keys;

/** The cell after `index` for Volgende, or null for the answer field after the last one. */
export function nextNote(index: number, count: number): number | null {
  return index + 1 < count ? index + 1 : null;
}

/** New notes with one key typed into cell `index`, using the number reducer. */
export function applyNoteKey(
  notes: readonly string[],
  index: number,
  key: KeypadKey,
): readonly string[] {
  return notes.map((note, i) => (i === index ? INPUT_MODELS.number.apply(note, key) : note));
}

/** Tables are practised from memory, and Ja/Nee steps have no keypad (spec §3.6). */
export function showsScratchpad(topic: Topic, kind: AnswerKind): boolean {
  return topic !== 'tables' && kind !== 'boolean';
}

/** How KeypadAnswer hands the keypad to the kladblok. */
export interface ScratchpadInput {
  /** A cell is active: the keypad types there and OK is Volgende. */
  active: boolean;
  onkey(key: KeypadKey): void;
  /** Volgende: the next cell, or back to the answer field after the last one. */
  onnext(): void;
  /** The answer field was tapped while a cell was active. */
  onfocusanswer(): void;
}
