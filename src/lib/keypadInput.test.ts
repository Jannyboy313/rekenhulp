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
});
