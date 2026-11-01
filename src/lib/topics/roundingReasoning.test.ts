import { describe, expect, it } from 'vitest';
import { createRng } from '../random';
import { decimalPlaces, isBetween, isInteger, parseDutchNumber } from '../rational';
import type { Question } from '../types';
import {
  cashQuestion,
  decimalBoundsQuestion,
  generateRoundingReasoning,
  wholeBoundsQuestion,
} from './roundingReasoning';
import { answerOf, decimal, stepOf } from './testHelpers';

const SAMPLES = 4000;
const NBSP = '\u{a0}';
const S = '\u{202f}';

describe('wholeBoundsQuestion', () => {
  it('gives the smallest and the largest number that rounds to 4500', () => {
    const smallest = stepOf(wholeBoundsQuestion('honderdtallen', 4500, 'kleinste'));
    expect(smallest.kind).toBe('number');
    expect(smallest.prompt).toBe(
      'Een getal is afgerond op honderdtallen 4500. Wat is het kleinste getal dat het kan zijn?',
    );
    expect(smallest.check('4450')).toEqual({
      correct: true,
      expected: '4450',
      explanation: '4449 wordt 4400, 4450 wordt 4500 → 4450',
    });
    expect(smallest.check('4400').correct).toBe(false);
    const largest = stepOf(wholeBoundsQuestion('honderdtallen', 4500, 'grootste'));
    expect(largest.prompt).toContain('Wat is het grootste getal dat het kan zijn?');
    expect(largest.check('4549')).toEqual({
      correct: true,
      expected: '4549',
      explanation: '4549 wordt 4500, 4550 wordt 4600 → 4549',
    });
  });

  it('works for tientallen and duizendtallen, with grouped large numbers', () => {
    expect(stepOf(wholeBoundsQuestion('tientallen', 120, 'kleinste')).check('').expected).toBe('115');
    expect(stepOf(wholeBoundsQuestion('tientallen', 120, 'grootste')).check('').expected).toBe('124');
    const thousands = stepOf(wholeBoundsQuestion('duizendtallen', 45000, 'grootste'));
    expect(thousands.prompt).toContain(`duizendtallen 45${S}000.`);
    expect(thousands.check('').expected).toBe(`45${S}499`);
  });
});

describe('decimalBoundsQuestion', () => {
  it('gives the smallest and the largest 2-decimal number that rounds to 3,7', () => {
    const smallest = stepOf(decimalBoundsQuestion(decimal('3,7'), 'kleinste'));
    expect(smallest.prompt).toBe(
      'Een getal met 2 decimalen is afgerond op 1 decimaal 3,7. Wat is het kleinste getal dat het kan zijn?',
    );
    expect(smallest.check('3,65')).toEqual({
      correct: true,
      expected: '3,65',
      explanation: '3,64 wordt 3,6, 3,65 wordt 3,7 → 3,65',
    });
    const largest = stepOf(decimalBoundsQuestion(decimal('3,7'), 'grootste'));
    expect(largest.check('3,74')).toEqual({
      correct: true,
      expected: '3,74',
      explanation: '3,74 wordt 3,7, 3,75 wordt 3,8 → 3,74',
    });
  });
});

describe('cashQuestion', () => {
  it('rounds 3 cent up to 5 cent', () => {
    const step = stepOf(cashQuestion(793));
    expect(step.prompt).toBe(
      `Je boodschappen kosten €${NBSP}7,93. Je betaalt contant. Hoeveel betaal je?`,
    );
    expect(step.prefix).toBe('€');
    expect(step.check('7,95')).toEqual({
      correct: true,
      expected: '7,95',
      explanation: `€${NBSP}7,93: 3 cent wordt 5 cent → €${NBSP}7,95`,
    });
    expect(step.check('7,9').correct).toBe(false);
  });

  it('rounds 1 cent down and 8 cent up, with 2 decimals unless whole', () => {
    const down = stepOf(cashQuestion(791));
    expect(down.check('').expected).toBe('7,90');
    expect(down.check('7,9').correct).toBe(true);
    expect(down.check('').explanation).toBe(
      `€${NBSP}7,91: 1 cent wordt 0 cent → €${NBSP}7,90`,
    );
    const up = stepOf(cashQuestion(798));
    expect(up.check('').expected).toBe('8');
    expect(up.check('').explanation).toBe(`€${NBSP}7,98: 8 cent wordt 10 cent → €${NBSP}8`);
    expect(up.check('8').correct).toBe(true);
  });

  it('asks the change from a note', () => {
    const step = stepOf(cashQuestion(793, 10));
    expect(step.prompt).toBe(
      `Je boodschappen kosten €${NBSP}7,93. Je betaalt contant met €${NBSP}10. Hoeveel krijg je terug?`,
    );
    expect(step.check('2,05')).toEqual({
      correct: true,
      expected: '2,05',
      explanation: `€${NBSP}7,93 → €${NBSP}7,95 → 10 − 7,95 = 2,05`,
    });
  });
});

describe('generateRoundingReasoning', () => {
  const rng = createRng(61);
  const questions: Question[] = Array.from({ length: SAMPLES }, () =>
    generateRoundingReasoning(rng),
  );
  const parts = (question: Question) => question.key.split(':');
  const bounds = questions.filter((q) => parts(q)[1] === 'bounds');
  const cash = questions.filter((q) => parts(q)[1] === 'cash');
  const whole = bounds.filter((q) => parts(q)[2] === 'whole');
  const decimals = bounds.filter((q) => parts(q)[2] === 'decimal');
  const significant = (value: number) => String(value).replace(/0+$/, '').length;

  it('is a single number step; money has the € prefix', () => {
    for (const question of questions) {
      const step = stepOf(question);
      expect(question.topic).toBe('roundingReasoning');
      expect(question.steps).toHaveLength(1);
      expect(step.kind).toBe('number');
      expect(step.check(step.check('').expected.replaceAll(S, '')).correct).toBe(true);
    }
    for (const question of cash) expect(stepOf(question).prefix).toBe('€');
    for (const question of bounds) expect(stepOf(question).prefix).toBeUndefined();
  });

  it('splits bounds and cash 50/50, whole and decimal bounds 70/30, kleinste and grootste 50/50', () => {
    expect(bounds.length / SAMPLES).toBeGreaterThan(0.45);
    expect(bounds.length / SAMPLES).toBeLessThan(0.55);
    expect(whole.length / bounds.length).toBeGreaterThan(0.65);
    expect(whole.length / bounds.length).toBeLessThan(0.75);
    const smallest = bounds.filter((q) => parts(q)[3] === 'kleinste').length;
    expect(smallest / bounds.length).toBeGreaterThan(0.45);
    expect(smallest / bounds.length).toBeLessThan(0.55);
    expect(new Set(whole.map((q) => parts(q)[4]))).toEqual(
      new Set(['tientallen', 'honderdtallen', 'duizendtallen']),
    );
    expect(new Set(cash.map((q) => parts(q)[2]))).toEqual(new Set(['pay', 'change']));
  });

  it('whole bounds: 2 or 3 significant digits in [100, 99 000], a multiple of the place', () => {
    const units = { tientallen: 10, honderdtallen: 100, duizendtallen: 1000 } as const;
    for (const question of whole) {
      const [, , , side, place, text] = parts(question) as [string, string, string, string, keyof typeof units, string];
      const value = Number(text);
      expect(value).toBeGreaterThanOrEqual(100);
      expect(value).toBeLessThanOrEqual(99000);
      expect(value % units[place]).toBe(0);
      expect(significant(value)).toBeGreaterThanOrEqual(2);
      expect(significant(value)).toBeLessThanOrEqual(3);
      const answer = Number(answerOf(question).num);
      expect(answer).toBe(side === 'kleinste' ? value - units[place] / 2 : value + units[place] / 2 - 1);
    }
  });

  it('decimal bounds: a rounded value of 0,1-99,9 with 1 decimal, not whole', () => {
    for (const question of decimals) {
      const value = parseDutchNumber(parts(question)[4]!)!;
      expect(isBetween(value, decimal('0,1'), decimal('99,9'))).toBe(true);
      expect(decimalPlaces(value)).toBe(1);
      const answer = answerOf(question);
      expect(decimalPlaces(answer)).toBe(2);
      const side = parts(question)[3];
      const offset = side === 'kleinste' ? decimal('−0,05') : decimal('0,04');
      expect(answer.num * value.den * offset.den).toBe(
        (value.num * offset.den + offset.num * value.den) * answer.den,
      );
    }
  });

  it('cash: 1 to 50 euro, cents not ending in 0 or 5, rounded to 5 cent; change from a higher note', () => {
    const roundCents = (cents: number) => {
      const last = cents % 10;
      const base = cents - last;
      return last <= 2 ? base : last <= 7 ? base + 5 : base + 10;
    };
    for (const question of cash) {
      const [, , variant, amount, note] = parts(question);
      const cents = Math.round(Number(amount!.replace(',', '.')) * 100);
      expect(cents).toBeGreaterThanOrEqual(100);
      expect(cents).toBeLessThanOrEqual(5000);
      expect([0, 5]).not.toContain(cents % 10);
      const rounded = roundCents(cents);
      const answer = answerOf(question);
      if (variant === 'pay') {
        expect(answer.num * 100n).toBe(BigInt(rounded) * answer.den);
      } else {
        expect([5, 10, 20, 50]).toContain(Number(note));
        expect(Number(note) * 100).toBeGreaterThan(rounded);
        expect(answer.num * 100n).toBe(BigInt(Number(note) * 100 - rounded) * answer.den);
      }
    }
    expect(cash.some((q) => isInteger(answerOf(q)))).toBe(true);
  });

  it('is deterministic for a seed', () => {
    expect(generateRoundingReasoning(createRng(9)).key).toBe(
      generateRoundingReasoning(createRng(9)).key,
    );
  });
});
