import { evaluate } from './expr/evaluate';
import { parse } from './expr/parser';
import { caretPowers, formatRational, GROUP_SEPARATOR, groupDigits, MINUS } from './format';
import { MAX_INPUT_LENGTH, type DigitKey } from './keypadInput';
import { keyDefs, type KeyDef } from './keys';
import { equals, roundHalfUp, type Rational } from './rational';

/** The keys of the calculator (calculator spec §5.2); `clear` is the C of the display row. */
export type CalculatorKey =
  DigitKey | ',' | '+' | '-' | '×' | ':' | '^' | '(' | ')' | '=' | 'backspace' | 'clear';

/** A result as Neem over types it: ASCII minus, a comma, no thousands separators. */
export interface CalculatorResult {
  text: string;
  /** False when the text is a rounding of the value: the display then shows `≈`. */
  exact: boolean;
}

export interface CalculatorState {
  /** The expression as typed, in the notation of `lib/expr`. */
  input: string;
  /** Set by `=`; any other key than `=` removes it. */
  result: CalculatorResult | 'error' | null;
}

export const EMPTY_CALCULATOR: CalculatorState = { input: '', result: null };

export const MAX_CALCULATOR_INPUT = 40;
const MAX_SIGNIFICANT_DIGITS = 10;
/** A result must fit a number field, sign included (calculator spec §5.3). */
const MAX_RESULT_LENGTH = MAX_INPUT_LENGTH;

/** In reading order, 5 columns; `=` takes the place of OK in the last cell. */
export const CALCULATOR_KEYS: readonly KeyDef[] = keyDefs(
  ...(['7', '8', '9', ':', '('] as const),
  ...(['4', '5', '6', '×', ')'] as const),
  ...(['1', '2', '3', '-', '^'] as const),
  ...(['backspace', '0', ',', '+'] as const),
);
export const CALCULATOR_COLUMNS = 5;

/** The state after a key; the same object when the key does nothing (calculator spec §5.3). */
export function applyCalculatorKey(state: CalculatorState, key: CalculatorKey): CalculatorState {
  if (key === 'clear') return state === EMPTY_CALCULATOR ? state : EMPTY_CALCULATOR;
  const { input, result } = state;
  if (result === null) {
    if (key === '=') return evaluated(state);
    const next = typed(input, key);
    return next === input ? state : { input: next, result: null };
  }
  if (key === '=') return state;
  if (key === 'backspace') return { input, result: null };
  if (isOperator(key)) {
    if (result === 'error') return state;
    const first = result.text.startsWith('-') ? `(${result.text})` : result.text;
    return { input: first + key, result: null };
  }
  // A digit, the comma or '(' starts a new calculation; ')' cannot.
  const next = typed('', key);
  return next === '' ? state : { input: next, result: null };
}

/** Whether the key does anything in this state: a key that does not is drawn disabled. */
export function canPress(state: CalculatorState, key: CalculatorKey): boolean {
  return applyCalculatorKey(state, key) !== state;
}

type Operator = '+' | '-' | '×' | ':' | '^';

function isOperator(key: CalculatorKey): key is Operator {
  return key === '+' || key === '-' || key === '×' || key === ':' || key === '^';
}

/** The input after a typing key, unchanged when the key is not accepted there. */
function typed(input: string, key: Exclude<CalculatorKey, '=' | 'clear'>): string {
  if (key === 'backspace') return input.slice(0, -1);
  if (input.length >= MAX_CALCULATOR_INPUT) return input;
  // The number being typed, and whether it is an exponent (whole, and no power of it).
  const number = /[\d,]*$/.exec(input)?.[0] ?? '';
  const before = input.slice(0, input.length - number.length);
  const exponent = before.endsWith('^');
  const afterOperand = /[\d)]$/.test(input);
  // A minus sign is only written at the start and directly after '(' (main spec §7).
  const signPlace = input === '' || input.endsWith('(');
  const afterSign = before.endsWith('-') && (before.length === 1 || before.at(-2) === '(');
  const accepted = (() => {
    switch (key) {
      case ',':
        return !input.endsWith(')') && !exponent && !number.includes(',') && fits(number);
      case '+':
      case '×':
      case ':':
        return afterOperand;
      case '-':
        return afterOperand || signPlace;
      case '^':
        return afterOperand && !exponent;
      case '(':
        return number === '' && !input.endsWith(')') && !exponent && !afterSign;
      case ')':
        return afterOperand && openParentheses(input) > 0;
      default:
        return !input.endsWith(')') && fits(number);
    }
  })();
  return accepted ? input + key : input;
}

function fits(number: string): boolean {
  return number.length < MAX_INPUT_LENGTH;
}

function openParentheses(text: string): number {
  let open = 0;
  for (const char of text) {
    if (char === '(') open++;
    else if (char === ')') open--;
  }
  return open;
}

/** `=`: the state with its result, or the same state for an input that is not complete. */
function evaluated(state: CalculatorState): CalculatorState {
  // `,5` reads as `0,5`; lib/expr wants the zero.
  const expr = parse(state.input.replace(/(?<!\d),/g, '0,'));
  if (expr === null) return state;
  const value = evaluate(expr);
  return { input: state.input, result: value === null ? 'error' : formatResult(value) };
}

/**
 * A value as the calculator shows it (calculator spec §5.3): rounded half up to at most 10
 * significant digits and 12 characters. An error when even its whole part does not fit.
 */
export function formatResult(value: Rational): CalculatorResult | 'error' {
  // From the most decimals a value below 1 can show down to hundreds, the rounding a whole
  // number of 12 digits needs; the first that fits is the most precise.
  for (let decimals = MAX_SIGNIFICANT_DIGITS; decimals >= -2; decimals--) {
    const rounded = roundHalfUp(value, decimals);
    const text = formatRational(rounded).replaceAll(GROUP_SEPARATOR, '').replace(MINUS, '-');
    if (text.length <= MAX_RESULT_LENGTH && significantDigits(text) <= MAX_SIGNIFICANT_DIGITS) {
      return { text, exact: equals(rounded, value) };
    }
  }
  return 'error';
}

function significantDigits(text: string): number {
  return text.replace(/[-,]/g, '').replace(/^0+|0+$/g, '').length;
}

/** Typed text as shown: spaced operators, a typographic minus, superscripts, digit groups. */
function formatCalculation(raw: string): string {
  return caretPowers(raw)
    .replace(/(^|\()-/g, `$1${MINUS}`)
    .replace(/[-+×:]/g, (operator) => ` ${operator === '-' ? MINUS : operator} `)
    .replace(/(?<![\d,])\d+/g, groupDigits);
}

/** The display line: the calculation, then its result after `=` or `≈`. Empty shows `0`. */
export function displayText({ input, result }: CalculatorState): string {
  const calculation = input === '' ? '0' : formatCalculation(input);
  if (result === null) return calculation;
  if (result === 'error') return `${calculation} = Fout`;
  return `${calculation} ${result.exact ? '=' : '≈'} ${formatCalculation(result.text)}`;
}

/** What a screen reader hears after `=` (calculator spec §5.6); empty while typing. */
export function spokenResult({ result }: CalculatorState): string {
  if (result === null) return '';
  if (result === 'error') return 'Fout';
  return `is ${result.exact ? '' : 'ongeveer '}${formatCalculation(result.text)}`;
}

/** The text Neem over puts in the answer field, or null without a result. */
export function takeOverText({ result }: CalculatorState): string | null {
  return result === null || result === 'error' ? null : result.text;
}
