export type DigitKey = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';
export type KeypadKey = DigitKey | ',' | '-' | '/' | 'backspace';

/** Maximum number of digits, comma and slash; the sign is not counted. */
export const MAX_INPUT_LENGTH = 12;

export function applyKey(value: string, key: KeypadKey): string {
  const length = value.replace('-', '').length;
  const full = length >= MAX_INPUT_LENGTH;
  switch (key) {
    case 'backspace':
      return value.slice(0, -1);
    case '-':
      return value.startsWith('-') ? value.slice(1) : `-${value}`;
    case ',':
      return value.includes(',') || value.includes('/') || full ? value : `${value},`;
    case '/':
      // A fraction is digits/digits: one slash, after a digit, never with a comma (spec §6).
      return value.includes('/') || value.includes(',') || !/\d$/.test(value) || full
        ? value
        : `${value}/`;
    default:
      return full ? value : value + key;
  }
}
