import { describe, expect, it } from 'vitest';
import {
  applyFactorizationKey,
  applyFractionKey,
  applyKey,
  EMPTY_FRACTION_INPUT,
  fractionInputToString,
  MAX_FACTORIZATION_LENGTH,
  MAX_INPUT_LENGTH,
  MAX_SLOT_LENGTH,
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

  it('allows a single fraction slash directly after a digit', () => {
    expect(type(['2', '5', '/', '2'])).toBe('25/2');
    expect(type(['2', '/', '/'])).toBe('2/');
    expect(type(['/'])).toBe('');
    expect(type(['-', '/'])).toBe('-');
    expect(type(['-', '3', '/', '4'])).toBe('-3/4');
  });

  it('does not mix the slash and the decimal comma', () => {
    expect(type(['1', ',', '5', '/'])).toBe('1,5');
    expect(type(['1', '/', '2', ','])).toBe('1/2');
  });

  it('counts the slash toward the length limit', () => {
    const full = '9'.repeat(MAX_INPUT_LENGTH);
    expect(applyKey(full, '/')).toBe(full);
    const almost = '9'.repeat(MAX_INPUT_LENGTH - 1);
    expect(applyKey(almost, '/')).toBe(`${almost}/`);
    expect(applyKey(`${almost}/`, '1')).toBe(`${almost}/`);
  });
  it('ignores the factorization keys', () => {
    expect(type(['2', '×', '^'])).toBe('2');
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

function typeFraction(keys: KeypadKey[], start: FractionInput = EMPTY_FRACTION_INPUT): FractionInput {
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
