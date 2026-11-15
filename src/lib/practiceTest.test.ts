import { describe, expect, it } from 'vitest';
import {
  blueprintFor,
  DOMAINS,
  domainSets,
  hasPassed,
  neededToPass,
  remainingMs,
  type Domain,
  type TestConfig,
} from './practiceTest';
import { PRACTICE_SETS } from './sets';

const MINUTE = 60_000;

function domain(id: string): Domain {
  return DOMAINS.find((d) => d.id === id)!;
}

describe('blueprintFor (test spec §3.2)', () => {
  it.each<[TestConfig, number[], number, number]>([
    [{ length: 'short', lkt: false }, [8, 5, 2, 0, 0], 15, 17],
    [{ length: 'short', lkt: true }, [7, 4, 2, 0, 2], 15, 17],
    [{ length: 'long', lkt: false }, [15, 14, 12, 9, 0], 50, 57],
    [{ length: 'long', lkt: true }, [13, 12, 10, 8, 7], 50, 57],
  ])('%o', (config, counts, total, minutes) => {
    const blueprint = blueprintFor(config);
    const { A, B, C, D, H } = blueprint.counts;
    expect([A, B, C, D, H]).toEqual(counts);
    expect(blueprint.total).toBe(total);
    expect(counts.reduce((sum, count) => sum + count, 0)).toBe(total);
    expect(blueprint.limitMs).toBe(minutes * MINUTE);
  });
});

describe('DOMAINS (test spec §3.1)', () => {
  const ids = DOMAINS.flatMap((d) => [...d.sets, ...(d.lktSets ?? [])]);

  it('holds every set except Tafels in exactly one domain', () => {
    const expected = PRACTICE_SETS.map((set) => set.id).filter((id) => id !== 'tafels');
    expect([...ids].sort()).toEqual([...expected].sort());
  });

  it('has no unknown set ids', () => {
    const known = new Set(PRACTICE_SETS.map((set) => set.id));
    expect(ids.filter((id) => !known.has(id))).toEqual([]);
  });
});

describe('domainSets', () => {
  const names = (sets: { name: string }[]) => sets.map((set) => set.name);

  it('gives A without LKT', () => {
    expect(names(domainSets(domain('A'), PRACTICE_SETS, false))).toEqual([
      'Bewerkingen',
      'Getalbegrip',
    ]);
  });

  it('adds the LKT sets of A in pool order', () => {
    expect(names(domainSets(domain('A'), PRACTICE_SETS, true))).toEqual([
      'Getallen & delers',
      'Bewerkingen',
      'Getalbegrip',
      'Talstelsels',
    ]);
  });

  it('gives no sets for Heuristieken without LKT', () => {
    expect(domainSets(domain('H'), PRACTICE_SETS, false)).toEqual([]);
    expect(names(domainSets(domain('H'), PRACTICE_SETS, true))).toEqual(['Heuristieken']);
  });

  it('skips an id that is not in the pool', () => {
    const pool = PRACTICE_SETS.filter((set) => set.id !== 'talstelsels');
    expect(names(domainSets(domain('A'), pool, true))).not.toContain('Talstelsels');
  });
});

describe('pass mark (test spec §6)', () => {
  it.each([
    [15, 11],
    [50, 35],
  ])('needs %d → %d', (total, needed) => {
    expect(neededToPass(total)).toBe(needed);
  });

  it.each([
    [10, 15, false],
    [11, 15, true],
    [34, 50, false],
    [35, 50, true],
    [0, 15, false],
  ])('%d of %d passed: %s', (correct, total, passed) => {
    expect(hasPassed(correct, total)).toBe(passed);
  });
});

describe('remainingMs', () => {
  it.each([
    [1000, 400, 600],
    [1000, 1000, 0],
    [1000, 5000, 0],
  ])('deadline %d at %d → %d', (deadline, now, expected) => {
    expect(remainingMs(deadline, now)).toBe(expected);
  });
});
