import { describe, expect, it } from 'vitest';
import { fromInteger, parseDutchNumber, type Rational } from './rational';
import { firstTip, positiveInteger, powerOfTenShift, powerOfTenTip } from './tips';

const n = (text: string): Rational => parseDutchNumber(text)!;

describe('powerOfTenShift', () => {
  it.each([
    ['560', '56', 1],
    ['5,6', '56', -1],
    ['0,056', '56', -3],
    ['35000', '3,5', 4],
  ])('%s against %s is 10^%i', (given, answer, shift) => {
    expect(powerOfTenShift(n(given), n(answer))).toBe(shift);
  });

  it.each([
    ['56', '56'],
    ['57', '56'],
    ['-560', '56'],
    ['0', '56'],
    ['280', '56'],
    ['5', '0'],
  ])('%s against %s is no power of ten', (given, answer) => {
    expect(powerOfTenShift(n(given), n(answer))).toBeNull();
  });
});

describe('powerOfTenTip', () => {
  it('names the factor and the direction', () => {
    expect(powerOfTenTip(n('560'), n('56'))).toBe(
      'Je antwoord is 10 keer te groot. Let op de komma en het aantal nullen.',
    );
    expect(powerOfTenTip(n('0,056'), n('56'))).toBe(
      'Je antwoord is 1000 keer te klein. Let op de komma en het aantal nullen.',
    );
    expect(powerOfTenTip(n('560000'), n('56'))).toBe(
      'Je antwoord is 10\u{202f}000 keer te groot. Let op de komma en het aantal nullen.',
    );
  });

  it('gives nothing for other mistakes', () => {
    expect(powerOfTenTip(n('57'), n('56'))).toBeUndefined();
  });
});

describe('firstTip', () => {
  it('returns the first tip in order and undefined when none applies', () => {
    const tip = firstTip(
      () => undefined,
      (given) => (given.num === 3n ? 'drie' : undefined),
      () => 'altijd',
    );
    expect(tip(fromInteger(3))).toBe('drie');
    expect(tip(fromInteger(4))).toBe('altijd');
    expect(firstTip()(fromInteger(4))).toBeUndefined();
  });
});

describe('positiveInteger', () => {
  it('accepts positive integers only', () => {
    expect(positiveInteger(n('12'))).toBe(12);
    expect(positiveInteger(n('0'))).toBeNull();
    expect(positiveInteger(n('-3'))).toBeNull();
    expect(positiveInteger(n('2,5'))).toBeNull();
  });
});
