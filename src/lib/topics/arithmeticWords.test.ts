import { describe, expect, it } from 'vitest';
import { createRng } from '../random';
import type { Question } from '../types';
import {
  approximationQuestion,
  ARITHMETIC_WORDS,
  generateArithmeticWords,
  operationQuestion,
} from './arithmeticWords';
import { stepOf } from './testHelpers';

const SAMPLES = 3000;
const NBSP = '\u{a0}';

describe('operationQuestion', () => {
  it('asks the difference of 48 and 12', () => {
    const step = stepOf(operationQuestion('verschil', 48, 12));
    expect(step.kind).toBe('choice');
    expect(step.prompt).toBe('Wat is het verschil van 48 en 12?');
    expect(step.options).toEqual(['4', '36', '60', '576']);
    expect(step.check('36')).toEqual({
      correct: true,
      expected: '36',
      explanation: 'verschil = aftrekken: 48 − 12 = 36',
    });
    expect(step.check('4').correct).toBe(false);
  });

  it('answers each word with its operation and explains it', () => {
    const step = (word: Parameters<typeof operationQuestion>[0]) =>
      stepOf(operationQuestion(word, 48, 12)).check('');
    expect(step('som')).toMatchObject({ expected: '60', explanation: 'som = optellen: 48 + 12 = 60' });
    expect(step('product')).toMatchObject({
      expected: '576',
      explanation: 'product = vermenigvuldigen: 48 × 12 = 576',
    });
    expect(step('quotiënt')).toMatchObject({
      expected: '4',
      explanation: 'quotiënt = delen: 48 : 12 = 4',
    });
    expect(stepOf(operationQuestion('quotiënt', 48, 12)).prompt).toBe(
      'Wat is het quotiënt van 48 en 12?',
    );
  });
});

describe('approximationQuestion', () => {
  it('asks for an amount that is ruim € 50', () => {
    const step = stepOf(approximationQuestion('ruim', 'bedrag', 50, 3));
    expect(step.prompt).toBe(`Welk bedrag is ruim €${NBSP}50?`);
    expect(step.options).toEqual([`€${NBSP}47`, `€${NBSP}50`, `€${NBSP}53`, `€${NBSP}65`]);
    expect(step.check(`€${NBSP}53`)).toEqual({
      correct: true,
      expected: `€${NBSP}53`,
      explanation: `ruim €${NBSP}50 = iets meer dan €${NBSP}50`,
    });
  });

  it('asks for a distance that is bijna 100 km', () => {
    const step = stepOf(approximationQuestion('bijna', 'km', 100, 4));
    expect(step.prompt).toBe('Welke afstand is bijna 100 km?');
    expect(step.options).toEqual(['70 km', '96 km', '100 km', '104 km']);
    expect(step.check('').expected).toBe('96 km');
    expect(step.check('').explanation).toBe('bijna 100 km = iets minder dan 100 km');
  });

  it('words the other two contexts', () => {
    expect(stepOf(approximationQuestion('ruim', 'kinderen', 200, 8)).prompt).toBe(
      'Welk aantal is ruim 200 kinderen?',
    );
    expect(stepOf(approximationQuestion('bijna', 'minuten', 500, 20)).prompt).toBe(
      'Welke tijd is bijna 500 minuten?',
    );
  });
});

describe('generateArithmeticWords', () => {
  const rng = createRng(41);
  const questions: Question[] = Array.from({ length: SAMPLES }, () => generateArithmeticWords(rng));
  const parts = (question: Question) => question.key.split(':');
  const operations = questions.filter((q) => parts(q)[1] === 'operation');
  const approximations = questions.filter((q) => parts(q)[1] === 'approximation');
  const share = (list: Question[], test: (q: Question) => boolean) =>
    list.filter(test).length / list.length;

  it('is multiple choice with four unique options, one of them correct', () => {
    for (const question of questions) {
      const step = question.steps[0]!;
      expect(question.topic).toBe('arithmeticWords');
      expect(question.steps).toHaveLength(1);
      expect(step.kind).toBe('choice');
      expect(new Set(step.options).size).toBe(4);
      expect(step.options).toContain(step.check('').expected);
      expect(step.check(step.check('').expected).correct).toBe(true);
    }
  });

  it('splits the two forms 50/50 and uses every word and context', () => {
    expect(share(questions, (q) => parts(q)[1] === 'operation')).toBeGreaterThan(0.45);
    expect(share(questions, (q) => parts(q)[1] === 'operation')).toBeLessThan(0.55);
    for (const word of ARITHMETIC_WORDS) {
      expect(share(operations, (q) => parts(q)[2] === word)).toBeGreaterThan(0.2);
      expect(share(operations, (q) => parts(q)[2] === word)).toBeLessThan(0.3);
    }
    expect(new Set(approximations.map((q) => parts(q)[3]))).toEqual(
      new Set(['bedrag', 'kinderen', 'km', 'minuten']),
    );
    expect(new Set(approximations.map((q) => parts(q)[2]))).toEqual(new Set(['ruim', 'bijna']));
    expect(share(approximations, (q) => parts(q)[2] === 'ruim')).toBeGreaterThan(0.4);
    expect(share(approximations, (q) => parts(q)[2] === 'ruim')).toBeLessThan(0.6);
  });

  it('operation: a in [12, 99], b in [2, 12], a a multiple of b, options ascending', () => {
    for (const question of operations) {
      const [, , word, a, b] = parts(question).map((part, i) => (i < 3 ? part : Number(part)));
      const [first, second] = [a as number, b as number];
      expect(first).toBeGreaterThanOrEqual(12);
      expect(first).toBeLessThanOrEqual(99);
      expect(second).toBeGreaterThanOrEqual(2);
      expect(second).toBeLessThanOrEqual(12);
      expect(first % second).toBe(0);
      const step = question.steps[0]!;
      const values = step.options!.map(Number);
      expect(values).toEqual([...values].sort((x, y) => x - y));
      expect(new Set(values)).toEqual(
        new Set([first + second, first - second, first * second, first / second]),
      );
      const answers = {
        som: first + second,
        verschil: first - second,
        product: first * second,
        quotiënt: first / second,
      };
      expect(Number(step.check('').expected)).toBe(answers[word as keyof typeof answers]);
    }
  });

  it('approximation: d is 2% to 8% of R (at least 1) and the far option is 30% away', () => {
    for (const question of approximations) {
      const [, , direction, , round, d] = parts(question);
      const [base, offset] = [Number(round), Number(d)];
      expect([20, 50, 100, 200, 500, 1000]).toContain(base);
      expect(offset).toBeGreaterThanOrEqual(Math.max(1, base * 0.02));
      expect(offset).toBeLessThanOrEqual(base * 0.08);
      const step = question.steps[0]!;
      const values = step.options!.map((option) => Number(option.replace(/\D/g, '')));
      expect(values).toEqual([...values].sort((x, y) => x - y));
      const expected = direction === 'ruim' ? base + offset : base - offset;
      expect(Number(step.check('').expected.replace(/\D/g, ''))).toBe(expected);
      expect(values).toEqual(
        direction === 'ruim'
          ? [base - offset, base, base + offset, base * 1.3]
          : [base * 0.7, base - offset, base, base + offset],
      );
    }
  });

  it('is deterministic for a seed', () => {
    expect(generateArithmeticWords(createRng(9)).key).toBe(generateArithmeticWords(createRng(9)).key);
  });
});
