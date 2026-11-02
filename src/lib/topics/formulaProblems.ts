import { formatEuro, formatInteger as f, formatMoney, formatRational, MINUS } from '../format';
import { drawUntil, pick, randomInt, range, type Rng } from '../random';
import {
  add,
  compare,
  fromInteger,
  multiply,
  ONE,
  subtract,
  type Rational,
} from '../rational';
import { numberStep } from '../steps';
import type { Question } from '../types';
import { WORD_FORMULAS, WORD_TEXTS, type WordContext } from './formulas';

// Formulas and sequences in context (spec §5.89).
export type BreakEvenContext = 'abonnement' | 'sportschool';

const REVERSE_SUFFIX: Readonly<Record<WordContext, string>> = {
  taxi: 'km',
  fietsverhuur: 'dagen',
  kaars: 'uur',
};

const REVERSE_ASK: Readonly<Record<WordContext, (shown: string) => string>> = {
  taxi: (shown) => `Een rit kost ${shown}. Hoeveel km is dat?`,
  fietsverhuur: (shown) => `Je betaalt ${shown} voor de huur. Hoeveel dagen was dat?`,
  kaars: (shown) => `De kaars is nog ${shown} cm lang. Hoeveel uur brandt hij al?`,
};

/** The word formula of §5.36 with its result given; asks the quantity (always whole). */
export function reverseQuestion(
  context: WordContext,
  start: Rational,
  rate: Rational,
  input: number,
): Question {
  const { name, unit } = WORD_TEXTS[context];
  // The candle burns down; the others are money.
  const money = context !== 'kaars';
  const show = money ? formatMoney : formatRational;
  const sign = money ? '+' : MINUS;
  const product = multiply(rate, fromInteger(input));
  const result = money ? add(start, product) : subtract(start, product);
  const shown = money ? formatEuro(result) : formatRational(result);
  const gap = money
    ? `${show(result)} ${MINUS} ${show(start)}`
    : `${show(start)} ${MINUS} ${show(result)}`;
  return {
    key: `formulaProblems:reverse:${context}:${formatRational(start)}:${formatRational(rate)}:${input}`,
    topic: 'formulaProblems',
    steps: [
      numberStep({
        prompt: `${name} = ${show(start)} ${sign} ${show(rate)} × ${unit}. ${REVERSE_ASK[context](shown)}`,
        answer: fromInteger(input),
        suffix: REVERSE_SUFFIX[context],
        explanation: `${show(start)} ${sign} ${show(rate)} × ${unit} = ${show(result)} → ${show(rate)} × ${unit} = ${gap} = ${show(product)} → ${show(product)} : ${show(rate)} = ${input}`,
      }),
    ],
  };
}

const BREAK_EVEN: Readonly<Record<BreakEvenContext, { name: string; noun: string; plural: string }>> =
  {
    abonnement: { name: 'Abonnement', noun: 'film', plural: 'films' },
    sportschool: { name: 'Sportschool', noun: 'les', plural: 'lessen' },
  };

/** Two offers `startA + rateA × x` and `startB + rateB × x`, with startA > startB and rateA < rateB. */
export function breakEvenQuestion(
  context: BreakEvenContext,
  startA: number,
  rateA: number,
  startB: number,
  rateB: number,
): Question {
  const { name, noun, plural } = BREAK_EVEN[context];
  const extra = startA - startB;
  const gain = rateB - rateA;
  const x = extra / gain;
  return {
    key: `formulaProblems:breakeven:${context}:${startA}:${rateA}:${startB}:${rateB}`,
    topic: 'formulaProblems',
    steps: [
      numberStep({
        prompt: `${name} A kost ${formatEuro(fromInteger(startA))} per maand plus ${formatEuro(fromInteger(rateA))} per ${noun}. ${name} B kost ${formatEuro(fromInteger(startB))} per maand plus ${formatEuro(fromInteger(rateB))} per ${noun}. Bij hoeveel ${plural} kosten ze evenveel?`,
        answer: fromInteger(x),
        suffix: plural,
        explanation: `A is ${formatEuro(fromInteger(extra))} duurder per maand (${startA} ${MINUS} ${startB}), B is ${formatEuro(fromInteger(gain))} duurder per ${noun} (${rateB} ${MINUS} ${rateA}) → ${extra} : ${gain} = ${x} ${plural}`,
      }),
    ],
  };
}

/** An increasing sequence with four terms shown; asks the place n of the term start + (n − 1) × diff. */
export function positionQuestion(start: number, diff: number, n: number): Question {
  const steps = n - 1;
  const value = start + steps * diff;
  const shownTerms = range(0, 3).map((i) => f(start + i * diff));
  return {
    key: `formulaProblems:position:${start}:${diff}:${n}`,
    topic: 'formulaProblems',
    steps: [
      numberStep({
        prompt: `Patroon: ${shownTerms.join(', ')}, … Op welke plek staat ${f(value)}?`,
        answer: fromInteger(n),
        explanation: `van ${f(start)} naar ${f(value)} is ${f(steps * diff)} meer → ${f(steps * diff)} : ${diff} = ${steps} stappen → plek 1 + ${steps} = ${n}`,
      }),
    ],
  };
}

const REVERSE_CONTEXTS = ['taxi', 'fietsverhuur', 'kaars'] as const;

function drawReverse(rng: Rng): Question {
  const context = pick(rng, REVERSE_CONTEXTS);
  const { starts, rates, inputRange } = WORD_FORMULAS[context];
  const { start, rate, input } = drawUntil(() => {
    const start = pick(rng, starts);
    const rate = pick(rng, rates);
    const input = randomInt(rng, inputRange[0], inputRange[1]);
    // A candle must still be there.
    const left = subtract(start, multiply(rate, fromInteger(input)));
    return context !== 'kaars' || compare(left, ONE) >= 0 ? { start, rate, input } : null;
  });
  return reverseQuestion(context, start, rate, input);
}

function drawBreakEven(rng: Rng): Question {
  const context = pick(rng, ['abonnement', 'sportschool'] as const);
  const { startA, rateA, startB, rateB } = drawUntil(() => {
    const startB = randomInt(rng, 1, 20);
    const extra = randomInt(rng, 2, 12);
    const rateA = randomInt(rng, 1, 9);
    const gain = randomInt(rng, 1, 3);
    const x = extra / gain;
    return extra % gain === 0 && x >= 2 && x <= 10
      ? { startA: startB + extra, rateA, startB, rateB: rateA + gain }
      : null;
  });
  return breakEvenQuestion(context, startA, rateA, startB, rateB);
}

function drawPosition(rng: Rng): Question {
  const { start, diff, n } = drawUntil(() => {
    const start = randomInt(rng, 1, 20);
    const diff = randomInt(rng, 2, 9);
    const n = randomInt(rng, 10, 60);
    return start + (n - 1) * diff <= 500 ? { start, diff, n } : null;
  });
  return positionQuestion(start, diff, n);
}

/** Reverse word formula, break-even of two offers, or position in a sequence, each 1/3. */
export function generateFormulaProblems(rng: Rng): Question {
  switch (pick(rng, ['reverse', 'breakEven', 'position'] as const)) {
    case 'reverse':
      return drawReverse(rng);
    case 'breakEven':
      return drawBreakEven(rng);
    case 'position':
      return drawPosition(rng);
  }
}
