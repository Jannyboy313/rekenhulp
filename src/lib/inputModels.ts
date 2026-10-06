import { formatFactorizationInput, formatInput } from './format';
import { applyFactorizationKey, applyKey, type DigitKey, type KeypadKey } from './keypadInput';
import { parseAnswer, parseFactorization } from './steps';
import type { AnswerKind } from './types';

export interface KeyDef {
  key: KeypadKey;
  label: string;
  ariaLabel?: string;
}

/** Everything that differs per answer kind on the keypad (spec §6). */
export interface InputModel {
  /** Keys in reading order on a 3-column grid; OK fills the rest of the last row. */
  keys: readonly KeyDef[];
  apply(value: string, key: KeypadKey): string;
  /** Null when the input can be submitted, otherwise the inline error. */
  validate(value: string): string | null;
  /** The raw input as shown while typing, in the feedback and in the results. */
  display(value: string): string;
}

/** Ja/Nee has no keypad: QuestionView shows two buttons instead. */
export type KeypadKind = Exclude<AnswerKind, 'boolean'>;

export const INVALID_NUMBER = 'Ongeldig getal';
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

function numericModel(kind: 'number' | 'fraction', keys: readonly KeyDef[]): InputModel {
  return {
    keys,
    apply: applyKey,
    validate: (value) => (parseAnswer(kind, value) === null ? INVALID_NUMBER : null),
    display: formatInput,
  };
}

export const INPUT_MODELS: Record<KeypadKind, InputModel> = {
  number: numericModel('number', NUMBER_KEYS),
  fraction: numericModel('fraction', [
    ...NUMBER_KEYS,
    { key: '/', label: '/', ariaLabel: 'breukstreep' },
  ]),
  factorization: {
    keys: [
      ...DIGIT_ROWS,
      { key: '×', label: '×', ariaLabel: 'keer' },
      digit('0'),
      { key: '^', label: '^', ariaLabel: 'tot de macht' },
      BACKSPACE,
    ],
    apply: applyFactorizationKey,
    validate: (value) => (parseFactorization(value) === null ? INVALID_FACTORIZATION : null),
    display: formatFactorizationInput,
  },
};

/** A given answer as it was shown while typing; Ja and Nee are shown as they are. */
export function displayAnswer(kind: AnswerKind, input: string): string {
  return kind === 'boolean' ? input : INPUT_MODELS[kind].display(input);
}

/** Columns that OK spans, so that it fills the last row of the 3-column keypad. */
export function okSpan(model: InputModel): number {
  return 3 - (model.keys.length % 3);
}
