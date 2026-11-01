import { describe, expect, it } from 'vitest';
import { evaluate } from '../expr/evaluate';
import { formatExpr } from '../expr/format';
import { parse } from '../expr/parser';
import { evaluationSteps } from '../expr/reduce';
import { createRng } from '../random';
import { fromInteger } from '../rational';
import { plain } from '../slot';
import { bracketStep, drawBracketExercise, generateBracketPlacement } from './bracketPlacement';

const SAMPLES = 3000;
const OPERATORS = ['+', '−', '×', ':'];
const rng = createRng(63);
const exercises = Array.from({ length: SAMPLES }, () => drawBracketExercise(rng));

const valueOf = (text: string) => evaluate(parse(text)!)!;
const countOf = (text: string, char: string) => text.split(char).length - 1;

describe('drawBracketExercise (spec §5.63)', () => {
  it('uses 3 or 4 numbers in [1, 12] with 2 or 3 operators, one of them × or :', () => {
    for (const { numbers, operators } of exercises) {
      expect([3, 4]).toContain(numbers.length);
      expect(operators).toHaveLength(numbers.length - 1);
      for (const n of numbers) {
        expect(n).toBeGreaterThanOrEqual(1);
        expect(n).toBeLessThanOrEqual(12);
      }
      for (const op of operators) expect(OPERATORS).toContain(op);
      expect(operators.some((op) => op === '×' || op === ':')).toBe(true);
    }
    expect(new Set(exercises.map((e) => e.numbers.length))).toEqual(new Set([3, 4]));
    expect(new Set(exercises.flatMap((e) => e.operators))).toEqual(new Set(OPERATORS));
  });

  it('has one pair of parentheses round two or more numbers that gives the target', () => {
    for (const { placed, flat, target } of exercises) {
      expect(countOf(placed, '(')).toBe(1);
      expect(countOf(placed, ')')).toBe(1);
      const inside = /\(([^)]*)\)/.exec(placed)![1]!;
      expect(inside).toMatch(/\d+ [+−×:] \d+/);
      expect(placed.replace(/[()]/g, '')).toBe(flat);
      expect(valueOf(placed)).toEqual(fromInteger(target));
      expect(valueOf(flat)).not.toEqual(fromInteger(target));
    }
  });

  it('has an integer target in [0, 200] and exact divisions, with and without parentheses', () => {
    for (const { placed, flat, target } of exercises) {
      expect(target).toBeGreaterThanOrEqual(0);
      expect(target).toBeLessThanOrEqual(200);
      for (const text of [placed, flat]) {
        const value = valueOf(text);
        expect(value.den).toBe(1n);
      }
      // Every division, also as a sub-expression, is exact: no intermediate result has decimals.
      for (const text of [placed, flat]) {
        for (const step of evaluationSteps(parse(text)!))
          expect(formatExpr(step)).not.toContain(',');
      }
    }
    expect(Math.max(...exercises.map((e) => e.target))).toBeGreaterThan(60);
  });

  it('puts the parentheses in different places', () => {
    const shapes = new Set(
      exercises.map(
        (e) => `${e.numbers.length}:${e.placed.indexOf('(') === 0 ? 'start' : 'inner'}`,
      ),
    );
    expect(shapes.size).toBeGreaterThanOrEqual(3);
  });
});

describe('generateBracketPlacement', () => {
  const questions = Array.from({ length: SAMPLES }, () => generateBracketPlacement(rng));

  it('asks the left side as an expression step with the target in the prompt', () => {
    for (const question of questions) {
      expect(question.topic).toBe('bracketPlacement');
      expect(question.steps).toHaveLength(1);
      const step = question.steps[0]!;
      expect(step.kind).toBe('expression');
      expect(plain(step.prompt)).toMatch(/^Zet haakjes zodat het klopt: [\d +−×:]+ = \d+$/);
      expect(step.prompt).not.toContain('?');
    }
  });

  it('accepts its own expected answer and explains it as the evaluation', () => {
    for (const question of questions) {
      const step = question.steps[0]!;
      const { expected } = step.check('');
      const result = step.check(expected);
      expect(result.correct).toBe(true);
      expect(result.explanation).toMatch(/^[^=]+ = .*\d$/);
      expect(result.explanation!.startsWith(expected)).toBe(true);
    }
  });

  it('keys on the expression without parentheses and the target', () => {
    for (const question of questions) {
      const text = plain(question.steps[0]!.prompt).replace('Zet haakjes zodat het klopt: ', '');
      expect(question.key).toBe(`bracketPlacement:${text}`);
    }
  });
});

describe('bracketStep check', () => {
  // 3 + 4 × 5 − 2 = 33 without parentheses is 21; (3 + 4) × 5 − 2 = 33.
  const step = bracketStep({
    numbers: [3, 4, 5, 2],
    operators: ['+', '×', '−'],
    target: 33,
    placed: '(3 + 4) × 5 − 2',
  });

  const wrongTokens = 'Gebruik dezelfde getallen en bewerkingen in dezelfde volgorde.';

  it.each([
    ['(3+4)×5−2', true],
    ['((3+4))×5−2', true],
    ['(3+4)×(5)−2', true],
    ['(3+4×5)−2', false],
    ['3+4×(5−2)', false],
    ['3+4×5−2', false],
  ])('%s correct = %s', (input, correct) => {
    expect(step.check(input).correct).toBe(correct);
  });

  it('shows the evaluation of a wrong placement ending in ≠ target', () => {
    const result = step.check('3+4×(5−2)');
    expect(result.explanation).toBe('3 + 4 × (5 − 2) = 3 + 4 × 3 = 3 + 12 = 15 ≠ 33');
  });

  it('shows the evaluation of no parentheses ending in ≠ target', () => {
    expect(step.check('3+4×5−2').explanation).toBe('3 + 4 × 5 − 2 = 3 + 20 − 2 = 23 − 2 = 21 ≠ 33');
  });

  it.each(['3+4×5−3', '(3+4)×5', '(3+4)×5−2+1', '(3+4)+5−2', '(4+3)×5−2', '(3+4)×5−2^2'])(
    '%s uses other numbers or operators',
    (input) => {
      const result = step.check(input);
      expect(result.correct).toBe(false);
      expect(result.explanation).toBe(wrongTokens);
    },
  );

  it('does not crash on an inexact quotient in the input', () => {
    const division = bracketStep({
      numbers: [1, 3, 2],
      operators: [':', '−'],
      target: 1,
      placed: '1 : (3 − 2)',
    });
    expect(division.check('1:(3−2)').correct).toBe(true);
    expect(division.check('(1:3)−2').explanation).toBe('(1 : 3) − 2 ≠ 1');
  });

  it('treats unparsable input as wrong without a crash', () => {
    const result = step.check('(3+4×5−2');
    expect(result.correct).toBe(false);
    expect(result.expected).toBe('(3 + 4) × 5 − 2');
  });
});
