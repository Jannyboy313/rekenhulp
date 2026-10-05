import { describe, expect, it } from 'vitest';
import { fromInteger, rational } from './rational';
import { numberStep } from './steps';

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
