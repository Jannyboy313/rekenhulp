import { MINUS } from '../format';
import { pick, type Rng } from '../random';
import { fromInteger } from '../rational';
import { numberStep } from '../steps';
import { exactTip } from '../tips';
import type { Question } from '../types';

/** Legs a < b, hypotenuse c. */
export type Triple = readonly [number, number, number];
export type PythagorasContext = 'kaal' | 'schoolplein' | 'wandelen';
/** The side that is asked: 'c' for the hypotenuse, 'a' or 'b' for a leg. */
export type Side = 'a' | 'b' | 'c';

/** The 8 triples of spec §5.29, hypotenuse at most 25. */
export const TRIPLES: readonly Triple[] = [
  [3, 4, 5],
  [6, 8, 10],
  [9, 12, 15],
  [12, 16, 20],
  [15, 20, 25],
  [5, 12, 13],
  [8, 15, 17],
  [7, 24, 25],
];

/** A schoolplein has a diagonal of at least 13 m (spec §5.29). */
export const SCHOOLPLEIN_MIN_DIAGONAL = 13;

/** The prompt per context and asked side. In the schoolplein b is the length, a the width. */
function prompts([a, b, c]: Triple): Record<PythagorasContext, Record<Side, string>> {
  return {
    kaal: {
      a: `Een rechthoekige driehoek heeft een schuine zijde van ${c} cm en een rechthoekszijde van ${b} cm. Hoe lang is de andere rechthoekszijde?`,
      b: `Een rechthoekige driehoek heeft een schuine zijde van ${c} cm en een rechthoekszijde van ${a} cm. Hoe lang is de andere rechthoekszijde?`,
      c: `Een rechthoekige driehoek heeft rechthoekszijden van ${a} cm en ${b} cm. Hoe lang is de schuine zijde?`,
    },
    schoolplein: {
      a: `Een schoolplein is ${b} m lang en de diagonaal is ${c} m. Hoe breed is het schoolplein?`,
      b: `Een schoolplein is ${a} m breed en de diagonaal is ${c} m. Hoe lang is het schoolplein?`,
      c: `Een schoolplein is ${b} m lang en ${a} m breed. Hoe lang is de diagonaal?`,
    },
    wandelen: {
      a: `Je loopt ${b} m naar het oosten en dan naar het noorden. Je bent nu hemelsbreed ${c} m van je beginpunt. Hoeveel m liep je naar het noorden?`,
      b: `Je loopt naar het oosten en dan ${a} m naar het noorden. Je bent nu hemelsbreed ${c} m van je beginpunt. Hoeveel m liep je naar het oosten?`,
      c: `Je loopt ${b} m naar het oosten en dan ${a} m naar het noorden. Hoe ver ben je hemelsbreed van je beginpunt?`,
    },
  };
}

/** The answer, how it is worked out, and the mistake that belongs to it (sum or difference). */
function calculation([a, b, c]: Triple, asked: Side) {
  if (asked === 'c') {
    return {
      answer: c,
      mistaken: a + b,
      tip: `Tel de kwadraten op: ${a}² + ${b}² = ${c * c}, en neem daarvan de wortel.`,
      explanation: `${a}² + ${b}² = ${a * a} + ${b * b} = ${c * c} → √${c * c} = ${c}`,
    };
  }
  const known = asked === 'a' ? b : a;
  const answer = asked === 'a' ? a : b;
  const square = answer * answer;
  return {
    answer,
    mistaken: c - known,
    tip: `Trek de kwadraten af: ${c}² ${MINUS} ${known}² = ${square}, en neem daarvan de wortel.`,
    explanation: `${c}² ${MINUS} ${known}² = ${c * c} ${MINUS} ${known * known} = ${square} → √${square} = ${answer}`,
  };
}

/**
 * `Een rechthoekige driehoek heeft rechthoekszijden van 6 cm en 8 cm. Hoe lang is de schuine
 * zijde?` The prompt shows the sides in cm for `kaal` and in m otherwise; in the schoolplein the
 * length is b and the width a, in the walk east is b and north a.
 */
export function pythagorasQuestion(
  context: PythagorasContext,
  triple: Triple,
  asked: Side,
): Question {
  const { answer, mistaken, tip, explanation } = calculation(triple, asked);
  return {
    key: ['pythagoras', asked, context, ...triple].join(':'),
    topic: 'pythagoras',
    steps: [
      numberStep({
        prompt: prompts(triple)[context][asked],
        answer: fromInteger(answer),
        suffix: context === 'kaal' ? 'cm' : 'm',
        explanation,
        diagnose: exactTip(fromInteger(mistaken), tip),
      }),
    ],
  };
}

// The bare form 50%, the schoolplein and the walk 25% each; the hypotenuse 50%, each leg 25%.
const CONTEXTS: readonly PythagorasContext[] = ['kaal', 'kaal', 'schoolplein', 'wandelen'];
const ASKED: readonly Side[] = ['c', 'c', 'a', 'b'];
const SCHOOLPLEIN_TRIPLES = TRIPLES.filter(([, , c]) => c >= SCHOOLPLEIN_MIN_DIAGONAL);

export function generatePythagoras(rng: Rng): Question {
  const context = pick(rng, CONTEXTS);
  const triple = pick(rng, context === 'schoolplein' ? SCHOOLPLEIN_TRIPLES : TRIPLES);
  return pythagorasQuestion(context, triple, pick(rng, ASKED));
}
