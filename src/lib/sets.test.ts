import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SESSION_SIZE,
  describeSetTopics,
  MEASUREMENT_SET,
  NUMBER_SENSE_SET,
  NUMBERS_SET,
  OPERATIONS_SET,
  PRACTICE_SETS,
  PROPORTIONS_SET,
  SESSION_SIZES,
  TABLES_SET,
} from './sets';
import type { PracticeSet } from './types';

describe('practice sets', () => {
  it('offers the implemented sets in roadmap order', () => {
    expect(PRACTICE_SETS.map((set) => set.id)).toEqual([
      'tafels',
      'meten',
      'verhoudingen',
      'getallen',
      'bewerkingen',
      'getalbegrip',
    ]);
  });

  it('makes Getalbegrip five equally weighted topics with 15% tables', () => {
    expect(NUMBER_SENSE_SET.name).toBe('Getalbegrip');
    expect(NUMBER_SENSE_SET.tablesPercent).toBe(15);
    expect(NUMBER_SENSE_SET.topics).toEqual([
      { topic: 'mentalOperations', weight: 1 },
      { topic: 'negativeNumbers', weight: 1 },
      { topic: 'rounding', weight: 1 },
      { topic: 'powersRoots', weight: 1 },
      { topic: 'scientificNotation', weight: 1 },
    ]);
  });

  it('makes Bewerkingen three topics, properties at half weight, with 15% tables', () => {
    expect(OPERATIONS_SET.name).toBe('Bewerkingen');
    expect(OPERATIONS_SET.tablesPercent).toBe(15);
    expect(OPERATIONS_SET.topics).toEqual([
      { topic: 'orderOfOperations', weight: 1 },
      { topic: 'properties', weight: 0.5 },
      { topic: 'smartCalculation', weight: 1 },
    ]);
  });

  it('makes Getallen & delers six equally weighted topics with 15% tables', () => {
    expect(NUMBERS_SET.name).toBe('Getallen & delers');
    expect(NUMBERS_SET.tablesPercent).toBe(15);
    expect(NUMBERS_SET.topics).toEqual([
      { topic: 'lcm', weight: 1 },
      { topic: 'gcd', weight: 1 },
      { topic: 'prime', weight: 1 },
      { topic: 'factorization', weight: 1 },
      { topic: 'divisibility', weight: 1 },
      { topic: 'squares', weight: 1 },
    ]);
  });

  it('makes Verhoudingen two equally weighted topics with 15% tables', () => {
    expect(PROPORTIONS_SET.name).toBe('Verhoudingen');
    expect(PROPORTIONS_SET.tablesPercent).toBe(15);
    expect(PROPORTIONS_SET.topics).toEqual([
      { topic: 'percentages', weight: 1 },
      { topic: 'ratios', weight: 1 },
    ]);
  });

  it('makes Meten six equally weighted topics with 15% tables', () => {
    expect(MEASUREMENT_SET.name).toBe('Meten');
    expect(MEASUREMENT_SET.tablesPercent).toBe(15);
    expect(MEASUREMENT_SET.topics).toEqual([
      { topic: 'volume', weight: 1 },
      { topic: 'area', weight: 1 },
      { topic: 'length', weight: 1 },
      { topic: 'mass', weight: 1 },
      { topic: 'time', weight: 1 },
      { topic: 'numberUnits', weight: 1 },
    ]);
  });

  it('makes Tafels a pure tables set', () => {
    expect(TABLES_SET.name).toBe('Tafels');
    expect(TABLES_SET.tablesPercent).toBe(100);
    expect(TABLES_SET.topics).toEqual([]);
  });

  it('offers the session sizes from the spec with 15 as default', () => {
    expect(SESSION_SIZES).toEqual([5, 10, 15, 25, 50]);
    expect(DEFAULT_SESSION_SIZE).toBe(15);
  });
});

describe('describeSetTopics', () => {
  it('describes the Tafels set', () => {
    expect(describeSetTopics(TABLES_SET)).toEqual(['Tafels van 2 t/m 15 (zonder 10)']);
  });

  it('appends the mixed-in tables share for other sets', () => {
    const mixed: PracticeSet = {
      ...TABLES_SET,
      topics: [{ topic: 'tables', weight: 1 }],
      tablesPercent: 15,
    };
    expect(describeSetTopics(mixed)).toEqual(['Tafels van 2 t/m 15 (zonder 10)', '15% tafels']);
  });

  it('describes the Meten set', () => {
    expect(describeSetTopics(MEASUREMENT_SET)).toEqual([
      'Inhoud (ml t/m hl, mm³ t/m m³)',
      'Oppervlakte (mm² t/m km², are, ha)',
      'Lengte (mm t/m km)',
      'Gewicht (mg t/m ton)',
      'Tijd (s, min, uur, dag)',
      'Grote getallen (duizend t/m quadriljoen)',
      '15% tafels',
    ]);
  });

  it('describes the Getallen & delers set', () => {
    expect(describeSetTopics(NUMBERS_SET)).toEqual([
      'KGV (kleinste gemene veelvoud)',
      'GGD (grootste gemene deler)',
      'Priemgetal of niet (11 t/m 199)',
      'Ontbinden in priemfactoren (12 t/m 200)',
      'Deelbaarheid door 2 t/m 15 (zonder 10)',
      'Kwadraten en wortels (2² t/m 25²)',
      '15% tafels',
    ]);
  });

  it('describes the Bewerkingen set', () => {
    expect(describeSetTopics(OPERATIONS_SET)).toEqual([
      'Volgorde van bewerkingen (ook met negatieve getallen)',
      'Eigenschappen (commutatief, associatief, distributief)',
      'Handig rekenen (compenseren, aanvullen, splitsen, verdubbelen en halveren)',
      '15% tafels',
    ]);
  });

  it('describes the Getalbegrip set', () => {
    expect(describeSetTopics(NUMBER_SENSE_SET)).toEqual([
      'Hoofdrekenen met grote getallen (ook delen met rest)',
      'Negatieve getallen (ook temperatuur)',
      'Afronden (tientallen t/m miljoenen, decimalen)',
      'Machten en wortels (2⁵, 0,3², 10⁻³, ∛64)',
      'Wetenschappelijke notatie (4,5 × 10⁶)',
      '15% tafels',
    ]);
  });

  it('describes the Verhoudingen set', () => {
    expect(describeSetTopics(PROPORTIONS_SET)).toEqual([
      'Procenten (deel, percentage, korting/verhoging, terug naar 100%)',
      'Verhoudingen (ontbrekend getal, herschalen, verdelen)',
      '15% tafels',
    ]);
  });
});
