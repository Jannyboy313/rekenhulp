import { describe, expect, it } from 'vitest';
import { createRng } from '../random';
import type { Question } from '../types';
import { generateTables, TABLE_FACTORS } from './tables';

const SAMPLES = 1000;

function sample(seed = 1): Question[] {
  const rng = createRng(seed);
  return Array.from({ length: SAMPLES }, () => generateTables(rng));
}

function expectedOf(question: Question): string {
  // `expected` does not depend on the input.
  return question.steps[0]!.check('').expected;
}

describe('TABLE_FACTORS', () => {
  it('is 2 to 15 without 10', () => {
    expect(TABLE_FACTORS).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14, 15]);
  });
});

describe('generateTables', () => {
  const questions = sample();

  it('creates single-step numeric questions on the tables topic', () => {
    for (const question of questions) {
      expect(question.topic).toBe('tables');
      expect(question.key.startsWith('tables:')).toBe(true);
      expect(question.steps).toHaveLength(1);
      expect(question.steps[0]!.kind).toBe('number');
      expect(question.steps[0]!.prompt).toMatch(/\?/);
    }
  });

  it('accepts its own expected answer', () => {
    for (const question of questions) {
      expect(question.steps[0]!.check(expectedOf(question)).correct).toBe(true);
    }
  });

  it('only uses table factors and their exact product', () => {
    for (const question of questions) {
      const numbers = [...question.steps[0]!.prompt.matchAll(/\d+/g)].map((m) => Number(m[0]));
      numbers.push(Number(expectedOf(question)));
      const [a, b, product] = numbers.sort((x, y) => x - y) as [number, number, number];
      expect(TABLE_FACTORS).toContain(a);
      expect(TABLE_FACTORS).toContain(b);
      expect(a * b).toBe(product);
    }
  });

  it('covers every factor', () => {
    const seen = new Set<number>();
    for (const question of questions) {
      for (const m of question.steps[0]!.prompt.matchAll(/\d+/g)) {
        const value = Number(m[0]);
        if (TABLE_FACTORS.includes(value)) seen.add(value);
      }
    }
    expect([...seen].sort((x, y) => x - y)).toEqual(TABLE_FACTORS);
  });

  it('uses the three forms roughly equally', () => {
    const counts = { product: 0, division: 0, missing: 0 };
    for (const { key } of questions) {
      if (key.startsWith('tables:product:')) counts.product++;
      else if (key.startsWith('tables:division:')) counts.division++;
      else if (key.startsWith('tables:missing')) counts.missing++;
    }
    for (const count of Object.values(counts)) {
      expect(count / SAMPLES).toBeGreaterThan(0.28);
      expect(count / SAMPLES).toBeLessThan(0.39);
    }
  });

  it('puts the missing factor on both sides', () => {
    const keys = questions.map((q) => q.key);
    expect(keys.some((k) => k.startsWith('tables:missingLeft:'))).toBe(true);
    expect(keys.some((k) => k.startsWith('tables:missingRight:'))).toBe(true);
  });

  it('explains division and missing-factor answers with the multiplication fact', () => {
    for (const question of questions) {
      const { explanation } = question.steps[0]!.check('');
      if (question.key.startsWith('tables:product:')) {
        expect(explanation).toBeUndefined();
      } else {
        expect(explanation).toMatch(/^\d+ × \d+ = \d+$/);
      }
    }
  });

  it('is deterministic for a fixed seed', () => {
    expect(sample(5).map((q) => q.key)).toEqual(sample(5).map((q) => q.key));
  });
});
