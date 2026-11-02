import { describe, expect, it } from 'vitest';
import { createRng } from '../random';
import { hasSlot } from '../slot';
import type { Question } from '../types';
import {
  generateStatisticsReasoning,
  MEAN_MEDIAN_OPTIONS,
  MEASURES,
  meanMedianQuestion,
  unchangedQuestion,
} from './statisticsReasoning';
import { stepOf } from './testHelpers';

const SAMPLES = 4000;

function sample(): Question[] {
  const rng = createRng(87);
  return Array.from({ length: SAMPLES }, () => generateStatisticsReasoning(rng));
}

const answerText = (question: Question) => {
  const step = stepOf(question);
  return step.options!.find((option) => step.check(option).correct)!;
};

describe('statisticsReasoning fixed cases', () => {
  it('5, 6, 6, 7, 9 plus 10 → de modus', () => {
    const step = stepOf(unchangedQuestion([5, 6, 6, 7, 9], 10));
    expect(step.prompt).toBe('Cijfers: 5, 6, 6, 7, 9. Er komt een 10 bij. Welke maat blijft gelijk?');
    expect(step.options).toEqual([...MEASURES]);
    expect(step.check('de modus')).toEqual({
      correct: true,
      expected: 'de modus',
      explanation:
        'voor → na: gemiddelde 6,6 → 7,17 (verandert), mediaan 6 → 6,5 (verandert), modus 6 → 6 (blijft), spreidingsbreedte 4 → 5 (verandert)',
    });
    expect(step.check('de mediaan').correct).toBe(false);
  });

  it('2, 2, 3, 3, 15 → the mean is greater than the median', () => {
    const step = stepOf(meanMedianQuestion('Inkomens in € 1000:', [2, 2, 3, 3, 15]));
    expect(step.prompt).toBe('Inkomens in € 1000: 2, 2, 3, 3, 15. Welke uitspraak klopt?');
    expect(step.options).toEqual([...MEAN_MEDIAN_OPTIONS]);
    expect(step.check(MEAN_MEDIAN_OPTIONS[0])).toMatchObject({
      correct: true,
      explanation: 'gemiddelde 25 : 5 = 5, mediaan 3 → het gemiddelde is groter dan de mediaan',
    });
    expect(step.check(MEAN_MEDIAN_OPTIONS[1]).correct).toBe(false);
  });

  it('a mean below the median', () => {
    const step = stepOf(meanMedianQuestion('Cijfers:', [1, 8, 9, 9, 10]));
    expect(step.check(MEAN_MEDIAN_OPTIONS[1]).correct).toBe(true);
  });
});

describe('statisticsReasoning generator', () => {
  const questions = sample();

  it('has one choice step with four options, one correct, an explanation and no slot', () => {
    for (const question of questions) {
      const step = stepOf(question);
      expect(question.steps).toHaveLength(1);
      expect(step.kind).toBe('choice');
      expect(step.options).toHaveLength(4);
      expect(hasSlot(step.prompt)).toBe(false);
      expect(step.prompt.length).toBeLessThanOrEqual(170);
      expect(step.options!.filter((option) => step.check(option).correct)).toHaveLength(1);
      const answer = answerText(question);
      const wrong = step.options!.find((option) => option !== answer)!;
      expect(step.check(wrong).correct).toBe(false);
      expect(step.check(answer).explanation).toBeTruthy();
    }
  });

  it('draws both forms, about 50/50', () => {
    const unchanged = questions.filter(({ key }) => key.startsWith('statisticsReasoning:unchanged:'));
    const meanMedian = questions.filter(({ key }) => key.startsWith('statisticsReasoning:meanMedian:'));
    expect(unchanged.length + meanMedian.length).toBe(SAMPLES);
    expect(unchanged.length / SAMPLES).toBeGreaterThan(0.45);
    expect(unchanged.length / SAMPLES).toBeLessThan(0.55);
  });

  it('unchanged: 5 to 7 values in [1, 10], one added in [1, 10], measure options in order', () => {
    for (const question of questions.filter(({ key }) => key.includes(':unchanged:'))) {
      const [, , list, added] = question.key.split(':');
      const values = list!.split(',').map(Number);
      expect(values.length).toBeGreaterThanOrEqual(5);
      expect(values.length).toBeLessThanOrEqual(7);
      expect(values.every((value) => value >= 1 && value <= 10)).toBe(true);
      expect(Number(added)).toBeGreaterThanOrEqual(1);
      expect(Number(added)).toBeLessThanOrEqual(10);
      const step = stepOf(question);
      expect(step.options).toEqual([...MEASURES]);
      expect(step.check(step.check('x').expected).explanation!.match(/blijft/g)).toHaveLength(1);
    }
  });

  it('mean vs median: 5 values in [1, 20], exactly one statement true, known contexts', () => {
    for (const question of questions.filter(({ key }) => key.includes(':meanMedian:'))) {
      const step = stepOf(question);
      const values = question.key.split(':').pop()!.split(',').map(Number);
      expect(values).toHaveLength(5);
      const max = step.prompt.startsWith('Cijfers:') ? 10 : 20;
      expect(values.every((value) => value >= 1 && value <= max)).toBe(true);
      expect(step.options).toEqual([...MEAN_MEDIAN_OPTIONS]);
      expect(answerText(question)).not.toBe(MEAN_MEDIAN_OPTIONS[3]);
      expect(
        ['Cijfers:', 'Inkomens in € 1000:', 'Leeftijden:'].some((context) =>
          step.prompt.startsWith(context),
        ),
      ).toBe(true);
    }
  });

  it('keys are distinct often enough to de-duplicate', () => {
    expect(new Set(questions.map(({ key }) => key)).size).toBeGreaterThan(SAMPLES / 2);
  });
});
