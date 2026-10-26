import type { PracticeSet } from './types';

/**
 * Test-only set with a Verdieping, while no real set has one yet (spec §12.2 step 2). Its
 * prompts tell the levels apart: `Is … een priemgetal?` or a table versus `KGV van …`/`GGD van …`.
 */
export const DEEP_FIXTURE_SET: PracticeSet = {
  id: 'fixture',
  name: 'Fixture',
  description: 'Priemgetallen; Verdieping: KGV en GGD',
  topics: [{ topic: 'prime', weight: 1 }],
  tablesPercent: 15,
  deep: [
    { topic: 'lcm', weight: 2 },
    { topic: 'gcd', weight: 1 },
  ],
};
