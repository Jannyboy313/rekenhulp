import { describe, expect, it, vi } from 'vitest';
import { createRng } from './random';
import { allocateQuotas, buildSession, MAX_UNIQUE_ATTEMPTS, tablesCount } from './session';
import { MEASUREMENT_SET, SESSION_SIZES, TABLES_SET } from './sets';
import { GENERATORS } from './topics';
import type { Generator, Question } from './types';

describe('tablesCount', () => {
  it.each([
    [15, 2],
    [25, 4],
    [50, 8],
    [75, 11],
    [100, 15],
  ])('mixes 15%% of %i exercises as %i tables', (size, expected) => {
    expect(tablesCount(15, size)).toBe(expected);
  });

  it('uses every exercise for a 100% set', () => {
    for (const size of SESSION_SIZES) expect(tablesCount(100, size)).toBe(size);
  });
});

describe('allocateQuotas', () => {
  it('distributes by weight with the largest remainder (spec §4.2 Bewerkingen example)', () => {
    const quotas = allocateQuotas(
      [
        { key: 'orderOfOperations', weight: 1 },
        { key: 'properties', weight: 0.5 },
        { key: 'smartCalculation', weight: 1 },
      ],
      13,
      createRng(1),
    );
    expect(Object.fromEntries(quotas)).toEqual({
      orderOfOperations: 5,
      properties: 3,
      smartCalculation: 5,
    });
  });

  it('splits 13 over two equal topics as 7 + 6', () => {
    const quotas = allocateQuotas(
      [
        { key: 'a', weight: 1 },
        { key: 'b', weight: 1 },
      ],
      13,
      createRng(1),
    );
    expect([...quotas.values()].sort((x, y) => x - y)).toEqual([6, 7]);
  });

  it('breaks ties randomly', () => {
    const items = ['a', 'b', 'c', 'd', 'e', 'f'].map((key) => ({ key, weight: 1 }));
    const winners = new Set<string>();
    for (let seed = 1; seed <= 50; seed++) {
      const quotas = allocateQuotas(items, 13, createRng(seed));
      expect([...quotas.values()].sort((x, y) => x - y)).toEqual([2, 2, 2, 2, 2, 3]);
      for (const [key, count] of quotas) if (count === 3) winners.add(key);
    }
    expect(winners.size).toBeGreaterThan(1);
  });

  it('gives every topic at least one exercise when the total allows', () => {
    const quotas = allocateQuotas(
      [
        { key: 'big', weight: 1 },
        { key: 'tiny', weight: 0.01 },
      ],
      5,
      createRng(1),
    );
    expect(Object.fromEntries(quotas)).toEqual({ big: 4, tiny: 1 });
  });

  it('always allocates exactly the total', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const rng = createRng(seed);
      const count = 1 + Math.floor(rng() * 6);
      const items = Array.from({ length: count }, (_, key) => ({
        key,
        weight: [0.5, 1, 2][Math.floor(rng() * 3)]!,
      }));
      const total = Math.floor(rng() * 101);
      const values = [...allocateQuotas(items, total, rng).values()];
      expect(values.reduce((sum, value) => sum + value, 0)).toBe(total);
      if (total >= count) expect(Math.min(...values)).toBeGreaterThanOrEqual(1);
    }
  });

  it('returns zero quotas for a zero total', () => {
    expect(Object.fromEntries(allocateQuotas([{ key: 'a', weight: 1 }], 0, createRng(1)))).toEqual(
      { a: 0 },
    );
    expect(allocateQuotas([], 0, createRng(1)).size).toBe(0);
  });

  it('rejects invalid input', () => {
    expect(() => allocateQuotas([], 3, createRng(1))).toThrow(RangeError);
    expect(() => allocateQuotas([{ key: 'a', weight: 0 }], 3, createRng(1))).toThrow(RangeError);
  });
});

describe('buildSession', () => {
  it.each([...SESSION_SIZES])('builds %i unique table questions for Tafels', (size) => {
    const questions = buildSession(TABLES_SET, size, createRng(size));
    expect(questions).toHaveLength(size);
    expect(questions.every((q) => q.topic === 'tables')).toBe(true);
    expect(new Set(questions.map((q) => q.key)).size).toBe(size);
  });

  it('is deterministic for a fixed seed', () => {
    const keys = (seed: number) => buildSession(TABLES_SET, 25, createRng(seed)).map((q) => q.key);
    expect(keys(9)).toEqual(keys(9));
    expect(keys(9)).not.toEqual(keys(10));
  });

  it('accepts duplicates after the retry limit instead of looping forever', () => {
    const constant: Question = { key: 'same', topic: 'tables', steps: [] };
    const generate = vi.fn<Generator>(() => constant);
    const questions = buildSession(TABLES_SET, 15, createRng(1), {
      ...GENERATORS,
      tables: generate,
    });
    expect(questions).toHaveLength(15);
    expect(generate).toHaveBeenCalledTimes(1 + 14 * MAX_UNIQUE_ATTEMPTS);
  });
});

describe('buildSession for Meten', () => {
  it('mixes 2 tables with 13 exercises over all six topics at n = 15 (spec §4.2)', () => {
    const questions = buildSession(MEASUREMENT_SET, 15, createRng(3));
    const counts = new Map<string, number>();
    for (const { topic } of questions) counts.set(topic, (counts.get(topic) ?? 0) + 1);
    expect(counts.get('tables')).toBe(2);
    const perTopic = MEASUREMENT_SET.topics.map(({ topic }) => counts.get(topic) ?? 0);
    expect(perTopic.sort((a, b) => a - b)).toEqual([2, 2, 2, 2, 2, 3]);
  });

  it.each([...SESSION_SIZES])('builds %i unique questions', (size) => {
    const questions = buildSession(MEASUREMENT_SET, size, createRng(size));
    expect(questions).toHaveLength(size);
    expect(new Set(questions.map((q) => q.key)).size).toBe(size);
  });
});
