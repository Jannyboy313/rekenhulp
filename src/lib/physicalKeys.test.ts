import { describe, expect, it } from 'vitest';
import { INPUT_MODELS } from './inputModels';
import type { KeypadKey } from './keypadInput';
import type { CalculatorKey } from './calculator';
import { calculatorKeyFor, choiceFor, keyFor, type PhysicalAction } from './physicalKeys';
import { NOTE_KEYS } from './scratchpad';

type Pad = keyof typeof INPUT_MODELS | 'kladblok';

/** The keys of a keypad on screen; only the kladblok keypad has no OK (spec §3.6). */
function onPad(key: string, pad: Pad): PhysicalAction | null {
  const defs = pad === 'kladblok' ? NOTE_KEYS : INPUT_MODELS[pad].keys;
  return keyFor(
    key,
    defs.map((def) => def.key),
    pad !== 'kladblok',
  );
}

describe('keyFor (v4 spec §6)', () => {
  it.each<[string, Pad, KeypadKey | 'ok' | null]>([
    ['5', 'number', '5'],
    [',', 'number', ','],
    ['.', 'number', ','],
    ['-', 'number', '-'],
    ['c', 'number', null],
    ['c', 'baseDigits', 'C'],
    ['C', 'baseDigits', 'C'],
    ['g', 'baseDigits', null],
    ['x', 'roman', 'X'],
    ['m', 'roman', 'M'],
    ['x', 'expression', '×'],
    ['X', 'expression', '×'],
    ['*', 'expression', '×'],
    ['*', 'number', null],
    ['/', 'fraction', '/'],
    ['/', 'expression', ':'],
    ['/', 'kladblok', '/'],
    [':', 'kladblok', ':'],
    [':', 'fraction', null],
    ['(', 'expression', '('],
    [')', 'expression', ')'],
    ['^', 'factorization', '^'],
    ['=', 'kladblok', '='],
    [' ', 'kladblok', ' '],
    [' ', 'number', null],
    ['Backspace', 'number', 'backspace'],
    ['Backspace', 'kladblok', 'backspace'],
    ['Enter', 'number', 'ok'],
    ['Enter', 'kladblok', null],
    ['Tab', 'number', null],
    ['Dead', 'number', null],
    ['Escape', 'number', null],
  ])('%j on the %s keypad gives %j', (key, pad, expected) => {
    expect(onPad(key, pad)).toBe(expected);
  });
});

describe('choiceFor (v4 spec §6)', () => {
  it.each<[string, 'boolean' | 'choice', number | null]>([
    ['n', 'boolean', 0],
    ['N', 'boolean', 0],
    ['j', 'boolean', 1],
    ['1', 'boolean', null],
    ['1', 'choice', 0],
    ['4', 'choice', 3],
    ['5', 'choice', null],
    ['0', 'choice', null],
    ['j', 'choice', null],
  ])('%j on a %s step gives %j', (key, kind, expected) => {
    expect(choiceFor(key, kind, kind === 'boolean' ? 2 : 4)).toBe(expected);
  });
});

describe('calculatorKeyFor (calculator spec §5.5)', () => {
  it.each<[string, CalculatorKey | null]>([
    ['0', '0'],
    ['9', '9'],
    [',', ','],
    ['.', ','],
    ['+', '+'],
    ['-', '-'],
    ['*', '×'],
    ['x', '×'],
    ['X', '×'],
    [':', ':'],
    ['/', ':'],
    ['(', '('],
    [')', ')'],
    ['^', '^'],
    ['Backspace', 'backspace'],
    ['Enter', '='],
    ['=', '='],
    ['Delete', 'clear'],
    ['a', null],
    ['c', null],
    ['Escape', null],
    ['F1', null],
    [' ', null],
  ])('%s is %s', (key, expected) => {
    expect(calculatorKeyFor(key)).toBe(expected);
  });
});
