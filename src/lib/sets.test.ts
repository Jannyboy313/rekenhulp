import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SESSION_SIZE,
  describeSetTopics,
  PRACTICE_SETS,
  SESSION_SIZES,
  TABLES_SET,
} from './sets';
import type { PracticeSet } from './types';

describe('practice sets', () => {
  it('offers only the Tafels set in the beta', () => {
    expect(PRACTICE_SETS.map((set) => set.id)).toEqual(['tafels']);
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
});
