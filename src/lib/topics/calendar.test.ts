import { describe, expect, it } from 'vitest';
import { GROUP_SEPARATOR } from '../format';
import { createRng } from '../random';
import { SLOT } from '../slot';
import { CALENDAR_PAIRS, calendarQuestion, generateCalendar } from './calendar';
import { stepOf } from './testHelpers';

const SAMPLES = 1000;

const pair = (larger: string, smaller: string) =>
  CALENDAR_PAIRS.find((p) => p.larger.singular === larger && p.smaller.singular === smaller)!;

describe('CALENDAR_PAIRS', () => {
  it('has the 12 pairs and factors of the spec', () => {
    expect(CALENDAR_PAIRS.map((p) => [p.larger.singular, p.smaller.singular, p.factor])).toEqual([
      ['etmaal', 'uur', 24],
      ['week', 'dag', 7],
      ['jaar', 'maand', 12],
      ['jaar', 'kwartaal', 4],
      ['kwartaal', 'maand', 3],
      ['lustrum', 'jaar', 5],
      ['decennium', 'jaar', 10],
      ['decennium', 'lustrum', 2],
      ['eeuw', 'jaar', 100],
      ['eeuw', 'decennium', 10],
      ['millennium', 'jaar', 1000],
      ['millennium', 'eeuw', 10],
    ]);
  });
});

describe('calendarQuestion', () => {
  it.each([
    [
      'eeuw',
      'jaar',
      3,
      true,
      '3 eeuwen = ? jaar',
      'jaar',
      '300',
      '1 eeuw = 100 jaar → 3 × 100 = 300',
    ],
    [
      'jaar',
      'maand',
      3,
      false,
      '36 maanden = ? jaar',
      'jaar',
      '3',
      '1 jaar = 12 maanden → 36 : 12 = 3',
    ],
    [
      'decennium',
      'lustrum',
      4,
      true,
      '4 decennia = ? lustra',
      'lustra',
      '8',
      '1 decennium = 2 lustra → 4 × 2 = 8',
    ],
    [
      'etmaal',
      'uur',
      5,
      true,
      '5 etmalen = ? uur',
      'uur',
      '120',
      '1 etmaal = 24 uur → 5 × 24 = 120',
    ],
    [
      'millennium',
      'eeuw',
      10,
      true,
      '10 millennia = ? eeuwen',
      'eeuwen',
      '100',
      '1 millennium = 10 eeuwen → 10 × 10 = 100',
    ],
  ] as const)(
    '%s → %s',
    (larger, smaller, value, toSmaller, prompt, suffix, expected, explanation) => {
      const step = stepOf(calendarQuestion(pair(larger, smaller), value, toSmaller));
      expect(step.prompt).toBe(prompt);
      expect(step.suffix).toBe(suffix);
      expect(step.check(expected)).toEqual({ correct: true, expected, explanation });
      expect(step.check('1').correct).toBe(false);
    },
  );

  it('has no topic tip, only the factor-of-ten fallback', () => {
    const step = stepOf(calendarQuestion(pair('eeuw', 'jaar'), 3, true));
    expect(step.check('7').tip).toBeUndefined();
    expect(step.check('30').tip).toBeTruthy();
  });
});

describe('generateCalendar', () => {
  const rng = createRng(21);
  const questions = Array.from({ length: SAMPLES }, () => generateCalendar(rng));

  it('asks whole values in [2, 12] of the larger unit, with plural units', () => {
    const plurals = new Set(CALENDAR_PAIRS.flatMap((p) => [p.larger.plural, p.smaller.plural]));
    for (const question of questions) {
      expect(question.topic).toBe('calendar');
      const step = question.steps[0]!;
      expect(step.prompt.endsWith(`${SLOT} ${step.suffix}`)).toBe(true);
      const value = question.key.split(':')[2]!;
      const [, from] = step.prompt.match(/^[\d ]+ (\S+) = /)!;
      expect(plurals.has(from!)).toBe(true);
      expect(plurals.has(step.suffix!)).toBe(true);
      const [source, target] = question.key.split(':')[1]!.split('>');
      const found = CALENDAR_PAIRS.find(
        (p) =>
          (p.larger.singular === source && p.smaller.singular === target) ||
          (p.larger.singular === target && p.smaller.singular === source),
      )!;
      expect(found).toBeDefined();
      const largerValue =
        found.larger.singular === source ? Number(value) : Number(value) / found.factor;
      expect(Number.isInteger(largerValue)).toBe(true);
      expect(largerValue).toBeGreaterThanOrEqual(2);
      expect(largerValue).toBeLessThanOrEqual(12);
      expect(step.check(step.check('').expected.replaceAll(GROUP_SEPARATOR, '')).correct).toBe(
        true,
      );
    }
  });

  it('covers all 24 directed pairs', () => {
    const directed = new Set(questions.map((question) => question.key.split(':')[1]));
    expect(directed.size).toBe(24);
  });
});
