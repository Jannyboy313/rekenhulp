import { describe, expect, it } from 'vitest';
import { createRng, pick, randomInt, randomIntWhere, randomSeed, shuffle } from './random';

describe('createRng', () => {
  it('is deterministic for the same seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    expect(Array.from({ length: 5 }, a)).toEqual(Array.from({ length: 5 }, b));
  });

  it('produces different sequences for different seeds', () => {
    const a = createRng(1);
    const b = createRng(2);
    expect(Array.from({ length: 5 }, a)).not.toEqual(Array.from({ length: 5 }, b));
  });

  it('returns floats in [0, 1)', () => {
    const rng = createRng(1);
    for (let i = 0; i < 10_000; i++) {
      const value = rng();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe('randomSeed', () => {
  it('returns an unsigned 32-bit integer', () => {
    const seed = randomSeed();
    expect(Number.isInteger(seed)).toBe(true);
    expect(seed).toBeGreaterThanOrEqual(0);
    expect(seed).toBeLessThan(2 ** 32);
  });
});

describe('randomInt', () => {
  it('stays within inclusive bounds and reaches both ends', () => {
    const rng = createRng(7);
    const seen = new Set<number>();
    for (let i = 0; i < 1000; i++) {
      const value = randomInt(rng, 2, 5);
      expect(value).toBeGreaterThanOrEqual(2);
      expect(value).toBeLessThanOrEqual(5);
      seen.add(value);
    }
    expect([...seen].sort((x, y) => x - y)).toEqual([2, 3, 4, 5]);
  });

  it('rejects an invalid range', () => {
    expect(() => randomInt(createRng(1), 5, 2)).toThrow(RangeError);
    expect(() => randomInt(createRng(1), 1.5, 2)).toThrow(RangeError);
  });
});

describe('pick', () => {
  it('returns an element of the list', () => {
    const items = ['a', 'b', 'c'];
    const rng = createRng(3);
    for (let i = 0; i < 100; i++) expect(items).toContain(pick(rng, items));
  });

  it('rejects an empty list', () => {
    expect(() => pick(createRng(1), [])).toThrow(RangeError);
  });
});

describe('shuffle', () => {
  it('returns a permutation without mutating the input', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const copy = [...input];
    const output = shuffle(createRng(3), input);
    expect(input).toEqual(copy);
    expect([...output].sort((x, y) => x - y)).toEqual(input);
    expect(output).not.toEqual(input);
  });
});

describe('randomIntWhere', () => {
  it('only returns accepted values from the range', () => {
    const rng = createRng(5);
    for (let i = 0; i < 1000; i++) {
      const value = randomIntWhere(rng, 11, 99, (candidate) => candidate % 10 !== 0);
      expect(value).toBeGreaterThanOrEqual(11);
      expect(value).toBeLessThanOrEqual(99);
      expect(value % 10).not.toBe(0);
    }
  });

  it('throws when no value is accepted', () => {
    expect(() => randomIntWhere(createRng(1), 1, 5, () => false)).toThrow(RangeError);
  });
});
