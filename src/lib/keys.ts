import type { KeypadKey } from './keypadInput';

export interface KeyDef {
  key: KeypadKey;
  label: string;
  ariaLabel?: string;
  /** Drawn instead of the label: the breuk key shows a small stacked fraction. */
  icon?: 'fraction';
}

const digit = <K extends KeypadKey>(key: K) => ({ key, label: key });

/**
 * Every keypad key with its label, defined once (spec §6). A keypad lists the keys it needs with
 * keyDefs; whether a key does anything is up to the reducer of that keypad.
 */
export const KEYS: { readonly [K in KeypadKey]: KeyDef & { key: K } } = {
  '0': digit('0'),
  '1': digit('1'),
  '2': digit('2'),
  '3': digit('3'),
  '4': digit('4'),
  '5': digit('5'),
  '6': digit('6'),
  '7': digit('7'),
  '8': digit('8'),
  '9': digit('9'),
  ',': { key: ',', label: ',', ariaLabel: 'komma' },
  '-': { key: '-', label: '−', ariaLabel: 'min' },
  '+': { key: '+', label: '+', ariaLabel: 'plus' },
  '×': { key: '×', label: '×', ariaLabel: 'keer' },
  ':': { key: ':', label: ':', ariaLabel: 'gedeeld door' },
  '^': { key: '^', label: '^', ariaLabel: 'tot de macht' },
  '(': { key: '(', label: '(', ariaLabel: 'haakje openen' },
  ')': { key: ')', label: ')', ariaLabel: 'haakje sluiten' },
  '/': { key: '/', label: 'breuk', icon: 'fraction' },
  '=': { key: '=', label: '=', ariaLabel: 'is' },
  ' ': { key: ' ', label: '␣', ariaLabel: 'spatie' },
  backspace: { key: 'backspace', label: '⌫', ariaLabel: 'wissen' },
};

/** The definitions of the given keys, in reading order. */
export function keyDefs(...keys: readonly KeypadKey[]): readonly KeyDef[] {
  return keys.map((key) => KEYS[key]);
}

/** Columns that OK spans, so that it fills the last row of the keypad. */
export function okSpan(keys: readonly KeyDef[], columns = 3): number {
  return columns - (keys.length % columns);
}
