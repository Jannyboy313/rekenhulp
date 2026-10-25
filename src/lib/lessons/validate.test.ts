import { describe, expect, it } from 'vitest';
import { FIXTURE_LESSON } from './fixture';
import { LESSONS } from './index';
import type { Lesson, LessonBlock } from './types';
import { chainHolds, lessonProblems, textProblems } from './validate';

describe('chainHolds', () => {
  it.each([
    ['13 × 7 = 10 × 7 + 3 × 7 = 70 + 21 = 91', true],
    ['84 : 6 = 60 : 6 + 24 : 6 = 14', true],
    ['100 − 10 − 5 = 85', true],
    ['3/4 = 6/8', true],
    ['2\u{202f}500 : 100 = 25', true],
    ['13 × 7 = 90', false],
    ['13 × 7', false],
    ['13 × = 91', false],
    ['7 : 0 = 0', false],
  ])('%s → %s', (line, expected) => {
    expect(chainHolds(line)).toBe(expected);
  });
});

function lessonWith(block: LessonBlock): Lesson {
  return { setId: 'tafels', topics: [{ id: 'a', title: 'A', summary: 'A', blocks: [block] }] };
}

describe('lessonProblems', () => {
  it('accepts the fixture and the registry', () => {
    expect(lessonProblems([FIXTURE_LESSON])).toEqual([]);
    expect(lessonProblems(LESSONS)).toEqual([]);
  });

  const topic = FIXTURE_LESSON.topics[0]!;
  it.each<[string, Lesson[]]>([
    ['unknown set', [{ ...FIXTURE_LESSON, setId: 'nope' }]],
    ['duplicate topic id', [{ setId: 'tafels', topics: [topic, topic] }]],
    ['no topics', [{ setId: 'tafels', topics: [] }]],
    ['topic without blocks', [{ setId: 'tafels', topics: [{ ...topic, blocks: [] }] }]],
    ['two lessons for one set', [FIXTURE_LESSON, FIXTURE_LESSON]],
  ])('reports %s', (_, lessons) => {
    expect(lessonProblems(lessons)).toHaveLength(1);
  });
});

describe('textProblems', () => {
  it('accepts the fixture and the registry', () => {
    expect(textProblems(FIXTURE_LESSON)).toEqual([]);
    expect(LESSONS.flatMap(textProblems)).toEqual([]);
  });

  it.each<[string, LessonBlock, number]>([
    ['ASCII times', { type: 'text', text: 'Reken 7 * 8 uit.' }, 1],
    ['x as operator', { type: 'text', text: 'Reken 7 x 8 uit.' }, 1],
    ['slash as division', { type: 'tip', text: 'Reken 12 / 4 uit.' }, 1],
    ['a fraction', { type: 'text', text: 'Neem 3/4 deel.' }, 0],
    ['a unit with a slash', { type: 'text', text: 'Hij rijdt 80 km/u.' }, 0],
    ['ASCII times in a table', { type: 'table', head: ['Som'], rows: [['7 * 8']] }, 1],
    ['question mark in a worked line', { type: 'worked', lines: ['7 × ? = 56'] }, 1],
    ['hyphen as minus in a worked line', { type: 'worked', lines: ['70 - 7 = 63'] }, 1],
    ['wrong chain', { type: 'worked', lines: ['13 × 7 = 90'] }, 1],
  ])('%s', (_, block, count) => {
    expect(textProblems(lessonWith(block))).toHaveLength(count);
  });
});
