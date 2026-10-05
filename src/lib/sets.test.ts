import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SESSION_SIZE,
  describeSetTopics,
  MEASUREMENT_SET,
  PRACTICE_SETS,
  SESSION_SIZES,
  TABLES_SET,
} from './sets';
import type { PracticeSet } from './types';

describe('practice sets', () => {
  it('offers the implemented sets in roadmap order', () => {
    expect(PRACTICE_SETS.map((set) => set.id)).toEqual(['tafels', 'meten']);
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
    expect(SESSION_SIZES).toEqual([15, 25, 50, 75, 100]);
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
});
