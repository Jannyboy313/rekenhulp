import { describe, expect, it } from 'vitest';
import {
  applyCalculatorKey,
  CALCULATOR_KEYS,
  canPress,
  displayText,
  EMPTY_CALCULATOR,
  formatResult,
  MAX_CALCULATOR_INPUT,
  spokenResult,
  takeOverText,
  type CalculatorKey,
  type CalculatorState,
} from './calculator';
import { GROUP_SEPARATOR, MINUS } from './format';
import { powerOfTen, rational, type Rational } from './rational';

const ALL_KEYS: readonly CalculatorKey[] = [
  ...(CALCULATOR_KEYS.map((def) => def.key) as CalculatorKey[]),
  '=',
  'clear',
];

/** Types a sequence: one character per key, `<` for backspace and `C` for clear. */
function type(keys: string, start: CalculatorState = EMPTY_CALCULATOR): CalculatorState {
  return [...keys].reduce(
    (state, char) =>
      applyCalculatorKey(
        state,
        char === '<' ? 'backspace' : char === 'C' ? 'clear' : (char as CalculatorKey),
      ),
    start,
  );
}

const r = (num: bigint, den = 1n): Rational => rational(num, den);

describe('the calculator keypad', () => {
  it('has 19 keys, so = fills the last cell of 5 columns', () => {
    expect(CALCULATOR_KEYS).toHaveLength(19);
    expect(CALCULATOR_KEYS.map((def) => def.key).join(' ')).toBe(
      '7 8 9 : ( 4 5 6 × ) 1 2 3 - ^ backspace 0 , +',
    );
  });
});

describe('typing', () => {
  it.each([
    ['2)', '2'],
    ['(2)3', '(2)'],
    ['1234567890123', '123456789012'],
    ['12345678901,5', '12345678901,'],
    [',5', ',5'],
    ['1,2,', '1,2'],
    ['2^1,', '2^1'],
    ['2^,', '2^'],
    ['+', ''],
    ['×', ''],
    ['2+×', '2+'],
    ['1,+', '1,'],
    ['-2', '-2'],
    ['(-2', '(-2'],
    ['3×-', '3×'],
    ['--', '-'],
    ['2-3', '2-3'],
    ['2^3^', '2^3'],
    ['(2^3)^2', '(2^3)^2'],
    ['2^(', '2^'],
    ['2(', '2'],
    ['((', '(('],
    ['2×(', '2×('],
    ['-(', '-'],
    ['(2))', '(2)'],
    ['(2),', '(2)'],
    ['12<', '1'],
    ['<', ''],
  ])('%s gives %s', (keys, input) => {
    expect(type(keys)).toEqual({ input, result: null });
  });

  it('empties the calculation with C', () => {
    expect(type('12C')).toEqual(EMPTY_CALCULATOR);
  });

  it(`holds at most ${MAX_CALCULATOR_INPUT} characters`, () => {
    const state = type('1+'.repeat(25));
    expect(state.input).toBe('1+'.repeat(20));
    expect(type('<', state).input).toHaveLength(39);
  });

  it.each(['(2', '2+', '', '1,', '2^', '-'])('does not evaluate the incomplete %s', (keys) => {
    const state = type(keys);
    expect(type('=', state)).toBe(state);
  });
});

describe('evaluating', () => {
  it.each([
    ['2+3×4', '14', true],
    ['12:4×3', '9', true],
    ['2×3^2', '18', true],
    ['3,14×6,5^2', '132,665', true],
    ['1:8', '0,125', true],
    [',5', '0,5', true],
    ['(,5+,5)×3', '3', true],
    ['2-5', '-3', true],
    ['3×(-2)', '-6', true],
    ['4:3', '1,333333333', false],
    ['2:3', '0,6666666667', false],
    ['(-2):3', '-0,666666667', false],
    ['1:3000', '0,0003333333', false],
    ['4:3×3,14×6^3', '904,32', true],
  ])('%s = %s', (keys, text, exact) => {
    expect(type(`${keys}=`)).toEqual({ input: keys, result: { text, exact } });
  });

  it.each(['5:0', '10^10×100', '2^11', '2^99'])('gives an error for %s', (keys) => {
    expect(type(`${keys}=`).result).toBe('error');
  });
});

describe('formatResult', () => {
  it.each<[Rational, string, boolean]>([
    [r(132665n, 1000n), '132,665', true],
    [r(1n, 8n), '0,125', true],
    [r(4n, 3n), '1,333333333', false],
    [r(2n, 3n), '0,6666666667', false],
    [r(-2n, 3n), '-0,666666667', false],
    [r(1n, 3000n), '0,0003333333', false],
    [powerOfTen(-13), '0', false],
    [r(0n), '0', true],
    [r(123456789012n), '123456789000', false],
    [r(199999999999n, 2n), '100000000000', false],
    [r(-9999999999n), '-9999999999', true],
    [r(100000000000n), '100000000000', true],
  ])('%o as %s', (value, text, exact) => {
    expect(formatResult(value)).toEqual({ text, exact });
  });

  it.each<[string, Rational]>([
    ['10^12', powerOfTen(12)],
    ['a carry to 10^12', r(9999999999999n, 10n)],
    ['-10^11', r(-100000000000n)],
    ['a carry to -10^11', r(-99999999999n)],
  ])('gives an error for %s', (_name, value) => {
    expect(formatResult(value)).toBe('error');
  });
});

describe('with a result', () => {
  const third = type('4:3=');
  const negative = type('2-5=');

  it.each<[string, CalculatorState, string]>([
    ['7', third, '7'],
    [',', third, ','],
    ['(', third, '('],
    ['×', third, '1,333333333×'],
    ['+', third, '1,333333333+'],
    ['-', third, '1,333333333-'],
    [':', third, '1,333333333:'],
    ['^', third, '1,333333333^'],
    ['×', negative, '(-3)×'],
    ['<', third, '4:3'],
  ])('%s continues', (key, state, input) => {
    expect(type(key, state)).toEqual({ input, result: null });
  });

  it('empties with C and ignores =', () => {
    expect(type('C', third)).toEqual(EMPTY_CALCULATOR);
    expect(type('=', third)).toBe(third);
  });

  it('continues with the digits on the display', () => {
    expect(type('×3=', third).result).toEqual({ text: '3,999999999', exact: true });
  });
});

describe('after an error', () => {
  const error = type('5:0=');

  it.each(['+', '-', '×', ':', '^', '=', ')'] as const)('ignores %s', (key) => {
    expect(applyCalculatorKey(error, key)).toBe(error);
  });

  it('starts anew, goes back or empties', () => {
    expect(type('7', error)).toEqual({ input: '7', result: null });
    expect(type(',', error)).toEqual({ input: ',', result: null });
    expect(type('(', error)).toEqual({ input: '(', result: null });
    expect(type('<', error)).toEqual({ input: '5:0', result: null });
    expect(type('C', error)).toEqual(EMPTY_CALCULATOR);
  });
});

describe('canPress', () => {
  const states = [
    '',
    '2',
    '2+',
    '(2',
    '(2)',
    '2^',
    '2^3',
    '1,',
    '-',
    '4:3=',
    '2-5=',
    '5:0=',
    '1+'.repeat(20),
  ];

  it.each(states)('agrees with the reducer in state "%s"', (keys) => {
    const state = type(keys);
    for (const key of ALL_KEYS) {
      expect(canPress(state, key), key).toBe(applyCalculatorKey(state, key) !== state);
    }
  });

  it('refuses the keys that do nothing', () => {
    expect(canPress(EMPTY_CALCULATOR, '=')).toBe(false);
    expect(canPress(EMPTY_CALCULATOR, 'backspace')).toBe(false);
    expect(canPress(EMPTY_CALCULATOR, 'clear')).toBe(false);
    expect(canPress(EMPTY_CALCULATOR, '7')).toBe(true);
    expect(canPress(type('2+3'), '=')).toBe(true);
  });
});

describe('displayText', () => {
  it.each([
    ['', '0'],
    ['3,14×6,5^2', '3,14 × 6,5²'],
    ['3,14×6,5^2=', '3,14 × 6,5² = 132,665'],
    ['4:3=', '4 : 3 ≈ 1,333333333'],
    ['5:0=', '5 : 0 = Fout'],
    ['2-5=', `2 ${MINUS} 5 = ${MINUS}3`],
    ['(-2)×3', `(${MINUS}2) × 3`],
    ['-2+3', `${MINUS}2 + 3`],
    ['2^', '2^'],
    ['12345×10=', `12${GROUP_SEPARATOR}345 × 10 = 123${GROUP_SEPARATOR}450`],
    ['1,23456', '1,23456'],
    [',12345', ',12345'],
  ])('%s shows %s', (keys, text) => {
    expect(displayText(type(keys))).toBe(text);
  });
});

describe('spokenResult and takeOverText', () => {
  it.each([
    ['3,14×6,5^2=', 'is 132,665', '132,665'],
    ['4:3=', 'is ongeveer 1,333333333', '1,333333333'],
    ['2-5=', `is ${MINUS}3`, '-3'],
    ['5:0=', 'Fout', null],
    ['2+3', '', null],
    ['', '', null],
  ])('%s', (keys, spoken, taken) => {
    const state = type(keys);
    expect(spokenResult(state)).toBe(spoken);
    expect(takeOverText(state)).toBe(taken);
  });
});
