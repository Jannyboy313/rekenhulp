import { describe, expect, it } from 'vitest';
import { MINUS } from '../format';
import { createRng } from '../random';
import { ONE, add, hasAtMostDecimals, rational } from '../rational';
import type { Question } from '../types';
import {
  addedQuestion,
  combinedQuestion,
  generateStatisticsProblems,
  removedQuestion,
} from './statisticsProblems';
import { answerOf, stepOf, typed } from './testHelpers';

const SAMPLES = 6000;
const SIZES = [10, 15, 20, 25, 30, 40];
const ORDINALS: Readonly<Record<number, string>> = {
  5: 'vijfde',
  6: 'zesde',
  7: 'zevende',
  8: 'achtste',
  9: 'negende',
};

const rng = createRng(88);
const questions: Question[] = Array.from({ length: SAMPLES }, () =>
  generateStatisticsProblems(rng),
);

function withForm(form: string): Question[] {
  return questions.filter((question) => question.key.split(':')[1] === form);
}

function share(form: string): number {
  return withForm(form).length / SAMPLES;
}

describe('statisticsProblems: spec examples', () => {
  it('combined klassen: 20 at 6 and 30 at 7 give 6,6', () => {
    const question = combinedQuestion('klassen', { size: 20, mean: 6 }, { size: 30, mean: 7 });
    const step = stepOf(question);
    expect(step.prompt).toBe(
      'In klas A zitten 20 leerlingen met gemiddeld een 6. In klas B zitten 30 leerlingen met gemiddeld een 7. Wat is het gemiddelde van beide klassen samen?',
    );
    expect(typed(answerOf(question))).toBe('6,6');
    expect(step.suffix).toBeUndefined();
    expect(step.check('6,6').explanation).toBe(
      'klas A: 20 × 6 = 120, klas B: 30 × 7 = 210 → samen 120 + 210 = 330 voor 50 leerlingen → 330 : 50 = 6,6',
    );
  });

  it('combined groepen: 10 at 8 and 15 at 9 give 8,6 jaar', () => {
    const question = combinedQuestion('groepen', { size: 10, mean: 8 }, { size: 15, mean: 9 });
    const step = stepOf(question);
    expect(step.prompt).toBe(
      'In groep A zitten 10 kinderen met een gemiddelde leeftijd van 8 jaar. In groep B zitten 15 kinderen met een gemiddelde leeftijd van 9 jaar. Wat is het gemiddelde samen?',
    );
    expect(typed(answerOf(question))).toBe('8,6');
    expect(step.suffix).toBe('jaar');
    expect(step.check('8,6').explanation).toBe(
      'groep A: 10 × 8 = 80, groep B: 15 × 9 = 135 → samen 80 + 135 = 215 voor 25 kinderen → 215 : 25 = 8,6',
    );
  });

  it('added value: 5 numbers at 6, a sixth makes the mean 7, that number is 12', () => {
    const question = addedQuestion(5, 6, true);
    const step = stepOf(question);
    expect(step.prompt).toBe(
      'Het gemiddelde van 5 getallen is 6. Er komt een zesde getal bij en het gemiddelde wordt 7. Welk getal is dat?',
    );
    expect(typed(answerOf(question))).toBe('12');
    expect(step.check('12').explanation).toBe(
      `6 getallen met gemiddelde 7 = 6 × 7 = 42, eerst 5 × 6 = 30 → 42 ${MINUS} 30 = 12`,
    );
  });

  it('removed: 6 numbers at 8, remove 14, the other 5 average 6,8', () => {
    const question = removedQuestion(6, 8, 14);
    const step = stepOf(question);
    expect(step.prompt).toBe(
      'Het gemiddelde van 6 getallen is 8. Je haalt het getal 14 weg. Wat is het gemiddelde van de andere 5?',
    );
    expect(typed(answerOf(question))).toBe('6,8');
    expect(step.check('6,8').explanation).toBe(
      `6 × 8 = 48 → 48 ${MINUS} 14 = 34 → 34 : 5 = 6,8`,
    );
  });
});

describe('statisticsProblems: generated questions', () => {
  it('is a single number step with a prompt of at most 170 characters', () => {
    for (const question of questions) {
      const step = stepOf(question);
      expect(question.topic).toBe('statisticsProblems');
      expect(question.steps).toHaveLength(1);
      expect(step.kind).toBe('number');
      expect(step.prompt.length).toBeLessThanOrEqual(170);
    }
  });

  it('combines two groups with distinct sizes and means and a mean of at most 1 decimal', () => {
    const rows = withForm('combined');
    for (const question of rows) {
      const [, , context, sizeAText, meanAText, sizeBText, meanBText] = question.key.split(':');
      const sizeA = Number(sizeAText);
      const meanA = Number(meanAText);
      const sizeB = Number(sizeBText);
      const meanB = Number(meanBText);
      const min = context === 'klassen' ? 5 : 6;
      const max = context === 'klassen' ? 9 : 14;
      const step = stepOf(question);
      expect(['klassen', 'groepen']).toContain(context);
      for (const size of [sizeA, sizeB]) expect(SIZES).toContain(size);
      expect(sizeA).not.toBe(sizeB);
      expect(meanA).not.toBe(meanB);
      for (const mean of [meanA, meanB]) {
        expect(mean).toBeGreaterThanOrEqual(min);
        expect(mean).toBeLessThanOrEqual(max);
      }
      const exact = rational(BigInt(sizeA * meanA + sizeB * meanB), BigInt(sizeA + sizeB));
      expect(hasAtMostDecimals(exact, 1)).toBe(true);
      expect(answerOf(question)).toEqual(exact);
      expect(step.suffix).toBe(context === 'groepen' ? 'jaar' : undefined);
      expect(step.prompt.endsWith(context === 'klassen' ? 'beide klassen samen?' : 'samen?')).toBe(
        true,
      );
    }
    const groepen = rows.filter((question) => question.key.split(':')[2] === 'groepen');
    expect(groepen.length / rows.length).toBeGreaterThan(0.4);
    expect(groepen.length / rows.length).toBeLessThan(0.6);
  });

  it('adds one number that makes the mean m ± 1, the number in [1, 20]', () => {
    for (const question of withForm('added')) {
      const [, , nText, mText, direction] = question.key.split(':');
      const n = Number(nText);
      const m = Number(mText);
      const newMean = direction === 'up' ? m + 1 : m - 1;
      expect(['up', 'down']).toContain(direction);
      expect(n).toBeGreaterThanOrEqual(4);
      expect(n).toBeLessThanOrEqual(8);
      expect(m).toBeGreaterThanOrEqual(5);
      expect(m).toBeLessThanOrEqual(9);
      const added = (n + 1) * newMean - n * m;
      expect(added).toBeGreaterThanOrEqual(1);
      expect(added).toBeLessThanOrEqual(20);
      expect(typed(answerOf(question))).toBe(String(added));
      expect(stepOf(question).prompt).toBe(
        `Het gemiddelde van ${n} getallen is ${m}. Er komt een ${ORDINALS[n + 1]} getal bij en het gemiddelde wordt ${newMean}. Welk getal is dat?`,
      );
    }
    for (const direction of ['up', 'down']) {
      expect(
        withForm('added').some((question) => question.key.endsWith(`:${direction}`)),
      ).toBe(true);
    }
  });

  it('removes r ≠ m from n numbers with whole mean m, the new mean at most 1 decimal', () => {
    for (const question of withForm('removed')) {
      const [, , nText, mText, rText] = question.key.split(':');
      const n = Number(nText);
      const m = Number(mText);
      const r = Number(rText);
      expect(n).toBeGreaterThanOrEqual(5);
      expect(n).toBeLessThanOrEqual(8);
      expect(m).toBeGreaterThanOrEqual(6);
      expect(m).toBeLessThanOrEqual(12);
      expect(r).toBeGreaterThanOrEqual(1);
      expect(r).toBeLessThanOrEqual(30);
      expect(r).not.toBe(m);
      const exact = rational(BigInt(n * m - r), BigInt(n - 1));
      expect(hasAtMostDecimals(exact, 1)).toBe(true);
      expect(answerOf(question)).toEqual(exact);
      expect(stepOf(question).prompt).toBe(
        `Het gemiddelde van ${n} getallen is ${m}. Je haalt het getal ${r} weg. Wat is het gemiddelde van de andere ${n - 1}?`,
      );
    }
  });

  it('accepts the exact answer, rejects a wrong one and always explains', () => {
    for (const question of questions) {
      const answer = answerOf(question);
      const step = stepOf(question);
      expect(step.check(typed(answer)).correct).toBe(true);
      expect(step.check(typed(add(answer, ONE))).correct).toBe(false);
      expect(step.check(typed(answer)).explanation).toMatch(/\S/);
    }
  });

  it('draws the three forms equally', () => {
    for (const form of ['combined', 'added', 'removed']) {
      expect(share(form), form).toBeGreaterThan(0.3);
      expect(share(form), form).toBeLessThan(0.37);
    }
  });

  it('gives many distinct keys', () => {
    expect(new Set(questions.map((question) => question.key)).size).toBeGreaterThan(500);
  });
});
