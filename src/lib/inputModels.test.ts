import { describe, expect, it } from 'vitest';
import {
  displayAnswer,
  INPUT_MODELS,
  INVALID_FACTORIZATION,
  INVALID_NUMBER,
  okSpan,
  type KeypadKind,
} from './inputModels';
import type { FractionInput, KeypadKey } from './keypadInput';

function labels(kind: KeypadKind): string[] {
  return INPUT_MODELS[kind].keys.map(({ label }) => label);
}

function ariaLabels(kind: KeypadKind): string[] {
  return INPUT_MODELS[kind].keys.map(({ label, ariaLabel }) => ariaLabel ?? label);
}

const DIGIT_ROWS = ['7', '8', '9', '4', '5', '6', '1', '2', '3'];
const fraction = INPUT_MODELS.fraction;

function typeFraction(keys: KeypadKey[]): FractionInput {
  return keys.reduce((state, key) => fraction.apply(state, key), fraction.empty);
}

describe('INPUT_MODELS keys', () => {
  it('lays out the number keypad', () => {
    expect(labels('number')).toEqual([...DIGIT_ROWS, '−', '0', ',', '⌫']);
    expect(ariaLabels('number').slice(-4)).toEqual(['min', '0', 'komma', 'wissen']);
  });

  it('adds the breuk key with a fraction icon for fractions', () => {
    expect(labels('fraction')).toEqual([...DIGIT_ROWS, '−', '0', ',', '⌫', 'breuk']);
    expect(fraction.keys.at(-1)).toEqual({ key: '/', label: 'breuk', icon: 'fraction' });
  });

  it('offers × and ^ instead of minus and comma for factorizations', () => {
    expect(labels('factorization')).toEqual([...DIGIT_ROWS, '×', '0', '^', '⌫']);
    expect(ariaLabels('factorization').slice(-4)).toEqual(['keer', '0', 'tot de macht', 'wissen']);
  });

  it('lets OK fill the last row of the 3-column grid', () => {
    expect(okSpan(INPUT_MODELS.number.keys)).toBe(2);
    expect(okSpan(INPUT_MODELS.fraction.keys)).toBe(1);
    expect(okSpan(INPUT_MODELS.factorization.keys)).toBe(2);
  });
});

describe('text input models', () => {
  it('use the input string as their state', () => {
    expect(INPUT_MODELS.number.empty).toBe('');
    expect(INPUT_MODELS.number.apply('2', '×')).toBe('2');
    expect(INPUT_MODELS.number.apply('2', '/')).toBe('2');
    expect(INPUT_MODELS.factorization.apply('2', '^')).toBe('2^');
    expect(INPUT_MODELS.factorization.apply('2', ',')).toBe('2');
    expect(INPUT_MODELS.number.toInput('-12,5')).toBe('-12,5');
  });

  it('enable OK for any non-empty input', () => {
    expect(INPUT_MODELS.number.canSubmit('')).toBe(false);
    expect(INPUT_MODELS.number.canSubmit('-')).toBe(true);
    expect(INPUT_MODELS.factorization.canSubmit('2×')).toBe(true);
  });

  it('show the pretty-printed input, or nothing for the placeholder', () => {
    expect(INPUT_MODELS.number.view('')).toEqual([]);
    expect(INPUT_MODELS.number.view('-12,5')).toEqual([{ type: 'text', text: '−12,5' }]);
    expect(INPUT_MODELS.factorization.view('2^2×3')).toEqual([{ type: 'text', text: '2² × 3' }]);
    expect(INPUT_MODELS.number.select).toBeUndefined();
  });
});

describe('fraction input model', () => {
  it('enables OK only once a digit has been typed', () => {
    expect(fraction.canSubmit(fraction.empty)).toBe(false);
    expect(fraction.canSubmit(typeFraction(['/']))).toBe(false);
    expect(fraction.canSubmit(typeFraction(['-']))).toBe(false);
    expect(fraction.canSubmit(typeFraction(['/', '1']))).toBe(true);
  });

  it('submits fractions and mixed numbers as strings', () => {
    expect(fraction.toInput(typeFraction(['/', '2', '5', '/', '2']))).toBe('25/2');
    expect(fraction.toInput(typeFraction(['1', '2', '/', '1', '/', '2']))).toBe('12 1/2');
  });

  it('shows the whole part as text and the template with its cursor', () => {
    expect(fraction.view(fraction.empty)).toEqual([]);
    expect(fraction.view(typeFraction(['-', '1', '2', '/', '1']))).toEqual([
      { type: 'text', text: '−12' },
      { type: 'template', num: '1', den: '', active: 'num', mixed: true },
    ]);
    expect(fraction.view(typeFraction(['/']))).toEqual([
      { type: 'template', num: '', den: '', active: 'num', mixed: false },
    ]);
  });

  it('moves the cursor to a tapped slot', () => {
    expect(fraction.select?.(typeFraction(['/']), 'den').template?.slot).toBe('den');
  });
});

describe('INPUT_MODELS validation and display', () => {
  it.each([
    ['number', '12', null],
    ['number', '-12,5', null],
    ['number', '-', INVALID_NUMBER],
    ['number', ',', INVALID_NUMBER],
    ['fraction', '25/2', null],
    ['fraction', '12 1/2', null],
    ['fraction', '12 5/3', null],
    ['fraction', '12,5', null],
    ['fraction', '25/', INVALID_NUMBER],
    ['fraction', '25/0', INVALID_NUMBER],
    ['fraction', '12 /2', INVALID_NUMBER],
    ['fraction', '/', INVALID_NUMBER],
    ['factorization', '2^2×3', null],
    ['factorization', '84', null],
    ['factorization', '2×', INVALID_FACTORIZATION],
    ['factorization', '2^', INVALID_FACTORIZATION],
  ] as const)('validates %s input %j as %j', (kind, value, expected) => {
    expect(INPUT_MODELS[kind].validate(value)).toBe(expected);
  });

  it('uses the Dutch messages from the spec', () => {
    expect(INVALID_NUMBER).toBe('Ongeldig getal');
    expect(INVALID_FACTORIZATION).toBe('Ongeldige ontbinding');
  });

  it('pretty-prints a submitted input', () => {
    expect(INPUT_MODELS.number.display('-12,5')).toBe('−12,5');
    expect(INPUT_MODELS.fraction.display('-12 1/2')).toBe('−12 1/2');
    expect(INPUT_MODELS.factorization.display('2^2×3')).toBe('2² × 3');
  });
});

describe('displayAnswer', () => {
  it('shows a given answer like the input field did', () => {
    expect(displayAnswer('number', '-5')).toBe('−5');
    expect(displayAnswer('fraction', '-3/4')).toBe('−3/4');
    expect(displayAnswer('factorization', '2^2×21')).toBe('2² × 21');
    expect(displayAnswer('boolean', 'Ja')).toBe('Ja');
  });
});
