import {
  formatInteger as f,
  formatLiteral,
  formatMoney,
  formatRational,
  MINUS,
} from '../format';
import { drawUntil, pick, randomInt, randomIntWhere, range, type Rng } from '../random';
import {
  add,
  compare,
  fromInteger,
  multiply,
  ONE,
  rational,
  subtract,
  type Rational,
} from '../rational';
import { numberStep } from '../steps';
import { exactTip } from '../tips';
import type { Question } from '../types';

// Formulas (spec §5.36).
export type WordContext = 'taxi' | 'fietsverhuur' | 'kaars';
export type Asked = 'startgetal' | 'hellingsgetal';

export interface WordFormula {
  starts: readonly Rational[];
  rates: readonly Rational[];
  inputRange: readonly [number, number];
}

const whole = (...values: number[]): Rational[] => values.map(fromInteger);

export const WORD_FORMULAS: Readonly<Record<WordContext, WordFormula>> = {
  taxi: {
    starts: whole(3, 4, 5),
    rates: [fromInteger(2), rational(5n, 2n), fromInteger(3)],
    inputRange: [2, 20],
  },
  fietsverhuur: { starts: whole(5, 10, 15), rates: whole(...range(6, 15)), inputRange: [2, 10] },
  kaars: {
    starts: whole(15, 20, 24, 30),
    rates: [fromInteger(1), rational(3n, 2n), fromInteger(2), fromInteger(3)],
    inputRange: [2, 12],
  },
};

interface WordText {
  /** The formula up to its `=`. */
  name: string;
  unit: string;
  ask: (input: number) => string;
}

const WORD_TEXTS: Readonly<Record<WordContext, WordText>> = {
  taxi: {
    name: 'Taxi: kosten in euro',
    unit: 'aantal km',
    ask: (input) => `Wat kost een rit van ${input} km?`,
  },
  fietsverhuur: {
    name: 'Fietsverhuur: prijs in euro',
    unit: 'aantal dagen',
    ask: (input) => `Wat kost ${input} dagen huren?`,
  },
  kaars: {
    name: 'Kaars: lengte in cm',
    unit: 'aantal uren',
    ask: (input) => `Hoe lang is de kaars na ${input} uur?`,
  },
};

/** `Taxi: kosten in euro = 4 + 2,50 × aantal km. Wat kost een rit van 12 km?` */
export function wordFormulaQuestion(
  context: WordContext,
  start: Rational,
  rate: Rational,
  input: number,
): Question {
  const { name, unit, ask } = WORD_TEXTS[context];
  // The candle burns down; the others are money.
  const money = context !== 'kaars';
  const show = money ? formatMoney : formatRational;
  const sign = money ? '+' : MINUS;
  const product = multiply(rate, fromInteger(input));
  const answer = money ? add(start, product) : subtract(start, product);
  const front = `${show(start)} ${sign}`;
  return {
    key: `formulas:word:${context}:${formatRational(start)}:${formatRational(rate)}:${input}`,
    topic: 'formulas',
    steps: [
      numberStep({
        prompt: `${name} = ${front} ${show(rate)} × ${unit}. ${ask(input)}`,
        answer,
        prefix: money ? '€' : undefined,
        suffix: money ? undefined : 'cm',
        expected: show(answer),
        explanation: `${front} ${show(rate)} × ${input} = ${front} ${show(product)} = ${show(answer)}`,
      }),
    ],
  };
}

/** `y = 3x − 4. Wat is y als x = 5?` with a signed `b`. */
export function letterFormulaQuestion(a: number, b: number, x: number): Question {
  const sign = b < 0 ? MINUS : '+';
  const product = a * x;
  const answer = product + b;
  const constant = `${sign} ${Math.abs(b)}`;
  return {
    key: `formulas:letter:letter:${a}:${b}:${x}`,
    topic: 'formulas',
    steps: [
      numberStep({
        prompt: `y = ${a}x ${constant}. Wat is y als x = ${f(x)}?`,
        answer: fromInteger(answer),
        explanation: `${a} × ${formatLiteral(x)} ${constant} = ${f(product)} ${constant} = ${f(answer)}`,
      }),
    ],
  };
}

/** `y = ax + b` at x = firstX, firstX + step, … (four values); asks b or a. */
export function tableQuestion(
  a: number,
  b: number,
  firstX: number,
  step: 1 | 2,
  asked: Asked,
): Question {
  const xs = range(0, 3).map((i) => firstX + i * step);
  const ys = xs.map((x) => a * x + b);
  const firstY = ys[0]!;
  const change = a * step;
  const direction = change > 0 ? 'groter' : 'kleiner';
  const grows = `y wordt ${Math.abs(change)} ${direction}`;
  const slope = asked === 'hellingsgetal';
  return {
    key: `formulas:table:${asked}:${a}:${b}:${firstX}:${step}`,
    topic: 'formulas',
    steps: [
      numberStep({
        prompt: `Tabel: bij x = ${xs.join(', ')} hoort y = ${ys.map((y) => f(y)).join(', ')}. Wat is het ${asked}?`,
        answer: fromInteger(slope ? a : b),
        explanation: slope
          ? `x wordt ${step} groter, ${grows} → ${f(change)}${step === 1 ? '' : ` : ${step} = ${f(a)}`}`
          : `hellingsgetal ${f(a)} → bij x = 0: ${f(firstY)} ${MINUS} ${firstX} × ${formatLiteral(a)} = ${f(b)}`,
        // The mistake: the change over a step of 2, or y at the first x instead of at x = 0.
        diagnose: slope
          ? step === 2
            ? exactTip(
                fromInteger(change),
                `${grows} als x 2 groter wordt; per 1 is dat ${f(change)} : 2 = ${f(a)}.`,
              )
            : undefined
          : exactTip(
              fromInteger(firstY),
              `Het startgetal is y bij x = 0, niet bij x = ${firstX}.`,
            ),
      }),
    ],
  };
}

const CONTEXTS = ['taxi', 'fietsverhuur', 'kaars'] as const;

function drawWord(rng: Rng): Question {
  const context = pick(rng, CONTEXTS);
  const { starts, rates, inputRange } = WORD_FORMULAS[context];
  const { start, rate, input } = drawUntil(() => {
    const start = pick(rng, starts);
    const rate = pick(rng, rates);
    const input = randomInt(rng, inputRange[0], inputRange[1]);
    // A candle must still be there.
    const left = subtract(start, multiply(rate, fromInteger(input)));
    return context !== 'kaars' || compare(left, ONE) >= 0 ? { start, rate, input } : null;
  });
  return wordFormulaQuestion(context, start, rate, input);
}

function drawLetter(rng: Rng): Question {
  const size = randomInt(rng, 1, 20);
  return letterFormulaQuestion(
    randomInt(rng, 2, 9),
    rng() < 0.25 ? -size : size,
    randomIntWhere(rng, -5, 10, (x) => x !== 0),
  );
}

function drawTable(rng: Rng): Question {
  const { a, b, firstX, step } = drawUntil(() => {
    const a = rng() < 0.25 ? -randomInt(rng, 1, 5) : randomInt(rng, 1, 10);
    const b = randomInt(rng, -10, 30);
    const firstX = randomInt(rng, 1, 3);
    const step = pick(rng, [1, 2] as const);
    const ys = range(0, 3).map((i) => a * (firstX + i * step) + b);
    return ys.every((y) => y >= -50 && y <= 100) ? { a, b, firstX, step } : null;
  });
  return tableQuestion(a, b, firstX, step, pick(rng, ['startgetal', 'hellingsgetal'] as const));
}

/** Substitution (word or letter formula, each 1/2) or a table, each 1/2. */
export function generateFormulas(rng: Rng): Question {
  if (rng() < 0.5) return rng() < 0.5 ? drawWord(rng) : drawLetter(rng);
  return drawTable(rng);
}
