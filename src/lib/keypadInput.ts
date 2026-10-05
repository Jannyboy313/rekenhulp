export type DigitKey = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';
export type KeypadKey = DigitKey | ',' | '-' | 'backspace';

/** Maximum number of digits and comma; the sign is not counted. */
export const MAX_INPUT_LENGTH = 12;

export function applyKey(value: string, key: KeypadKey): string {
  const length = value.replace('-', '').length;
  switch (key) {
    case 'backspace':
      return value.slice(0, -1);
    case '-':
      return value.startsWith('-') ? value.slice(1) : `-${value}`;
    case ',':
      return value.includes(',') || length >= MAX_INPUT_LENGTH ? value : `${value},`;
    default:
      return length >= MAX_INPUT_LENGTH ? value : value + key;
  }
}
