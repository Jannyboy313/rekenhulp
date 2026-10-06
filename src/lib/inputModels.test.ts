import { describe, expect, it } from 'vitest';
import {
  displayAnswer,
  INPUT_MODELS,
  INVALID_FACTORIZATION,
  INVALID_NUMBER,
  okSpan,
  type KeypadKind,
} from './inputModels';

function labels(kind: KeypadKind): string[] {
  return INPUT_MODELS[kind].keys.map(({ label }) => label);
}

function ariaLabels(kind: KeypadKind): string[] {
  return INPUT_MODELS[kind].keys.map(({ label, ariaLabel }) => ariaLabel ?? label);
}

const DIGIT_ROWS = ['7', '8', '9', '4', '5', '6', '1', '2', '3'];

describe('INPUT_MODELS keys', () => {
  it('lays out the number keypad', () => {
    expect(labels('number')).toEqual([...DIGIT_ROWS, '−', '0', ',', '⌫']);
    expect(ariaLabels('number').slice(-4)).toEqual(['min', '0', 'komma', 'wissen']);
  });

  it('adds the slash for fractions', () => {
    expect(labels('fraction')).toEqual([...DIGIT_ROWS, '−', '0', ',', '⌫', '/']);
    expect(ariaLabels('fraction').at(-1)).toBe('breukstreep');
  });

  it('offers × and ^ instead of minus and comma for factorizations', () => {
    expect(labels('factorization')).toEqual([...DIGIT_ROWS, '×', '0', '^', '⌫']);
    expect(ariaLabels('factorization').slice(-4)).toEqual(['keer', '0', 'tot de macht', 'wissen']);
  });

  it('lets OK fill the last row of the 3-column grid', () => {
    expect(okSpan(INPUT_MODELS.number)).toBe(2);
    expect(okSpan(INPUT_MODELS.fraction)).toBe(1);
    expect(okSpan(INPUT_MODELS.factorization)).toBe(2);
  });
});

describe('INPUT_MODELS behaviour', () => {
  it('uses the reducer of its kind', () => {
    expect(INPUT_MODELS.number.apply('2', '×')).toBe('2');
    expect(INPUT_MODELS.fraction.apply('2', '/')).toBe('2/');
    expect(INPUT_MODELS.factorization.apply('2', '^')).toBe('2^');
    expect(INPUT_MODELS.factorization.apply('2', ',')).toBe('2');
  });

  it.each([
    ['number', '12', null],
    ['number', '-12,5', null],
    ['number', '-', INVALID_NUMBER],
    ['number', ',', INVALID_NUMBER],
    ['fraction', '25/2', null],
    ['fraction', '12,5', null],
    ['fraction', '25/', INVALID_NUMBER],
    ['fraction', '25/0', INVALID_NUMBER],
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

  it('pretty-prints the input', () => {
    expect(INPUT_MODELS.number.display('-12,5')).toBe('−12,5');
    expect(INPUT_MODELS.fraction.display('-3/4')).toBe('−3/4');
    expect(INPUT_MODELS.factorization.display('2^2×3')).toBe('2² × 3');
  });
});

describe('displayAnswer', () => {
  it('shows a given answer like the input field did', () => {
    expect(displayAnswer('number', '-5')).toBe('−5');
    expect(displayAnswer('factorization', '2^2×21')).toBe('2² × 21');
    expect(displayAnswer('boolean', 'Ja')).toBe('Ja');
  });
});
