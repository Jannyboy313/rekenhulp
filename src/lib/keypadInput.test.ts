import { describe, expect, it } from 'vitest';
import { applyKey, MAX_INPUT_LENGTH, type KeypadKey } from './keypadInput';

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
});
