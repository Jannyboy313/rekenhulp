import { describe, expect, it } from 'vitest';
import type { PracticeRecord } from './memory';
import { dueTopics, reviewDescription } from './review';

describe('reviewDescription (review spec §4)', () => {
  it.each([
    [1, '1 onderwerp om te herhalen'],
    [2, '2 onderwerpen om te herhalen'],
    [12, '12 onderwerpen om te herhalen'],
  ])('%i', (count, expected) => {
    expect(reviewDescription(count)).toBe(expected);
  });
});

/** A moment in November 2026, local time: the tests hold in any time zone. */
function moment(day: number, hour = 12, minute = 0): number {
  return new Date(2026, 10, day, hour, minute).getTime();
}

function record(topic: string, correct: boolean, at: number): PracticeRecord {
  return { topic, correct, at, source: 'set' };
}

const wrong = (topic: string, at: number) => record(topic, false, at);
const right = (topic: string, at: number) => record(topic, true, at);

const NOW = moment(15);

describe('dueTopics (review spec §3)', () => {
  const cases: [string, PracticeRecord[], number, string[]][] = [
    ['no records', [], NOW, []],
    ['a mistake of today', [wrong('tables', moment(15, 9))], NOW, []],
    ['a mistake of yesterday', [wrong('tables', moment(14, 20))], NOW, ['tables']],
    ['a mistake of a week ago', [wrong('tables', moment(8))], NOW, ['tables']],
    ['right yesterday', [right('tables', moment(14))], NOW, []],
    [
      'wrong yesterday, right today',
      [wrong('tables', moment(14)), right('tables', moment(15, 9))],
      NOW,
      [],
    ],
    [
      'wrong yesterday, right in a later session of yesterday',
      [wrong('tables', moment(14, 10)), right('tables', moment(14, 10, 5))],
      NOW,
      [],
    ],
    [
      'right then wrong in one session',
      [right('tables', moment(14)), wrong('tables', moment(14))],
      NOW,
      ['tables'],
    ],
    [
      'wrong then right in one session',
      [wrong('tables', moment(14)), right('tables', moment(14))],
      NOW,
      ['tables'],
    ],
    [
      'wrong yesterday and wrong today',
      [wrong('tables', moment(14)), wrong('tables', moment(15, 9))],
      NOW,
      [],
    ],
    [
      'right two days ago, wrong yesterday',
      [right('tables', moment(13)), wrong('tables', moment(14))],
      NOW,
      ['tables'],
    ],
    ['an unknown topic id', [wrong('gone-topic', moment(14))], NOW, []],
    [
      'the oldest mistake first',
      [wrong('lcm', moment(14)), wrong('tables', moment(12))],
      NOW,
      ['tables', 'lcm'],
    ],
    [
      'the same moment: the order of the first record',
      [wrong('lcm', moment(14)), wrong('tables', moment(14))],
      NOW,
      ['lcm', 'tables'],
    ],
    ['just before midnight', [wrong('tables', moment(14, 23, 59))], moment(15, 0, 1), ['tables']],
    [
      'another topic does not clear it',
      [wrong('tables', moment(14)), right('lcm', moment(14))],
      NOW,
      ['tables'],
    ],
  ];

  it.each(cases)('%s', (_name, records, now, expected) => {
    expect(dueTopics(records, now)).toEqual(expected);
  });

  it('takes the known ids as an argument', () => {
    expect(dueTopics([wrong('tables', moment(14))], NOW, new Set())).toEqual([]);
  });
});
