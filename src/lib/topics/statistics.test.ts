import { describe, expect, it } from 'vitest';
import { MINUS } from '../format';
import { createRng } from '../random';
import { equals, fromInteger, rational } from '../rational';
import type { Question } from '../types';
import {
  generateStatistics,
  median,
  missingValueQuestion,
  STATS_CONTEXTS,
  statisticsQuestion,
  uniqueMode,
  type Measure,
  type StatsContext,
} from './statistics';
import { answerOf, stepOf, typed } from './testHelpers';

const TIP_FACTOR_TEN = 'Je antwoord is 10 keer te groot. Let op de komma en het aantal nullen.';
const TIP_MEDIAN = 'Zet de getallen eerst op volgorde; de mediaan is het middelste getal.';

describe('median', () => {
  it('is the middle value of an odd list, whatever the order', () => {
    expect(median([9, 5, 6, 8, 7])).toEqual(fromInteger(7));
  });

  it('is the mean of the middle two of an even list', () => {
    expect(median([6, 9, 5, 7, 8, 4])).toEqual(rational(13n, 2n));
  });
});

describe('uniqueMode', () => {
  it.each<[number[], number | null]>([
    [[2, 0, 3, 1, 2], 2],
    [[1, 1, 0, 1, 3], 1],
    [[2, 2, 3, 3, 1], null],
    [[1, 2, 3], null],
  ])('%j → %s', (values, expected) => {
    expect(uniqueMode(values)).toBe(expected);
  });
});

describe('question text', () => {
  it.each<[string, () => Question, string, string, string, string | undefined]>([
    [
      'mean',
      () => statisticsQuestion('cijfers', 'mean', [6, 8, 7, 5, 9]),
      'Cijfers: 6, 8, 7, 5, 9. Wat is het gemiddelde?',
      '7',
      '6 + 8 + 7 + 5 + 9 = 35 → 35 : 5 = 7',
      undefined,
    ],
    [
      'mean with negatives',
      () => statisticsQuestion('temperatuur', 'mean', [4, -2, 3, 0, 5, 1, -4]),
      `Temperaturen deze week in °C: 4, ${MINUS}2, 3, 0, 5, 1, ${MINUS}4. Wat is het gemiddelde?`,
      '1',
      `4 + (${MINUS}2) + 3 + 0 + 5 + 1 + (${MINUS}4) = 7 → 7 : 7 = 1`,
      '°C',
    ],
    [
      'mean, negative sum',
      () => statisticsQuestion('temperatuur', 'mean', [-3, -1, -5, 0, 2, -4, -3]),
      `Temperaturen deze week in °C: ${MINUS}3, ${MINUS}1, ${MINUS}5, 0, 2, ${MINUS}4, ${MINUS}3. Wat is het gemiddelde?`,
      `${MINUS}2`,
      `${MINUS}3 + (${MINUS}1) + (${MINUS}5) + 0 + 2 + (${MINUS}4) + (${MINUS}3) = ${MINUS}14 → ${MINUS}14 : 7 = ${MINUS}2`,
      '°C',
    ],
    [
      'median, odd',
      () => statisticsQuestion('cijfers', 'median', [6, 8, 7, 5, 9]),
      'Cijfers: 6, 8, 7, 5, 9. Wat is de mediaan?',
      '7',
      'op volgorde: 5, 6, 7, 8, 9 → de middelste is 7',
      undefined,
    ],
    [
      'median, odd, negatives',
      () => statisticsQuestion('temperatuur', 'median', [4, -2, 3, 0, 5, 1, -4]),
      `Temperaturen deze week in °C: 4, ${MINUS}2, 3, 0, 5, 1, ${MINUS}4. Wat is de mediaan?`,
      '1',
      `op volgorde: ${MINUS}4, ${MINUS}2, 0, 1, 3, 4, 5 → de middelste is 1`,
      '°C',
    ],
    [
      'median, even',
      () => statisticsQuestion('cijfers', 'median', [6, 9, 5, 7, 8, 4]),
      'Cijfers: 6, 9, 5, 7, 8, 4. Wat is de mediaan?',
      '6,5',
      'op volgorde: 4, 5, 6, 7, 8, 9 → (6 + 7) : 2 = 6,5',
      undefined,
    ],
    [
      'mode',
      () => statisticsQuestion('doelpunten', 'mode', [2, 0, 3, 1, 2]),
      'Doelpunten per wedstrijd: 2, 0, 3, 1, 2. Wat is de modus?',
      '2',
      '2 komt het vaakst voor (2 keer)',
      undefined,
    ],
    [
      'mode, three times',
      () => statisticsQuestion('doelpunten', 'mode', [1, 1, 0, 1, 3]),
      'Doelpunten per wedstrijd: 1, 1, 0, 1, 3. Wat is de modus?',
      '1',
      '1 komt het vaakst voor (3 keer)',
      undefined,
    ],
    [
      'range',
      () => statisticsQuestion('cijfers', 'range', [6, 8, 7, 5, 9]),
      'Cijfers: 6, 8, 7, 5, 9. Wat is de spreidingsbreedte?',
      '4',
      'hoogste − laagste = 9 − 5 = 4',
      undefined,
    ],
    [
      'range, negative lowest',
      () => statisticsQuestion('temperatuur', 'range', [15, 2, -3, 7, 4, 0, 9]),
      `Temperaturen deze week in °C: 15, 2, ${MINUS}3, 7, 4, 0, 9. Wat is de spreidingsbreedte?`,
      '18',
      `hoogste − laagste = 15 − (${MINUS}3) = 18`,
      'graden',
    ],
    [
      'missing value',
      () => missingValueQuestion([6, 8, 7], 7),
      'Je hebt de cijfers 6, 8 en 7. Welk cijfer moet je nog halen om gemiddeld een 7 te staan?',
      '7',
      'gemiddeld 7 bij 4 cijfers = 4 × 7 = 28 → 28 − 6 − 8 − 7 = 7',
      undefined,
    ],
  ])('%s', (_label, make, prompt, expected, explanation, suffix) => {
    const step = stepOf(make());
    expect(step.prompt).toBe(prompt);
    expect(step.suffix).toBe(suffix);
    const result = step.check(typed(answerOf(make())));
    expect(result).toMatchObject({ correct: true, expected, explanation });
  });

  it('rejects a mode question with a tie', () => {
    expect(() => statisticsQuestion('doelpunten', 'mode', [2, 2, 3, 3, 1])).toThrow(RangeError);
  });

  it('builds the key from the form, the context and the list', () => {
    expect(statisticsQuestion('cijfers', 'mean', [6, 8, 7, 5, 9]).key).toBe(
      'statistics:mean:cijfers:6:8:7:5:9',
    );
    expect(missingValueQuestion([6, 8, 7], 7).key).toBe('statistics:missing:7:6:8:7');
  });
});

describe('tips', () => {
  it.each<[string, string, () => Question, string | undefined]>([
    [
      'mean: the sum',
      '35',
      () => statisticsQuestion('cijfers', 'mean', [6, 8, 7, 5, 9]),
      'Deel de som nog door het aantal getallen: 35 : 5.',
    ],
    [
      'mean: the sum, negative',
      `${MINUS}14`,
      () => statisticsQuestion('temperatuur', 'mean', [-3, -1, -5, 0, 2, -4, -3]),
      `Deel de som nog door het aantal getallen: ${MINUS}14 : 7.`,
    ],
    [
      'median, odd: the middle as shown',
      '6',
      () => statisticsQuestion('cijfers', 'median', [9, 5, 6, 8, 7]),
      TIP_MEDIAN,
    ],
    [
      'median, even: the middle two as shown',
      '6',
      () => statisticsQuestion('cijfers', 'median', [6, 9, 5, 7, 8, 4]),
      TIP_MEDIAN,
    ],
    [
      'median: another wrong answer',
      '9',
      () => statisticsQuestion('cijfers', 'median', [9, 5, 6, 8, 7]),
      undefined,
    ],
    [
      'mode: no topic tip',
      '3',
      () => statisticsQuestion('doelpunten', 'mode', [2, 0, 3, 1, 2]),
      undefined,
    ],
    [
      'range: no topic tip',
      '14',
      () => statisticsQuestion('cijfers', 'range', [6, 8, 7, 5, 9]),
      undefined,
    ],
    [
      'range: factor of ten',
      '40',
      () => statisticsQuestion('cijfers', 'range', [6, 8, 7, 5, 9]),
      TIP_FACTOR_TEN,
    ],
    ['missing value: no topic tip', '28', () => missingValueQuestion([6, 8, 7], 7), undefined],
  ])('%s, typing %s', (_label, input, make, tip) => {
    expect(stepOf(make()).check(input).tip).toBe(tip);
  });

  it('gives the correct middle of a list shown in order no tip', () => {
    const result = stepOf(statisticsQuestion('cijfers', 'median', [6, 8, 7, 5, 9])).check('7');
    expect(result.correct).toBe(true);
    expect(result.tip).toBeUndefined();
  });
});

describe('generateStatistics', () => {
  const COUNT = 4000;
  const rng = createRng(5133);
  const questions = Array.from({ length: COUNT }, () => generateStatistics(rng));

  const LABELS: Record<string, StatsContext> = {
    'Cijfers:': 'cijfers',
    'Doelpunten per wedstrijd:': 'doelpunten',
    'Temperaturen deze week in °C:': 'temperatuur',
  };
  const MEASURES: Record<string, Measure> = {
    'Wat is het gemiddelde?': 'mean',
    'Wat is de mediaan?': 'median',
    'Wat is de modus?': 'mode',
    'Wat is de spreidingsbreedte?': 'range',
  };

  function numbers(text: string): number[] {
    return text.split(', ').map((value) => Number(value.replace(MINUS, '-')));
  }

  interface Parsed {
    question: Question;
    measure: Measure | 'missing';
    context: StatsContext | null;
    values: number[];
  }

  function parse(question: Question): Parsed {
    const prompt = stepOf(question).prompt;
    const missing = /^Je hebt de cijfers (.*) en (\d+)\. Welk cijfer/u.exec(prompt);
    if (missing) {
      const values = [...numbers(missing[1]!), Number(missing[2])];
      return { question, measure: 'missing', context: null, values };
    }
    const match = /^(.*?:) (.*)\. (Wat is .*\?)$/u.exec(prompt)!;
    return {
      question,
      measure: MEASURES[match[3]!]!,
      context: LABELS[match[1]!]!,
      values: numbers(match[2]!),
    };
  }

  const parsed = questions.map(parse);
  const share = (count: number) => count / COUNT;

  it('picks the five forms equally', () => {
    for (const form of ['mean', 'median', 'mode', 'range', 'missing']) {
      const count = parsed.filter((item) => item.measure === form).length;
      expect(Math.abs(share(count) - 0.2), form).toBeLessThanOrEqual(0.05);
    }
  });

  it('picks the three contexts equally for the four measures', () => {
    const asked = parsed.filter((item) => item.context !== null);
    for (const context of Object.keys(STATS_CONTEXTS)) {
      const count = asked.filter((item) => item.context === context).length;
      expect(Math.abs(count / asked.length - 1 / 3), context).toBeLessThanOrEqual(0.05);
    }
  });

  it('draws values and lengths within the context', () => {
    for (const { context, values, question } of parsed.filter((item) => item.context !== null)) {
      const { min, max, lengths } = STATS_CONTEXTS[context!];
      expect(lengths, question.key).toContain(values.length);
      for (const value of values) {
        expect(value, question.key).toBeGreaterThanOrEqual(min);
        expect(value, question.key).toBeLessThanOrEqual(max);
      }
    }
  });

  it('puts a value below zero in every temperature list', () => {
    for (const { context, values, question } of parsed) {
      if (context === 'temperatuur') expect(Math.min(...values), question.key).toBeLessThan(0);
    }
  });

  it('draws a whole mean, a unique mode of 2 or 3 and a median that fits', () => {
    for (const { measure, values, question } of parsed) {
      const answer = answerOf(question);
      const key = question.key;
      if (measure === 'mean') {
        const sum = values.reduce((total, value) => total + value, 0);
        expect(sum % values.length === 0, key).toBe(true);
        expect(equals(answer, fromInteger(sum / values.length)), key).toBe(true);
      }
      if (measure === 'mode') {
        const mode = uniqueMode(values);
        expect(mode, key).not.toBeNull();
        const count = values.filter((value) => value === mode).length;
        expect(count, key).toBeGreaterThanOrEqual(2);
        expect(count, key).toBeLessThanOrEqual(3);
        expect(equals(answer, fromInteger(mode!)), key).toBe(true);
      }
      if (measure === 'median') expect(equals(answer, median(values)), key).toBe(true);
      if (measure === 'range') {
        expect(equals(answer, fromInteger(Math.max(...values) - Math.min(...values))), key).toBe(
          true,
        );
      }
    }
  });

  it('draws the missing value of spec §5.33', () => {
    for (const { measure, values, question } of parsed) {
      if (measure !== 'missing') continue;
      const key = question.key;
      const given = values;
      const prompt = stepOf(question).prompt;
      const mean = Number(/gemiddeld een (\d+) te staan/u.exec(prompt)![1]);
      expect(given.length, key).toBeGreaterThanOrEqual(3);
      expect(given.length, key).toBeLessThanOrEqual(5);
      for (const value of given) {
        expect(value, key).toBeGreaterThanOrEqual(3);
        expect(value, key).toBeLessThanOrEqual(10);
      }
      expect(mean, key).toBeGreaterThanOrEqual(5);
      expect(mean, key).toBeLessThanOrEqual(8);
      const answer = answerOf(question);
      expect(answer.num, key).toBeGreaterThanOrEqual(4n);
      expect(answer.num, key).toBeLessThanOrEqual(10n);
      expect(answer.den, key).toBe(1n);
    }
  });

  it('checks the expected answer and explains every question', () => {
    for (const question of questions) {
      const result = stepOf(question).check(typed(answerOf(question)));
      expect(result.correct, question.key).toBe(true);
      expect(result.explanation, question.key).toBeTruthy();
      expect(question.topic).toBe('statistics');
    }
  });
});
