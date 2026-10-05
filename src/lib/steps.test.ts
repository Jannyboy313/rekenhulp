import { describe, expect, it } from 'vitest';
import { fromInteger, rational } from './rational';
import { fractionStep, numberStep, parseAnswer } from './steps';

describe('numberStep', () => {
  const step = numberStep({
    prompt: '3 × 4 = ?',
    answer: fromInteger(12),
    explanation: '3 × 4 = 12',
  });

  it('exposes kind and prompt', () => {
    expect(step.kind).toBe('number');
    expect(step.prompt).toBe('3 × 4 = ?');
    expect(step.suffix).toBeUndefined();
  });

  it('accepts the exact answer and equivalent notation', () => {
    expect(step.check('12')).toEqual({ correct: true, expected: '12', explanation: '3 × 4 = 12' });
    expect(step.check('012').correct).toBe(true);
  });

  it('rejects a wrong answer and reports the expected one', () => {
    expect(step.check('13')).toEqual({
      correct: false,
      expected: '12',
      explanation: '3 × 4 = 12',
    });
  });

  it('rejects unparsable input', () => {
    expect(step.check('').correct).toBe(false);
    expect(step.check('-').correct).toBe(false);
  });

  it('compares decimals exactly', () => {
    const quarter = numberStep({ prompt: '250 ml = ? L', answer: rational(1n, 4n), suffix: 'L' });
    expect(quarter.suffix).toBe('L');
    expect(quarter.check(',25').correct).toBe(true);
    expect(quarter.check('0,250').correct).toBe(true);
    expect(quarter.check('0,26').correct).toBe(false);
    expect(quarter.check('0,26').expected).toBe('0,25');
  });
});

describe('numberStep options', () => {
  it('passes a prefix and shows a custom expected answer', () => {
    const money = numberStep({
      prompt: '€ 30 na 15% korting = ?',
      answer: rational(51n, 2n),
      prefix: '€',
      expected: '25,50',
    });
    expect(money.prefix).toBe('€');
    expect(money.check('25,5')).toEqual({ correct: true, expected: '25,50' });
    expect(money.check('25,50').correct).toBe(true);
    expect(money.check('25').expected).toBe('25,50');
  });

  it('has no prefix by default', () => {
    expect(numberStep({ prompt: '1 + 1', answer: fromInteger(2) }).prefix).toBeUndefined();
  });

  it('does not accept a fraction', () => {
    const half = numberStep({ prompt: '25 : 2 = ?', answer: rational(25n, 2n) });
    expect(half.check('25/2').correct).toBe(false);
  });
});

describe('parseAnswer', () => {
  it('parses only decimals for number steps', () => {
    expect(parseAnswer('number', '12,5')).toEqual(rational(25n, 2n));
    expect(parseAnswer('number', '25/2')).toBeNull();
  });

  it('parses fractions and decimals for fraction steps', () => {
    expect(parseAnswer('fraction', '25/2')).toEqual(rational(25n, 2n));
    expect(parseAnswer('fraction', '12,5')).toEqual(rational(25n, 2n));
    expect(parseAnswer('fraction', '25/')).toBeNull();
    expect(parseAnswer('fraction', '')).toBeNull();
  });
});

describe('fractionStep', () => {
  const percent = fractionStep({
    prompt: '10 is ?% van 80',
    answer: rational(25n, 2n),
    suffix: '%',
    explanation: '12½% = 80 : 8 = 10',
  });

  it('is a fraction step with its suffix', () => {
    expect(percent.kind).toBe('fraction');
    expect(percent.suffix).toBe('%');
  });

  it('accepts every equal fraction and the decimal', () => {
    for (const input of ['25/2', '50/4', '12,5', '12,50']) {
      expect(percent.check(input).correct).toBe(true);
    }
    expect(percent.check('12').correct).toBe(false);
    expect(percent.check('1/0').correct).toBe(false);
  });

  it('shows both notations as the expected answer', () => {
    expect(percent.check('12')).toEqual({
      correct: false,
      expected: '12,5 of 25/2',
      explanation: '12½% = 80 : 8 = 10',
    });
  });

  it('shows a whole answer once and accepts it as a fraction', () => {
    const whole = fractionStep({ prompt: '30 is ?% van 120', answer: fromInteger(25), suffix: '%' });
    expect(whole.check('50/2')).toEqual({ correct: true, expected: '25' });
  });

  it('shows only the fraction when there is no finite decimal', () => {
    const third = fractionStep({ prompt: '1 : 3 = ?', answer: rational(1n, 3n) });
    expect(third.check('1/3')).toEqual({ correct: true, expected: '1/3' });
  });
});
