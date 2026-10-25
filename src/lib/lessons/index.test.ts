import { describe, expect, it } from 'vitest';
import { MEASUREMENT_SET, PRACTICE_SETS, TABLES_SET } from '../sets';
import { FIXTURE_LESSON } from './fixture';
import { LESSONS, lessonFor } from './index';

describe('lessonFor', () => {
  it('finds the lesson of a set', () => {
    expect(lessonFor(TABLES_SET, [FIXTURE_LESSON])).toBe(FIXTURE_LESSON);
  });

  it('is undefined for a set without a lesson', () => {
    expect(lessonFor(MEASUREMENT_SET, [FIXTURE_LESSON])).toBeUndefined();
  });

  it('reads the real registry by default', () => {
    expect(lessonFor(TABLES_SET)).toBeUndefined();
  });
});

describe('LESSONS', () => {
  // Shrinks with every lesson; empty once every set has one (lesstof spec §6).
  it('lists exactly these sets without a lesson', () => {
    const missing = PRACTICE_SETS.filter((set) => !lessonFor(set, LESSONS)).map((set) => set.id);
    expect(missing).toEqual([
      'tafels',
      'meten',
      'verhoudingen',
      'getallen',
      'bewerkingen',
      'getalbegrip',
      'breuken',
      'meetkunde',
    ]);
  });
});
