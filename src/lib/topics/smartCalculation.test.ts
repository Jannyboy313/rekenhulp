import { describe, expect, it } from 'vitest';
import { evaluate } from '../expr/evaluate';
import { parse } from '../expr/parser';
import { formatInteger } from '../format';
import { createRng } from '../random';
import type { Question } from '../types';
import {
  generateSmartCalculation,
  MAX_ANSWER,
  MIN_ANSWER,
  STRATEGIES,
  type Strategy,
} from './smartCalculation';

const SAMPLES = 3000;
const rng = createRng(29);
const questions = Array.from({ length: SAMPLES }, () => generateSmartCalculation(rng));

/** The strategy, recognised by the shape of the exercise (the key is just the prompt). */
function strategyOf(question: Question): Strategy {
  const prompt = promptText(question);
  if (prompt.includes(' + ')) return 'compensateAdd';
  if (prompt.includes(' − ')) {
    return explanationOf(question).includes('−') ? 'compensateSubtract' : 'complement';
  }
  if (prompt.includes(':')) return 'splitDivide';
  return [25, 50, 125].includes(operands(question)[1]) ? 'splitMultiply' : 'doubleHalve';
}

function explanationOf(question: Question): string {
  return question.steps[0]!.check('').explanation!;
}

/** The numbers of a text without digit grouping, e.g. [5003, 3000, 2, 2005]. */
function numbersIn(text: string): number[] {
  return [...text.matchAll(/\d+/g)].map((m) => Number(m[0]));
}

function promptText(question: Question): string {
  return question.steps[0]!.prompt.slice(0, -' = ?'.length);
}

/** The two numbers of the prompt; prompts never group digits (all numbers are ≤ 9999). */
function operands(question: Question): [number, number] {
  const [a = NaN, b = NaN] = numbersIn(promptText(question));
  return [a, b];
}

function valueOf(text: string): number {
  return Number(evaluate(parse(text)!)!.num);
}

/** Within ±1 to ±3 of a positive multiple of 10, 100 or 1000 (spec §5.9). */
function isNearRound(value: number): boolean {
  return [10, 100, 1000].some((magnitude) => {
    const round = Math.round(value / magnitude) * magnitude;
    const distance = Math.abs(value - round);
    return round > 0 && distance >= 1 && distance <= 3;
  });
}

function ofStrategy(strategy: Strategy): Question[] {
  return questions.filter((question) => strategyOf(question) === strategy);
}

describe('generateSmartCalculation', () => {
  it('asks for one number and accepts its own answer', () => {
    for (const question of questions) {
      const step = question.steps[0]!;
      const answer = valueOf(promptText(question));
      expect(question.topic).toBe('smartCalculation');
      expect(step.kind).toBe('number');
      expect(step.prompt.endsWith(' = ?')).toBe(true);
      expect(question.key).toBe(`smartCalculation:${promptText(question)}`);
      expect(Number.isInteger(answer)).toBe(true);
      expect(answer).toBeGreaterThanOrEqual(MIN_ANSWER);
      expect(answer).toBeLessThanOrEqual(MAX_ANSWER);
      const result = step.check(String(answer));
      expect(result.correct).toBe(true);
      expect(result.expected).toBe(formatInteger(answer));
    }
  });

  it('explains with a calculation that gives the answer', () => {
    for (const question of questions) {
      const answer = valueOf(promptText(question));
      const explanation = question.steps[0]!.check('').explanation!;
      const [left = '', right = ''] = explanation.split(' = ');
      if (strategyOf(question) === 'complement') {
        // '463 + 537 = 1000': the answer completes the round number.
        const [total] = operands(question);
        expect(right).toBe(formatInteger(total));
        expect(valueOf(left)).toBe(total);
        expect(left.endsWith(` + ${formatInteger(answer)}`)).toBe(true);
      } else {
        expect(right).toBe(formatInteger(answer));
        expect(valueOf(left)).toBe(answer);
      }
    }
  });

  it('uses every strategy about equally often', () => {
    for (const strategy of STRATEGIES) {
      const share = ofStrategy(strategy).length / SAMPLES;
      expect(share).toBeGreaterThan(1 / 6 - 0.03);
      expect(share).toBeLessThan(1 / 6 + 0.03);
    }
  });

  it('compensates near-round numbers', () => {
    for (const question of ofStrategy('compensateAdd')) {
      const [a, b] = operands(question);
      expect(isNearRound(a), String(a)).toBe(true);
      expect(b % 10).not.toBe(0);
      expect(question.steps[0]!.prompt).toContain(' + ');
    }
    for (const question of ofStrategy('compensateSubtract')) {
      const [a, b] = operands(question);
      expect(isNearRound(b), String(b)).toBe(true);
      expect(a).toBeGreaterThan(b);
      expect(question.steps[0]!.prompt).toContain(' − ');
    }
  });

  it('draws the magnitude of the near-round sum term evenly (no redraw skews it)', () => {
    const sums = ofStrategy('compensateAdd');
    const thousands = sums.filter((question) => operands(question)[0] >= 997).length;
    expect(thousands / sums.length).toBeGreaterThan(0.28);
    expect(thousands / sums.length).toBeLessThan(0.39);
  });

  it('subtracts a near-round number from one beyond the next round number', () => {
    for (const question of ofStrategy('compensateSubtract')) {
      const [a, b] = operands(question);
      // '5003 − 3000 + 2 = 2005': the round number R = k·m with k ∈ [1, 8] (k ≥ 2 for m = 10).
      const [, round = NaN] = numbersIn(explanationOf(question));
      const magnitude = round < 100 ? 10 : round < 1000 ? 100 : 1000;
      expect(Math.abs(b - round), `${a} − ${b}`).toBeLessThanOrEqual(3);
      expect(a, `${a} − ${b}`).toBeGreaterThanOrEqual(round + magnitude);
      expect(a - b, `${a} − ${b}`).toBeGreaterThanOrEqual(magnitude - 3);
      expect(a - b).toBeGreaterThanOrEqual(7);
    }
  });

  it('completes 100 or 1000', () => {
    for (const question of ofStrategy('complement')) {
      const [total, b] = operands(question);
      expect([100, 1000]).toContain(total);
      expect(b).toBeGreaterThan(total / 10);
      expect(b).toBeLessThan(total);
      expect(b % 10).not.toBe(0);
      expect(total - b, `${total} − ${b}`).toBeGreaterThanOrEqual(11);
    }
  });

  it('multiplies by 25, 50 or 125 via a round number', () => {
    for (const question of ofStrategy('splitMultiply')) {
      const [a, b] = operands(question);
      expect([25, 50, 125]).toContain(b);
      expect((a * b) % (b === 125 ? 1000 : 100)).toBe(0);
      expect(a % 10, `${a} × ${b}`).not.toBe(0);
    }
  });

  it('doubles a factor ending in 5 and halves an even one', () => {
    for (const question of ofStrategy('doubleHalve')) {
      const [a, b] = operands(question);
      expect([15, 25, 35, 45, 55, 65, 75]).toContain(a);
      expect(b % 2).toBe(0);
      expect(b % 10).not.toBe(0);
      const half = b / 2;
      expect(half).toBeGreaterThanOrEqual(6);
      expect(half).toBeLessThanOrEqual(15);
      expect(half % 5).not.toBe(0);
      // 2a × h is a table fact times 10.
      expect(((2 * a) / 10) * half).toBeLessThanOrEqual(15 * 15);
    }
  });

  it('divides exactly by 4, 5, 8 or 25', () => {
    for (const question of ofStrategy('splitDivide')) {
      const [a, b] = operands(question);
      expect([4, 5, 8, 25]).toContain(b);
      expect(a % b).toBe(0);
      expect(a / b).toBeGreaterThanOrEqual(5);
      expect(a / b).toBeLessThanOrEqual(199);
    }
  });
});
