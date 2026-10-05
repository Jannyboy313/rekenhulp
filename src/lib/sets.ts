import { TOPIC_LABELS } from './topics';
import type { PracticeSet } from './types';

export const SESSION_SIZES: readonly number[] = [15, 25, 50, 75, 100];
export const DEFAULT_SESSION_SIZE = 15;

export const TABLES_SET: PracticeSet = {
  id: 'tafels',
  name: 'Tafels',
  description: 'Vermenigvuldigen, delen en ontbrekende factor',
  topics: [],
  tablesPercent: 100,
};

export const MEASUREMENT_SET: PracticeSet = {
  id: 'meten',
  name: 'Meten',
  description: 'Eenheden en grote getallen omrekenen',
  topics: [
    { topic: 'volume', weight: 1 },
    { topic: 'area', weight: 1 },
    { topic: 'length', weight: 1 },
    { topic: 'mass', weight: 1 },
    { topic: 'time', weight: 1 },
    { topic: 'numberUnits', weight: 1 },
  ],
  tablesPercent: 15,
};

/** Implemented sets in roadmap order. Later plans append their set here (spec §4.1). */
export const PRACTICE_SETS: readonly PracticeSet[] = [TABLES_SET, MEASUREMENT_SET];

export function describeSetTopics(set: PracticeSet): string[] {
  if (set.tablesPercent === 100) return [TOPIC_LABELS.tables];
  const labels = set.topics.map(({ topic }) => TOPIC_LABELS[topic]);
  return set.tablesPercent > 0 ? [...labels, `${set.tablesPercent}% tafels`] : labels;
}
