import type { PracticeSet } from './types';

/** The Oefentoets (test spec): a session in the form of the RWT. */
export type TestLength = 'short' | 'long';

/** Plain data, so a test can be stored (v6) or printed (v8) later. */
export interface TestConfig {
  length: TestLength;
  lkt: boolean;
}

export type DomainId = 'A' | 'B' | 'C' | 'D' | 'H';

export interface Domain {
  id: DomainId;
  /** As on the setup screen. */
  name: string;
  /** Set ids, always in the test. */
  sets: readonly string[];
  /** Set ids added with RWT + LKT. */
  lktSets?: readonly string[];
}

export interface Blueprint {
  total: number;
  limitMs: number;
  counts: Readonly<Record<DomainId, number>>;
}

/** The domains of the toetsmatrijs, plus Heuristieken for the LKT (test spec §3.1). */
export const DOMAINS: readonly Domain[] = [
  {
    id: 'A',
    name: 'Hele getallen',
    sets: ['bewerkingen', 'getalbegrip'],
    // Only `squares` and `remainders` of Getallen & delers are RWT eindtermen (decision 7).
    lktSets: ['getallen', 'talstelsels'],
  },
  { id: 'B', name: 'Verhoudingen en breuken', sets: ['verhoudingen', 'breuken'] },
  { id: 'C', name: 'Meten en meetkunde', sets: ['meten', 'meetkunde'] },
  { id: 'D', name: 'Verbanden en statistiek', sets: ['verbanden'] },
  { id: 'H', name: 'Heuristieken', sets: [], lktSets: ['heuristieken'] },
];

const MINUTE = 60_000;

/** A fixed table, not computed at run time (test spec §3.2). */
const BLUEPRINTS: Record<TestLength, Record<'rwt' | 'lkt', Blueprint>> = {
  short: {
    rwt: { total: 15, limitMs: 17 * MINUTE, counts: { A: 8, B: 5, C: 2, D: 0, H: 0 } },
    lkt: { total: 15, limitMs: 17 * MINUTE, counts: { A: 7, B: 4, C: 2, D: 0, H: 2 } },
  },
  long: {
    rwt: { total: 50, limitMs: 57 * MINUTE, counts: { A: 15, B: 14, C: 12, D: 9, H: 0 } },
    lkt: { total: 50, limitMs: 57 * MINUTE, counts: { A: 13, B: 12, C: 10, D: 8, H: 7 } },
  },
};

/** The row on the Oefenen tab (test spec §4.1): display data only, the test is not a set. */
export const TEST_ROW = {
  id: 'oefentoets',
  name: 'Oefentoets',
  description: 'Toets met tijdslimiet, uitslag na afloop',
} as const;

export const PASS_PERCENT = 70;

export function blueprintFor(config: TestConfig): Blueprint {
  return BLUEPRINTS[config.length][config.lkt ? 'lkt' : 'rwt'];
}

/** The sets of a domain in pool order; an id that is not in the pool is skipped. */
export function domainSets(
  domain: Domain,
  pool: readonly PracticeSet[],
  lkt: boolean,
): PracticeSet[] {
  const ids = lkt ? [...domain.sets, ...(domain.lktSets ?? [])] : domain.sets;
  return pool.filter((set) => ids.includes(set.id));
}

/** The smallest number correct that passes, in integers (test spec §6). */
export function neededToPass(total: number): number {
  return Math.ceil((PASS_PERCENT * total) / 100);
}

export function hasPassed(correct: number, total: number): boolean {
  return correct * 100 >= PASS_PERCENT * total;
}

export function remainingMs(deadline: number, now: number): number {
  return Math.max(0, deadline - now);
}
