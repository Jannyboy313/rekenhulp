import { parse } from './expr/parser';
import { formatExpressionInput, formatFactorizationInput, formatInput } from './format';
import {
  applyExpressionKey,
  applyFactorizationKey,
  applyFractionKey,
  applyKey,
  EMPTY_FRACTION_INPUT,
  fractionInputToString,
  selectFractionSlot,
  type DigitKey,
  type FractionInput,
  type FractionSlot,
  type KeypadKey,
} from './keypadInput';
import { parseAnswer, parseFactorization } from './steps';
import type { AnswerKind } from './types';

export interface KeyDef {
  key: KeypadKey;
  label: string;
  ariaLabel?: string;
  /** Drawn instead of the label: the breuk key shows a small stacked fraction. */
  icon?: 'fraction';
  /** Grid columns the key takes; the kladblok's spatie takes OK's place. */
  span?: number;
}

/**
 * The answer field while typing: plain text, or an open fraction template with its cursor.
 * A mixed template follows a whole number, as in `12 1/2`.
 */
export type FieldSegment =
  | { type: 'text'; text: string }
  | { type: 'template'; num: string; den: string; active: FractionSlot; mixed: boolean };

/** Everything that differs per answer kind on the keypad (spec §6). S is the typing state. */
export interface InputModel<S> {
  /** Keys in reading order; OK fills the rest of the last row. */
  keys: readonly KeyDef[];
  /** Keypad columns; 3 when absent. Only the expression keypad has 4 (spec §6). */
  columns?: number;
  /** The state before the first key press. */
  empty: S;
  apply(state: S, key: KeypadKey): S;
  /** Whether OK is enabled. */
  canSubmit(state: S): boolean;
  /** The submitted input: what is validated, checked and stored in the results. */
  toInput(state: S): string;
  /** Null when the input can be submitted, otherwise the inline error. */
  validate(input: string): string | null;
  /** A submitted input as shown in the feedback and in the results. */
  display(input: string): string;
  /** The answer field while typing; no segments means the placeholder is shown. */
  view(state: S): FieldSegment[];
  /** Moves the cursor to a tapped slot; only kinds with a fraction template have it. */
  select?(state: S, slot: FractionSlot): S;
}

/** Ja/Nee has no keypad: QuestionView shows two buttons instead. */
export type KeypadKind = Exclude<AnswerKind, 'boolean'>;

/** Typing state per keypad kind. A new keypad kind must add its entry here. */
interface KeypadStates {
  number: string;
  fraction: FractionInput;
  expression: string;
  factorization: string;
}

export const INVALID_NUMBER = 'Ongeldig getal';
export const INVALID_EXPRESSION = 'Ongeldige som';
export const INVALID_FACTORIZATION = 'Ongeldige ontbinding';

const digit = (key: DigitKey): KeyDef => ({ key, label: key });
const DIGIT_ROWS: readonly KeyDef[] = (['7', '8', '9', '4', '5', '6', '1', '2', '3'] as const).map(
  digit,
);
const BACKSPACE: KeyDef = { key: 'backspace', label: '⌫', ariaLabel: 'wissen' };

const NUMBER_KEYS: readonly KeyDef[] = [
  ...DIGIT_ROWS,
  { key: '-', label: '−', ariaLabel: 'min' },
  digit('0'),
  { key: ',', label: ',', ariaLabel: 'komma' },
  BACKSPACE,
];

/**
 * Digits in the usual three columns, operators in a fourth (spec §6). Rewrites need no comma,
 * power or negative number, so '-' is only the operator.
 */
const EXPRESSION_KEYS: readonly KeyDef[] = [
  digit('7'),
  digit('8'),
  digit('9'),
  { key: '+', label: '+', ariaLabel: 'plus' },
  digit('4'),
  digit('5'),
  digit('6'),
  { key: '-', label: '−', ariaLabel: 'min' },
  digit('1'),
  digit('2'),
  digit('3'),
  { key: '×', label: '×', ariaLabel: 'keer' },
  { key: '(', label: '(', ariaLabel: 'haakje openen' },
  digit('0'),
  { key: ')', label: ')', ariaLabel: 'haakje sluiten' },
  { key: ':', label: ':', ariaLabel: 'gedeeld door' },
  BACKSPACE,
];

/** A model whose typing state is the input string itself. */
function textModel(
  keys: readonly KeyDef[],
  apply: (value: string, key: KeypadKey) => string,
  validate: (input: string) => string | null,
  display: (input: string) => string,
): InputModel<string> {
  return {
    keys,
    empty: '',
    apply,
    canSubmit: (value) => value !== '',
    toInput: (value) => value,
    validate,
    display,
    view: (value) => (value === '' ? [] : [{ type: 'text', text: display(value) }]),
  };
}

function validateNumber(kind: 'number' | 'fraction'): (input: string) => string | null {
  return (input) => (parseAnswer(kind, input) === null ? INVALID_NUMBER : null);
}

function viewFraction({ negative, whole, template }: FractionInput): FieldSegment[] {
  const text = formatInput((negative ? '-' : '') + whole);
  const segments: FieldSegment[] = text === '' ? [] : [{ type: 'text', text }];
  if (template !== null) {
    segments.push({
      type: 'template',
      num: template.num,
      den: template.den,
      active: template.slot,
      mixed: whole !== '',
    });
  }
  return segments;
}

export const INPUT_MODELS: { readonly [K in KeypadKind]: InputModel<KeypadStates[K]> } = {
  number: textModel(NUMBER_KEYS, applyKey, validateNumber('number'), formatInput),
  fraction: {
    keys: [...NUMBER_KEYS, { key: '/', label: 'breuk', icon: 'fraction' }],
    empty: EMPTY_FRACTION_INPUT,
    apply: applyFractionKey,
    // At least one digit, so an empty template cannot be submitted (spec §6).
    canSubmit: (state) => /\d/.test(fractionInputToString(state)),
    toInput: fractionInputToString,
    validate: validateNumber('fraction'),
    display: formatInput,
    view: viewFraction,
    select: selectFractionSlot,
  },
  expression: {
    ...textModel(
      EXPRESSION_KEYS,
      applyExpressionKey,
      (input) => (parse(input) === null ? INVALID_EXPRESSION : null),
      formatExpressionInput,
    ),
    columns: 4,
  },
  factorization: textModel(
    [
      ...DIGIT_ROWS,
      { key: '×', label: '×', ariaLabel: 'keer' },
      digit('0'),
      { key: '^', label: '^', ariaLabel: 'tot de macht' },
      BACKSPACE,
    ],
    applyFactorizationKey,
    (input) => (parseFactorization(input) === null ? INVALID_FACTORIZATION : null),
    formatFactorizationInput,
  ),
};

/** A given answer as it was shown while typing; Ja and Nee are shown as they are. */
export function displayAnswer(kind: AnswerKind, input: string): string {
  return kind === 'boolean' ? input : INPUT_MODELS[kind].display(input);
}

/** Columns that OK spans, so that it fills the last row of the keypad. */
export function okSpan(keys: readonly KeyDef[], columns = 3): number {
  return columns - (keys.length % columns);
}
