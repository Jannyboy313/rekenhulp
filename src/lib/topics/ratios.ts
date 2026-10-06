import { formatEuro, formatInteger } from '../format';
import { gcd } from '../primes';
import { pick, randomInt, type Rng } from '../random';
import { divide, equals, fromInteger } from '../rational';
import { numberStep } from '../steps';
import { positiveInteger, type Diagnose } from '../tips';
import type { Question, Step } from '../types';
import { NICE_WHOLES } from './percentages';

/** Terms of the given ratio and the counts in scaling (spec §5.13). */
export const MAX_RATIO_TERM = 12;
/** Terms of the other side of a missing-term exercise. */
export const MAX_SCALED_TERM = 100;
export const MIN_COUNT = 2;
export const MAX_SCALED_ANSWER = 2000;
export const MAX_TOTAL = 500;
/** One part is at least 2, so dividing is never trivial (spec §5.13, k ≥ 2). */
export const MIN_PART = 2;

type Terms = readonly [number, number, number, number];
type Pair = readonly [number, number];

export interface ScalingContext {
  id: string;
  maxAmount: number;
  prefix?: string;
  suffix?: string;
  prompt(a: number, amount: number, b: number): string;
}

export const SCALING_CONTEXTS: readonly ScalingContext[] = [
  {
    id: 'pasta',
    maxAmount: 1000,
    suffix: 'g',
    prompt: (a, amount, b) =>
      `Voor ${a} personen: ${formatInteger(amount)} g pasta. Hoeveel g voor ${b} personen?`,
  },
  {
    id: 'milk',
    maxAmount: 1000,
    suffix: 'ml',
    prompt: (a, amount, b) =>
      `Voor ${a} personen: ${formatInteger(amount)} ml melk. Hoeveel ml voor ${b} personen?`,
  },
  {
    id: 'notebooks',
    maxAmount: 100,
    prefix: '€',
    prompt: (a, amount, b) =>
      `${a} schriften kosten ${formatEuro(fromInteger(amount))}. Hoeveel kosten ${b} schriften?`,
  },
];

type RatioForm = 'missingTerm' | 'scaling' | 'divide';
const FORMS: readonly RatioForm[] = ['missingTerm', 'scaling', 'divide'];

export function generateRatios(rng: Rng): Question {
  switch (pick(rng, FORMS)) {
    case 'missingTerm':
      return missingTerm(rng);
    case 'scaling':
      return scaling(rng);
    case 'divide':
      return divideInRatio(rng);
  }
}

/** p : q with p ≠ q, both in [1, 12], and gcd(p, q) = 1. */
function randomSimplifiedRatio(rng: Rng): [number, number] {
  for (;;) {
    const p = randomInt(rng, 1, MAX_RATIO_TERM);
    const q = randomInt(rng, 1, MAX_RATIO_TERM);
    if (p !== q && gcd(p, q) === 1) return [p, q];
  }
}

/** A different integer in [min, max]: draws from one value fewer and skips `excluded`. */
function randomIntExcept(rng: Rng, min: number, max: number, excluded: number): number {
  const value = randomInt(rng, min, max - 1);
  return value >= excluded ? value + 1 : value;
}

function ratioQuestion(key: string, step: Step): Question {
  return { key: `ratios:${key}`, topic: 'ratios', steps: [step] };
}

function showPair([x, y]: Pair): string {
  return `${formatInteger(x)} : ${formatInteger(y)}`;
}

/** `3 : 5 = 12 : ?`, with the unknown in any of the four positions. */
function missingTerm(rng: Rng): Question {
  const [p, q] = randomSimplifiedRatio(rng);
  const largest = Math.max(p, q);
  const m = randomInt(rng, 1, Math.floor(MAX_RATIO_TERM / largest));
  const n = randomIntExcept(rng, 1, Math.floor(MAX_SCALED_TERM / largest), m);
  const terms: Terms = [p * m, q * m, p * n, q * n];
  const position = randomInt(rng, 0, 3);
  const shown = terms.map((term, index) => (index === position ? '?' : formatInteger(term)));
  return ratioQuestion(
    `missing:${terms.join(':')}:${position}`,
    numberStep({
      prompt: `${shown.slice(0, 2).join(' : ')} = ${shown.slice(2).join(' : ')}`,
      answer: fromInteger(terms[position]!),
      explanation: missingTermExplanation(terms, position),
      diagnose: missingTermTip(terms, position),
    }),
  );
}

/**
 * From the complete side to the side with the answer, via the simplified ratio when neither side
 * is simplified: '3 : 5 = 12 : 20 (× 4)', '12 : 20 = 3 : 5 (: 4)', '4 : 6 = 2 : 3 = 10 : 15'.
 * Precondition: the terms must be k×(p : q) on both sides with different multipliers (as
 * generated), otherwise the stated factors are meaningless.
 */
export function missingTermExplanation(terms: Terms, position: number): string {
  const [a, b, c, d] = terms;
  const [known, completed]: [Pair, Pair] = position < 2 ? [[c, d], [a, b]] : [[a, b], [c, d]];
  const knownFactor = gcd(known[0], known[1]);
  const simplified: Pair = [known[0] / knownFactor, known[1] / knownFactor];
  const completedFactor = completed[0] / simplified[0];
  if (knownFactor === 1) return `${showPair(known)} = ${showPair(completed)} (× ${completedFactor})`;
  if (completedFactor === 1) return `${showPair(known)} = ${showPair(completed)} (: ${knownFactor})`;
  return `${showPair(known)} = ${showPair(simplified)} = ${showPair(completed)}`;
}

/** Equal differences instead of equal factors: 3 : 5 = 12 : 14 (spec §3.4.1). */
export function missingTermTip(terms: Terms, position: number): Diagnose {
  const [a, b, c, d] = terms;
  const additive = [b - (d - c), a + (d - c), d - (b - a), c + (b - a)][position]!;
  return (given) =>
    equals(given, fromInteger(additive))
      ? 'Bij een verhouding vermenigvuldig of deel je beide getallen met hetzelfde getal; het verschil blijft niet gelijk.'
      : undefined;
}

/** Scaled the wrong way (amount × a : b), or the difference in count added. */
export function scalingTip(a: number, amount: number, b: number): Diagnose {
  const inverse = divide(fromInteger(amount * a), fromInteger(b));
  const added = fromInteger(amount + (b - a));
  const more = b > a ? 'meer' : 'minder';
  return (given) => {
    if (equals(given, inverse)) {
      return `Je hebt omgekeerd geschaald: ${b} is ${more} dan ${a}, dus het antwoord is ${more} dan ${formatInteger(amount)}.`;
    }
    if (equals(given, added)) {
      return 'Je hebt het verschil in aantal opgeteld; bij een verhouding vermenigvuldig je.';
    }
    return undefined;
  };
}

/** The other part, one part, or the total divided by one term of the ratio. */
export function divideTip(total: number, a: number, b: number, largest: boolean): Diagnose {
  const unit = total / (a + b);
  const asked = largest ? Math.max(a, b) : Math.min(a, b);
  const other = a + b - asked;
  const [askedName, otherName] = largest ? ['grootste', 'kleinste'] : ['kleinste', 'grootste'];
  return (given) => {
    const value = positiveInteger(given);
    if (value === null) return undefined;
    if (value === other * unit) {
      return `Dat is het ${otherName} deel; gevraagd is het ${askedName}.`;
    }
    if (asked > 1 && value === unit) {
      return `Dat is 1 deel; het ${askedName} deel is ${asked} delen.`;
    }
    if (value * a === total || value * b === total) {
      return `Deel eerst door het totaal aantal delen: ${a} + ${b} = ${a + b}.`;
    }
    return undefined;
  };
}

/** `Voor 4 personen: 300 g pasta. Hoeveel g voor 6 personen?` */
function scaling(rng: Rng): Question {
  const context = pick(rng, SCALING_CONTEXTS);
  const a = randomInt(rng, MIN_COUNT, MAX_RATIO_TERM);
  const b = randomIntExcept(rng, MIN_COUNT, MAX_RATIO_TERM, a);
  const g = gcd(a, b);
  // The amount for g units must be whole, so the amount is a multiple of a / g.
  const scaled = (amount: number) => (amount / (a / g)) * (b / g);
  const amounts = NICE_WHOLES.filter(
    (amount) =>
      amount <= context.maxAmount &&
      amount % (a / g) === 0 &&
      scaled(amount) <= MAX_SCALED_ANSWER,
  );
  const amount = pick(rng, amounts);
  return ratioQuestion(
    `scale:${context.id}:${a}:${amount}:${b}`,
    numberStep({
      prompt: context.prompt(a, amount, b),
      answer: fromInteger(scaled(amount)),
      prefix: context.prefix,
      suffix: context.suffix,
      explanation: scalingExplanation(a, amount, b),
      diagnose: scalingTip(a, amount, b),
    }),
  );
}

/** Ratio table via gcd(a, b): '4 → 300, 2 → 150, 6 → 450', or '4 → 300, 8 → 600'. */
export function scalingExplanation(a: number, amount: number, b: number): string {
  const g = gcd(a, b);
  const perGroup = amount / (a / g);
  const rows: [number, number][] = [[a, amount]];
  if (g !== a && g !== b) rows.push([g, perGroup]);
  rows.push([b, perGroup * (b / g)]);
  return rows.map(([count, value]) => `${count} → ${formatInteger(value)}`).join(', ');
}

/** `Verdeel 60 in de verhouding 2 : 3. Hoe groot is het grootste deel?` */
function divideInRatio(rng: Rng): Question {
  const [a, b] = randomSimplifiedRatio(rng);
  const unit = randomInt(rng, MIN_PART, Math.floor(MAX_TOTAL / (a + b)));
  const total = (a + b) * unit;
  const largest = rng() < 0.5;
  const asked = largest ? Math.max(a, b) : Math.min(a, b);
  return ratioQuestion(
    `divide:${total}:${a}:${b}:${largest ? 'largest' : 'smallest'}`,
    numberStep({
      prompt: `Verdeel ${formatInteger(total)} in de verhouding ${a} : ${b}. Hoe groot is het ${largest ? 'grootste' : 'kleinste'} deel?`,
      answer: fromInteger(asked * unit),
      explanation: divideExplanation(total, a, b, asked),
      diagnose: divideTip(total, a, b, largest),
    }),
  );
}

/** '2 + 3 = 5 delen → 1 deel = 60 : 5 = 12 → 3 delen = 36' */
export function divideExplanation(total: number, a: number, b: number, asked: number): string {
  const parts = a + b;
  const unit = total / parts;
  const first = `${a} + ${b} = ${parts} delen → 1 deel = ${formatInteger(total)} : ${parts} = ${formatInteger(unit)}`;
  return asked === 1 ? first : `${first} → ${asked} delen = ${formatInteger(asked * unit)}`;
}
