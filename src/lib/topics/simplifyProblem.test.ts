import { describe, expect, it } from 'vitest';
import { createRng } from '../random';
import type { Question } from '../types';
import {
  DIVISIBLE_LIMITS,
  divisibleQuestion,
  fencePostQuestion,
  FIGURE_NUMBERS,
  figureQuestion,
  GAUSS_ENDS,
  gaussQuestion,
  generateSimplifyProblem,
  inclusiveCountQuestion,
  PATTERNS,
  POST_SPACINGS,
} from './simplifyProblem';
import { answerOf, stepOf, typed } from './testHelpers';

const SQUARES =
  'Vierkantjes van lucifers op een rij: figuur 1 heeft 4 lucifers, figuur 2 heeft 7 en figuur 3 heeft 10.';
const TRIANGLES =
  'Driehoekjes van lucifers op een rij: figuur 1 heeft 3 lucifers, figuur 2 heeft 5 en figuur 3 heeft 7.';
const TABLES =
  'Tafels staan in een rij tegen elkaar. Aan 1 tafel passen 4 stoelen, aan 2 tafels 6 en aan 3 tafels 8.';

describe('constants', () => {
  it('lists the values of spec §5.44', () => {
    expect(GAUSS_ENDS).toHaveLength(26);
    expect(GAUSS_ENDS.slice(0, 3)).toEqual([10, 12, 14]);
    expect(GAUSS_ENDS.slice(-6)).toEqual([50, 60, 70, 80, 90, 100]);
    expect(DIVISIBLE_LIMITS).toEqual([50, 100, 200]);
    expect(POST_SPACINGS).toEqual([2, 4, 5, 10, 20, 25]);
    expect(FIGURE_NUMBERS).toEqual([10, 12, 15, 20, 25, 30, 50, 100]);
    expect(PATTERNS).toEqual({
      vierkantjes: { first: 4, step: 3 },
      driehoekjes: { first: 3, step: 2 },
      tafels: { first: 4, step: 2 },
    });
  });
});

describe('question text', () => {
  it.each<[string, () => Question, string, string, string]>([
    [
      'Gauss 40',
      () => gaussQuestion(40),
      'Wat is 1 + 2 + 3 + … + 40?',
      '820',
      'Vereenvoudigen: maak paren van de buitenste getallen: 1 + 40 = 41, 2 + 39 = 41, … → 40 getallen zijn 20 paren van 41 → 20 × 41 = 820',
    ],
    [
      'Gauss 10 (smallest)',
      () => gaussQuestion(10),
      'Wat is 1 + 2 + 3 + … + 10?',
      '55',
      'Vereenvoudigen: maak paren van de buitenste getallen: 1 + 10 = 11, 2 + 9 = 11, … → 10 getallen zijn 5 paren van 11 → 5 × 11 = 55',
    ],
    [
      'Gauss 100 (largest)',
      () => gaussQuestion(100),
      'Wat is 1 + 2 + 3 + … + 100?',
      '5050',
      'Vereenvoudigen: maak paren van de buitenste getallen: 1 + 100 = 101, 2 + 99 = 101, … → 100 getallen zijn 50 paren van 101 → 50 × 101 = 5050',
    ],
    [
      'deelbaar 100, 7',
      () => divisibleQuestion(100, 7),
      'Hoeveel getallen van 1 tot en met 100 zijn deelbaar door 7?',
      '14',
      'Vereenvoudigen: 7 = 1 × 7, …, 98 = 14 × 7 en 15 × 7 = 105 is te groot → 14 getallen',
    ],
    [
      'deelbaar 50, 5 (exact)',
      () => divisibleQuestion(50, 5),
      'Hoeveel getallen van 1 tot en met 50 zijn deelbaar door 5?',
      '10',
      'Vereenvoudigen: 5 = 1 × 5, …, 50 = 10 × 5 en 11 × 5 = 55 is te groot → 10 getallen',
    ],
    [
      'deelbaar 200, 3 (largest answer)',
      () => divisibleQuestion(200, 3),
      'Hoeveel getallen van 1 tot en met 200 zijn deelbaar door 3?',
      '66',
      'Vereenvoudigen: 3 = 1 × 3, …, 198 = 66 × 3 en 67 × 3 = 201 is te groot → 66 getallen',
    ],
    [
      'tot en met 37, 82',
      () => inclusiveCountQuestion(37, 82),
      'Hoeveel getallen zijn er van 37 tot en met 82?',
      '46',
      'Vereenvoudigen: van 1 tot en met 82 zijn 82 getallen; zonder 1 tot en met 36 blijven er 82 − 36 = 46 over',
    ],
    [
      'tot en met 11, 21 (smallest)',
      () => inclusiveCountQuestion(11, 21),
      'Hoeveel getallen zijn er van 11 tot en met 21?',
      '11',
      'Vereenvoudigen: van 1 tot en met 21 zijn 21 getallen; zonder 1 tot en met 10 blijven er 21 − 10 = 11 over',
    ],
    [
      'paaltjes 5, 8',
      () => fencePostQuestion(5, 8),
      'Langs een pad van 40 meter staat om de 5 meter een paaltje, ook aan het begin en aan het eind. Hoeveel paaltjes zijn dat?',
      '9',
      'Vereenvoudigen: een pad van 10 meter heeft 3 paaltjes, 1 meer dan de 2 stukken → 40 : 5 = 8 stukken → 8 + 1 = 9 paaltjes',
    ],
    [
      'paaltjes 2, 3 (smallest)',
      () => fencePostQuestion(2, 3),
      'Langs een pad van 6 meter staat om de 2 meter een paaltje, ook aan het begin en aan het eind. Hoeveel paaltjes zijn dat?',
      '4',
      'Vereenvoudigen: een pad van 4 meter heeft 3 paaltjes, 1 meer dan de 2 stukken → 6 : 2 = 3 stukken → 3 + 1 = 4 paaltjes',
    ],
    [
      'paaltjes 25, 20 (500 m)',
      () => fencePostQuestion(25, 20),
      'Langs een pad van 500 meter staat om de 25 meter een paaltje, ook aan het begin en aan het eind. Hoeveel paaltjes zijn dat?',
      '21',
      'Vereenvoudigen: een pad van 50 meter heeft 3 paaltjes, 1 meer dan de 2 stukken → 500 : 25 = 20 stukken → 20 + 1 = 21 paaltjes',
    ],
    [
      'vierkantjes 20',
      () => figureQuestion('vierkantjes', 20, false),
      `${SQUARES} Hoeveel lucifers heeft figuur 20?`,
      '61',
      'Vereenvoudigen: elke figuur heeft 3 lucifers meer; van figuur 1 naar figuur 20 zijn 19 stappen → 4 + 19 × 3 = 61',
    ],
    [
      'driehoekjes 20',
      () => figureQuestion('driehoekjes', 20, false),
      `${TRIANGLES} Hoeveel lucifers heeft figuur 20?`,
      '41',
      'Vereenvoudigen: elke figuur heeft 2 lucifers meer; van figuur 1 naar figuur 20 zijn 19 stappen → 3 + 19 × 2 = 41',
    ],
    [
      'tafels 15',
      () => figureQuestion('tafels', 15, false),
      `${TABLES} Hoeveel stoelen passen er aan 15 tafels?`,
      '32',
      'Vereenvoudigen: elke tafel geeft 2 stoelen meer; van 1 naar 15 tafels zijn 14 stappen → 4 + 14 × 2 = 32',
    ],
    [
      'vierkantjes 20, reverse',
      () => figureQuestion('vierkantjes', 20, true),
      `${SQUARES} Welke figuur heeft 61 lucifers?`,
      '20',
      'Vereenvoudigen: 61 − 4 = 57 lucifers meer dan figuur 1 → 57 : 3 = 19 stappen → figuur 1 + 19 = figuur 20',
    ],
    [
      'tafels 15, reverse',
      () => figureQuestion('tafels', 15, true),
      `${TABLES} Hoeveel tafels heb je nodig voor 32 stoelen?`,
      '15',
      'Vereenvoudigen: 32 − 4 = 28 stoelen meer dan bij 1 tafel → 28 : 2 = 14 stappen → 1 + 14 = 15 tafels',
    ],
    [
      'vierkantjes 100 (largest)',
      () => figureQuestion('vierkantjes', 100, false),
      `${SQUARES} Hoeveel lucifers heeft figuur 100?`,
      '301',
      'Vereenvoudigen: elke figuur heeft 3 lucifers meer; van figuur 1 naar figuur 100 zijn 99 stappen → 4 + 99 × 3 = 301',
    ],
  ])('%s', (_label, make, prompt, expected, explanation) => {
    const step = stepOf(make());
    expect(step.prompt).toBe(prompt);
    expect(step.check(typed(answerOf(make())))).toMatchObject({
      correct: true,
      expected,
      explanation,
    });
  });

  it('has the prefix figuur only on a figure asked of a lucifer pattern', () => {
    expect(stepOf(figureQuestion('vierkantjes', 20, true)).prefix).toBe('figuur');
    expect(stepOf(figureQuestion('driehoekjes', 20, true)).prefix).toBe('figuur');
    expect(stepOf(figureQuestion('tafels', 15, true)).prefix).toBeUndefined();
    expect(stepOf(figureQuestion('vierkantjes', 20, false)).prefix).toBeUndefined();
  });

  it('builds the key from the form, the kind and the numbers', () => {
    expect(gaussQuestion(40).key).toBe('simplifyProblem:gauss:40');
    expect(divisibleQuestion(100, 7).key).toBe('simplifyProblem:divisible:100:7');
    expect(inclusiveCountQuestion(37, 82).key).toBe('simplifyProblem:inclusive:37:82');
    expect(fencePostQuestion(5, 8).key).toBe('simplifyProblem:posts:5:8');
    expect(figureQuestion('tafels', 15, true).key).toBe(
      'simplifyProblem:figure:tafels:15:reverse',
    );
    expect(figureQuestion('tafels', 15, false).key).toBe(
      'simplifyProblem:figure:tafels:15:value',
    );
  });
});

describe('tips', () => {
  it.each<[string, string, () => Question, string | undefined]>([
    [
      'Gauss: pairs not halved',
      '1640',
      () => gaussQuestion(40),
      '40 getallen maken 20 paren, geen 40: 20 × 41.',
    ],
    [
      'tot en met: without + 1',
      '45',
      () => inclusiveCountQuestion(37, 82),
      'Tel 37 en 82 allebei mee: 82 − 37 + 1 = 46.',
    ],
    [
      'paaltjes: the pieces',
      '8',
      () => fencePostQuestion(5, 8),
      'Er staat ook een paaltje aan het begin: 8 stukken hebben 9 paaltjes.',
    ],
    [
      'vierkantjes: n steps',
      '64',
      () => figureQuestion('vierkantjes', 20, false),
      'Van figuur 1 naar figuur 20 zijn 19 stappen, geen 20.',
    ],
    [
      'tafels: n steps',
      '34',
      () => figureQuestion('tafels', 15, false),
      'Van 1 naar 15 tafels zijn 14 stappen, geen 15.',
    ],
    ['deelbaar: no topic tip', '15', () => divisibleQuestion(100, 7), undefined],
    [
      'reverse figure: no topic tip',
      '19',
      () => figureQuestion('vierkantjes', 20, true),
      undefined,
    ],
  ])('%s, typing %s', (_label, input, make, tip) => {
    expect(stepOf(make()).check(input).tip).toBe(tip);
  });
});

describe('generateSimplifyProblem', () => {
  const COUNT = 6000;
  const rng = createRng(4444);
  const questions = Array.from({ length: COUNT }, () => generateSimplifyProblem(rng));
  const parsed = questions.map((question) => {
    const [, kind, ...rest] = question.key.split(':');
    return { question, kind: kind!, rest };
  });
  const near = (count: number, of: number, share: number) => Math.abs(count / of - share) <= 0.05;
  const ofKind = (...kinds: string[]) => parsed.filter((item) => kinds.includes(item.kind));

  it('picks the three forms equally and the counting kinds equally', () => {
    const counting = ofKind('divisible', 'inclusive', 'posts');
    expect(near(ofKind('gauss').length, COUNT, 1 / 3)).toBe(true);
    expect(near(counting.length, COUNT, 1 / 3)).toBe(true);
    expect(near(ofKind('figure').length, COUNT, 1 / 3)).toBe(true);
    for (const kind of ['divisible', 'inclusive', 'posts']) {
      expect(near(ofKind(kind).length, counting.length, 1 / 3), kind).toBe(true);
    }
  });

  it('draws the numbers of spec §5.44', () => {
    for (const { kind, rest, question } of parsed) {
      const [a, b] = rest.map(Number) as [number, number];
      switch (kind) {
        case 'gauss':
          expect(GAUSS_ENDS, question.key).toContain(a);
          break;
        case 'divisible':
          expect(DIVISIBLE_LIMITS, question.key).toContain(a);
          expect(b >= 3 && b <= 9, question.key).toBe(true);
          break;
        case 'inclusive':
          expect(a >= 11 && a <= 99, question.key).toBe(true);
          expect(b - a >= 10 && b - a <= 150, question.key).toBe(true);
          break;
        case 'posts':
          expect(POST_SPACINGS, question.key).toContain(a);
          expect(b >= 3 && b <= 20, question.key).toBe(true);
          expect(a * b, question.key).toBeLessThanOrEqual(500);
          break;
        case 'figure':
          expect(Object.keys(PATTERNS), question.key).toContain(rest[0]);
          expect(FIGURE_NUMBERS, question.key).toContain(Number(rest[1]));
          break;
        default:
          throw new Error(question.key);
      }
    }
  });

  it('draws the figure patterns equally, value or figure 1/2', () => {
    const figures = ofKind('figure');
    for (const pattern of Object.keys(PATTERNS)) {
      const count = figures.filter((item) => item.rest[0] === pattern).length;
      expect(near(count, figures.length, 1 / 3), pattern).toBe(true);
    }
    const reverse = figures.filter((item) => item.rest[2] === 'reverse').length;
    expect(near(reverse, figures.length, 0.5)).toBe(true);
  });

  it('answers, explains and keeps every prompt within 170 characters', () => {
    for (const { question } of parsed) {
      const step = stepOf(question);
      const result = step.check(typed(answerOf(question)));
      expect(result.correct, question.key).toBe(true);
      expect(result.explanation, question.key).toMatch(/^Vereenvoudigen: /);
      expect(step.prompt.length, question.key).toBeLessThanOrEqual(170);
      expect(question.topic).toBe('simplifyProblem');
    }
  });
});
