import { describe, expect, it } from 'vitest';
import { createRng } from '../random';
import { fromInteger, hasAtMostDecimals, isInteger } from '../rational';
import { hasSlot } from '../slot';
import type { Question } from '../types';
import {
  atPercentQuestion,
  backQuestion,
  COPY_PERCENTAGES,
  ENLARGE_PERCENTAGES,
  findPercentQuestion,
  generateEnlargement,
  REDUCE_PERCENTAGES,
  withPercentQuestion,
} from './enlargement';
import { answerOf, decimal, stepOf, typed } from './testHelpers';

const SAMPLES = 4000;
const FOTO = { item: 'foto', dimension: 'breed' } as const;
const TEKENING = { item: 'tekening', dimension: 'breed' } as const;

function sample(): Question[] {
  const rng = createRng(56);
  return Array.from({ length: SAMPLES }, () => generateEnlargement(rng));
}

const ofForm = (questions: Question[], form: string) =>
  questions.filter(({ key }) => key.startsWith(`enlargement:${form}:`));

describe('enlargement fixed cases', () => {
  it('12 cm enlarged with 25% → 15', () => {
    const step = stepOf(withPercentQuestion(FOTO, 'enlarge', 25, 12));
    expect(step.prompt).toBe('Je vergroot een foto van 12 cm breed met 25%. Hoe breed wordt de foto?');
    expect(step.suffix).toBe('cm');
    expect(step.check('15')).toEqual({
      correct: true,
      expected: '15',
      explanation: 'vergroten met 25% → 125% van 12: 25% = 3 → 12 + 3 = 15',
    });
  });

  it('20 cm reduced with 20% → 16', () => {
    const step = stepOf(withPercentQuestion(TEKENING, 'reduce', 20, 20));
    expect(step.prompt).toContain('verkleint een tekening van 20 cm breed met 20%');
    expect(step.check('16').explanation).toBe(
      'verkleinen met 20% → 80% van 20: 20% = 4 → 20 − 4 = 16',
    );
  });

  it('20 cm at 80% → 16', () => {
    const step = stepOf(atPercentQuestion(TEKENING, 80, 20));
    expect(step.prompt).toBe(
      'Je kopieert een tekening van 20 cm breed op 80%. Hoe breed wordt de kopie?',
    );
    expect(step.check('16')).toMatchObject({
      correct: true,
      explanation: '80% van 20: 10% = 2 → 8 × 2 = 16',
    });
  });

  it('10 → 15 cm asks the setting: 150', () => {
    const step = stepOf(findPercentQuestion(FOTO, 150, 10));
    expect(step.prompt).toBe(
      'Een foto van 10 cm breed wordt 15 cm breed. Op hoeveel procent stel je het kopieerapparaat in?',
    );
    expect(step.suffix).toBe('%');
    expect(step.check('150')).toMatchObject({
      correct: true,
      explanation: '15 : 10 = 1,5 → 150%',
    });
  });

  it('after +50% the photo is 18 cm → 12', () => {
    const step = stepOf(backQuestion(FOTO, 'enlarge', 50, 12));
    expect(step.prompt).toBe(
      'Na vergroten met 50% is een foto 18 cm breed. Hoe breed was hij?',
    );
    expect(step.check('12')).toMatchObject({
      correct: true,
      explanation: '150% = 18 → 50% = 6 → 100% = 12',
    });
  });

  it('writes tall items as hoog', () => {
    const step = stepOf(atPercentQuestion({ item: 'plattegrond', dimension: 'hoog' }, 120, 10));
    expect(step.prompt).toBe(
      'Je kopieert een plattegrond van 10 cm hoog op 120%. Hoe hoog wordt de kopie?',
    );
  });
});

describe('generateEnlargement', () => {
  const questions = sample();

  it('is a single number step that accepts its expected answer', () => {
    for (const question of questions) {
      expect(question.topic).toBe('enlargement');
      expect(question.steps).toHaveLength(1);
      const step = question.steps[0]!;
      expect(step.kind).toBe('number');
      expect(step.check(typed(answerOf(question))).correct, step.prompt).toBe(true);
      expect(step.check('987654').correct).toBe(false);
    }
  });

  it('uses the four forms with equal probability', () => {
    for (const form of ['withPercent', 'atPercent', 'findPercent', 'back']) {
      const share = ofForm(questions, form).length / SAMPLES;
      expect(share, form).toBeGreaterThan(0.21);
      expect(share, form).toBeLessThan(0.29);
    }
  });

  it('draws percentages from the spec lists, both directions and every context', () => {
    const enlarge = new Set<number>();
    const reduce = new Set<number>();
    const settings = new Set<number>();
    const contexts = new Set<string>();
    for (const { key } of questions) {
      const parts = key.split(':');
      contexts.add(`${parts[2]}:${parts[3]}`);
      if (parts[1] === 'withPercent' || parts[1] === 'back') {
        (parts[4] === 'enlarge' ? enlarge : reduce).add(Number(parts[5]));
      } else {
        settings.add(Number(parts[4]));
      }
    }
    expect([...enlarge].sort((a, b) => a - b)).toEqual([...ENLARGE_PERCENTAGES]);
    expect([...reduce].sort((a, b) => a - b)).toEqual([...REDUCE_PERCENTAGES]);
    expect([...settings].sort((a, b) => a - b)).toEqual([...COPY_PERCENTAGES]);
    expect(contexts.size).toBe(6);
  });

  it('keeps the original an integer in [4, 40] and the result at most 1 decimal', () => {
    for (const question of questions) {
      const parts = question.key.split(':');
      const original = Number(parts[parts.length - 1]);
      expect(Number.isInteger(original)).toBe(true);
      expect(original).toBeGreaterThanOrEqual(4);
      expect(original).toBeLessThanOrEqual(40);
      const answer = answerOf(question);
      if (parts[1] === 'back') expect(answer).toEqual(fromInteger(original));
      else if (parts[1] === 'findPercent') {
        expect(answer).toEqual(fromInteger(Number(parts[4])));
        const result = decimal(/wordt ([\d,]+) cm/.exec(stepOf(question).prompt)![1]!);
        expect(isInteger(result)).toBe(true);
      } else {
        expect(hasAtMostDecimals(answer, 1)).toBe(true);
      }
      if (parts[1] === 'back') {
        const shown = decimal(/is een \S+ ([\d,]+) cm/.exec(stepOf(question).prompt)![1]!);
        expect(hasAtMostDecimals(shown, 1)).toBe(true);
      }
    }
  });

  it('has a stable key and no slot', () => {
    expect(generateEnlargement(createRng(5)).key).toBe(generateEnlargement(createRng(5)).key);
    for (const { steps } of questions) expect(hasSlot(steps[0]!.prompt)).toBe(false);
  });
});
