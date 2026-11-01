import { formatEuro, formatInteger, formatMoney, formatRational, MINUS } from '../format';
import { gcd } from '../primes';
import { drawUntil, pick, randomInt, range, type Rng } from '../random';
import { fromInteger, hasAtMostDecimals, rational } from '../rational';
import { numberStep } from '../steps';
import type { Question } from '../types';
import { hasAtMostTwoSignificantDigits } from './percentages';

/** Spec §5.58. */
export const NAME_PAIRS = [
  ['Anna', 'Bas'],
  ['Lotte', 'Daan'],
  ['Noor', 'Sam'],
] as const;

export type DifferenceContext = 'geld' | 'knikkers' | 'stickers';
export const DIFFERENCE_CONTEXTS: readonly DifferenceContext[] = ['geld', 'knikkers', 'stickers'];
export type DifferenceAsked = 'smaller' | 'larger' | 'total';
export const DIFFERENCE_ASKED: readonly DifferenceAsked[] = ['smaller', 'larger', 'total'];

const parts = (count: number) => `${count} ${count === 1 ? 'deel' : 'delen'}`;

/** `Anna en Bas verdelen geld in de verhouding 3 : 5. Bas krijgt € 12 meer dan Anna. …` */
export function differenceQuestion(
  names: readonly [string, string],
  context: DifferenceContext,
  ratio: readonly [number, number],
  unit: number,
  asked: DifferenceAsked,
): Question {
  const [a, b] = ratio;
  const money = context === 'geld';
  const show = (value: number) => (money ? formatEuro(fromInteger(value)) : formatInteger(value));
  const difference = (b - a) * unit;
  const answer = { smaller: a * unit, larger: b * unit, total: (a + b) * unit }[asked];
  const noun = money ? '' : ` ${context}`;
  const prompt = {
    smaller: `Hoeveel${noun} krijgt ${names[0]}?`,
    larger: `Hoeveel${noun} krijgt ${names[1]}?`,
    total: `Hoeveel${money ? ' is het' : ` ${context} zijn het`} samen?`,
  }[asked];
  const result = {
    smaller: `${names[0]} = ${a} × ${unit} = ${formatInteger(answer)}`,
    larger: `${names[1]} = ${b} × ${unit} = ${formatInteger(answer)}`,
    total: `samen = ${a + b} × ${unit} = ${formatInteger(answer)}`,
  }[asked];
  return {
    key: `ratioReasoning:difference:${names[0]}:${context}:${a}:${b}:${unit}:${asked}`,
    topic: 'ratioReasoning',
    steps: [
      numberStep({
        prompt: `${names[0]} en ${names[1]} verdelen ${context} in de verhouding ${a} : ${b}. ${names[1]} krijgt ${show(difference)}${money ? '' : ` ${context}`} meer dan ${names[0]}. ${prompt}`,
        answer: fromInteger(answer),
        prefix: money ? '€' : undefined,
        suffix: money ? undefined : context,
        expected: money ? formatMoney(fromInteger(answer)) : undefined,
        explanation: `${b} ${MINUS} ${a} = ${parts(b - a)} = ${show(difference)} → 1 deel = ${show(unit)} → ${result}`,
      }),
    ],
  };
}

interface RescaleContext {
  prompt(first: number, amount: number, second: number): string;
  smallUnit: string;
  largeUnit: string;
  minPerPerson: number;
  maxPerPerson: number;
}

export const RESCALE_CONTEXTS: Readonly<Record<string, RescaleContext>> = {
  pasta: {
    prompt: (first, amount, second) =>
      `Voor ${first} personen heb je ${formatInteger(amount)} g pasta nodig. Hoeveel kg is dat voor ${second} personen?`,
    smallUnit: 'g',
    largeUnit: 'kg',
    minPerPerson: 50,
    maxPerPerson: 150,
  },
  melk: {
    prompt: (first, amount, second) =>
      `Voor ${first} personen heb je ${formatInteger(amount)} ml melk nodig. Hoeveel L is dat voor ${second} personen?`,
    smallUnit: 'ml',
    largeUnit: 'L',
    minPerPerson: 50,
    maxPerPerson: 250,
  },
};

/** `Voor 4 personen heb je 300 g pasta nodig. Hoeveel kg is dat voor 30 personen?` */
export function rescaleQuestion(
  context: string,
  first: number,
  amount: number,
  second: number,
): Question {
  const { prompt, smallUnit, largeUnit } = RESCALE_CONTEXTS[context]!;
  const common = gcd(first, second);
  const perGroup = amount / (first / common);
  const scaled = perGroup * (second / common);
  const rows: [number, number][] = [[first, amount]];
  if (common !== first) rows.push([common, perGroup]);
  rows.push([second, scaled]);
  const answer = rational(BigInt(scaled), 1000n);
  return {
    key: `ratioReasoning:rescale:${context}:${first}:${amount}:${second}`,
    topic: 'ratioReasoning',
    steps: [
      numberStep({
        prompt: prompt(first, amount, second),
        answer,
        suffix: largeUnit,
        explanation: `${rows.map(([count, value]) => `${count} → ${formatInteger(value)} ${smallUnit}`).join(', ')} = ${formatRational(answer)} ${largeUnit}`,
      }),
    ],
  };
}

export interface TopUpContext {
  container: string;
  things: string;
  /** The two colours with their adjective form: 'rood' → 'rode'. */
  colours: readonly [{ name: string; adjective: string }, { name: string; adjective: string }];
}

export const TOP_UP_CONTEXTS: Readonly<Record<string, TopUpContext>> = {
  knikkers: {
    container: 'een zak',
    things: 'knikkers',
    colours: [
      { name: 'rood', adjective: 'rode' },
      { name: 'blauw', adjective: 'blauwe' },
    ],
  },
  kralen: {
    container: 'een doos',
    things: 'kralen',
    colours: [
      { name: 'wit', adjective: 'witte' },
      { name: 'zwart', adjective: 'zwarte' },
    ],
  },
};

export const TARGET_RATIOS: readonly (readonly [number, number])[] = [
  [1, 1],
  [2, 1],
  [1, 2],
  [3, 2],
  [2, 3],
  [3, 1],
  [1, 3],
];

/** How many of colour `added` (0 or 1) make the counts `target`, or null unless a whole number ≥ 1. */
export function topUpCount(
  counts: readonly [number, number],
  target: readonly [number, number],
  added: 0 | 1,
): number | null {
  const other = counts[1 - added]!;
  const needed = (other * target[added]!) / target[1 - added]!;
  const count = needed - counts[added]!;
  return Number.isInteger(count) && count >= 1 ? count : null;
}

/** `In een zak zitten 30 knikkers, rood : blauw = 2 : 3. Hoeveel rode knikkers moet je erbij doen om 1 : 1 te krijgen?` */
export function topUpQuestion(
  context: string,
  ratio: readonly [number, number],
  unit: number,
  target: readonly [number, number],
  added: 0 | 1,
): Question {
  const { container, things, colours } = TOP_UP_CONTEXTS[context]!;
  const counts: [number, number] = [ratio[0] * unit, ratio[1] * unit];
  const count = topUpCount(counts, target, added)!;
  const colour = colours[added];
  const newCount = counts[added] + count;
  return {
    key: `ratioReasoning:topUp:${context}:${ratio.join(':')}:${unit}:${target.join(':')}:${added}`,
    topic: 'ratioReasoning',
    steps: [
      numberStep({
        prompt: `In ${container} zitten ${(ratio[0] + ratio[1]) * unit} ${things}, ${colours[0].name} : ${colours[1].name} = ${ratio[0]} : ${ratio[1]}. Hoeveel ${colour.adjective} ${things} moet je erbij doen om ${target[0]} : ${target[1]} te krijgen?`,
        answer: fromInteger(count),
        suffix: things,
        explanation: `${colours[0].name} ${counts[0]}, ${colours[1].name} ${counts[1]} → ${target[0]} : ${target[1]} → ${colour.name} ${newCount} → ${newCount} ${MINUS} ${counts[added]} = ${count} erbij`,
      }),
    ],
  };
}

const TERMS = range(1, 9);

function randomDifference(rng: Rng): Question {
  const [a, b] = drawUntil(() => {
    const first = pick(rng, TERMS);
    const second = pick(rng, TERMS);
    return first < second && gcd(first, second) === 1 ? ([first, second] as const) : null;
  });
  return differenceQuestion(
    pick(rng, NAME_PAIRS),
    pick(rng, DIFFERENCE_CONTEXTS),
    [a, b],
    randomInt(rng, 2, 50),
    pick(rng, DIFFERENCE_ASKED),
  );
}

const AMOUNTS = range(10, 1000).filter(hasAtMostTwoSignificantDigits);
const SECOND_COUNTS = range(2, 12).map((times) => times * 5);

function randomRescale(rng: Rng): Question {
  const context = pick(rng, Object.keys(RESCALE_CONTEXTS));
  const { minPerPerson, maxPerPerson } = RESCALE_CONTEXTS[context]!;
  const [first, amount, second] = drawUntil(() => {
    const firstCount = randomInt(rng, 2, 8);
    const secondCount = pick(rng, SECOND_COUNTS);
    const common = gcd(firstCount, secondCount);
    const amounts = AMOUNTS.filter(
      (value) =>
        value % (firstCount / common) === 0 &&
        value >= minPerPerson * firstCount &&
        value <= maxPerPerson * firstCount &&
        hasAtMostDecimals(
          rational(BigInt((value / (firstCount / common)) * (secondCount / common)), 1000n),
          2,
        ),
    );
    return amounts.length > 0 ? ([firstCount, pick(rng, amounts), secondCount] as const) : null;
  });
  return rescaleQuestion(context, first, amount, second);
}

function randomTopUp(rng: Rng): Question {
  const context = pick(rng, Object.keys(TOP_UP_CONTEXTS));
  const [ratio, unit, target, added] = drawUntil(() => {
    const a = randomInt(rng, 1, 5);
    const b = randomInt(rng, 1, 5);
    if (gcd(a, b) !== 1) return null;
    const unitCount = randomInt(rng, 1, Math.floor(60 / (a + b)));
    const targetRatio = pick(rng, TARGET_RATIOS);
    const colour: 0 | 1 = rng() < 0.5 ? 0 : 1;
    return topUpCount([a * unitCount, b * unitCount], targetRatio, colour) === null
      ? null
      : ([[a, b] as const, unitCount, targetRatio, colour] as const);
  });
  return topUpQuestion(context, ratio, unit, target, added);
}

export function generateRatioReasoning(rng: Rng): Question {
  switch (pick(rng, ['difference', 'rescale', 'topUp'] as const)) {
    case 'difference':
      return randomDifference(rng);
    case 'rescale':
      return randomRescale(rng);
    case 'topUp':
      return randomTopUp(rng);
  }
}
