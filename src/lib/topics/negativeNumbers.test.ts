import { describe, expect, it } from 'vitest';
import { evaluate } from '../expr/evaluate';
import { parse } from '../expr/parser';
import { createRng } from '../random';
import { parseDutchNumber } from '../rational';
import type { Question, Step } from '../types';
import {
  addSubtractQuestion,
  buildNegativeNumbers,
  changeQuestion,
  differenceQuestion,
  explainAddSubtract,
  explainSigns,
  generateNegativeNumbers,
  MAX_CHANGE,
  MAX_DAY,
  MAX_FACTOR,
  MAX_NIGHT,
  MAX_RESULT,
  MAX_START,
  MAX_TERM,
  MIN_CHANGE,
  MIN_DAY,
  MIN_FACTOR,
  MIN_NIGHT,
  MIN_RESULT,
  MIN_START,
  multiplyDivideQuestion,
  NEGATIVE_FORMS,
  type NegativeForm,
  PRODUCT_SIGN_TIP,
  SIGN_TIP,
} from './negativeNumbers';

const PER_FORM = 1000;

function questionsOf(form: NegativeForm): Question[] {
  const rng = createRng(300 + NEGATIVE_FORMS.indexOf(form));
  return Array.from({ length: PER_FORM }, () => buildNegativeNumbers(rng, form));
}

function stepOf(question: Question): Step {
  return question.steps[0]!;
}

function sumOf(question: Question): string {
  return stepOf(question).prompt.slice(0, -' = ?'.length);
}

function expectedValue(question: Question): number {
  return Number(parseDutchNumber(stepOf(question).check('').expected)!.num);
}

/** '−6' or '(−6)' as a number. */
function literalValue(text: string): number {
  return Number(text.replace(/[()]/g, '').replace('−', '-'));
}

const CHANGE =
  /^Het is (−?\d+)\u{a0}°C\. Het wordt (\d+) graden (warmer|kouder)\. Hoeveel graden is het dan\?$/u;
const DIFFERENCE =
  /^'s Nachts is het (−?\d+)\u{a0}°C, overdag (−?\d+)\u{a0}°C\. Hoeveel graden is het verschil\?$/u;

describe('generateNegativeNumbers', () => {
  it('produces all three forms, each accepting its expected answer', () => {
    const rng = createRng(1);
    let temperatures = 0;
    for (let i = 0; i < 2000; i++) {
      const question = generateNegativeNumbers(rng);
      expect(question.topic).toBe('negativeNumbers');
      const step = stepOf(question);
      expect(step.check(step.check('').expected).correct, step.prompt).toBe(true);
      if (step.suffix !== undefined) temperatures++;
    }
    expect(temperatures).toBeGreaterThan(550);
    expect(temperatures).toBeLessThan(800);
  });
});

describe('add / subtract', () => {
  const questions = questionsOf('addSubtract');

  it('writes negative literals as in §5.8 and stays within ±20', () => {
    for (const question of questions) {
      const match = /^(−?\d+) ([+−]) (\(−\d+\)|\d+)$/.exec(sumOf(question));
      expect(match, sumOf(question)).not.toBeNull();
      const a = literalValue(match![1]!);
      const b = literalValue(match![3]!);
      for (const term of [a, b]) {
        expect(term).not.toBe(0);
        expect(Math.abs(term)).toBeLessThanOrEqual(MAX_TERM);
      }
      const answer = expectedValue(question);
      expect(answer).not.toBe(0);
      expect(a < 0 || b < 0 || answer < 0, sumOf(question)).toBe(true);
    }
  });

  it('expects the value of the sum', () => {
    for (const question of questions) {
      expect(parseDutchNumber(stepOf(question).check('').expected)).toEqual(
        evaluate(parse(sumOf(question))!),
      );
    }
  });

  it('turns a negative term around, splits at zero, or just adds', () => {
    expect(explainAddSubtract(-4, false, -6)).toBe('−4 − (−6) = −4 + 6 = 2');
    expect(explainAddSubtract(5, true, -8)).toBe('5 + (−8) = 5 − 8 = −3');
    expect(explainAddSubtract(3, false, 8)).toBe('3 − 8 = 3 − 3 − 5 = −5');
    expect(explainAddSubtract(-7, true, 12)).toBe('−7 + 12 = −7 + 7 + 5 = 5');
    expect(explainAddSubtract(-4, false, 6)).toBe('−4 − 6 = −10');
  });

  it('names minus a negative number, then a wrong sign', () => {
    const step = stepOf(addSubtractQuestion(-4, false, -6));
    expect(step.prompt).toBe('−4 − (−6) = ?');
    expect(step.check('-10').tip).toBe('Min een negatief getal is plus: −4 − (−6) = −4 + 6.');
    expect(step.check('-2').tip).toBe(SIGN_TIP);
    expect(step.check('7').tip).toBeUndefined();
  });
});

describe('multiply / divide', () => {
  const questions = questionsOf('multiplyDivide');

  it('multiplies or divides exactly with at least one negative number', () => {
    for (const question of questions) {
      const match = /^(−?\d+) ([×:]) (\(−\d+\)|\d+)$/.exec(sumOf(question));
      expect(match, sumOf(question)).not.toBeNull();
      const left = literalValue(match![1]!);
      const right = literalValue(match![3]!);
      expect(left < 0 || right < 0, sumOf(question)).toBe(true);
      const factors = match![2] === '×' ? [left, right] : [left / right, right];
      for (const factor of factors) {
        expect(Number.isInteger(factor), sumOf(question)).toBe(true);
        expect(Math.abs(factor)).toBeGreaterThanOrEqual(MIN_FACTOR);
        expect(Math.abs(factor)).toBeLessThanOrEqual(MAX_FACTOR);
      }
      expect(parseDutchNumber(stepOf(question).check('').expected)).toEqual(
        evaluate(parse(sumOf(question))!),
      );
    }
  });

  it('explains the sum without signs, then the sign rule', () => {
    expect(explainSigns(-6, '×', 4)).toBe('6 × 4 = 24; één negatief getal → −24');
    expect(explainSigns(-24, ':', -3)).toBe('24 : 3 = 8; twee negatieve getallen → 8');
  });

  it('names a wrong sign', () => {
    const product = stepOf(multiplyDivideQuestion(-6, '×', 4));
    expect(product.prompt).toBe('−6 × 4 = ?');
    expect(product.check('24').tip).toBe(PRODUCT_SIGN_TIP);
    const quotient = stepOf(multiplyDivideQuestion(-24, ':', -3));
    expect(quotient.prompt).toBe('−24 : (−3) = ?');
    expect(quotient.check('-8').tip).toBe(PRODUCT_SIGN_TIP);
  });
});

describe('temperature', () => {
  const questions = questionsOf('temperature');
  const changes = questions.filter((question) => CHANGE.test(stepOf(question).prompt));
  const differences = questions.filter((question) => DIFFERENCE.test(stepOf(question).prompt));

  it('asks a change or a difference, about equally often', () => {
    expect(changes.length + differences.length).toBe(PER_FORM);
    expect(changes.length).toBeGreaterThan(400);
    expect(changes.length).toBeLessThan(600);
  });

  it('keeps a change within the ranges, with the start or the result below zero', () => {
    for (const question of changes) {
      const [, startText = '', amountText, direction] = CHANGE.exec(stepOf(question).prompt)!;
      const start = literalValue(startText);
      const amount = Number(amountText);
      const result = start + (direction === 'warmer' ? amount : -amount);
      expect(start).toBeGreaterThanOrEqual(MIN_START);
      expect(start).toBeLessThanOrEqual(MAX_START);
      expect(amount).toBeGreaterThanOrEqual(MIN_CHANGE);
      expect(amount).toBeLessThanOrEqual(MAX_CHANGE);
      expect(result).toBeGreaterThanOrEqual(MIN_RESULT);
      expect(result).toBeLessThanOrEqual(MAX_RESULT);
      expect(start < 0 || result < 0).toBe(true);
      expect(expectedValue(question)).toBe(result);
      expect(stepOf(question).suffix).toBe('°C');
    }
  });

  it('keeps a difference within the ranges, with the night below zero', () => {
    for (const question of differences) {
      const [, nightText = '', dayText = ''] = DIFFERENCE.exec(stepOf(question).prompt)!;
      const night = literalValue(nightText);
      const day = literalValue(dayText);
      expect(night).toBeGreaterThanOrEqual(MIN_NIGHT);
      expect(night).toBeLessThanOrEqual(MAX_NIGHT);
      expect(day).toBeGreaterThanOrEqual(MIN_DAY);
      expect(day).toBeLessThanOrEqual(MAX_DAY);
      expect(night).toBeLessThan(day);
      expect(night).toBeLessThan(0);
      expect(expectedValue(question)).toBe(day - night);
      expect(stepOf(question).suffix).toBe('graden');
    }
  });

  it('explains a change like a sum and names a wrong sign', () => {
    const step = stepOf(changeQuestion(-5, 8));
    expect(step.prompt).toBe(
      'Het is −5\u{a0}°C. Het wordt 8 graden warmer. Hoeveel graden is het dan?',
    );
    expect(step.check('3')).toMatchObject({
      correct: true,
      explanation: '−5 + 8 = −5 + 5 + 3 = 3',
    });
    expect(step.check('-3').tip).toBe(SIGN_TIP);
    expect(stepOf(changeQuestion(4, -9)).prompt).toBe(
      'Het is 4\u{a0}°C. Het wordt 9 graden kouder. Hoeveel graden is het dan?',
    );
  });

  it('explains a difference and names the steps to and from zero', () => {
    const step = stepOf(differenceQuestion(-7, 4));
    expect(step.prompt).toBe(
      "'s Nachts is het −7\u{a0}°C, overdag 4\u{a0}°C. Hoeveel graden is het verschil?",
    );
    expect(step.check('11')).toMatchObject({ correct: true, explanation: '4 − (−7) = 4 + 7 = 11' });
    expect(step.check('3').tip).toBe('Van −7 naar 0 is 7 graden, van 0 naar 4 nog 4: samen 11.');
    expect(step.check('5').tip).toBeUndefined();
  });

  it('names adding both when both are below zero', () => {
    const step = stepOf(differenceQuestion(-12, -3));
    expect(step.check('9').correct).toBe(true);
    expect(step.check('15').tip).toBe('Allebei onder nul: het verschil is 12 − 3 = 9.');
  });
});
