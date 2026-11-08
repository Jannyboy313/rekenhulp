import { describe, expect, it, vi } from 'vitest';
import { createRng } from './random';
import { fromInteger } from './rational';
import {
  allocateQuotas,
  buildMixedSession,
  buildSession,
  generatorsFor,
  insertRepeat,
  MAX_UNIQUE_ATTEMPTS,
  mistakeSession,
  shareCount,
} from './session';
import { DEEP_FIXTURE_SET } from './setFixture';
import {
  choosesTables,
  forLevel,
  FRACTIONS_SET,
  GEOMETRY_SET,
  hasDeep,
  HEURISTICS_SET,
  MEASUREMENT_SET,
  NUMBER_SENSE_SET,
  NUMBER_SYSTEMS_SET,
  NUMBERS_SET,
  OPERATIONS_SET,
  PRACTICE_SETS,
  PROPORTIONS_SET,
  RELATIONS_SET,
  SESSION_SIZES,
  TABLES_SET,
} from './sets';
import { numberStep } from './steps';
import { GENERATORS } from './topics';
import type { Generator, Level, PracticeSet, Question, Topic } from './types';

describe('shareCount', () => {
  it.each([
    [5, 0],
    [10, 2],
    [15, 2],
    [25, 4],
    [50, 8],
    [75, 11],
    [100, 15],
  ])('mixes 15 percent of %i exercises as %i tables', (size, expected) => {
    expect(shareCount(15, size)).toBe(expected);
  });

  it.each([
    [5, 0],
    [10, 2],
    [15, 3],
    [25, 5],
    [50, 10],
  ])('mixes 20 percent of %i exercises as %i Opfrisser exercises', (size, expected) => {
    expect(shareCount(20, size)).toBe(expected);
  });

  it('uses every exercise for a 100% set', () => {
    for (const size of SESSION_SIZES) expect(shareCount(100, size)).toBe(size);
  });
});

describe('allocateQuotas', () => {
  it('distributes by weight with the largest remainder (spec §4.2 Bewerkingen example)', () => {
    const quotas = allocateQuotas(
      [
        { key: 'orderOfOperations', weight: 2 },
        { key: 'properties', weight: 1 },
        { key: 'smartCalculation', weight: 2 },
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
        { key: 'big', weight: 100 },
        { key: 'tiny', weight: 1 },
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
        weight: [1, 2, 4][Math.floor(rng() * 3)]!,
      }));
      const total = Math.floor(rng() * 101);
      const values = [...allocateQuotas(items, total, rng).values()];
      expect(values.reduce((sum, value) => sum + value, 0)).toBe(total);
      if (total >= count) expect(Math.min(...values)).toBeGreaterThanOrEqual(1);
    }
  });

  it('returns zero quotas for a zero total', () => {
    expect(Object.fromEntries(allocateQuotas([{ key: 'a', weight: 1 }], 0, createRng(1)))).toEqual({
      a: 0,
    });
    expect(allocateQuotas([], 0, createRng(1)).size).toBe(0);
  });

  it('rejects invalid input', () => {
    expect(() => allocateQuotas([], 3, createRng(1))).toThrow(RangeError);
    expect(() => allocateQuotas([{ key: 'a', weight: 0 }], 3, createRng(1))).toThrow(RangeError);
    expect(() => allocateQuotas([{ key: 'a', weight: 0.5 }], 3, createRng(1))).toThrow(RangeError);
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

  it('treats the same prompt under another key as a duplicate (10⁻³ = ? from two topics)', () => {
    let count = 0;
    // Every two questions share a prompt but never a key.
    const generate = vi.fn<Generator>(() => {
      const index = count++;
      return {
        key: `key:${index}`,
        topic: 'tables',
        steps: [numberStep({ prompt: `prompt ${Math.floor(index / 2)}`, answer: fromInteger(1) })],
      };
    });
    const questions = buildSession(TABLES_SET, 15, createRng(1), {
      ...GENERATORS,
      tables: generate,
    });
    expect(new Set(questions.map((q) => q.steps[0]!.prompt)).size).toBe(15);
  });
});

describe('generatorsFor', () => {
  it('limits the Tafels set to the chosen tables', () => {
    const questions = buildSession(TABLES_SET, 50, createRng(4), generatorsFor(TABLES_SET, [7]));
    expect(questions).toHaveLength(50);
    expect(new Set(questions.map((q) => q.key)).size).toBe(50);
    for (const question of questions) {
      const numbers = [...question.steps[0]!.prompt.matchAll(/\d+/g)].map((m) => Number(m[0]));
      numbers.push(Number(question.steps[0]!.check('').expected));
      // The two smallest numbers are the factors, the largest is the product.
      expect(numbers.sort((x, y) => x - y).slice(0, 2)).toContain(7);
    }
  });

  it('keeps all tables in the other sets', () => {
    expect(generatorsFor(MEASUREMENT_SET, [7])).toBe(GENERATORS);
  });
});

describe('buildSession for Meten', () => {
  it('mixes 2 tables with 13 exercises over all eleven topics at n = 15 (spec §4.2)', () => {
    const questions = buildSession(MEASUREMENT_SET, 15, createRng(3));
    const counts = new Map<string, number>();
    for (const { topic } of questions) counts.set(topic, (counts.get(topic) ?? 0) + 1);
    expect(counts.get('tables')).toBe(2);
    const perTopic = MEASUREMENT_SET.topics.map(({ topic }) => counts.get(topic) ?? 0);
    expect(perTopic.sort((a, b) => a - b)).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2]);
  });

  it.each([15, 25, 50])('has every topic at n = %i', (size) => {
    const questions = buildSession(MEASUREMENT_SET, size, createRng(size));
    const topics = new Set(questions.map(({ topic }) => topic));
    for (const { topic } of MEASUREMENT_SET.topics) expect(topics.has(topic)).toBe(true);
  });

  it.each([...SESSION_SIZES])('builds %i unique questions', (size) => {
    const questions = buildSession(MEASUREMENT_SET, size, createRng(size));
    expect(questions).toHaveLength(size);
    expect(new Set(questions.map((q) => q.key)).size).toBe(size);
  });
});

describe('buildSession for Verhoudingen', () => {
  it('mixes 2 tables with 13 exercises over all seven topics at n = 15 (spec §4.2)', () => {
    const questions = buildSession(PROPORTIONS_SET, 15, createRng(3));
    const counts = new Map<string, number>();
    for (const { topic } of questions) counts.set(topic, (counts.get(topic) ?? 0) + 1);
    expect(counts.get('tables')).toBe(2);
    const perTopic = PROPORTIONS_SET.topics.map(({ topic }) => counts.get(topic) ?? 0);
    expect(perTopic.sort((a, b) => a - b)).toEqual([1, 2, 2, 2, 2, 2, 2]);
  });

  it.each([...SESSION_SIZES])('builds %i unique questions', (size) => {
    const questions = buildSession(PROPORTIONS_SET, size, createRng(size));
    expect(questions).toHaveLength(size);
    expect(new Set(questions.map((q) => q.key)).size).toBe(size);
  });
});

describe('buildSession for Getallen & delers', () => {
  it('mixes 2 tables with 13 exercises over all six topics at n = 15 (spec §4.2)', () => {
    const questions = buildSession(NUMBERS_SET, 15, createRng(3));
    const counts = new Map<string, number>();
    for (const { topic } of questions) counts.set(topic, (counts.get(topic) ?? 0) + 1);
    expect(counts.get('tables')).toBe(2);
    const perTopic = NUMBERS_SET.topics.map(({ topic }) => counts.get(topic) ?? 0);
    expect(perTopic.sort((a, b) => a - b)).toEqual([2, 2, 2, 2, 2, 3]);
  });

  it.each([...SESSION_SIZES])('builds %i unique questions', (size) => {
    const questions = buildSession(NUMBERS_SET, size, createRng(size));
    expect(questions).toHaveLength(size);
    expect(new Set(questions.map((q) => q.key)).size).toBe(size);
  });
});

describe('buildSession for Bewerkingen', () => {
  it('mixes 2 tables with 5 + 3 + 5 exercises at n = 15 (spec §4.2)', () => {
    const questions = buildSession(OPERATIONS_SET, 15, createRng(3));
    const counts = new Map<string, number>();
    for (const { topic } of questions) counts.set(topic, (counts.get(topic) ?? 0) + 1);
    expect(Object.fromEntries(counts)).toEqual({
      tables: 2,
      orderOfOperations: 5,
      properties: 3,
      smartCalculation: 5,
    });
  });

  it.each([...SESSION_SIZES])('builds %i unique questions', (size) => {
    const questions = buildSession(OPERATIONS_SET, size, createRng(size));
    expect(questions).toHaveLength(size);
    expect(new Set(questions.map((q) => q.key)).size).toBe(size);
  });
});

describe('buildSession for Getalbegrip', () => {
  it('mixes 2 tables with 2 + 2 + 2 + 2 + 2 + 2 + 1 exercises at n = 15 (spec §4.2)', () => {
    const questions = buildSession(NUMBER_SENSE_SET, 15, createRng(3));
    const counts = new Map<string, number>();
    for (const { topic } of questions) counts.set(topic, (counts.get(topic) ?? 0) + 1);
    expect(counts.get('tables')).toBe(2);
    const perTopic = NUMBER_SENSE_SET.topics.map(({ topic }) => counts.get(topic) ?? 0);
    expect(perTopic.sort((a, b) => a - b)).toEqual([1, 2, 2, 2, 2, 2, 2]);
  });

  it.each([...SESSION_SIZES])('builds %i unique questions', (size) => {
    const questions = buildSession(NUMBER_SENSE_SET, size, createRng(size));
    expect(questions).toHaveLength(size);
    expect(new Set(questions.map((q) => q.key)).size).toBe(size);
  });
});

describe('buildSession for Breuken & kommagetallen', () => {
  it('mixes 2 tables with 13 exercises over all six topics at n = 15 (spec §4.2)', () => {
    const questions = buildSession(FRACTIONS_SET, 15, createRng(3));
    const counts = new Map<string, number>();
    for (const { topic } of questions) counts.set(topic, (counts.get(topic) ?? 0) + 1);
    expect(counts.get('tables')).toBe(2);
    const perTopic = FRACTIONS_SET.topics.map(({ topic }) => counts.get(topic) ?? 0);
    expect(perTopic.sort((a, b) => a - b)).toEqual([2, 2, 2, 2, 2, 3]);
  });

  it.each([...SESSION_SIZES])('builds %i unique questions', (size) => {
    const questions = buildSession(FRACTIONS_SET, size, createRng(size));
    expect(questions).toHaveLength(size);
    expect(new Set(questions.map((q) => q.key)).size).toBe(size);
  });
});

describe('buildSession for Meetkunde', () => {
  it('mixes 2 tables with 13 exercises over all seven topics at n = 15 (spec §4.2)', () => {
    const questions = buildSession(GEOMETRY_SET, 15, createRng(3));
    const counts = new Map<string, number>();
    for (const { topic } of questions) counts.set(topic, (counts.get(topic) ?? 0) + 1);
    expect(counts.get('tables')).toBe(2);
    const perTopic = GEOMETRY_SET.topics.map(({ topic }) => counts.get(topic) ?? 0);
    expect(perTopic.sort((a, b) => a - b)).toEqual([1, 2, 2, 2, 2, 2, 2]);
  });

  it.each([...SESSION_SIZES])('builds %i unique questions', (size) => {
    const questions = buildSession(GEOMETRY_SET, size, createRng(size));
    expect(questions).toHaveLength(size);
    expect(new Set(questions.map((q) => q.key)).size).toBe(size);
  });
});

describe('buildSession for Verbanden & statistiek', () => {
  it('mixes 2 tables with 13 exercises over all six topics at n = 15 (spec §4.2)', () => {
    const questions = buildSession(RELATIONS_SET, 15, createRng(3));
    const counts = new Map<string, number>();
    for (const { topic } of questions) counts.set(topic, (counts.get(topic) ?? 0) + 1);
    expect(counts.get('tables')).toBe(2);
    const perTopic = RELATIONS_SET.topics.map(({ topic }) => counts.get(topic) ?? 0);
    expect(perTopic.sort((a, b) => a - b)).toEqual([2, 2, 2, 2, 2, 3]);
  });

  it.each([...SESSION_SIZES])('builds %i unique questions', (size) => {
    const questions = buildSession(RELATIONS_SET, size, createRng(size));
    expect(questions).toHaveLength(size);
    expect(new Set(questions.map((q) => q.key)).size).toBe(size);
  });
});

describe('insertRepeat', () => {
  const queue = ['a', 'b', 'c', 'd', 'e'];

  it('never puts the repeat directly next when other questions remain', () => {
    const rng = createRng(7);
    const seen = new Set<number>();
    for (let i = 0; i < 1000; i++) {
      const result = insertRepeat(queue, 1, 'x', rng);
      expect(result.filter((item) => item !== 'x')).toEqual(queue);
      seen.add(result.indexOf('x'));
    }
    // After 'b' (index 1) and at least one other question: indices 3, 4 or 5.
    expect([...seen].sort()).toEqual([3, 4, 5]);
  });

  it('appends the repeat when nothing else remains', () => {
    expect(insertRepeat(queue, 4, 'x', createRng(1))).toEqual([...queue, 'x']);
  });

  it('places the repeat after the only remaining question', () => {
    expect(insertRepeat(queue, 3, 'x', createRng(1))).toEqual([...queue, 'x']);
  });

  it('does not modify the queue', () => {
    insertRepeat(queue, 1, 'x', createRng(1));
    expect(queue).toEqual(['a', 'b', 'c', 'd', 'e']);
  });
});

describe('buildSession for Talstelsels', () => {
  function counts(size: number) {
    const perTopic = new Map<string, number>();
    for (const { topic } of buildSession(NUMBER_SYSTEMS_SET, size, createRng(3))) {
      perTopic.set(topic, (perTopic.get(topic) ?? 0) + 1);
    }
    return perTopic;
  }

  it('mixes 2 tables with 7 + 6 exercises at n = 15 (spec §4.2)', () => {
    const perTopic = counts(15);
    expect(perTopic.get('tables')).toBe(2);
    const topics = [perTopic.get('numberSystems'), perTopic.get('romanNumerals')];
    expect(topics.sort()).toEqual([6, 7]);
  });

  it('has no tables at n = 5, with 3 + 2 exercises', () => {
    const perTopic = counts(5);
    expect(perTopic.get('tables')).toBeUndefined();
    const topics = [perTopic.get('numberSystems'), perTopic.get('romanNumerals')];
    expect(topics.sort()).toEqual([2, 3]);
  });

  it.each([...SESSION_SIZES])('builds %i unique questions', (size) => {
    const questions = buildSession(NUMBER_SYSTEMS_SET, size, createRng(size));
    expect(questions).toHaveLength(size);
    expect(new Set(questions.map((q) => q.key)).size).toBe(size);
  });
});

describe('buildSession for Heuristieken', () => {
  function counts(size: number) {
    const perTopic = new Map<string, number>();
    for (const { topic } of buildSession(HEURISTICS_SET, size, createRng(3))) {
      perTopic.set(topic, (perTopic.get(topic) ?? 0) + 1);
    }
    return perTopic;
  }

  const TOPICS = ['systematicCounting', 'workingBackwards', 'guessAndCheck', 'simplifyProblem'];

  it('mixes 2 tables with 4 + 3 + 3 + 3 exercises at n = 15 (spec §4.2)', () => {
    const perTopic = counts(15);
    expect(perTopic.get('tables')).toBe(2);
    expect(TOPICS.map((topic) => perTopic.get(topic)).sort()).toEqual([3, 3, 3, 4]);
  });

  it.each([...SESSION_SIZES])('builds %i unique questions', (size) => {
    const questions = buildSession(HEURISTICS_SET, size, createRng(size));
    expect(questions).toHaveLength(size);
    expect(new Set(questions.map((q) => q.key)).size).toBe(size);
  });
});

describe('buildSession for Meten Verdieping', () => {
  const deep = forLevel(MEASUREMENT_SET, 'deep');

  it('has no tables, 3 Opfrisser exercises and 3 + 3 + 3 + 3 Verdieping (spec §4.2)', () => {
    const questions = buildSession(deep, 15, createRng(3));
    const counts = new Map<string, number>();
    for (const { topic } of questions) counts.set(topic, (counts.get(topic) ?? 0) + 1);
    expect(counts.has('tables')).toBe(false);
    expect(deep.topics.map(({ topic }) => counts.get(topic) ?? 0)).toEqual([3, 3, 3, 3]);
    const quick = MEASUREMENT_SET.topics.map(({ topic }) => counts.get(topic) ?? 0);
    expect(quick.reduce((sum, count) => sum + count, 0)).toBe(3);
    expect(Math.max(...quick)).toBe(1);
  });

  it.each([...SESSION_SIZES])('builds %i unique questions', (size) => {
    const questions = buildSession(deep, size, createRng(size));
    expect(questions).toHaveLength(size);
    expect(new Set(questions.map((q) => q.key)).size).toBe(size);
  });
});

describe('buildSession for Verhoudingen Verdieping', () => {
  const deep = forLevel(PROPORTIONS_SET, 'deep');

  it('has no tables, 3 Opfrisser exercises and 3 + 3 + 3 + 3 Verdieping', () => {
    const questions = buildSession(deep, 15, createRng(3));
    const counts = new Map<string, number>();
    for (const { topic } of questions) counts.set(topic, (counts.get(topic) ?? 0) + 1);
    expect(counts.has('tables')).toBe(false);
    expect(deep.topics.map(({ topic }) => counts.get(topic) ?? 0)).toEqual([3, 3, 3, 3]);
    const quick = PROPORTIONS_SET.topics.map(({ topic }) => counts.get(topic) ?? 0);
    expect(quick.reduce((sum, count) => sum + count, 0)).toBe(3);
  });

  it.each([...SESSION_SIZES])('builds %i unique questions', (size) => {
    const questions = buildSession(deep, size, createRng(size));
    expect(questions).toHaveLength(size);
    expect(new Set(questions.map((q) => q.key)).size).toBe(size);
  });
});

describe('buildSession for Getalbegrip Verdieping', () => {
  const deep = forLevel(NUMBER_SENSE_SET, 'deep');

  it('has no tables, 3 Opfrisser exercises and 3 + 3 + 3 + 3 Verdieping', () => {
    const questions = buildSession(deep, 15, createRng(3));
    const counts = new Map<string, number>();
    for (const { topic } of questions) counts.set(topic, (counts.get(topic) ?? 0) + 1);
    expect(counts.has('tables')).toBe(false);
    expect(deep.topics.map(({ topic }) => counts.get(topic) ?? 0)).toEqual([3, 3, 3, 3]);
    const quick = NUMBER_SENSE_SET.topics.map(({ topic }) => counts.get(topic) ?? 0);
    expect(quick.reduce((sum, count) => sum + count, 0)).toBe(3);
  });

  it.each([...SESSION_SIZES])('builds %i unique questions', (size) => {
    const questions = buildSession(deep, size, createRng(size));
    expect(questions).toHaveLength(size);
    expect(new Set(questions.map((q) => q.key)).size).toBe(size);
  });
});

describe('buildSession for Verdieping', () => {
  const deep = forLevel(DEEP_FIXTURE_SET, 'deep');
  const counts = (size: number) => {
    const topics = buildSession(deep, size, createRng(size)).map((q) => q.topic);
    const count = (topic: string) => topics.filter((t) => t === topic).length;
    return {
      lcm: count('lcm'),
      gcd: count('gcd'),
      prime: count('prime'),
      tables: count('tables'),
      total: topics.length,
    };
  };

  it('mixes in 20% Opfrisser and splits the rest by the weights 2 : 1, with no tables', () => {
    expect(counts(15)).toEqual({ lcm: 8, gcd: 4, prime: 3, tables: 0, total: 15 });
    expect(counts(10)).toEqual({ lcm: 5, gcd: 3, prime: 2, tables: 0, total: 10 });
    expect(counts(50)).toEqual({ lcm: 27, gcd: 13, prime: 10, tables: 0, total: 50 });
  });

  it('has no Opfrisser share below 10 and splits 5 by largest remainder', () => {
    expect(counts(5)).toEqual({ lcm: 3, gcd: 2, prime: 0, tables: 0, total: 5 });
  });
});

describe('mistakeSession', () => {
  it('is empty without mistakes', () => {
    expect(mistakeSession([], createRng(1))).toEqual([]);
  });

  it('gives three new exercises per wrong question, of its topic', () => {
    const rng = createRng(2);
    const mistakes = [
      GENERATORS.percentages(rng),
      GENERATORS.scale(rng),
      GENERATORS.percentages(rng),
    ];
    const topics = mistakeSession(mistakes, createRng(3)).map((q) => q.topic);
    expect(topics).toHaveLength(9);
    expect(topics.filter((t) => t === 'percentages')).toHaveLength(6);
    expect(topics.filter((t) => t === 'scale')).toHaveLength(3);
  });

  it('never repeats a wrong question as is', () => {
    // A pool of four: after one mistake exactly the other three remain.
    const pool = [1, 2, 3, 4].map(
      (n): Question => ({
        key: `q${n}`,
        topic: 'lcm',
        steps: [numberStep({ prompt: `p${n}`, answer: fromInteger(n) })],
      }),
    );
    // Cycles through the pool, so the redraws are deterministic (de-duplication is best effort).
    let next = 0;
    const generators = { ...GENERATORS, lcm: () => pool[next++ % pool.length]! };
    const keys = mistakeSession([pool[0]!], createRng(7), generators).map((q) => q.key);
    expect(keys.sort()).toEqual(['q2', 'q3', 'q4']);
  });

  it('keeps the table choice of the Tafels set', () => {
    const mistake = generatorsFor(TABLES_SET, [7]).tables(createRng(5));
    const questions = mistakeSession([mistake], createRng(6), generatorsFor(TABLES_SET, [7]));
    for (const question of questions) {
      const numbers = [...question.steps[0]!.prompt.matchAll(/\d+/g)].map((m) => Number(m[0]));
      numbers.push(Number(question.steps[0]!.check('').expected));
      expect(numbers.sort((x, y) => x - y).slice(0, 2)).toContain(7);
    }
  });
});

describe('buildMixedSession (spec §4.2, Gemengd)', () => {
  type Kind = 'quick' | 'deep';
  const entry = (topic: Topic, set: PracticeSet, kind: Kind) => ({ topic, set: set.id, kind });
  const entries = PRACTICE_SETS.flatMap((set) => [
    ...(choosesTables(set) ? [entry('tables', set, 'quick')] : []),
    ...set.topics.map(({ topic }) => entry(topic, set, 'quick')),
    ...(set.deep ?? []).map(({ topic }) => entry(topic, set, 'deep')),
  ]);
  const owner = new Map(entries.map((entry) => [entry.topic, entry]));
  const ownersOf = (questions: readonly Question[]) => questions.map((q) => owner.get(q.topic)!);
  /** Exercises per set, in the order of `sets` (zeros included). */
  const perSet = (questions: readonly Question[], sets: readonly PracticeSet[], kind?: Kind) => {
    const owners = ownersOf(questions).filter((o) => kind === undefined || o.kind === kind);
    return sets.map((set) => owners.filter((o) => o.set === set.id).length);
  };
  const sorted = (counts: number[]) => [...counts].sort((x, y) => y - x);

  /** Fast generators with a unique key per call, for the distribution tests over many seeds. */
  function stubGenerators(): Record<Topic, Generator> {
    let n = 0;
    const entries = Object.keys(GENERATORS).map((topic) => [
      topic,
      (): Question => ({ key: `${topic}-${n++}`, topic: topic as Topic, steps: [] }),
    ]);
    return Object.fromEntries(entries) as Record<Topic, Generator>;
  }
  const SEEDS = Array.from({ length: 200 }, (_, i) => i + 1);
  const build = (sets: readonly PracticeSet[], level: Level, size: number, seed: number) =>
    buildMixedSession(sets, level, size, createRng(seed), stubGenerators());

  const all = PRACTICE_SETS;
  const deepSets = PRACTICE_SETS.filter(hasDeep);

  it('relies on every topic belonging to one set only', () => {
    expect(owner.size).toBe(entries.length);
  });

  it('gives all 11 sets at Opfrisser 15 exercises: four sets 2, seven 1, no Verdieping topics', () => {
    for (const seed of SEEDS) {
      const questions = build(all, 'quick', 15, seed);
      expect(questions).toHaveLength(15);
      expect(sorted(perSet(questions, all))).toEqual([2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1]);
      expect(ownersOf(questions).every((o) => o.kind === 'quick')).toBe(true);
    }
  });

  it('builds real exercises with the default generators', () => {
    const questions = buildMixedSession(all, 'quick', 15, createRng(4));
    expect(questions).toHaveLength(15);
    expect(sorted(perSet(questions, all))).toEqual([2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1]);
  });

  it('gives 5 random sets 1 exercise at size 5', () => {
    const chosen = new Set<string>();
    for (const seed of SEEDS) {
      const counts = perSet(build(all, 'quick', 5, seed), all);
      expect(sorted(counts)).toEqual([1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0]);
      all.forEach((set, i) => counts[i] && chosen.add(set.id));
    }
    expect(chosen.size).toBe(all.length);
  });

  it('splits Tafels and Meten 8 + 7 with no tables share inside Meten', () => {
    const sets = [TABLES_SET, MEASUREMENT_SET];
    for (const seed of SEEDS) {
      const questions = build(sets, 'quick', 15, seed);
      expect(sorted(perSet(questions, sets))).toEqual([8, 7]);
      const tables = questions.filter((q) => q.topic === 'tables').length;
      expect(tables).toBe(perSet(questions, sets)[0]);
    }
  });

  it('mixes no tables into a set on its own', () => {
    for (const seed of SEEDS.slice(0, 50)) {
      const owners = ownersOf(build([MEASUREMENT_SET], 'quick', 15, seed));
      expect(owners.every((o) => o.set === 'meten' && o.kind === 'quick')).toBe(true);
    }
  });

  it('follows the Bewerkingen weights for its one exercise: never properties', () => {
    const seen = new Set<Topic>();
    const index = all.indexOf(OPERATIONS_SET);
    for (const seed of SEEDS) {
      const questions = build(all, 'quick', 15, seed);
      if (perSet(questions, all)[index] !== 1) continue;
      const topic = questions.find((q) => owner.get(q.topic)!.set === OPERATIONS_SET.id)!.topic;
      seen.add(topic);
    }
    expect([...seen].sort()).toEqual(['orderOfOperations', 'smartCalculation']);
  });

  it('gives the 10 Verdieping sets 3 Opfrisser exercises from 3 sets and splits 12 as 2 + 2 + 1 × 8', () => {
    for (const seed of SEEDS) {
      const questions = build(deepSets, 'deep', 15, seed);
      expect(questions.some((q) => q.topic === 'tables')).toBe(false);
      expect(sorted(perSet(questions, deepSets, 'quick'))).toEqual([1, 1, 1, 0, 0, 0, 0, 0, 0, 0]);
      expect(sorted(perSet(questions, deepSets, 'deep'))).toEqual([2, 2, 1, 1, 1, 1, 1, 1, 1, 1]);
    }
  });

  it('gives Meten and Verhoudingen at Verdieping 10: 1 Opfrisser each and every Verdieping topic once', () => {
    const sets = [MEASUREMENT_SET, PROPORTIONS_SET];
    const deepTopics = sets.flatMap((set) => (set.deep ?? []).map((t) => t.topic)).sort();
    for (const seed of SEEDS) {
      const questions = build(sets, 'deep', 10, seed);
      expect(perSet(questions, sets, 'quick')).toEqual([1, 1]);
      const deep = questions.filter((q) => owner.get(q.topic)!.kind === 'deep');
      expect(deep.map((q) => q.topic).sort()).toEqual(deepTopics);
    }
  });

  it('has no Opfrisser share below 10 at Verdieping', () => {
    for (const seed of SEEDS.slice(0, 50)) {
      const questions = build([MEASUREMENT_SET], 'deep', 5, seed);
      expect(perSet(questions, [MEASUREMENT_SET], 'quick')).toEqual([0]);
      const topics = questions.map((q) => q.topic);
      const counts = (MEASUREMENT_SET.deep ?? []).map(
        ({ topic }) => topics.filter((t) => t === topic).length,
      );
      expect(sorted(counts)).toEqual([2, 1, 1, 1]);
    }
  });

  it('mixes 10 Opfrisser exercises into 50 at Verdieping', () => {
    const questions = build([MEASUREMENT_SET], 'deep', 50, 3);
    expect(perSet(questions, [MEASUREMENT_SET], 'quick')).toEqual([10]);
    expect(perSet(questions, [MEASUREMENT_SET], 'deep')).toEqual([40]);
  });

  it('keeps the counts per set within 1 of each other at 50', () => {
    for (const seed of SEEDS.slice(0, 50)) {
      const counts = perSet(build(all, 'quick', 50, seed), all);
      expect(counts.reduce((sum, c) => sum + c, 0)).toBe(50);
      expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
    }
  });

  it('throws without sets', () => {
    expect(() => buildMixedSession([], 'quick', 15, createRng(1))).toThrow(RangeError);
  });

  it('is deterministic for a seed', () => {
    const keys = () => buildMixedSession(all, 'quick', 15, createRng(9)).map((q) => q.key);
    expect(keys()).toEqual(keys());
  });
});
