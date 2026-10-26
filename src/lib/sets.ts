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
  description: 'Eenheden, grote getallen en snelheid',
  topics: [
    { topic: 'volume', weight: 1 },
    { topic: 'area', weight: 1 },
    { topic: 'length', weight: 1 },
    { topic: 'mass', weight: 1 },
    { topic: 'time', weight: 1 },
    { topic: 'numberUnits', weight: 1 },
    { topic: 'speed', weight: 1 },
  ],
  tablesPercent: 15,
};

/** Five equally weighted topics: the v1 pair plus the v2 additions (spec §4.1). */
export const PROPORTIONS_SET: PracticeSet = {
  id: 'verhoudingen',
  name: 'Verhoudingen',
  description: 'Procenten, verhoudingen en schaal',
  topics: [
    { topic: 'percentages', weight: 1 },
    { topic: 'ratios', weight: 1 },
    { topic: 'percentChange', weight: 1 },
    { topic: 'scale', weight: 1 },
    { topic: 'ratioProblems', weight: 1 },
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

/** properties has half the weight of the others: two steps take 2–3× as long (spec §4.1). */
export const OPERATIONS_SET: PracticeSet = {
  id: 'bewerkingen',
  name: 'Bewerkingen',
  description: 'Volgorde van bewerkingen, eigenschappen en handig rekenen',
  topics: [
    { topic: 'orderOfOperations', weight: 2 },
    { topic: 'properties', weight: 1 },
    { topic: 'smartCalculation', weight: 2 },
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

export const FRACTIONS_SET: PracticeSet = {
  id: 'breuken',
  name: 'Breuken & kommagetallen',
  description: 'Omzetten, rekenen met breuken en met kommagetallen',
  topics: [
    { topic: 'fractionConversion', weight: 1 },
    { topic: 'fractionArithmetic', weight: 1 },
    { topic: 'decimalArithmetic', weight: 1 },
  ],
  tablesPercent: 15,
};

export const GEOMETRY_SET: PracticeSet = {
  id: 'meetkunde',
  name: 'Meetkunde',
  description: 'Omtrek, oppervlakte, inhoud, hoeken en vormen',
  topics: [
    { topic: 'perimeterArea', weight: 1 },
    { topic: 'solids', weight: 1 },
    { topic: 'pythagoras', weight: 1 },
    { topic: 'angles', weight: 1 },
    { topic: 'symmetry', weight: 1 },
    { topic: 'shapeProperties', weight: 1 },
  ],
  tablesPercent: 15,
};

export const RELATIONS_SET: PracticeSet = {
  id: 'verbanden',
  name: 'Verbanden & statistiek',
  description: 'Statistiek, rijen, formules, vergelijkingen en kans',
  topics: [
    { topic: 'statistics', weight: 1 },
    { topic: 'percentagePoints', weight: 1 },
    { topic: 'sequences', weight: 1 },
    { topic: 'formulas', weight: 1 },
    { topic: 'equations', weight: 1 },
    { topic: 'probability', weight: 1 },
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
  FRACTIONS_SET,
  GEOMETRY_SET,
  RELATIONS_SET,
];

/** Only the Tafels set lets the user choose which tables to practise (spec §3.2). */
export function choosesTables(set: PracticeSet): boolean {
  return set.tablesPercent === 100;
}

/** Sessions below this size get no mixed-in table exercises (spec §4.2). */
export const MIN_SIZE_FOR_MIXED_TABLES = 10;

export interface TopicRow {
  name: string;
  detail?: string;
}

/** Splits `Name (detail)` at the first ' (' when the label ends with ')'. */
export function splitTopicLabel(label: string): TopicRow {
  const open = label.indexOf(' (');
  if (open === -1 || !label.endsWith(')')) return { name: label };
  return { name: label.slice(0, open), detail: label.slice(open + 2, -1) };
}

export function describeSetTopicRows(
  set: PracticeSet,
  size = MIN_SIZE_FOR_MIXED_TABLES,
): TopicRow[] {
  if (choosesTables(set)) return [splitTopicLabel(TOPIC_LABELS.tables)];
  const rows = set.topics.map(({ topic }) => splitTopicLabel(TOPIC_LABELS[topic]));
  return set.tablesPercent > 0 && size >= MIN_SIZE_FOR_MIXED_TABLES
    ? [...rows, { name: `${set.tablesPercent}% tafels` }]
    : rows;
}
