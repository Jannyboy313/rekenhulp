import { describe, expect, it } from 'vitest';
import { PRACTICE_SETS } from '../sets';
import type { Topic } from '../types';
import { FIXTURE_LESSON } from './fixture';
import { LESSONS } from './index';
import {
  LESSON_LINKS,
  LESSON_PRACTICE_SIZE,
  lessonLinksFor,
  lessonSetName,
  practiceTopicsFor,
  type LessonRef,
} from './links';

const entries = Object.entries(LESSON_LINKS) as [Topic, readonly LessonRef[]][];

describe('LESSON_LINKS', () => {
  it.each(entries)('%s refers to existing lesson topics only', (topic, refs) => {
    expect(lessonLinksFor(topic).map((lessonTopic) => lessonTopic.id)).toEqual(
      refs.map((ref) => ref.topicId),
    );
  });

  it.each(entries)('%s lists every ref once', (_topic, refs) => {
    const keys = refs.map((ref) => `${ref.setId}/${ref.topicId}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('only names topics of the practice sets', () => {
    const topics = new Set(
      PRACTICE_SETS.flatMap((set) => [...set.topics, ...(set.deep ?? [])]).map((w) => w.topic),
    );
    for (const [topic] of entries) expect(topics.has(topic)).toBe(true);
  });

  it('links across sets where the spec says so (lesstof spec §3.2)', () => {
    expect(lessonLinksFor('remainders').map((t) => t.title)).toEqual(['Delen met rest', 'KGV']);
    expect(lessonLinksFor('tables')).toEqual([]);
    expect(lessonLinksFor('dataSize')).toEqual([]);
  });

  it('reads the real registry by default', () => {
    expect(lessonLinksFor('divisibility', LESSONS).map((t) => t.id)).toEqual([
      'digitRules',
      'combinedRules',
      'chunking',
    ]);
  });
});

describe('lessonLinksFor', () => {
  const links: Partial<Record<Topic, readonly LessonRef[]>> = {
    tables: [
      { setId: 'tafels', topicId: 'halves' },
      { setId: 'tafels', topicId: 'missing' },
      { setId: 'meten', topicId: 'metric' },
      { setId: 'tafels', topicId: 'splitting' },
    ],
  };

  it('keeps the order and drops refs that do not resolve', () => {
    expect(lessonLinksFor('tables', [FIXTURE_LESSON], links).map((t) => t.id)).toEqual([
      'halves',
      'splitting',
    ]);
  });

  it('gives none for a topic without refs', () => {
    expect(lessonLinksFor('lcm', [FIXTURE_LESSON], links)).toEqual([]);
  });
});

describe('lessonSetName (v4 spec §7)', () => {
  it('names the set of the lesson that holds the topic, also for a link to another set', () => {
    // `remainders` is a Bewerkingen topic that links to lessons of two other sets.
    const names = lessonLinksFor('remainders').map((topic) => lessonSetName(topic));
    expect(names).toEqual(['Getalbegrip', 'Getallen & delers']);
  });

  it('is empty for a topic outside the lessons', () => {
    expect(lessonSetName({ id: 'x', title: 'X', summary: '', blocks: [] })).toBe('');
  });
});

describe('practiceTopicsFor (lesstof spec §3.3)', () => {
  const links: Partial<Record<Topic, readonly LessonRef[]>> = {
    lcm: [{ setId: 'getallen', topicId: 'lcm' }],
    gcd: [{ setId: 'getallen', topicId: 'gcd' }],
    remainders: [
      { setId: 'getalbegrip', topicId: 'remainder' },
      { setId: 'getallen', topicId: 'lcm' },
    ],
    volume: [{ setId: 'meten', topicId: 'lcm' }],
  };

  it('gives every practice topic that refers to the lesson topic, in the order of the links', () => {
    expect(practiceTopicsFor('getallen', 'lcm', links)).toEqual(['lcm', 'remainders']);
  });

  it('keeps the topic of another set with the same id apart', () => {
    expect(practiceTopicsFor('meten', 'lcm', links)).toEqual(['volume']);
  });

  it('gives none for a lesson topic without a ref', () => {
    expect(practiceTopicsFor('getallen', 'primes', links)).toEqual([]);
  });

  it('inverts the real links by default', () => {
    expect(practiceTopicsFor('getallen', 'lcm')).toEqual(['lcm', 'lcmGcdProblems', 'remainders']);
    expect(practiceTopicsFor('getalbegrip', 'remainder')).toEqual([
      'remainders',
      'multiStepProblems',
    ]);
  });

  it('is a short session', () => {
    expect(LESSON_PRACTICE_SIZE).toBe(5);
  });
});
