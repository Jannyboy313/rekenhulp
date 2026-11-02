import { formatInteger as f, formatRational, MINUS } from '../format';
import { drawUntil, pick, randomInt, type Rng } from '../random';
import { fromInteger, hasAtMostDecimals, rational } from '../rational';
import { numberStep } from '../steps';
import type { Question } from '../types';

// Averages in context (spec §5.88).
export interface Group {
  size: number;
  mean: number;
}

export type CombinedContext = 'klassen' | 'groepen';

interface CombinedRules {
  min: number;
  max: number;
  unit: string;
  people: string;
  suffix?: string;
  question: string;
  sentence: (letter: string, group: Group) => string;
}

const COMBINED: Readonly<Record<CombinedContext, CombinedRules>> = {
  klassen: {
    min: 5,
    max: 9,
    unit: 'klas',
    people: 'leerlingen',
    question: 'Wat is het gemiddelde van beide klassen samen?',
    sentence: (letter, { size, mean }) =>
      `In klas ${letter} zitten ${size} leerlingen met gemiddeld een ${mean}.`,
  },
  groepen: {
    min: 6,
    max: 14,
    unit: 'groep',
    people: 'kinderen',
    suffix: 'jaar',
    question: 'Wat is het gemiddelde samen?',
    sentence: (letter, { size, mean }) =>
      `In groep ${letter} zitten ${size} kinderen met een gemiddelde leeftijd van ${mean} jaar.`,
  },
};

const COMBINED_CONTEXTS = ['klassen', 'groepen'] as const;
const GROUP_SIZES = [10, 15, 20, 25, 30, 40];
const ORDINALS: Readonly<Record<number, string>> = {
  5: 'vijfde',
  6: 'zesde',
  7: 'zevende',
  8: 'achtste',
  9: 'negende',
};

/** Two groups with their own size and mean; the combined mean is the answer. */
export function combinedQuestion(context: CombinedContext, first: Group, second: Group): Question {
  const { unit, people, suffix, question, sentence } = COMBINED[context];
  const firstTotal = first.size * first.mean;
  const secondTotal = second.size * second.mean;
  const total = firstTotal + secondTotal;
  const size = first.size + second.size;
  const answer = rational(BigInt(total), BigInt(size));
  return {
    key: `statisticsProblems:combined:${context}:${first.size}:${first.mean}:${second.size}:${second.mean}`,
    topic: 'statisticsProblems',
    steps: [
      numberStep({
        prompt: `${sentence('A', first)} ${sentence('B', second)} ${question}`,
        answer,
        suffix,
        explanation: `${unit} A: ${first.size} × ${first.mean} = ${f(firstTotal)}, ${unit} B: ${second.size} × ${second.mean} = ${f(secondTotal)} → samen ${f(firstTotal)} + ${f(secondTotal)} = ${f(total)} voor ${size} ${people} → ${f(total)} : ${size} = ${formatRational(answer)}`,
      }),
    ],
  };
}

/** The number added to n numbers with mean m so that the mean becomes m + 1 (up) or m − 1. */
export function addedQuestion(n: number, m: number, up: boolean): Question {
  const newMean = up ? m + 1 : m - 1;
  const oldTotal = n * m;
  const newTotal = (n + 1) * newMean;
  const added = newTotal - oldTotal;
  return {
    key: `statisticsProblems:added:${n}:${m}:${up ? 'up' : 'down'}`,
    topic: 'statisticsProblems',
    steps: [
      numberStep({
        prompt: `Het gemiddelde van ${n} getallen is ${m}. Er komt een ${ORDINALS[n + 1]} getal bij en het gemiddelde wordt ${newMean}. Welk getal is dat?`,
        answer: fromInteger(added),
        explanation: `${n + 1} getallen met gemiddelde ${newMean} = ${n + 1} × ${newMean} = ${f(newTotal)}, eerst ${n} × ${m} = ${f(oldTotal)} → ${f(newTotal)} ${MINUS} ${f(oldTotal)} = ${f(added)}`,
      }),
    ],
  };
}

/** The mean of the n − 1 numbers left after removing r from n numbers with mean m. */
export function removedQuestion(n: number, m: number, r: number): Question {
  const total = n * m;
  const left = total - r;
  const answer = rational(BigInt(left), BigInt(n - 1));
  return {
    key: `statisticsProblems:removed:${n}:${m}:${r}`,
    topic: 'statisticsProblems',
    steps: [
      numberStep({
        prompt: `Het gemiddelde van ${n} getallen is ${m}. Je haalt het getal ${r} weg. Wat is het gemiddelde van de andere ${n - 1}?`,
        answer,
        explanation: `${n} × ${m} = ${f(total)} → ${f(total)} ${MINUS} ${r} = ${f(left)} → ${f(left)} : ${n - 1} = ${formatRational(answer)}`,
      }),
    ],
  };
}

function drawCombined(rng: Rng): Question {
  const context = pick(rng, COMBINED_CONTEXTS);
  const { min, max } = COMBINED[context];
  const [first, second] = drawUntil(() => {
    const a: Group = { size: pick(rng, GROUP_SIZES), mean: randomInt(rng, min, max) };
    const b: Group = { size: pick(rng, GROUP_SIZES), mean: randomInt(rng, min, max) };
    if (a.size === b.size || a.mean === b.mean) return null;
    const mean = rational(BigInt(a.size * a.mean + b.size * b.mean), BigInt(a.size + b.size));
    return hasAtMostDecimals(mean, 1) ? ([a, b] as const) : null;
  });
  return combinedQuestion(context, first, second);
}

function drawAdded(rng: Rng): Question {
  const drawn = drawUntil(() => {
    const n = randomInt(rng, 4, 8);
    const m = randomInt(rng, 5, 9);
    const up = rng() < 0.5;
    const added = (n + 1) * (up ? m + 1 : m - 1) - n * m;
    return added >= 1 && added <= 20 ? { n, m, up } : null;
  });
  return addedQuestion(drawn.n, drawn.m, drawn.up);
}

function drawRemoved(rng: Rng): Question {
  const drawn = drawUntil(() => {
    const n = randomInt(rng, 5, 8);
    const m = randomInt(rng, 6, 12);
    const r = randomInt(rng, 1, 30);
    if (r === m || n * m - r < n - 1) return null;
    return hasAtMostDecimals(rational(BigInt(n * m - r), BigInt(n - 1)), 1) ? { n, m, r } : null;
  });
  return removedQuestion(drawn.n, drawn.m, drawn.r);
}

/** Combined, added value or removed value, each 1/3. */
export function generateStatisticsProblems(rng: Rng): Question {
  return pick(rng, [drawCombined, drawAdded, drawRemoved])(rng);
}
