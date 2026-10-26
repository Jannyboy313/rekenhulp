import { describe, expect, it } from 'vitest';
import { MINUS } from '../format';
import { createRng } from '../random';
import type { Question } from '../types';
import {
  differenceQuestion,
  generatePercentagePoints,
  newValueQuestion,
  POINTS_RANGES,
  RELATIVE_CHANGES,
  type PointsContext,
} from './percentagePoints';
import { answerOf, stepOf, typed } from './testHelpers';

const TIP_FACTOR_TEN = 'Je antwoord is 10 keer te groot. Let op de komma en het aantal nullen.';

describe('constants', () => {
  it('lists the ranges and the relative changes of spec §5.34', () => {
    expect(POINTS_RANGES).toEqual({ rente: [1, 8], werkloosheid: [2, 12], opkomst: [40, 95] });
    expect(RELATIVE_CHANGES).toEqual([10, 20, 25, 50, 75, 100]);
  });
});

describe('question text', () => {
  it.each<[string, () => Question, string, string, string, string]>([
    [
      'rente 4 → 5, procentpunt',
      () => differenceQuestion('rente', 4, 5, 'procentpunt'),
      'De rente stijgt van 4% naar 5%. Hoeveel procentpunt is dat?',
      '1',
      '5 − 4 = 1 procentpunt',
      'procentpunt',
    ],
    [
      'rente 4 → 5, procent',
      () => differenceQuestion('rente', 4, 5, 'procent'),
      'De rente stijgt van 4% naar 5%. Met hoeveel procent stijgt de rente?',
      '25',
      '5 − 4 = 1 → 1 van 4 = 1/4 = 25%',
      '%',
    ],
    [
      'werkloosheid 8 → 6, procent',
      () => differenceQuestion('werkloosheid', 8, 6, 'procent'),
      'De werkloosheid daalt van 8% naar 6%. Met hoeveel procent daalt de werkloosheid?',
      '25',
      '8 − 6 = 2 → 2 van 8 = 1/4 = 25%',
      '%',
    ],
    [
      'rente 4 → 7, procent (3/4)',
      () => differenceQuestion('rente', 4, 7, 'procent'),
      'De rente stijgt van 4% naar 7%. Met hoeveel procent stijgt de rente?',
      '75',
      '7 − 4 = 3 → 3 van 4 = 3/4 = 75%',
      '%',
    ],
    [
      'rente 2 → 4, procent (100%, no fraction)',
      () => differenceQuestion('rente', 2, 4, 'procent'),
      'De rente stijgt van 2% naar 4%. Met hoeveel procent stijgt de rente?',
      '100',
      '4 − 2 = 2 → 2 van 2 = 100%',
      '%',
    ],
    [
      'opkomst 50 → 55, procent (10%)',
      () => differenceQuestion('opkomst', 50, 55, 'procent'),
      'De opkomst bij de verkiezingen stijgt van 50% naar 55%. Met hoeveel procent stijgt de opkomst?',
      '10',
      '55 − 50 = 5 → 5 van 50 = 1/10 = 10%',
      '%',
    ],
    [
      'opkomst 60 → 75, procentpunt',
      () => differenceQuestion('opkomst', 60, 75, 'procentpunt'),
      'De opkomst bij de verkiezingen stijgt van 60% naar 75%. Hoeveel procentpunt is dat?',
      '15',
      '75 − 60 = 15 procentpunt',
      'procentpunt',
    ],
    [
      'rente 4 → 5, given procent',
      () => newValueQuestion('rente', 4, 5, 'procent'),
      'De rente is 4%. Die stijgt met 25%. Hoeveel procent is de rente nu?',
      '5',
      '25% van 4 = 1 → 4 + 1 = 5%',
      '%',
    ],
    [
      'rente 4 → 5, given procentpunt',
      () => newValueQuestion('rente', 4, 5, 'procentpunt'),
      'De rente is 4%. Die stijgt met 1 procentpunt. Hoeveel procent is de rente nu?',
      '5',
      '4 + 1 = 5%',
      '%',
    ],
    [
      'werkloosheid 8 → 6, given procent',
      () => newValueQuestion('werkloosheid', 8, 6, 'procent'),
      'De werkloosheid is 8%. Die daalt met 25%. Hoeveel procent is de werkloosheid nu?',
      '6',
      '25% van 8 = 2 → 8 − 2 = 6%',
      '%',
    ],
    [
      'werkloosheid 8 → 6, given procentpunt',
      () => newValueQuestion('werkloosheid', 8, 6, 'procentpunt'),
      'De werkloosheid is 8%. Die daalt met 2 procentpunt. Hoeveel procent is de werkloosheid nu?',
      '6',
      '8 − 2 = 6%',
      '%',
    ],
  ])('%s', (_label, make, prompt, expected, explanation, suffix) => {
    const step = stepOf(make());
    expect(step.prompt).toBe(prompt);
    expect(step.suffix).toBe(suffix);
    expect(step.check(typed(answerOf(make())))).toMatchObject({
      correct: true,
      expected,
      explanation,
    });
  });

  it('builds the key from the form, the context, the percentages and the unit', () => {
    expect(differenceQuestion('rente', 4, 5, 'procent').key).toBe(
      'percentagePoints:difference:rente:4:5:procent',
    );
    expect(newValueQuestion('werkloosheid', 8, 6, 'procentpunt').key).toBe(
      'percentagePoints:newValue:werkloosheid:8:6:procentpunt',
    );
  });
});

describe('tips', () => {
  it.each<[string, string, () => Question, string | undefined]>([
    [
      'difference in points: the relative change',
      '25',
      () => differenceQuestion('rente', 4, 5, 'procentpunt'),
      'Procentpunten is het verschil tussen de percentages: 5 − 4 = 1.',
    ],
    [
      'difference in percent: the points',
      '1',
      () => differenceQuestion('rente', 4, 5, 'procent'),
      'Dat is het verschil in procentpunten; 1 van 4 is 1/4 = 25%.',
    ],
    [
      'difference in percent, 100%: the points',
      '2',
      () => differenceQuestion('rente', 2, 4, 'procent'),
      'Dat is het verschil in procentpunten; 2 van 2 is 100%.',
    ],
    [
      'decrease in percent: the points',
      '2',
      () => differenceQuestion('werkloosheid', 8, 6, 'procent'),
      'Dat is het verschil in procentpunten; 2 van 8 is 1/4 = 25%.',
    ],
    [
      'given percent, increase: 4 + 25',
      '29',
      () => newValueQuestion('rente', 4, 5, 'procent'),
      '25% van 4% is 1 procentpunt: 4% + 1% = 5%.',
    ],
    [
      'given percent, decrease: 8 − 25',
      `${MINUS}17`,
      () => newValueQuestion('werkloosheid', 8, 6, 'procent'),
      '25% van 8% is 2 procentpunt: 8% − 2% = 6%.',
    ],
    [
      'given points: no topic tip',
      '29',
      () => newValueQuestion('rente', 4, 5, 'procentpunt'),
      undefined,
    ],
    [
      'difference in points: factor of ten',
      '10',
      () => differenceQuestion('rente', 4, 5, 'procentpunt'),
      TIP_FACTOR_TEN,
    ],
  ])('%s, typing %s', (_label, input, make, tip) => {
    expect(stepOf(make()).check(input).tip).toBe(tip);
  });
});

describe('generatePercentagePoints', () => {
  const COUNT = 4000;
  const rng = createRng(5134);
  const questions = Array.from({ length: COUNT }, () => generatePercentagePoints(rng));

  const SUBJECTS: Record<string, PointsContext> = {
    'De rente': 'rente',
    'De werkloosheid': 'werkloosheid',
    'De opkomst bij de verkiezingen': 'opkomst',
  };
  const SUBJECT = '(De rente|De werkloosheid|De opkomst bij de verkiezingen)';

  interface Parsed {
    question: Question;
    form: 'difference' | 'newValue';
    context: PointsContext;
    increase: boolean;
    old: number;
    next: number;
    /** What is asked (difference) or given (new value). */
    unit: 'procentpunt' | 'procent';
    /** The given amount of a new value question. */
    amount: number | null;
  }

  function parse(question: Question): Parsed {
    const prompt = stepOf(question).prompt;
    const difference = new RegExp(
      `^${SUBJECT} (stijgt|daalt) van (\\d+)% naar (\\d+)%\\. (Hoeveel procentpunt is dat\\?|Met hoeveel procent .*)$`,
      'u',
    ).exec(prompt);
    if (difference) {
      return {
        question,
        form: 'difference',
        context: SUBJECTS[difference[1]!]!,
        increase: difference[2] === 'stijgt',
        old: Number(difference[3]),
        next: Number(difference[4]),
        unit: difference[5]!.startsWith('Hoeveel procentpunt') ? 'procentpunt' : 'procent',
        amount: null,
      };
    }
    const given = new RegExp(
      `^${SUBJECT} is (\\d+)%\\. Die (stijgt|daalt) met (\\d+)( procentpunt|%)\\. Hoeveel procent is .* nu\\?$`,
      'u',
    ).exec(prompt)!;
    return {
      question,
      form: 'newValue',
      context: SUBJECTS[given[1]!]!,
      increase: given[3] === 'stijgt',
      old: Number(given[2]),
      next: Number(answerOf(question).num),
      unit: given[5] === '%' ? 'procent' : 'procentpunt',
      amount: Number(given[4]),
    };
  }

  const parsed = questions.map(parse);
  const near = (count: number, of: number, share: number) =>
    Math.abs(count / of - share) <= 0.05;

  it('picks the forms, the units, the direction and the contexts equally', () => {
    const count = (test: (item: Parsed) => boolean) => parsed.filter(test).length;
    expect(near(count((item) => item.form === 'difference'), COUNT, 0.5)).toBe(true);
    for (const form of ['difference', 'newValue']) {
      const ofForm = parsed.filter((item) => item.form === form);
      expect(near(ofForm.filter((item) => item.unit === 'procent').length, ofForm.length, 0.5)).toBe(
        true,
      );
    }
    expect(near(count((item) => item.increase), COUNT, 0.5)).toBe(true);
    for (const context of Object.keys(POINTS_RANGES)) {
      expect(near(count((item) => item.context === context), COUNT, 1 / 3), context).toBe(true);
    }
  });

  it('draws whole percentages within the range of the context', () => {
    for (const { context, old, next, question } of parsed) {
      const [min, max] = POINTS_RANGES[context];
      for (const value of [old, next]) {
        expect(value, question.key).toBeGreaterThanOrEqual(min);
        expect(value, question.key).toBeLessThanOrEqual(max);
      }
    }
  });

  it('follows the direction and a relative change from the list, a decrease at most 75%', () => {
    for (const { increase, old, next, question } of parsed) {
      expect(next > old, question.key).toBe(increase);
      const points = Math.abs(next - old);
      const relative = (points * 100) / old;
      expect(Number.isInteger(relative), question.key).toBe(true);
      expect(RELATIVE_CHANGES, question.key).toContain(relative);
      if (!increase) expect(relative, question.key).toBeLessThanOrEqual(75);
      expect(points, question.key).not.toBe(relative);
    }
  });

  it('gives the amount of a new value question in the unit and asks the new percentage', () => {
    for (const { form, unit, amount, old, next, question } of parsed) {
      if (form !== 'newValue') continue;
      const points = Math.abs(next - old);
      expect(amount, question.key).toBe(unit === 'procent' ? (points * 100) / old : points);
    }
  });

  it('answers every question, with an explanation', () => {
    for (const question of questions) {
      const result = stepOf(question).check(typed(answerOf(question)));
      expect(result.correct, question.key).toBe(true);
      expect(result.explanation, question.key).toBeTruthy();
      expect(question.topic).toBe('percentagePoints');
    }
  });
});
