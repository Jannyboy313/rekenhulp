import { describe, expect, it } from 'vitest';
import {
  applyFactorizationKey,
  applyFractionKey,
  applyKey,
  applyExpressionKey,
  applyScientificKey,
  EMPTY_FRACTION_INPUT,
  endsWithOperand,
  MAX_EXPRESSION_LENGTH,
  fractionInputToString,
  MAX_FACTORIZATION_LENGTH,
  MAX_INPUT_LENGTH,
  MAX_SCIENTIFIC_LENGTH,
  MAX_SLOT_LENGTH,
  openParentheses,
  selectFractionSlot,
  type FractionInput,
  type KeypadKey,
} from './keypadInput';

function type(keys: KeypadKey[], start = ''): string {
  return keys.reduce(applyKey, start);
}

describe('applyKey', () => {
  it('appends digits', () => {
    expect(type(['1', '2'])).toBe('12');
  });

  it('allows a single decimal comma', () => {
    expect(type(['1', ',', '5', ','])).toBe('1,5');
    expect(type([','])).toBe(',');
  });

  it('toggles a leading minus regardless of cursor position', () => {
    expect(type(['1', '2', '-'])).toBe('-12');
    expect(type(['1', '2', '-', '-'])).toBe('12');
    expect(type(['-', '5'])).toBe('-5');
  });

  it('removes the last character on backspace', () => {
    expect(type(['1', '2', 'backspace'])).toBe('1');
    expect(type(['backspace'])).toBe('');
    expect(type(['-', 'backspace'])).toBe('');
  });

  it('limits the length of digits and comma', () => {
    const full = '9'.repeat(MAX_INPUT_LENGTH);
    expect(applyKey(full, '1')).toBe(full);
    expect(applyKey(full, ',')).toBe(full);
    expect(applyKey(full, '-')).toBe(`-${full}`);
  });

  it('ignores the slash and the factorization keys', () => {
    expect(type(['2', '/', '×', '^'])).toBe('2');
  });
});

describe('applyFactorizationKey', () => {
  function typeFactors(keys: KeypadKey[], start = ''): string {
    return keys.reduce(applyFactorizationKey, start);
  }

  it('builds a factorization from digits, × and ^', () => {
    expect(typeFactors(['2', '^', '2', '×', '3', '×', '7'])).toBe('2^2×3×7');
    expect(typeFactors(['1', '3', '×', '1', '3'])).toBe('13×13');
  });

  it('allows × only directly after a digit', () => {
    expect(typeFactors(['×'])).toBe('');
    expect(typeFactors(['2', '×', '×'])).toBe('2×');
    expect(typeFactors(['2', '^', '×'])).toBe('2^');
  });

  it('allows ^ only directly after a base', () => {
    expect(typeFactors(['^'])).toBe('');
    expect(typeFactors(['2', '×', '^'])).toBe('2×');
    expect(typeFactors(['2', '^', '^'])).toBe('2^');
    expect(typeFactors(['2', '^', '3', '^'])).toBe('2^3');
    expect(typeFactors(['2', '^', '3', '×', '5', '^', '2'])).toBe('2^3×5^2');
  });

  it('ignores the comma, the minus and the slash', () => {
    expect(typeFactors(['2', ',', '-', '/'])).toBe('2');
  });

  it('removes the last character on backspace', () => {
    expect(typeFactors(['2', '^', 'backspace', '×'])).toBe('2×');
    expect(typeFactors(['backspace'])).toBe('');
  });

  it('limits the length but still allows backspace', () => {
    const full = `${'2×'.repeat(9)}22`;
    expect(full).toHaveLength(MAX_FACTORIZATION_LENGTH);
    expect(applyFactorizationKey(full, '3')).toBe(full);
    expect(applyFactorizationKey(full, '×')).toBe(full);
    expect(applyFactorizationKey(full, 'backspace')).toBe(full.slice(0, -1));
  });
});

function typeFraction(
  keys: KeypadKey[],
  start: FractionInput = EMPTY_FRACTION_INPUT,
): FractionInput {
  return keys.reduce(applyFractionKey, start);
}

function fractionText(keys: KeypadKey[]): string {
  return fractionInputToString(typeFraction(keys));
}

describe('applyFractionKey', () => {
  it('types a whole number like the number input', () => {
    expect(fractionText(['1', '2', ',', '5'])).toBe('12,5');
    expect(fractionText(['-', '3'])).toBe('-3');
    expect(fractionText(['1', ',', ','])).toBe('1,');
  });

  it('opens an empty template with the cursor in the numerator', () => {
    expect(typeFraction(['/'])).toEqual({
      negative: false,
      whole: '',
      template: { num: '', den: '', slot: 'num' },
    });
    expect(fractionText(['/', '2', '5', '/', '2'])).toBe('25/2');
  });

  it('builds a mixed number after a whole number', () => {
    expect(fractionText(['1', '2', '/', '2', '/', '3'])).toBe('12 2/3');
  });

  it('toggles between numerator and denominator with the breuk key', () => {
    const state = typeFraction(['/', '1', '/', '/', '2']);
    expect(fractionInputToString(state)).toBe('12/');
    expect(state.template?.slot).toBe('num');
  });

  it('does not open a template after a comma and ignores the comma inside one', () => {
    expect(fractionText(['1', ',', '5', '/'])).toBe('1,5');
    expect(typeFraction(['1', ',', '5', '/']).template).toBeNull();
    expect(fractionText(['/', '1', ','])).toBe('1/');
  });

  it('applies the minus to the whole number', () => {
    expect(fractionText(['1', '/', '1', '/', '2', '-'])).toBe('-1 1/2');
    expect(fractionText(['/', '3', '-'])).toBe('-3/');
    expect(fractionText(['-', '-'])).toBe('');
  });

  it('deletes in the active slot, then moves to the numerator, then closes the template', () => {
    let state = typeFraction(['1', '2', '/', '3', '/', '4']);
    const seen: string[] = [];
    for (let i = 0; i < 5; i++) {
      state = applyFractionKey(state, 'backspace');
      seen.push(fractionInputToString(state));
    }
    expect(seen).toEqual(['12 3/', '12 3/', '12 /', '12', '1']);
  });

  it('keeps a filled denominator when backspace hits an empty numerator', () => {
    const state = selectFractionSlot(typeFraction(['/', '/', '4']), 'num');
    expect(fractionInputToString(applyFractionKey(state, 'backspace'))).toBe('/4');
  });

  it('clears a lone minus on backspace', () => {
    expect(typeFraction(['-', 'backspace'])).toEqual(EMPTY_FRACTION_INPUT);
  });

  it('limits each slot to MAX_SLOT_LENGTH digits', () => {
    const nines = Array<KeypadKey>(MAX_SLOT_LENGTH + 1).fill('9');
    expect(fractionText(['/', ...nines])).toBe(`${'9'.repeat(MAX_SLOT_LENGTH)}/`);
  });

  it('ignores the factorization keys', () => {
    expect(fractionText(['/', '1', '×', '^'])).toBe('1/');
  });
});

describe('selectFractionSlot', () => {
  it('moves the cursor within an open template only', () => {
    expect(selectFractionSlot(typeFraction(['/']), 'den').template?.slot).toBe('den');
    expect(selectFractionSlot(EMPTY_FRACTION_INPUT, 'den')).toBe(EMPTY_FRACTION_INPUT);
  });
});

describe('fractionInputToString', () => {
  it('writes fractions, mixed numbers and decimals as parseAnswer reads them', () => {
    expect(fractionInputToString(EMPTY_FRACTION_INPUT)).toBe('');
    expect(fractionText(['/'])).toBe('/');
    expect(fractionText(['-', '1', '2', '/', '1', '/', '2'])).toBe('-12 1/2');
  });
});

describe('applyExpressionKey', () => {
  const typeExpression = (keys: KeypadKey[], start = '') => keys.reduce(applyExpressionKey, start);

  it('builds an expression with operators and parentheses', () => {
    expect(typeExpression(['7', '×', '(', '1', '3', '+', '8', '7', ')'])).toBe('7×(13+87)');
    expect(typeExpression(['7', '×', '1', '0', '0', '-', '7', '×', '2'])).toBe('7×100-7×2');
    expect(typeExpression(['(', '(', '1', '+', '2', ')', ':', '3', ')'])).toBe('((1+2):3)');
  });

  it('allows an operator only after a number or )', () => {
    expect(typeExpression(['+'])).toBe('');
    expect(typeExpression(['-'])).toBe('');
    expect(typeExpression(['2', '×', ':'])).toBe('2×');
    expect(typeExpression(['(', '×'])).toBe('(');
    expect(typeExpression(['(', '2', ')', ':'])).toBe('(2):');
  });

  it('opens a parenthesis only at the start, after an operator or after (', () => {
    expect(typeExpression(['2', '('])).toBe('2');
    expect(typeExpression(['(', '1', ')', '('])).toBe('(1)');
    expect(typeExpression(['2', '+', '(', '('])).toBe('2+((');
  });

  it('closes a parenthesis only after an operand while one is open', () => {
    expect(typeExpression(['2', ')'])).toBe('2');
    expect(typeExpression(['(', ')'])).toBe('(');
    expect(typeExpression(['(', '2', '+', ')'])).toBe('(2+');
    expect(typeExpression(['(', '2', ')', ')'])).toBe('(2)');
  });

  it('allows no digit directly after )', () => {
    expect(typeExpression(['(', '2', ')', '3'])).toBe('(2)');
  });

  it('ignores keys that are not expression keys', () => {
    expect(typeExpression(['2', ',', '^', '/', ' '])).toBe('2');
  });

  it('deletes the last character', () => {
    expect(applyExpressionKey('7×(13', 'backspace')).toBe('7×(1');
    expect(applyExpressionKey('', 'backspace')).toBe('');
    expect(applyExpressionKey(applyExpressionKey('(2)', 'backspace'), ')')).toBe('(2)');
    expect(applyExpressionKey(applyExpressionKey('(2', 'backspace'), ')')).toBe('(');
  });

  it(`stops at ${MAX_EXPRESSION_LENGTH} characters`, () => {
    const full = '1+'.repeat(MAX_EXPRESSION_LENGTH / 2 - 1) + '12';
    expect(full).toHaveLength(MAX_EXPRESSION_LENGTH);
    expect(applyExpressionKey(full, '3')).toBe(full);
    expect(applyExpressionKey(full, 'backspace')).toBe(full.slice(0, -1));
  });
});

describe('endsWithOperand', () => {
  it('is true after a digit or a closing parenthesis', () => {
    expect(endsWithOperand('12')).toBe(true);
    expect(endsWithOperand('(3+4)')).toBe(true);
  });

  it('is false when empty or after an operator, comma or opening parenthesis', () => {
    for (const text of ['', '3+', '3×', '(', '2,', '3=']) {
      expect(endsWithOperand(text)).toBe(false);
    }
  });
});

describe('openParentheses', () => {
  it('counts the parentheses that are still open', () => {
    expect(openParentheses('')).toBe(0);
    expect(openParentheses('((3+4')).toBe(2);
    expect(openParentheses('(3+4)×(2')).toBe(1);
    expect(openParentheses('(3+4)')).toBe(0);
  });
});

describe('applyScientificKey', () => {
  const typeScientific = (keys: KeypadKey[], start = '') => keys.reduce(applyScientificKey, start);

  it('types the notation with ×, ^ and a negative exponent', () => {
    expect(typeScientific(['4', ',', '5', '×', '1', '0', '^', '-', '3'])).toBe('4,5×10^-3');
    expect(typeScientific(['1', '0', '^', '6'])).toBe('10^6');
    expect(typeScientific(['4', '5', '0', '0'])).toBe('4500');
  });

  it('allows the comma once, only in the first number', () => {
    expect(typeScientific([','])).toBe(',');
    expect(typeScientific(['4', ',', '5', ','])).toBe('4,5');
    expect(typeScientific(['4', '×', '1', ','])).toBe('4×1');
    expect(typeScientific(['1', '0', '^', ','])).toBe('10^');
  });

  it('allows × once, only after a digit of the first number', () => {
    expect(typeScientific(['×'])).toBe('');
    expect(typeScientific(['4', ',', '×'])).toBe('4,');
    expect(typeScientific(['4', '×', '1', '0', '×'])).toBe('4×10');
    expect(typeScientific(['1', '0', '^', '2', '×'])).toBe('10^2');
  });

  it('allows ^ once, only after a digit', () => {
    expect(typeScientific(['^'])).toBe('');
    expect(typeScientific(['4', '×', '^'])).toBe('4×');
    expect(typeScientific(['4', '×', '1', '0', '^', '2', '^'])).toBe('4×10^2');
  });

  it('allows a minus sign only directly after ^', () => {
    expect(typeScientific(['-', '4'])).toBe('4');
    expect(typeScientific(['4', '-'])).toBe('4');
    expect(typeScientific(['1', '0', '^', '-', '-'])).toBe('10^-');
    expect(typeScientific(['1', '0', '^', '2', '-'])).toBe('10^2');
  });

  it('keeps the exponent to two digits', () => {
    expect(typeScientific(['1', '0', '^', '1', '2', '3'])).toBe('10^12');
    expect(typeScientific(['1', '0', '^', '-', '1', '2', '3'])).toBe('10^-12');
  });

  it('ignores the keys of other keypads', () => {
    expect(typeScientific(['4', '+', ':', '(', ')', '/', '=', ' '])).toBe('4');
  });

  it('removes the last character on backspace and stops at the maximum length', () => {
    expect(typeScientific(['4', '×', 'backspace'])).toBe('4');
    expect(typeScientific(['backspace'])).toBe('');
    const full = '1'.repeat(MAX_SCIENTIFIC_LENGTH);
    expect(applyScientificKey(full, '1')).toBe(full);
    expect(applyScientificKey(full, 'backspace')).toBe(full.slice(0, -1));
  });
});
