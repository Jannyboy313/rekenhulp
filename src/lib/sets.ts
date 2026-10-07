import { TOPIC_LABELS } from './topics';
import type { PracticeSet } from './types';

export const SESSION_SIZES: readonly number[] = [5, 10, 15, 25, 50];
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

/** v1 topics only; v2 adds fractionConversion and fractionArithmetic (spec §4.1, §12). */
export const PROPORTIONS_SET: PracticeSet = {
  id: 'verhoudingen',
  name: 'Verhoudingen',
  description: 'Procenten en verhoudingen',
  topics: [
    { topic: 'percentages', weight: 1 },
    { topic: 'ratios', weight: 1 },
  ],
  tablesPercent: 15,
};

export const NUMBERS_SET: PracticeSet = {
  id: 'getallen',
  name: 'Getallen & delers',
  description: 'KGV, GGD, priemgetallen, deelbaarheid en kwadraten',
  topics: [
    { topic: 'lcm', weight: 1 },
    { topic: 'gcd', weight: 1 },
    { topic: 'prime', weight: 1 },
    { topic: 'factorization', weight: 1 },
    { topic: 'divisibility', weight: 1 },
    { topic: 'squares', weight: 1 },
  ],
  tablesPercent: 15,
};

/** properties has half weight: two steps take 2–3× as long (spec §4.1). */
export const OPERATIONS_SET: PracticeSet = {
  id: 'bewerkingen',
  name: 'Bewerkingen',
  description: 'Volgorde van bewerkingen, eigenschappen en handig rekenen',
  topics: [
    { topic: 'orderOfOperations', weight: 1 },
    { topic: 'properties', weight: 0.5 },
    { topic: 'smartCalculation', weight: 1 },
  ],
  tablesPercent: 15,
};

export const NUMBER_SENSE_SET: PracticeSet = {
  id: 'getalbegrip',
  name: 'Getalbegrip',
  description: 'Hoofdrekenen, negatieve getallen, afronden, machten en wetenschappelijke notatie',
  topics: [
    { topic: 'mentalOperations', weight: 1 },
    { topic: 'negativeNumbers', weight: 1 },
    { topic: 'rounding', weight: 1 },
    { topic: 'powersRoots', weight: 1 },
    { topic: 'scientificNotation', weight: 1 },
  ],
  tablesPercent: 15,
};

/** Implemented sets in roadmap order. Later plans append their set here (spec §4.1). */
export const PRACTICE_SETS: readonly PracticeSet[] = [
  TABLES_SET,
  MEASUREMENT_SET,
  PROPORTIONS_SET,
  NUMBERS_SET,
  OPERATIONS_SET,
  NUMBER_SENSE_SET,
];

export function describeSetTopics(set: PracticeSet): string[] {
  if (set.tablesPercent === 100) return [TOPIC_LABELS.tables];
  const labels = set.topics.map(({ topic }) => TOPIC_LABELS[topic]);
  return set.tablesPercent > 0 ? [...labels, `${set.tablesPercent}% tafels`] : labels;
}
