import { formatInteger as f } from '../format';
import { drawUntil, pick, randomInt, type Rng } from '../random';
import { fromInteger } from '../rational';
import { numberStep } from '../steps';
import type { Question } from '../types';
import { applyChain, describeChain, drawChain, type Operation } from './workingBackwards';

// Working backwards, deeper (spec §5.95).

export function chainQuestion(start: number, operations: readonly Operation[]): Question {
  const result = applyChain(start, operations, 300)!;
  const { spoken, undo } = describeChain(result, operations);
  return {
    key: `backwardsProblems:chain:${start}:${operations.map(({ kind, k }) => `${kind}${k}`).join(',')}`,
    topic: 'backwardsProblems',
    steps: [
      numberStep({
        prompt: `Ik denk aan een getal. ${spoken}. Ik kom uit op ${f(result)}. Aan welk getal dacht ik?`,
        answer: fromInteger(start),
        explanation: `Terugrekenen vanaf ${f(result)}: ${undo}`,
      }),
    ],
  };
}

/** The part sold is 1/n of the stock. */
export type RoundsPart = 2 | 3 | 4;
export type RoundsContext = 'bakker' | 'kraam' | 'kassa';

const PART_TEXT: Readonly<Record<RoundsPart, { sold: string; rest: string }>> = {
  2: { sold: 'de helft', rest: '1/2' },
  3: { sold: 'een derde', rest: '2/3' },
  4: { sold: 'een kwart', rest: '3/4' },
};
const CONTEXT: Readonly<Record<RoundsContext, { seller: string; item: string }>> = {
  bakker: { seller: 'Een bakker', item: 'broden' },
  kraam: { seller: 'Een kraam', item: 'appels' },
  kassa: { seller: 'Een kassa', item: 'kaartjes' },
};

/** The stock before the first round, or null when it or the stock after it is not whole or above 120. */
export function roundsStart(n1: RoundsPart | number, n2: RoundsPart | number, left: number) {
  const after = (left * n2) / (n2 - 1);
  const start = (after * n1) / (n1 - 1);
  return Number.isInteger(after) && Number.isInteger(start) && start <= 120 ? start : null;
}

export function roundsQuestion(
  n1: RoundsPart,
  n2: RoundsPart,
  left: number,
  context: RoundsContext,
): Question {
  const start = roundsStart(n1, n2, left)!;
  const { seller, item } = CONTEXT[context];
  const undoPart = (n: RoundsPart, after: number) =>
    n === 2 ? `${f(after)} × 2` : `${f(after)} : ${n - 1} × ${n}`;
  const middle = (left * n2) / (n2 - 1);
  return {
    key: `backwardsProblems:rounds:${n1}:${n2}:${left}:${context}`,
    topic: 'backwardsProblems',
    steps: [
      numberStep({
        prompt: `${seller} verkoopt 's ochtends ${PART_TEXT[n1].sold} van de ${item} en 's middags ${PART_TEXT[n2].sold} van de rest. Er blijven ${left} ${item} over. Hoeveel ${item} waren het eerst?`,
        answer: fromInteger(start),
        explanation: `Terugrekenen vanaf ${left}: na de middag is ${PART_TEXT[n2].rest} over → ${undoPart(n2, left)} = ${f(middle)} → na de ochtend is ${PART_TEXT[n1].rest} over → ${undoPart(n1, middle)} = ${f(start)}`,
      }),
    ],
  };
}

const PARTS: readonly RoundsPart[] = [2, 3, 4];
const CONTEXTS: readonly RoundsContext[] = ['bakker', 'kraam', 'kassa'];

function drawRounds(rng: Rng): Question {
  const n1 = pick(rng, PARTS);
  const n2 = pick(rng, PARTS);
  const context = pick(rng, CONTEXTS);
  const left = drawUntil(() => {
    const left = randomInt(rng, 4, 20);
    return roundsStart(n1, n2, left) === null ? null : left;
  });
  return roundsQuestion(n1, n2, left, context);
}

/** Long chain and rounds, each 1/2. */
export function generateBackwardsProblems(rng: Rng): Question {
  if (rng() < 0.5) {
    const { start, operations } = drawChain(rng, 4, 300);
    return chainQuestion(start, operations);
  }
  return drawRounds(rng);
}
