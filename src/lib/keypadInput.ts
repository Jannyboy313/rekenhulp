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

export type FractionSlot = 'num' | 'den';

/** An open fraction template: numerator, denominator and the slot that has the cursor. */
export interface FractionTemplate {
  num: string;
  den: string;
  slot: FractionSlot;
}

/** Fraction typing state (spec §6): the sign, a whole part and an optional template. */
export interface FractionInput {
  negative: boolean;
  /** Digits and at most one comma. Next to a template it is the whole part of a mixed number. */
  whole: string;
  /** Null while no template is open. */
  template: FractionTemplate | null;
}

export const EMPTY_FRACTION_INPUT: FractionInput = { negative: false, whole: '', template: null };

/** Digits per numerator or denominator; far beyond any exercise. */
export const MAX_SLOT_LENGTH = 6;

/**
 * Fraction input with a template (spec §6). The breuk key ('/') opens a template, after a whole
 * number too (a mixed number), and inside a template it moves the cursor to the other slot.
 */
export function applyFractionKey(state: FractionInput, key: KeypadKey): FractionInput {
  const { negative, whole, template } = state;
  if (key === '-') return { ...state, negative: !negative };
  if (template === null) {
    if (key === '/') {
      return whole.includes(',') ? state : { ...state, template: { num: '', den: '', slot: 'num' } };
    }
    if (key === 'backspace' && whole === '') return { ...state, negative: false };
    // Without a template the whole part behaves like a number input.
    return { ...state, whole: applyKey(whole, key) };
  }
  const active = template[template.slot];
  switch (key) {
    case '/':
      return selectFractionSlot(state, template.slot === 'num' ? 'den' : 'num');
    case 'backspace':
      if (active !== '') return withActiveSlot(state, template, active.slice(0, -1));
      if (template.slot === 'den') return selectFractionSlot(state, 'num');
      return template.den === '' ? { ...state, template: null } : state;
    default:
      // Only digits go into a slot; the comma and the factorization keys are ignored.
      return /^\d$/.test(key) && active.length < MAX_SLOT_LENGTH
        ? withActiveSlot(state, template, active + key)
        : state;
  }
}

function withActiveSlot(
  state: FractionInput,
  template: FractionTemplate,
  digits: string,
): FractionInput {
  return {
    ...state,
    template: template.slot === 'num' ? { ...template, num: digits } : { ...template, den: digits },
  };
}

/** Moves the cursor to a slot of the open template: the breuk key, or a tap on the slot. */
export function selectFractionSlot(state: FractionInput, slot: FractionSlot): FractionInput {
  return state.template === null ? state : { ...state, template: { ...state.template, slot } };
}

/** '25/2', '12 1/2', '-12,5': the input string that parseAnswer('fraction', …) reads. */
export function fractionInputToString({ negative, whole, template }: FractionInput): string {
  const fraction = template === null ? '' : `${template.num}/${template.den}`;
  const separator = whole !== '' && template !== null ? ' ' : '';
  return (negative ? '-' : '') + whole + separator + fraction;
}
