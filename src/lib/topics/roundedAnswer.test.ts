import { describe, expect, it } from 'vitest';
import { rational } from '../rational';
import { nearBoundary, roundedQuestion, ROUNDING_SENTENCE, shownValue } from './roundedAnswer';
import { decimal } from './testHelpers';

describe('nearBoundary (calculator spec §6)', () => {
  it.each<[string, 0 | 1 | 2, boolean]>([
    ['23,55', 1, false],
    ['23,5504', 1, true],
    ['23,5496', 1, true],
    ['23,551', 1, false],
    ['23,56', 1, false],
    ['124,4995', 0, true],
    ['124,5', 0, false],
    ['124,95', 0, false],
    ['0,4999', 0, true],
    ['2,67501', 2, true],
  ])('%s at %i decimals: %s', (value, decimals, expected) => {
    expect(nearBoundary(decimal(value), decimals)).toBe(expected);
  });
});

describe('shownValue', () => {
  it('writes a terminating value exactly and cuts another after 3 decimals', () => {
    expect(shownValue(decimal('44,15625'))).toBe('44,15625');
    expect(shownValue(rational(4000n, 314n))).toBe('12,738…');
    expect(shownValue(rational(100n, 3n))).toBe('33,333…');
  });
});

describe('roundedQuestion', () => {
  const base = { topic: 'calcCircle', key: 'k', prompt: 'Vraag.', suffix: 'cm' } as const;

  it('asks the rounding last and accepts only the rounded value', () => {
    const question = roundedQuestion({
      ...base,
      value: decimal('43,96'),
      decimals: 1,
      calculation: '3,14 × 14',
    });
    const step = question.steps[0]!;
    expect(question.key).toBe('calcCircle:k');
    expect(step.prompt).toBe(`Vraag. ${ROUNDING_SENTENCE[1]}`);
    expect(step.check('').expected).toBe('44,0');
    expect(step.check('44').correct).toBe(true);
    expect(step.check('44,0').correct).toBe(true);
    expect(step.check('43,96').correct).toBe(false);
    expect(step.check('43,9').correct).toBe(false);
    expect(step.check('1').explanation).toBe('3,14 × 14 = 43,96 → 44,0');
  });

  it('shows no arrow for a value that needs no rounding, and a unit when given', () => {
    const exact = roundedQuestion({
      ...base,
      value: decimal('15,7'),
      decimals: 1,
      calculation: 'a',
    });
    expect(exact.steps[0]!.check('1').explanation).toBe('a = 15,7');
    const litres = roundedQuestion({
      ...base,
      value: decimal('124,95'),
      decimals: 0,
      calculation: 'a',
      valueUnit: 'L',
    });
    expect(litres.steps[0]!.check('1').explanation).toBe('a = 124,95 L → 125');
  });
});
