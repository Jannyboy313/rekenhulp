import { describe, expect, it } from 'vitest';
import { evaluate } from '../expr/evaluate';
import { parse } from '../expr/parser';
import { formatInteger as f } from '../format';
import { createRng } from '../random';
import { fromInteger, parseDutchNumber } from '../rational';
import { numberStep } from '../steps';
import type { Question } from '../types';
import {
  buildExercise,
  compensationTip,
  complementTip,
  dedupKey,
  type Exercise,
  generateSmartCalculation,
  MAX_ANSWER,
  MIN_ANSWER,
  STRATEGIES,
  type Strategy,
} from './smartCalculation';

const SAMPLES = 3000;
const PER_STRATEGY = 1000;

interface SplitFactor {
  divisor: number;
  power: number;
  minK: number;
  maxK: number;
}

/** `count` exercises of one strategy, each strategy with its own seed. */
function exercisesOf(strategy: Strategy, count = PER_STRATEGY): Exercise[] {
  const rng = createRng(100 + STRATEGIES.indexOf(strategy));
  return Array.from({ length: count }, () => buildExercise(rng, strategy));
}

function promptText(question: Question): string {
  return question.steps[0]!.prompt.slice(0, -' = ?'.length);
}

function explanationOf(question: Question): string {
  return question.steps[0]!.check('').explanation!;
}

/** The numbers of a text without digit grouping, e.g. [5003, 2998]. */
function numbersIn(text: string): number[] {
  return [...text.matchAll(/\d+/g)].map((m) => Number(m[0]));
}

/** The groups of `pattern` in `text` as numbers; fails the test when it does not match. */
function matchNumbers(text: string, pattern: RegExp): number[] {
  const match = pattern.exec(text);
  expect(match, text).not.toBeNull();
  return match!.slice(1).map(Number);
}

function valueOf(text: string): number {
  return Number(evaluate(parse(text)!)!.num);
}

/** The magnitude m of a round number R = k·m with k ≤ 8 (spec §5.9). */
function magnitudeOf(round: number): number {
  return round < 100 ? 10 : round < 1000 ? 100 : 1000;
}

/** The k range of R = k·m (spec §5.9). */
function expectRoundInRange(round: number): void {
  const magnitude = magnitudeOf(round);
  expect(round % magnitude, String(round)).toBe(0);
  expect(round / magnitude, String(round)).toBeGreaterThanOrEqual(magnitude === 10 ? 2 : 1);
  expect(round / magnitude, String(round)).toBeLessThanOrEqual(8);
}

/** The strategy, recognised by the shape of the exercise. */
function strategyOf(question: Question): Strategy {
  const prompt = promptText(question);
  if (prompt.includes(' + ')) return 'compensateAdd';
  if (prompt.includes(' − ')) {
    return explanationOf(question).includes('−') ? 'compensateSubtract' : 'complement';
  }
  if (prompt.includes(':')) return 'splitDivide';
  return [25, 50, 125].includes(numbersIn(prompt)[1]!) ? 'splitMultiply' : 'doubleHalve';
}

describe('generateSmartCalculation', () => {
  const rng = createRng(29);
  const questions = Array.from({ length: SAMPLES }, () => generateSmartCalculation(rng));

  it('asks for one number and accepts its own answer', () => {
    for (const question of questions) {
      const step = question.steps[0]!;
      const answer = valueOf(promptText(question));
      expect(question.topic).toBe('smartCalculation');
      expect(step.kind).toBe('number');
      expect(step.prompt.endsWith(' = ?')).toBe(true);
      expect(question.key).toBe(dedupKey(promptText(question)));
      expect(Number.isInteger(answer)).toBe(true);
      expect(answer).toBeGreaterThanOrEqual(MIN_ANSWER);
      expect(answer).toBeLessThanOrEqual(MAX_ANSWER);
      const result = step.check(String(answer));
      expect(result.correct).toBe(true);
      expect(result.expected).toBe(f(answer));
    }
  });

  it('explains with a calculation that gives the answer', () => {
    for (const question of questions) {
      const answer = valueOf(promptText(question));
      const [left = '', right = ''] = explanationOf(question).split(' = ');
      if (strategyOf(question) === 'complement') {
        // '463 + 537 = 1000': the answer completes the round number.
        const [total = NaN] = numbersIn(promptText(question));
        expect(right).toBe(f(total));
        expect(valueOf(left)).toBe(total);
        expect(left.endsWith(` + ${f(answer)}`)).toBe(true);
      } else {
        expect(right).toBe(f(answer));
        expect(valueOf(left)).toBe(answer);
      }
    }
  });

  it('uses every strategy about equally often', () => {
    for (const strategy of STRATEGIES) {
      const share = questions.filter((question) => strategyOf(question) === strategy).length;
      expect(share / SAMPLES).toBeGreaterThan(1 / 6 - 0.03);
      expect(share / SAMPLES).toBeLessThan(1 / 6 + 0.03);
    }
  });

  it('keys a product by its factors in ascending order', () => {
    for (const question of questions) {
      const prompt = promptText(question);
      if (!prompt.includes(' × ')) {
        expect(question.key).toBe(`smartCalculation:${prompt}`);
        continue;
      }
      const [x = NaN, y = NaN] = numbersIn(prompt);
      expect(question.key).toBe(`smartCalculation:${Math.min(x, y)} × ${Math.max(x, y)}`);
    }
  });
});

describe('dedupKey', () => {
  it('gives a product and its commuted form one key (spec §5.9)', () => {
    // Split (×) asks 12 × 25, double/halve asks 25 × 12.
    expect(dedupKey('12 × 25')).toBe('smartCalculation:12 × 25');
    expect(dedupKey('25 × 12')).toBe('smartCalculation:12 × 25');
    // Numeric, not alphabetical, order.
    expect(dedupKey('125 × 16')).toBe('smartCalculation:16 × 125');
    expect(dedupKey('16 × 125')).toBe('smartCalculation:16 × 125');
  });

  it('keeps every other sum as it is', () => {
    expect(dedupKey('1000 − 463')).toBe('smartCalculation:1000 − 463');
    expect(dedupKey('398 + 247')).toBe('smartCalculation:398 + 247');
    expect(dedupKey('72 : 4')).toBe('smartCalculation:72 : 4');
  });
});

describe('buildExercise', () => {
  it('compensates a near-round first term (+)', () => {
    for (const { prompt, answer, explanation } of exercisesOf('compensateAdd')) {
      const [a = NaN, b = NaN] = matchNumbers(prompt, /^(\d+) \+ (\d+)$/);
      const [round = NaN, explainedB, d = NaN] = matchNumbers(
        explanation,
        /^(\d+) \+ (\d+) [+−] (\d+) = /,
      );
      const magnitude = magnitudeOf(round);
      expectRoundInRange(round);
      expect(explainedB).toBe(b);
      expect(Math.abs(a - round)).toBe(d);
      expect(d).toBeGreaterThanOrEqual(1);
      expect(d).toBeLessThanOrEqual(3);
      expect(b).toBeGreaterThanOrEqual(magnitude + 1);
      expect(b).toBeLessThanOrEqual(Math.min(10 * magnitude - 1, MAX_ANSWER - a));
      expect(b % 10).not.toBe(0);
      expect(answer).toBe(a + b);
      expect(explanation).toBe(`${f(round)} + ${f(b)} ${a < round ? '−' : '+'} ${d} = ${f(a + b)}`);
    }
  });

  it('draws the magnitude of the near-round sum term evenly (no redraw skews it)', () => {
    const exercises = exercisesOf('compensateAdd');
    const thousands = exercises.filter(({ prompt }) => numbersIn(prompt)[0]! >= 997).length;
    expect(thousands / exercises.length).toBeGreaterThan(0.28);
    expect(thousands / exercises.length).toBeLessThan(0.39);
  });

  it('reaches the answer 10 000 and formats it with digit grouping', () => {
    const rng = createRng(3);
    let edge: Exercise | undefined;
    for (let i = 0; i < 200_000 && !edge; i++) {
      const exercise = buildExercise(rng, 'compensateAdd');
      if (exercise.answer === MAX_ANSWER) edge = exercise;
    }
    expect(edge).toBeDefined();
    expect(edge!.explanation.endsWith(` = ${f(10_000)}`)).toBe(true);
  });

  it('compensates a near-round second term (−)', () => {
    for (const { prompt, answer, explanation } of exercisesOf('compensateSubtract')) {
      const [a = NaN, b = NaN] = matchNumbers(prompt, /^(\d+) − (\d+)$/);
      const [explainedA, round = NaN] = matchNumbers(explanation, /^(\d+) − (\d+) [+−] \d+ = /);
      const magnitude = magnitudeOf(round);
      const d = Math.abs(b - round);
      expectRoundInRange(round);
      expect(explainedA).toBe(a);
      expect(d).toBeGreaterThanOrEqual(1);
      expect(d).toBeLessThanOrEqual(3);
      // a lies beyond the next round number, so a − R never goes below zero.
      expect(a).toBeGreaterThanOrEqual(round + magnitude);
      expect(a).toBeLessThanOrEqual(10 * magnitude - 1);
      expect(answer).toBe(a - b);
      expect(explanation).toBe(`${f(a)} − ${f(round)} ${b < round ? '+' : '−'} ${d} = ${f(a - b)}`);
    }
  });

  it('completes 100 or 1000 with an answer of at least 11', () => {
    const exercises = exercisesOf('complement');
    for (const { prompt, answer, explanation } of exercises) {
      const [total = NaN, b = NaN] = matchNumbers(prompt, /^(100|1000) − (\d+)$/);
      expect(b).toBeGreaterThanOrEqual(total === 100 ? 11 : 101);
      expect(b).toBeLessThanOrEqual(total === 100 ? 89 : 989);
      expect(b % 10).not.toBe(0);
      expect(answer).toBe(total - b);
      expect(answer).toBeGreaterThanOrEqual(11);
      expect(explanation).toBe(`${f(b)} + ${f(answer)} = ${f(total)}`);
    }
    const hundreds = exercises.filter(({ prompt }) => prompt.startsWith('100 ')).length;
    expect(hundreds / exercises.length).toBeGreaterThan(0.45);
    expect(hundreds / exercises.length).toBeLessThan(0.55);
  });

  it('multiplies by 25, 50 or 125 via a round number', () => {
    // Per factor: a = divisor · k with k ∈ [minK, maxK], explained as a : divisor × power.
    const splits: Record<number, SplitFactor> = {
      25: { divisor: 4, power: 100, minK: 3, maxK: 25 },
      50: { divisor: 2, power: 100, minK: 6, maxK: 50 },
      125: { divisor: 8, power: 1000, minK: 2, maxK: 10 },
    };
    const factors = new Set<number>();
    for (const { prompt, answer, explanation } of exercisesOf('splitMultiply')) {
      const [a = NaN, b = NaN] = matchNumbers(prompt, /^(\d+) × (\d+)$/);
      const split = splits[b];
      expect(split, prompt).toBeDefined();
      const { divisor, power, minK, maxK } = split!;
      factors.add(b);
      expect(a % divisor).toBe(0);
      expect(a / divisor).toBeGreaterThanOrEqual(minK);
      expect(a / divisor).toBeLessThanOrEqual(maxK);
      expect(a % 10, prompt).not.toBe(0);
      expect(answer).toBe(a * b);
      expect(explanation).toBe(`${f(a)} : ${divisor} × ${f(power)} = ${f(a * b)}`);
    }
    expect([...factors].sort((x, y) => x - y)).toEqual([25, 50, 125]);
  });

  it('doubles a factor ending in 5 and halves an even one into a table fact times 10', () => {
    for (const { prompt, answer, explanation } of exercisesOf('doubleHalve')) {
      const [a = NaN, b = NaN] = matchNumbers(prompt, /^(\d+) × (\d+)$/);
      const half = b / 2;
      expect([15, 25, 35, 45, 55, 65, 75]).toContain(a);
      expect([6, 7, 8, 9, 11, 12, 13, 14]).toContain(half);
      expect(answer).toBe(a * b);
      expect(explanation).toBe(`${f(2 * a)} × ${f(half)} = ${f(a * b)}`);
    }
  });

  it('divides exactly by 4, 5, 8 or 25 via easy steps', () => {
    const splits: Record<number, { minQ: number; maxQ: number; steps: string }> = {
      4: { minQ: 13, maxQ: 99, steps: ': 2 : 2' },
      5: { minQ: 13, maxQ: 199, steps: '× 2 : 10' },
      8: { minQ: 13, maxQ: 99, steps: ': 2 : 2 : 2' },
      25: { minQ: 5, maxQ: 99, steps: '× 4 : 100' },
    };
    const divisors = new Set<number>();
    for (const { prompt, answer, explanation } of exercisesOf('splitDivide')) {
      const [a = NaN, divisor = NaN] = matchNumbers(prompt, /^(\d+) : (\d+)$/);
      const split = splits[divisor];
      expect(split, prompt).toBeDefined();
      const { minQ, maxQ, steps } = split!;
      divisors.add(divisor);
      expect(a % divisor).toBe(0);
      const quotient = a / divisor;
      expect(quotient).toBeGreaterThanOrEqual(minQ);
      expect(quotient).toBeLessThanOrEqual(maxQ);
      expect(quotient % 10, prompt).not.toBe(0);
      expect(answer).toBe(quotient);
      expect(explanation).toBe(`${f(a)} ${steps} = ${f(quotient)}`);
    }
    expect([...divisors].sort((x, y) => x - y)).toEqual([4, 5, 8, 25]);
  });
});

describe('smart calculation tips', () => {
  it('names compensation the wrong way round', () => {
    const near = { value: 398, round: 400, offset: -2, magnitude: 100 };
    // 398 + 247 = 645; compensating the wrong way gives 400 + 247 + 2 = 649.
    expect(compensationTip(near, -2, 645)(fromInteger(649))).toBe(
      '398 = 400 − 2, dus compenseer met − 2, niet met + 2.',
    );
    const subtracted = { value: 2998, round: 3000, offset: -2, magnitude: 1000 };
    // 5003 − 2998 = 2005; the wrong way gives 5003 − 3000 − 2 = 2001.
    expect(compensationTip(subtracted, 2, 2005)(fromInteger(2001))).toBe(
      '2998 = 3000 − 2, dus compenseer met + 2, niet met − 2.',
    );
    expect(compensationTip(near, -2, 645)(fromInteger(650))).toBeUndefined();
  });

  it('checks a complement', () => {
    expect(complementTip(463, 1000, 537)(fromInteger(547))).toBe('463 + 547 = 1010, niet 1000.');
    expect(complementTip(463, 1000, 537)(parseDutchNumber('5,5')!)).toBeUndefined();
  });

  it('leaves a complement 10ᵏ times the correct one to the factor-of-ten tip', () => {
    expect(complementTip(463, 1000, 537)(fromInteger(5370))).toBeUndefined();
    expect(complementTip(463, 1000, 537)(fromInteger(53_700))).toBeUndefined();
    const step = numberStep({
      prompt: '1000 − 463 = ?',
      answer: fromInteger(537),
      diagnose: complementTip(463, 1000, 537),
    });
    expect(step.check('5370').tip).toContain('10 keer te groot');
  });

  const numbersIn = (prompt: string) =>
    [...prompt.matchAll(/\d[\d ]*/g)].map((m) => Number(m[0].replace(/\D/g, '')));
  const sign = (offset: number) => `${offset < 0 ? '−' : '+'} ${Math.abs(offset)}`;
  const nearestRound = (value: number) => Math.round(value / 10) * 10;
  const compensationText = (value: number, offset: number, correction: number) =>
    `${f(value)} = ${f(value - offset)} ${sign(offset)}, dus compenseer met ${sign(correction)}, niet met ${sign(-correction)}.`;

  it('names the wrong compensation of a sum', () => {
    const rng = createRng(9);
    for (let i = 0; i < 300; i++) {
      const { prompt, diagnose } = buildExercise(rng, 'compensateAdd');
      const [a, b] = numbersIn(prompt) as [number, number];
      const round = nearestRound(a);
      expect(diagnose!(fromInteger(2 * round - a + b))).toBe(
        compensationText(a, a - round, a - round),
      );
    }
  });

  it('names the wrong compensation of a difference', () => {
    const rng = createRng(10);
    for (let i = 0; i < 300; i++) {
      const { prompt, diagnose } = buildExercise(rng, 'compensateSubtract');
      const [a, b] = numbersIn(prompt) as [number, number];
      const round = nearestRound(b);
      expect(diagnose!(fromInteger(a - 2 * round + b))).toBe(
        compensationText(b, b - round, round - b),
      );
    }
  });

  it('shows the sum of a wrong complement', () => {
    const rng = createRng(11);
    for (let i = 0; i < 300; i++) {
      const { prompt, answer, diagnose } = buildExercise(rng, 'complement');
      const [total, b] = numbersIn(prompt) as [number, number];
      const wrong = answer + 1;
      expect(diagnose!(fromInteger(wrong))).toBe(
        `${f(b)} + ${f(wrong)} = ${f(b + wrong)}, niet ${f(total)}.`,
      );
    }
  });

  it('reaches the learner through generateSmartCalculation', () => {
    const rng = createRng(12);
    let seen = 0;
    for (let i = 0; i < 1000; i++) {
      const step = generateSmartCalculation(rng).steps[0]!;
      const [a, b] = numbersIn(step.prompt) as [number, number];
      if (step.prompt.includes(' + ')) {
        const round = nearestRound(a);
        const tip = step.check(String(2 * round - a + b)).tip;
        expect(tip).toBe(compensationText(a, a - round, a - round));
        seen++;
      }
    }
    expect(seen).toBeGreaterThan(100);
  });
});
