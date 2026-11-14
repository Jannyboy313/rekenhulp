import type { KeypadKey } from './keypadInput';

/** What a physical key does on the play screen: a keypad key, or OK (v4 spec §6). */
export type PhysicalAction = KeypadKey | 'ok';

/** The keypad keys a physical key can stand for, most specific first. */
const CANDIDATES: Readonly<Record<string, readonly string[]>> = {
  ',': [','],
  '.': [','],
  '-': ['-'],
  '+': ['+'],
  '*': ['×'],
  ':': [':'],
  // The breuk key where the keypad has one (so `3/4` is a fraction), otherwise divide.
  '/': ['/', ':'],
  '(': ['('],
  ')': [')'],
  '^': ['^'],
  '=': ['='],
  ' ': [' '],
  Backspace: ['backspace'],
  // The Roman X, or × on a keypad without it; no keypad has both.
  x: ['X', '×'],
  X: ['X', '×'],
};

/**
 * The action of a physical key (`KeyboardEvent.key`) given the keys of the keypad on screen, or
 * null when that keypad has no matching key. Letters are case-insensitive; Enter is OK.
 */
export function keyFor(
  key: string,
  available: readonly KeypadKey[],
  hasOk: boolean,
): PhysicalAction | null {
  if (key === 'Enter') return hasOk ? 'ok' : null;
  const candidates = CANDIDATES[key] ?? (key.length === 1 ? [key.toUpperCase()] : []);
  for (const candidate of candidates) {
    const match = available.find((option) => option === candidate);
    if (match !== undefined) return match;
  }
  return null;
}

/**
 * The button a physical key chooses on a step without a keypad: `n` and `j` for Nee and Ja (in
 * that order on screen), `1`–`4` for the options of a multiple-choice step.
 */
export function choiceFor(key: string, kind: 'boolean' | 'choice', count: number): number | null {
  if (kind === 'boolean') {
    const index = ['n', 'j'].indexOf(key.toLowerCase());
    return index === -1 ? null : index;
  }
  if (!/^[1-9]$/.test(key)) return null;
  const index = Number(key) - 1;
  return index < count ? index : null;
}
