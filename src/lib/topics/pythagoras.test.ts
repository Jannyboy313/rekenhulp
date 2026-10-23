import { describe, expect, it } from 'vitest';
import { MINUS } from '../format';
import { createRng } from '../random';
import { fromInteger } from '../rational';
import type { Question } from '../types';
import {
  generatePythagoras,
  pythagorasQuestion,
  SCHOOLPLEIN_MIN_DIAGONAL,
  TRIPLES,
  type PythagorasContext,
  type Side,
  type Triple,
} from './pythagoras';
import { answerOf, stepOf, typed } from './testHelpers';

const TIP_SUM = 'Tel de kwadraten op: 6² + 8² = 100, en neem daarvan de wortel.';
const TIP_DIFFERENCE = 'Trek de kwadraten af: 13² − 5² = 144, en neem daarvan de wortel.';
const TIP_FACTOR_TEN = 'Je antwoord is 10 keer te groot. Let op de komma en het aantal nullen.';

describe('TRIPLES', () => {
  it('are exactly the 8 triples of spec §5.29', () => {
    expect(TRIPLES).toEqual([
      [3, 4, 5],
      [6, 8, 10],
      [9, 12, 15],
      [12, 16, 20],
      [15, 20, 25],
      [5, 12, 13],
      [8, 15, 17],
      [7, 24, 25],
    ]);
  });

  it('have legs a < b and a hypotenuse of at most 25 that fits Pythagoras', () => {
    for (const [a, b, c] of TRIPLES) {
      expect(a).toBeLessThan(b);
      expect(c).toBeLessThanOrEqual(25);
      expect(a * a + b * b).toBe(c * c);
    }
  });
});

describe('question text', () => {
  it.each<[string, () => Question, string, string, string, string]>([
    [
      'kaal (6, 8, 10), c',
      () => pythagorasQuestion('kaal', [6, 8, 10], 'c'),
      'Een rechthoekige driehoek heeft rechthoekszijden van 6 cm en 8 cm. Hoe lang is de schuine zijde?',
      '10',
      'cm',
      '6² + 8² = 36 + 64 = 100 → √100 = 10',
    ],
    [
      'kaal (3, 4, 5), c (edge: smallest)',
      () => pythagorasQuestion('kaal', [3, 4, 5], 'c'),
      'Een rechthoekige driehoek heeft rechthoekszijden van 3 cm en 4 cm. Hoe lang is de schuine zijde?',
      '5',
      'cm',
      '3² + 4² = 9 + 16 = 25 → √25 = 5',
    ],
    [
      'kaal (7, 24, 25), c (edge: largest)',
      () => pythagorasQuestion('kaal', [7, 24, 25], 'c'),
      'Een rechthoekige driehoek heeft rechthoekszijden van 7 cm en 24 cm. Hoe lang is de schuine zijde?',
      '25',
      'cm',
      '7² + 24² = 49 + 576 = 625 → √625 = 25',
    ],
    [
      'kaal (5, 12, 13), b',
      () => pythagorasQuestion('kaal', [5, 12, 13], 'b'),
      'Een rechthoekige driehoek heeft een schuine zijde van 13 cm en een rechthoekszijde van 5 cm. Hoe lang is de andere rechthoekszijde?',
      '12',
      'cm',
      '13² − 5² = 169 − 25 = 144 → √144 = 12',
    ],
    [
      'kaal (5, 12, 13), a',
      () => pythagorasQuestion('kaal', [5, 12, 13], 'a'),
      'Een rechthoekige driehoek heeft een schuine zijde van 13 cm en een rechthoekszijde van 12 cm. Hoe lang is de andere rechthoekszijde?',
      '5',
      'cm',
      '13² − 12² = 169 − 144 = 25 → √25 = 5',
    ],
    [
      'kaal (7, 24, 25), b (edge: largest)',
      () => pythagorasQuestion('kaal', [7, 24, 25], 'b'),
      'Een rechthoekige driehoek heeft een schuine zijde van 25 cm en een rechthoekszijde van 7 cm. Hoe lang is de andere rechthoekszijde?',
      '24',
      'cm',
      '25² − 7² = 625 − 49 = 576 → √576 = 24',
    ],
    [
      'schoolplein (15, 20, 25), c',
      () => pythagorasQuestion('schoolplein', [15, 20, 25], 'c'),
      'Een schoolplein is 20 m lang en 15 m breed. Hoe lang is de diagonaal?',
      '25',
      'm',
      '15² + 20² = 225 + 400 = 625 → √625 = 25',
    ],
    [
      'schoolplein (15, 20, 25), a: the width',
      () => pythagorasQuestion('schoolplein', [15, 20, 25], 'a'),
      'Een schoolplein is 20 m lang en de diagonaal is 25 m. Hoe breed is het schoolplein?',
      '15',
      'm',
      '25² − 20² = 625 − 400 = 225 → √225 = 15',
    ],
    [
      'schoolplein (15, 20, 25), b: the length',
      () => pythagorasQuestion('schoolplein', [15, 20, 25], 'b'),
      'Een schoolplein is 15 m breed en de diagonaal is 25 m. Hoe lang is het schoolplein?',
      '20',
      'm',
      '25² − 15² = 625 − 225 = 400 → √400 = 20',
    ],
    [
      'schoolplein (5, 12, 13), c (edge: diagonal 13)',
      () => pythagorasQuestion('schoolplein', [5, 12, 13], 'c'),
      'Een schoolplein is 12 m lang en 5 m breed. Hoe lang is de diagonaal?',
      '13',
      'm',
      '5² + 12² = 25 + 144 = 169 → √169 = 13',
    ],
    [
      'wandelen (5, 12, 13), c',
      () => pythagorasQuestion('wandelen', [5, 12, 13], 'c'),
      'Je loopt 12 m naar het oosten en dan 5 m naar het noorden. Hoe ver ben je hemelsbreed van je beginpunt?',
      '13',
      'm',
      '5² + 12² = 25 + 144 = 169 → √169 = 13',
    ],
    [
      'wandelen (5, 12, 13), a: north',
      () => pythagorasQuestion('wandelen', [5, 12, 13], 'a'),
      'Je loopt 12 m naar het oosten en dan naar het noorden. Je bent nu hemelsbreed 13 m van je beginpunt. Hoeveel m liep je naar het noorden?',
      '5',
      'm',
      '13² − 12² = 169 − 144 = 25 → √25 = 5',
    ],
    [
      'wandelen (5, 12, 13), b: east',
      () => pythagorasQuestion('wandelen', [5, 12, 13], 'b'),
      'Je loopt naar het oosten en dan 5 m naar het noorden. Je bent nu hemelsbreed 13 m van je beginpunt. Hoeveel m liep je naar het oosten?',
      '12',
      'm',
      '13² − 5² = 169 − 25 = 144 → √144 = 12',
    ],
  ])('%s', (_label, make, prompt, answer, suffix, explanation) => {
    const step = stepOf(make());
    expect(step.kind).toBe('number');
    expect(step.prompt).toBe(prompt);
    expect(step.suffix).toBe(suffix);
    expect(step.prefix).toBeUndefined();
    expect(step.check(answer).correct).toBe(true);
    expect(step.check('').expected).toBe(answer);
    expect(step.check(answer).explanation).toBe(explanation);
    expect(step.check('1').explanation).toBe(explanation);
  });

  it('has a key of the asked side, the context and the triple', () => {
    expect(pythagorasQuestion('kaal', [6, 8, 10], 'c').key).toBe('pythagoras:c:kaal:6:8:10');
    expect(pythagorasQuestion('schoolplein', [15, 20, 25], 'a').key).toBe(
      'pythagoras:a:schoolplein:15:20:25',
    );
    expect(pythagorasQuestion('wandelen', [5, 12, 13], 'b').key).toBe(
      'pythagoras:b:wandelen:5:12:13',
    );
    expect(pythagorasQuestion('kaal', [6, 8, 10], 'c').topic).toBe('pythagoras');
  });
});

describe('tips', () => {
  it.each<[string, string, () => Question, string | undefined]>([
    ['kaal (6, 8, 10), c', '14', () => pythagorasQuestion('kaal', [6, 8, 10], 'c'), TIP_SUM],
    [
      'kaal (5, 12, 13), b',
      '8',
      () => pythagorasQuestion('kaal', [5, 12, 13], 'b'),
      TIP_DIFFERENCE,
    ],
    [
      'kaal (5, 12, 13), a: the hypotenuse minus the other leg',
      '1',
      () => pythagorasQuestion('kaal', [5, 12, 13], 'a'),
      'Trek de kwadraten af: 13² − 12² = 25, en neem daarvan de wortel.',
    ],
    [
      'kaal (6, 8, 10), c: a wrong answer',
      '15',
      () => pythagorasQuestion('kaal', [6, 8, 10], 'c'),
      undefined,
    ],
    [
      'kaal (5, 12, 13), b: the sum of the sides is no mistake of this form',
      '18',
      () => pythagorasQuestion('kaal', [5, 12, 13], 'b'),
      undefined,
    ],
    [
      'kaal (5, 12, 13), a: factor of ten',
      '50',
      () => pythagorasQuestion('kaal', [5, 12, 13], 'a'),
      TIP_FACTOR_TEN,
    ],
  ])('%s, typing %s', (_label, input, make, tip) => {
    expect(stepOf(make()).check(input).tip).toBe(tip);
  });

  it('gives a correct answer no tip', () => {
    const result = stepOf(pythagorasQuestion('kaal', [6, 8, 10], 'c')).check('10');
    expect(result.correct).toBe(true);
    expect(result.tip).toBeUndefined();
  });
});

describe('generatePythagoras', () => {
  const COUNT = 3000;
  const rng = createRng(2311);
  const questions = Array.from({ length: COUNT }, () => generatePythagoras(rng));

  /** The bare prompt of a leg does not say which leg is asked: 'leg'. */
  const PROMPTS: readonly (readonly [PythagorasContext, Side | 'leg', RegExp])[] = [
    [
      'kaal',
      'c',
      /^Een rechthoekige driehoek heeft rechthoekszijden van (\d+) cm en (\d+) cm\. Hoe lang is de schuine zijde\?$/u,
    ],
    [
      'kaal',
      'leg',
      /^Een rechthoekige driehoek heeft een schuine zijde van (\d+) cm en een rechthoekszijde van (\d+) cm\. Hoe lang is de andere rechthoekszijde\?$/u,
    ],
    [
      'schoolplein',
      'c',
      /^Een schoolplein is (\d+) m lang en (\d+) m breed\. Hoe lang is de diagonaal\?$/u,
    ],
    [
      'schoolplein',
      'a',
      /^Een schoolplein is (\d+) m lang en de diagonaal is (\d+) m\. Hoe breed is het schoolplein\?$/u,
    ],
    [
      'schoolplein',
      'b',
      /^Een schoolplein is (\d+) m breed en de diagonaal is (\d+) m\. Hoe lang is het schoolplein\?$/u,
    ],
    [
      'wandelen',
      'c',
      /^Je loopt (\d+) m naar het oosten en dan (\d+) m naar het noorden\. Hoe ver ben je hemelsbreed van je beginpunt\?$/u,
    ],
    [
      'wandelen',
      'a',
      /^Je loopt (\d+) m naar het oosten en dan naar het noorden\. Je bent nu hemelsbreed (\d+) m van je beginpunt\. Hoeveel m liep je naar het noorden\?$/u,
    ],
    [
      'wandelen',
      'b',
      /^Je loopt naar het oosten en dan (\d+) m naar het noorden\. Je bent nu hemelsbreed (\d+) m van je beginpunt\. Hoeveel m liep je naar het oosten\?$/u,
    ],
  ];
  /** The asked side as an index into a triple. */
  const INDEX_OF: Record<Side, number> = { a: 0, b: 1, c: 2 };

  interface Parsed {
    context: PythagorasContext;
    asked: Side;
    /** The two numbers of the prompt, in the order shown. */
    shown: readonly [number, number];
    /** The triple, worked out from the numbers of the prompt alone. */
    triple: Triple;
    question: Question;
  }

  /** Hypotenuse asked: both numbers are legs. A leg asked: the larger number is the hypotenuse. */
  function tripleOf(hypotenuseAsked: boolean, low: number, high: number): Triple {
    if (hypotenuseAsked) return [low, high, Math.sqrt(low * low + high * high)];
    const other = Math.sqrt(high * high - low * low);
    return [Math.min(low, other), Math.max(low, other), high];
  }

  function parse(question: Question): Parsed {
    const { prompt } = stepOf(question);
    for (const [context, form, pattern] of PROMPTS) {
      const match = pattern.exec(prompt);
      if (match === null) continue;
      const first = Number(match[1]);
      const second = Number(match[2]);
      const low = Math.min(first, second);
      const triple = tripleOf(form === 'c', low, Math.max(first, second));
      // The shown leg is the smaller number, so the asked leg is the other one.
      const missing = low === triple[0] ? 'b' : 'a';
      return {
        context,
        asked: form === 'leg' ? missing : form,
        shown: [first, second],
        triple,
        question,
      };
    }
    throw new Error(`Unexpected prompt: ${prompt}`);
  }

  const all = questions.map(parse);
  const share = (matches: (one: Parsed) => boolean) => all.filter(matches).length / all.length;

  it('creates single-step number questions that accept their own answer', () => {
    for (const question of questions) {
      expect(question.topic).toBe('pythagoras');
      expect(question.steps, question.key).toHaveLength(1);
      expect(stepOf(question).kind).toBe('number');
      const result = stepOf(question).check(typed(answerOf(question)));
      expect(result.correct, question.key).toBe(true);
      expect(result.explanation, question.key).toBeTruthy();
    }
  });

  it('asks the hypotenuse 50% and each leg 25%', () => {
    expect(Math.abs(share(({ asked }) => asked === 'c') - 0.5)).toBeLessThan(0.05);
    expect(Math.abs(share(({ asked }) => asked === 'a') - 0.25)).toBeLessThan(0.05);
    expect(Math.abs(share(({ asked }) => asked === 'b') - 0.25)).toBeLessThan(0.05);
  });

  it('uses the bare form 50%, the schoolplein 25% and the walk 25%', () => {
    expect(Math.abs(share(({ context }) => context === 'kaal') - 0.5)).toBeLessThan(0.05);
    expect(Math.abs(share(({ context }) => context === 'schoolplein') - 0.25)).toBeLessThan(0.05);
    expect(Math.abs(share(({ context }) => context === 'wandelen') - 0.25)).toBeLessThan(0.05);
  });

  it('draws the triples of spec §5.29, a schoolplein only with a diagonal of 13 m or more', () => {
    const asText = (triples: readonly Triple[]) =>
      new Set(triples.map((triple) => triple.join(':')));
    const used = (context: PythagorasContext) =>
      asText(all.filter((one) => one.context === context).map(({ triple }) => triple));
    expect(used('kaal')).toEqual(asText(TRIPLES));
    expect(used('wandelen')).toEqual(asText(TRIPLES));
    expect(used('schoolplein')).toEqual(
      asText(TRIPLES.filter(([, , c]) => c >= SCHOOLPLEIN_MIN_DIAGONAL)),
    );
    expect(SCHOOLPLEIN_MIN_DIAGONAL).toBe(13);
  });

  it('shows whole sides with a² + b² = c², in cm for the bare form and in m otherwise', () => {
    for (const { context, triple, question } of all) {
      const [a, b, c] = triple;
      expect(Number.isInteger(c), question.key).toBe(true);
      expect(Number.isInteger(a) && Number.isInteger(b), question.key).toBe(true);
      expect(a * a + b * b, question.key).toBe(c * c);
      expect(stepOf(question).suffix, question.key).toBe(context === 'kaal' ? 'cm' : 'm');
    }
  });

  it('answers the asked side', () => {
    for (const { asked, triple, question } of all) {
      expect(answerOf(question), question.key).toEqual(fromInteger(triple[INDEX_OF[asked]]!));
    }
  });

  it('shows the legs shorter first in the bare form and longer first otherwise', () => {
    for (const { context, asked, shown, question } of all) {
      if (asked !== 'c') continue;
      const [first, second] = shown;
      expect(first < second, question.key).toBe(context === 'kaal');
    }
  });

  it('has a key of the asked side, the context and the triple', () => {
    for (const { asked, context, triple, question } of all) {
      expect(question.key, stepOf(question).prompt).toBe(
        ['pythagoras', asked, context, ...triple].join(':'),
      );
    }
  });

  it('names the sum or the difference of the sides as the mistake', () => {
    for (const { asked, triple, question } of all) {
      const [a, b, c] = triple;
      if (asked === 'c') {
        const tip = `Tel de kwadraten op: ${a}² + ${b}² = ${c * c}, en neem daarvan de wortel.`;
        expect(stepOf(question).check(String(a + b)).tip, question.key).toBe(tip);
      } else {
        const known = asked === 'a' ? b : a;
        const answer = triple[INDEX_OF[asked]]!;
        const tip = `Trek de kwadraten af: ${c}² ${MINUS} ${known}² = ${answer * answer}, en neem daarvan de wortel.`;
        expect(stepOf(question).check(String(c - known)).tip, question.key).toBe(tip);
      }
    }
  });

  it('gives the same prompt and answer to questions with the same key', () => {
    const seen = new Map<string, string>();
    for (const question of questions) {
      const shown = `${stepOf(question).prompt} ${stepOf(question).check('').expected}`;
      expect(seen.get(question.key) ?? shown, question.key).toBe(shown);
      seen.set(question.key, shown);
    }
    // 8 triples × 3 asked sides for the bare form and the walk, 6 triples × 3 for the schoolplein.
    expect(seen.size).toBe(66);
  });

  it('is deterministic for a fixed seed', () => {
    const keys = (seed: number) => {
      const random = createRng(seed);
      return Array.from({ length: 50 }, () => generatePythagoras(random).key);
    };
    expect(keys(7)).toEqual(keys(7));
    expect(keys(7)).not.toEqual(keys(8));
  });
});
