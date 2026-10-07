import { describe, expect, it } from 'vitest';
import { createRng } from '../random';
import {
  add,
  compare,
  decimalPlaces,
  divide,
  fromInteger,
  multiply,
  parseDutchNumber,
  subtract,
  type Rational,
} from '../rational';
import type { Question, Step } from '../types';
import {
  addSubtractQuestion,
  buildDecimalArithmetic,
  DECIMAL_FORMS,
  type DecimalForm,
  divideQuestion,
  generateDecimalArithmetic,
  multiplyQuestion,
} from './decimalArithmetic';

const PER_FORM = 1000;
const HUNDRED = fromInteger(100);
const THOUSAND = fromInteger(1000);
const ADD_SUBTRACT = /^([\d,]+) ([+−]) ([\d,]+) = \?$/u;
const MULTIPLY = /^([\d,]+) × ([\d,]+) = \?$/u;
const DIVIDE = /^([\d,]+) : ([\d,]+) = \?$/u;

function questionsOf(form: DecimalForm): Question[] {
  const rng = createRng(700 + DECIMAL_FORMS.indexOf(form));
  return Array.from({ length: PER_FORM }, () => buildDecimalArithmetic(rng, form));
}

function stepOf(question: Question): Step {
  return question.steps[0]!;
}

function value(text: string): Rational {
  const parsed = parseDutchNumber(text);
  if (parsed === null) throw new Error(`Not a number: ${text}`);
  return parsed;
}

function decimals(text: string): number {
  return text.split(',')[1]?.length ?? 0;
}

function answerOf(step: Step): Rational {
  return value(step.check('').expected);
}

describe('generateDecimalArithmetic', () => {
  it('produces all three forms, each accepting its expected answer', () => {
    const rng = createRng(1);
    const kinds = new Set<string>();
    for (let i = 0; i < 1500; i++) {
      const question = generateDecimalArithmetic(rng);
      expect(question.topic).toBe('decimalArithmetic');
      const step = stepOf(question);
      expect(step.kind).toBe('number');
      expect(step.check(step.check('').expected).correct, step.prompt).toBe(true);
      kinds.add(question.key.split(':')[1]!);
    }
    expect([...kinds].sort()).toEqual(['add', 'divide', 'multiply', 'subtract']);
  });
});

describe('add / subtract', () => {
  const questions = questionsOf('addSubtract');

  it('adds or subtracts two numbers below 100 with a different number of decimals', () => {
    let subtractions = 0;
    for (const question of questions) {
      const step = stepOf(question);
      const match = ADD_SUBTRACT.exec(step.prompt);
      expect(match, step.prompt).not.toBeNull();
      const [, left = '', operator, right = ''] = match!;
      for (const text of [left, right]) {
        expect(decimals(text), text).toBeLessThanOrEqual(2);
        expect(text, 'no trailing zero after the comma').not.toMatch(/,\d*0$/);
        expect(text.replace(',', '').replace(/^0+/, '').length, text).toBeLessThanOrEqual(3);
        expect(compare(value(text), fromInteger(0))).toBe(1);
        expect(compare(value(text), HUNDRED)).toBe(-1);
      }
      expect(decimals(left)).not.toBe(decimals(right));
      const a = value(left);
      const b = value(right);
      if (operator === '−') {
        subtractions++;
        expect(answerOf(step)).toEqual(subtract(a, b));
        expect(compare(answerOf(step), fromInteger(0))).toBe(1);
      } else {
        expect(answerOf(step)).toEqual(add(a, b));
        expect(compare(answerOf(step), HUNDRED)).toBe(-1);
      }
    }
    // Sums of 100 or more are redrawn, so subtractions are a little more common (about 55%).
    expect(subtractions).toBeGreaterThan(400);
    expect(subtractions).toBeLessThan(700);
  });

  it('explains with aligned commas and names right-aligned digits', () => {
    const step = stepOf(addSubtractQuestion(value('4,7'), value('0,35'), false));
    expect(step.prompt).toBe('4,7 + 0,35 = ?');
    expect(step.check('5,05')).toMatchObject({
      correct: true,
      explanation: '4,70 + 0,35 = 5,05',
    });
    expect(step.check('0,82').tip).toBe("Zet de komma's onder elkaar: 4,70 + 0,35.");
    expect(step.check('5,15').tip).toBeUndefined();
  });

  it('pads a whole number and gives no alignment tip when it cannot apply', () => {
    const step = stepOf(addSubtractQuestion(fromInteger(5), value('0,25'), true));
    expect(step.prompt).toBe('5 − 0,25 = ?');
    expect(step.check('4,75')).toMatchObject({
      correct: true,
      explanation: '5,00 − 0,25 = 4,75',
    });
    // 5 − 25 is negative, so no right-aligned answer exists.
    expect(step.check('4,25').tip).toBeUndefined();
    const aligned = stepOf(addSubtractQuestion(value('12,5'), value('0,25'), true));
    expect(aligned.check('1').tip).toBe("Zet de komma's onder elkaar: 12,50 − 0,25.");
  });
});

describe('multiply', () => {
  const questions = questionsOf('multiply');

  it('multiplies two numbers with 1 to 3 decimals together', () => {
    for (const question of questions) {
      const step = stepOf(question);
      const match = MULTIPLY.exec(step.prompt);
      expect(match, step.prompt).not.toBeNull();
      const [, left = '', right = ''] = match!;
      const together = decimals(left) + decimals(right);
      expect(together).toBeGreaterThanOrEqual(1);
      expect(together).toBeLessThanOrEqual(3);
      expect(answerOf(step)).toEqual(multiply(value(left), value(right)));
    }
  });

  it('keys the factors in ascending order', () => {
    const one = multiplyQuestion({ digits: 3, decimals: 1 }, { digits: 4, decimals: 0 });
    const other = multiplyQuestion({ digits: 4, decimals: 0 }, { digits: 3, decimals: 1 });
    expect(one.key).toBe(other.key);
  });

  it('explains the digits, then the decimals, and names too few decimals', () => {
    const step = stepOf(multiplyQuestion({ digits: 3, decimals: 1 }, { digits: 4, decimals: 1 }));
    expect(step.prompt).toBe('0,3 × 0,4 = ?');
    expect(step.check('0,12')).toMatchObject({
      correct: true,
      explanation: '3 × 4 = 12; 1 + 1 = 2 decimalen → 0,12',
    });
    const tip = 'De uitkomst heeft evenveel decimalen als beide getallen samen: 1 + 1 = 2.';
    expect(step.check('1,2').tip).toBe(tip);
    expect(step.check('12').tip).toBe(tip);
    expect(step.check('0,012').tip).toBe(
      'Je antwoord is 10 keer te klein. Let op de komma en het aantal nullen.',
    );
  });

  it('writes 1 decimaal and simplifies trailing zeros', () => {
    const one = stepOf(multiplyQuestion({ digits: 7, decimals: 0 }, { digits: 6, decimals: 1 }));
    expect(one.prompt).toBe('7 × 0,6 = ?');
    expect(one.check('4,2').explanation).toBe('7 × 6 = 42; 0 + 1 = 1 decimaal → 4,2');
    const whole = stepOf(multiplyQuestion({ digits: 25, decimals: 2 }, { digits: 4, decimals: 0 }));
    expect(whole.prompt).toBe('0,25 × 4 = ?');
    expect(whole.check('1').explanation).toBe('25 × 4 = 100; 2 + 0 = 2 decimalen → 1');
  });
});

describe('divide', () => {
  const questions = questionsOf('divide');

  it('divides exactly, with a decimal dividend or divisor and at most 3 decimals', () => {
    let decimalDivisors = 0;
    for (const question of questions) {
      const step = stepOf(question);
      const match = DIVIDE.exec(step.prompt);
      expect(match, step.prompt).not.toBeNull();
      const [, left = '', right = ''] = match!;
      const dividend = value(left);
      const divisor = value(right);
      expect(dividend.den !== 1n || divisor.den !== 1n, step.prompt).toBe(true);
      if (divisor.den !== 1n) decimalDivisors++;
      expect(compare(dividend, THOUSAND)).toBe(-1);
      const answer = answerOf(step);
      expect(answer).toEqual(divide(dividend, divisor));
      for (const part of [dividend, divisor, answer]) {
        expect(decimalPlaces(part)).not.toBeNull();
        expect(decimalPlaces(part)!).toBeLessThanOrEqual(3);
      }
    }
    expect(decimalDivisors).toBeGreaterThan(300);
  });

  it('makes a decimal divisor whole first, and names a shifted answer', () => {
    const step = stepOf(divideQuestion(5, 1, 5, -2));
    expect(step.prompt).toBe('2,5 : 0,05 = ?');
    expect(step.check('50')).toMatchObject({
      correct: true,
      explanation: '2,5 : 0,05 = 250 : 5 = 50 (beide × 100)',
    });
    const tip = 'Maak eerst van de deler een heel getal: 2,5 : 0,05 = 250 : 5.';
    expect(step.check('5').tip).toBe(tip);
    expect(step.check('500').tip).toBe(tip);
    expect(step.check('49').tip).toBeUndefined();
  });

  it('uses the table fact for a whole divisor', () => {
    const step = stepOf(divideQuestion(9, -2, 4, 0));
    expect(step.prompt).toBe('0,36 : 4 = ?');
    expect(step.check('0,09')).toMatchObject({
      correct: true,
      explanation: '36 : 4 = 9 → 0,36 : 4 = 0,09',
    });
    expect(step.check('0,9').tip).toBe(
      'Je antwoord is 10 keer te groot. Let op de komma en het aantal nullen.',
    );
  });
});
