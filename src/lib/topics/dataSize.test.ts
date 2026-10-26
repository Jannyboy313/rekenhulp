import { describe, expect, it } from 'vitest';
import { createRng } from '../random';
import { SLOT } from '../slot';
import { compare, decimalPlaces, parseDutchNumber } from '../rational';
import { dataSizeQuestion, DATA_UNITS, generateDataSize, LARGER_VALUES } from './dataSize';
import { decimal, stepOf } from './testHelpers';

const SAMPLES = 1000;

describe('dataSizeQuestion', () => {
  it.each([
    ['GB', 'MB', '3', '3072', '1 GB = 1024 MB → 3 × 1024 = 3072'],
    ['MB', 'GB', '512', '0,5', '1 GB = 1024 MB → 512 : 1024 = 0,5'],
    ['TB', 'GB', '1,5', '1536', '1 TB = 1024 GB → 1,5 × 1024 = 1536'],
  ])('%s → %s', (from, to, value, expected, explanation) => {
    const step = stepOf(dataSizeQuestion(from!, to!, decimal(value!)));
    expect(step.prompt).toBe(`${value} ${from} = ? ${to}`);
    expect(step.suffix).toBe(to);
    expect(step.check(expected!)).toEqual({ correct: true, expected, explanation });
  });

  it('has no topic tip', () => {
    const step = stepOf(dataSizeQuestion('GB', 'MB', decimal('3')));
    expect(step.check('3000').correct).toBe(false);
    expect(step.check('3000').tip).toBeUndefined();
  });
});

describe('generateDataSize', () => {
  const rng = createRng(33);
  const questions = Array.from({ length: SAMPLES }, () => generateDataSize(rng));

  it('lists the values of the spec', () => {
    expect(DATA_UNITS).toEqual(['kB', 'MB', 'GB', 'TB']);
    expect(LARGER_VALUES.map((value) => `${value.num}/${value.den}`)).toEqual([
      '1/4',
      '1/2',
      '1/1',
      '3/2',
      '2/1',
      '3/1',
      '4/1',
      '8/1',
    ]);
  });

  it('converts neighbouring units only, all 6 directed pairs', () => {
    const pairs = new Set<string>();
    for (const question of questions) {
      expect(question.topic).toBe('dataSize');
      const [from, to] = question.key.split(':')[1]!.split('>');
      expect(Math.abs(DATA_UNITS.indexOf(from!) - DATA_UNITS.indexOf(to!))).toBe(1);
      expect(stepOf(question).prompt).toMatch(new RegExp(`^[\\d, ]+ ${from} = \\? ${to}$`));
      pairs.add(`${from}>${to}`);
    }
    expect(pairs.size).toBe(6);
  });

  it('uses a larger value from the list and a whole smaller value from 256 to 8192', () => {
    const smaller = new Set([256, 512, 1024, 1536, 2048, 3072, 4096, 8192]);
    for (const question of questions) {
      const [from, to] = question.key.split(':')[1]!.split('>');
      const shown = parseDutchNumber(stepOf(question).prompt.split(' ')[0]!)!;
      const answer = parseDutchNumber(stepOf(question).check('').expected)!;
      const [largerValue, smallerValue] =
        DATA_UNITS.indexOf(from!) > DATA_UNITS.indexOf(to!) ? [shown, answer] : [answer, shown];
      expect(LARGER_VALUES.some((value) => compare(value, largerValue) === 0)).toBe(true);
      expect(decimalPlaces(smallerValue)).toBe(0);
      expect(smaller.has(Number(smallerValue.num))).toBe(true);
    }
  });

  it('puts the slot in the prompt', () => {
    for (const question of questions) expect(question.steps[0]!.prompt).toContain(SLOT);
  });
});
