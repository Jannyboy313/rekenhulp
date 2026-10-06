export type DigitKey = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';
export type KeypadKey = DigitKey | ',' | '-' | '/' | '×' | '^' | 'backspace';

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
      // Only digits are appended; any other key is ignored until handled explicitly above.
      return /^\d$/.test(key) && !full ? value + key : value;
  }
}

/** The longest useful input is 2×2×2×2×2×2×2 (128, 13 characters); 20 leaves room. */
export const MAX_FACTORIZATION_LENGTH = 20;

/**
 * Factorization input (spec §6): integers joined by ×, each with an optional exponent.
 * × only directly after a digit; ^ only directly after a base, so never after an exponent.
 */
export function applyFactorizationKey(value: string, key: KeypadKey): string {
  if (key === 'backspace') return value.slice(0, -1);
  if (value.length >= MAX_FACTORIZATION_LENGTH) return value;
  const endsWithDigit = /\d$/.test(value);
  switch (key) {
    case '×':
      return endsWithDigit ? `${value}×` : value;
    case '^': {
      const currentFactor = value.slice(value.lastIndexOf('×') + 1);
      return endsWithDigit && !currentFactor.includes('^') ? `${value}^` : value;
    }
    default:
      // Only digits are appended; any other key is ignored until handled explicitly above.
      return /^\d$/.test(key) ? value + key : value;
  }
}
