import { describe, expect, it } from 'vitest';
import { MINUS } from '../format';
import { createRng } from '../random';
import type { Question } from '../types';
import { bothSidesQuestion, bracketQuestion, generateEquations, linearQuestion } from './equations';
import { answerOf, stepOf, typed } from './testHelpers';

const m = (text: string) => text.replaceAll('-', MINUS);

describe('question text', () => {
  it.each<[string, () => Question, string, string, string]>([
    [
      'linear 3, 5, 5',
      () => linearQuestion(3, 5, 5),
      '3x + 5 = 20',
      '5',
      '3x + 5 = 20 → 3x = 20 − 5 = 15 → x = 15 : 3 = 5',
    ],
    [
      'linear 3, 20, −5',
      () => linearQuestion(3, 20, -5),
      '3x + 20 = 5',
      m('-5'),
      m('3x + 20 = 5 → 3x = 5 − 20 = -15 → x = -15 : 3 = -5'),
    ],
    [
      'linear 3, −5, 7',
      () => linearQuestion(3, -5, 7),
      '3x − 5 = 16',
      '7',
      '3x − 5 = 16 → 3x = 16 + 5 = 21 → x = 21 : 3 = 7',
    ],
    [
      'linear 4, −6, −2',
      () => linearQuestion(4, -6, -2),
      m('4x − 6 = -14'),
      m('-2'),
      m('4x − 6 = -14 → 4x = -14 + 6 = -8 → x = -8 : 4 = -2'),
    ],
    [
      'bracket 4, −2, 5',
      () => bracketQuestion(4, -2, 5),
      '4(x − 2) = 12',
      '5',
      '4(x − 2) = 12 → x − 2 = 12 : 4 = 3 → x = 3 + 2 = 5',
    ],
    [
      'bracket 3, 4, −6',
      () => bracketQuestion(3, 4, -6),
      m('3(x + 4) = -6'),
      m('-6'),
      m('3(x + 4) = -6 → x + 4 = -6 : 3 = -2 → x = -2 − 4 = -6'),
    ],
    [
      'both 5, 3, 2, 5',
      () => bothSidesQuestion(5, 3, 2, 5),
      '5x + 3 = 2x + 18',
      '5',
      '5x + 3 = 2x + 18 → 3x + 3 = 18 → 3x = 18 − 3 = 15 → x = 15 : 3 = 5',
    ],
    [
      'both 3, 3, 2, 15 (one x left)',
      () => bothSidesQuestion(3, 3, 2, 15),
      '3x + 3 = 2x + 18',
      '15',
      '3x + 3 = 2x + 18 → x + 3 = 18 → x = 18 − 3 = 15',
    ],
    [
      'both 4, −7, 1, 3 (x on the right)',
      () => bothSidesQuestion(4, -7, 1, 3),
      '4x − 7 = x + 2',
      '3',
      '4x − 7 = x + 2 → 3x − 7 = 2 → 3x = 2 + 7 = 9 → x = 9 : 3 = 3',
    ],
    [
      'both 5, 2, 3, −4 (negative d)',
      () => bothSidesQuestion(5, 2, 3, -4),
      m('5x + 2 = 3x − 6'),
      m('-4'),
      m('5x + 2 = 3x − 6 → 2x + 2 = -6 → 2x = -6 − 2 = -8 → x = -8 : 2 = -4'),
    ],
    [
      'both 4, −3, 1, −2 (x left, negative sides)',
      () => bothSidesQuestion(4, -3, 1, -2),
      m('4x − 3 = x − 9'),
      m('-2'),
      m('4x − 3 = x − 9 → 3x − 3 = -9 → 3x = -9 + 3 = -6 → x = -6 : 3 = -2'),
    ],
  ])('%s', (_label, make, equation, expected, explanation) => {
    const step = stepOf(make());
    expect(step.prompt).toBe(`Los op: ${equation}`);
    expect(step.prefix).toBe('x =');
    expect(step.kind).toBe('number');
    expect(step.check(typed(answerOf(make())))).toMatchObject({
      correct: true,
      expected,
      explanation,
    });
  });

  it('uses the equation as the key', () => {
    expect(linearQuestion(3, 5, 5).key).toBe('equations:3x + 5 = 20');
    expect(bracketQuestion(4, -2, 5).key).toBe('equations:4(x − 2) = 12');
  });
});

describe('tips', () => {
  it.each<[string, string, () => Question, string | undefined]>([
    [
      'linear +: the constant added',
      '7',
      () => linearQuestion(2, 4, 3),
      'Haal 4 aan beide kanten weg: 2x = 10 − 4.',
    ],
    [
      'linear −: the constant taken off',
      '3',
      () => linearQuestion(2, -4, 7),
      'Tel 4 aan beide kanten op: 2x = 10 + 4.',
    ],
    ['linear: not whole, no tip', '25', () => linearQuestion(3, 5, 5), undefined],
    ['linear: another wrong answer', '6', () => linearQuestion(2, 4, 3), undefined],
    [
      'bracket −',
      '1',
      () => bracketQuestion(4, -2, 5),
      'Tel 2 aan beide kanten op: x = 3 + 2.',
    ],
    [
      'bracket +',
      '5',
      () => bracketQuestion(4, 2, 1),
      'Haal 2 aan beide kanten weg: x = 3 − 2.',
    ],
    [
      'both sides +',
      '7',
      () => bothSidesQuestion(5, 3, 2, 5),
      'Haal 3 aan beide kanten weg: 3x = 18 − 3.',
    ],
    [
      'both sides, one x left',
      '21',
      () => bothSidesQuestion(3, 3, 2, 15),
      'Haal 3 aan beide kanten weg: x = 18 − 3.',
    ],
    [
      'both sides −',
      '2',
      () => bothSidesQuestion(5, -2, 3, 4),
      'Tel 2 aan beide kanten op: 2x = 6 + 2.',
    ],
    ['both sides −: not whole, no tip', m('-5'), () => bothSidesQuestion(4, -7, 1, 3), undefined],
    [
      'negative right side',
      m('-5'),
      () => linearQuestion(4, -6, -2),
      'Tel 6 aan beide kanten op: 4x = −14 + 6.',
    ],
  ])('%s, typing %s', (_label, input, make, tip) => {
    // The typed solution is the one with the sign of the moved constant flipped.
    expect(stepOf(make()).check(input).tip).toBe(tip);
  });

  it('gives the correct answer no tip', () => {
    const result = stepOf(linearQuestion(2, 4, 3)).check('3');
    expect(result.correct).toBe(true);
    expect(result.tip).toBeUndefined();
  });
});

describe('generateEquations', () => {
  const COUNT = 4000;
  const rng = createRng(5137);
  const questions = Array.from({ length: COUNT }, () => generateEquations(rng));

  const LINEAR = /^(\d+)x ([+−]) (\d+) = (−?\d+)$/u;
  const BRACKET = /^(\d+)\(x ([+−]) (\d+)\) = (−?\d+)$/u;
  const BOTH = /^(\d+)x ([+−]) (\d+) = (\d*)x ([+−]) (\d+)$/u;

  interface Parsed {
    question: Question;
    form: 'linear' | 'bracket' | 'both';
    /** The numbers of the equation, constants signed, a coefficient of 1 written out. */
    numbers: number[];
    x: number;
  }

  const signed = (sign: string | undefined, digits: string | undefined) =>
    (sign === MINUS ? -1 : 1) * Number(digits);

  function parse(question: Question): Parsed {
    const equation = stepOf(question).prompt.replace('Los op: ', '');
    const x = Number(answerOf(question).num);
    const both = BOTH.exec(equation);
    if (both) {
      const c = both[4] === '' ? 1 : Number(both[4]);
      const numbers = [Number(both[1]), signed(both[2], both[3]), c, signed(both[5], both[6])];
      return { question, form: 'both', numbers, x };
    }
    const bracket = BRACKET.exec(equation);
    if (bracket) {
      const [, a, sign, b, c] = bracket;
      return { question, form: 'bracket', numbers: [Number(a), signed(sign, b), Number(c!.replace(MINUS, '-'))], x };
    }
    const [, a, sign, b, c] = LINEAR.exec(equation)!;
    return { question, form: 'linear', numbers: [Number(a), signed(sign, b), Number(c!.replace(MINUS, '-'))], x };
  }

  const parsed = questions.map(parse);
  const near = (count: number, of: number, share: number) =>
    Math.abs(count / of - share) <= 0.05;

  it('picks the three forms equally', () => {
    for (const form of ['linear', 'bracket', 'both']) {
      const count = parsed.filter((item) => item.form === form).length;
      expect(near(count, COUNT, 1 / 3), form).toBe(true);
    }
  });

  it('draws the solution in [−10, 20] without 0, negative in 25%', () => {
    for (const { x, question } of parsed) {
      expect(x, question.key).toBeGreaterThanOrEqual(-10);
      expect(x, question.key).toBeLessThanOrEqual(20);
      expect(x, question.key).not.toBe(0);
    }
    expect(near(parsed.filter((item) => item.x < 0).length, COUNT, 0.25)).toBe(true);
  });

  it('draws the coefficients and constants of spec §5.37', () => {
    for (const { form, numbers, x, question } of parsed) {
      const [a, b] = numbers as [number, number];
      expect(Math.abs(b), question.key).toBeGreaterThanOrEqual(1);
      expect(Math.abs(b), question.key).toBeLessThanOrEqual(20);
      if (form === 'both') {
        const [, , c, d] = numbers as [number, number, number, number];
        expect(a, question.key).toBeGreaterThanOrEqual(3);
        expect(c, question.key).toBeGreaterThanOrEqual(1);
        expect(c, question.key).toBeLessThanOrEqual(a - 1);
        expect(Math.abs(d), question.key).toBeGreaterThanOrEqual(1);
        expect(Math.abs(d), question.key).toBeLessThanOrEqual(50);
        expect(a * x + b, question.key).toBe(c * x + d);
      } else {
        const right = numbers[2]!;
        expect(right, question.key).not.toBe(0);
        expect(Math.abs(right), question.key).toBeLessThanOrEqual(100);
        expect(form === 'linear' ? a * x + b : a * (x + b), question.key).toBe(right);
      }
      expect(a, question.key).toBeGreaterThanOrEqual(2);
      expect(a, question.key).toBeLessThanOrEqual(9);
    }
  });

  it('draws the sign of the constant 1/2 each', () => {
    for (const form of ['linear', 'bracket', 'both']) {
      const ofForm = parsed.filter((item) => item.form === form);
      const share = ofForm.filter((item) => item.numbers[1]! < 0).length / ofForm.length;
      expect(Math.abs(share - 0.5), `${form} ${share}`).toBeLessThanOrEqual(0.05);
    }
  });

  it('answers every question and explains it', () => {
    for (const question of questions) {
      const result = stepOf(question).check(typed(answerOf(question)));
      expect(result.correct, question.key).toBe(true);
      expect(result.explanation, question.key).toBeTruthy();
      expect(question.topic).toBe('equations');
    }
  });
});
