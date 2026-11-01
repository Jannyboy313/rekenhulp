import { formatEuro, formatFraction, formatInteger } from '../format';
import { gcd } from '../primes';
import { drawUntil, pick, randomInt, range, type Rng } from '../random';
import { compare, fromInteger, isInteger, multiply, ONE, rational, subtract, add } from '../rational';
import type { Rational } from '../rational';
import { numberStep, simplestFractionStep } from '../steps';
import type { Question } from '../types';

/** Spec §5.77: proper fractions in lowest terms with these denominators. */
export const DENOMINATORS = [2, 3, 4, 5, 6, 8, 10, 12] as const;

export const FRACTIONS: readonly Rational[] = DENOMINATORS.flatMap((q) =>
  range(1, q - 1)
    .filter((p) => gcd(p, q) === 1)
    .map((p) => rational(BigInt(p), BigInt(q))),
);

export const FORMS = ['rest', 'partOfRest', 'whole', 'whichPart'] as const;
export type Form = (typeof FORMS)[number];

const whole = (n: number) => fromInteger(n);
const of = (fraction: Rational, n: number) => multiply(fraction, whole(n));
const isWhole = (fraction: Rational, n: number) => isInteger(of(fraction, n));
const text = formatFraction;
const num = (value: Rational) => formatInteger(value.num);

interface RestContext {
  /** `Van de 32 leerlingen komt 3/8 op de fiets en 1/4 met de bus. De rest loopt. …` */
  prompt(total: number, first: string, second: string): string;
  suffix: string;
  /** The names of the three groups; the third is the rest. */
  groups: readonly [string, string, string];
}

export const REST_CONTEXTS: Readonly<Record<string, RestContext>> = {
  leerlingen: {
    prompt: (n, a, b) =>
      `Van de ${n} leerlingen komt ${a} op de fiets en ${b} met de bus. De rest loopt. Hoeveel leerlingen lopen?`,
    suffix: 'leerlingen',
    groups: ['fiets', 'bus', 'lopen'],
  },
  bezoekers: {
    prompt: (n, a, b) =>
      `Van de ${n} bezoekers van een museum zijn ${a} volwassenen en ${b} kinderen. De rest is senior. Hoeveel senioren zijn dat?`,
    suffix: 'bezoekers',
    groups: ['volwassenen', 'kinderen', 'senioren'],
  },
  boeken: {
    prompt: (n, a, b) =>
      `Van de ${n} boeken in een kast zijn ${a} romans en ${b} strips. De rest zijn informatieboeken. Hoeveel informatieboeken zijn dat?`,
    suffix: 'boeken',
    groups: ['romans', 'strips', 'informatieboeken'],
  },
};

/** The rest after two parts of a whole, e.g. 32 with 3/8 and 1/4: 12. */
export function restQuestion(context: string, total: number, first: Rational, second: Rational): Question {
  const { prompt, suffix } = REST_CONTEXTS[context]!;
  const [a, b] = [of(first, total), of(second, total)];
  const answer = subtract(subtract(whole(total), a), b);
  return {
    key: `fractionProblems:rest:${context}:${total}:${text(first)}:${text(second)}`,
    topic: 'fractionProblems',
    steps: [
      numberStep({
        prompt: prompt(total, text(first), text(second)),
        answer,
        suffix,
        explanation: `${text(first)} van ${total} = ${num(a)}, ${text(second)} van ${total} = ${num(b)} → ${total} − ${num(a)} − ${num(b)} = ${num(answer)}`,
      }),
    ],
  };
}

interface PartOfRestContext {
  /** What is left over, or the second part when `second` is true. */
  prompt(total: number, first: string, second: string, askSecond: boolean): string;
  prefix?: string;
  suffix?: string;
  maxTotal: number;
  multipleOf: number;
}

export const PART_OF_REST_CONTEXTS: Readonly<Record<string, PartOfRestContext>> = {
  geld: {
    prompt: (n, a, b, askSecond) =>
      `Je hebt ${formatEuro(whole(n))}. Je geeft ${a} uit aan een boek en van wat over is ${b} aan eten. ${askSecond ? 'Hoeveel geef je uit aan eten?' : 'Hoeveel houd je over?'}`,
    prefix: '€',
    maxTotal: 240,
    multipleOf: 5,
  },
  // A cake of at most 48 pieces: the spec range of 240 is not a realistic cake.
  taart: {
    prompt: (n, a, b, askSecond) =>
      `Een taart heeft ${n} stukken. Op zaterdag wordt ${a} opgegeten en van wat over is ${b} op zondag. ${askSecond ? 'Hoeveel stukken worden er op zondag opgegeten?' : 'Hoeveel stukken zijn er daarna nog?'}`,
    suffix: 'stukken',
    maxTotal: 48,
    multipleOf: 1,
  },
  snoepjes: {
    prompt: (n, a, b, askSecond) =>
      `Je hebt ${n} snoepjes. Je eet er ${a} van op en van de rest geef je ${b} aan je broer. ${askSecond ? 'Hoeveel snoepjes geef je aan je broer?' : 'Hoeveel snoepjes houd je over?'}`,
    suffix: 'snoepjes',
    maxTotal: 240,
    multipleOf: 1,
  },
};

/** Two parts in a row, the second of what is left over: € 60, 1/3 and 1/4 of the rest → 30. */
export function partOfRestQuestion(
  context: string,
  total: number,
  first: Rational,
  second: Rational,
  askSecond: boolean,
): Question {
  const { prompt, prefix, suffix } = PART_OF_REST_CONTEXTS[context]!;
  const firstPart = of(first, total);
  const left = subtract(whole(total), firstPart);
  const secondPart = multiply(second, left);
  const answer = askSecond ? secondPart : subtract(left, secondPart);
  const steps = `${text(first)} van ${total} = ${num(firstPart)} → ${num(left)} over → ${text(second)} van ${num(left)} = ${num(secondPart)}`;
  return {
    key: `fractionProblems:partOfRest:${context}:${askSecond ? 'second' : 'left'}:${total}:${text(first)}:${text(second)}`,
    topic: 'fractionProblems',
    steps: [
      numberStep({
        prompt: prompt(total, text(first), text(second), askSecond),
        answer,
        prefix,
        suffix,
        explanation: askSecond
          ? steps
          : `${steps} → ${num(left)} − ${num(secondPart)} = ${num(answer)}`,
      }),
    ],
  };
}

interface WholeContext {
  /** `2/5 van de klas is jongen. Dat zijn 12 kinderen. …` */
  prompt(fraction: string, part: number): string;
  suffix: string;
  /** Spec §5.77 gives no range for the whole; a class or a book must stay realistic. */
  minWhole: number;
  maxWhole: number;
}

export const WHOLE_CONTEXTS: Readonly<Record<string, WholeContext>> = {
  klas: {
    prompt: (f, part) =>
      `${f} van de klas is jongen. Dat zijn ${part} kinderen. Hoeveel kinderen zitten er in de klas?`,
    suffix: 'kinderen',
    minWhole: 20,
    maxWhole: 36,
  },
  boek: {
    prompt: (f, part) =>
      `Je hebt ${f} van een boek gelezen. Dat zijn ${part} bladzijden. Hoeveel bladzijden heeft het boek?`,
    suffix: 'bladzijden',
    minWhole: 4,
    maxWhole: 144,
  },
  tank: {
    prompt: (f, part) =>
      `De tank is voor ${f} vol. Er zit ${part} liter in. Hoeveel liter past er in de tank?`,
    suffix: 'liter',
    minWhole: 4,
    maxWhole: 144,
  },
};

/** Part `p × m` of `p/q`, the whole is `q × m`. */
export function wholeQuestion(context: string, fraction: Rational, m: number): Question {
  const { prompt, suffix } = WHOLE_CONTEXTS[context]!;
  const [p, q] = [Number(fraction.num), Number(fraction.den)];
  const answer = whole(q * m);
  const unit = fraction.num === 1n ? '' : `1/${q} = ${m} → `;
  return {
    key: `fractionProblems:whole:${context}:${text(fraction)}:${m}`,
    topic: 'fractionProblems',
    steps: [
      numberStep({
        prompt: prompt(text(fraction), p * m),
        answer,
        suffix,
        explanation: `${text(fraction)} = ${p * m} → ${unit}${q}/${q} = ${q * m}`,
      }),
    ],
  };
}

interface WhichPartContext {
  /** `In een klas van 30 kinderen zitten 12 jongens. Welk deel van de klas is meisje?` */
  prompt(total: number, given: number): string;
  /** The unit of the other part, for the explanation. */
  other: string;
  maxTotal: number;
}

export const WHICH_PART_CONTEXTS: Readonly<Record<string, WhichPartContext>> = {
  klas: {
    prompt: (n, a) =>
      `In een klas van ${n} kinderen zitten ${a} jongens. Welk deel van de klas is meisje?`,
    other: 'meisjes',
    maxTotal: 36,
  },
  boek: {
    prompt: (n, a) =>
      `Een boek heeft ${n} bladzijden. Je hebt er ${a} gelezen. Welk deel van het boek moet je nog lezen?`,
    other: 'bladzijden',
    maxTotal: 60,
  },
  tank: {
    prompt: (n, a) =>
      `In een tank van ${n} liter zit ${a} liter. Welk deel van de tank is leeg?`,
    other: 'liter',
    maxTotal: 60,
  },
};

/** The other part of a whole `total` of which `given` is known, as a fraction in lowest terms. */
export function whichPartQuestion(context: string, total: number, given: number): Question {
  const { prompt, other } = WHICH_PART_CONTEXTS[context]!;
  const rest = total - given;
  const answer = rational(BigInt(rest), BigInt(total));
  const unsimplified = `${rest}/${total}`;
  const lowest = text(answer);
  return {
    key: `fractionProblems:whichPart:${context}:${total}:${given}`,
    topic: 'fractionProblems',
    steps: [
      simplestFractionStep({
        prompt: prompt(total, given),
        answer,
        decimalAllowed: false,
        explanation: `${total} − ${given} = ${rest} ${other} → ${unsimplified}${unsimplified === lowest ? '' : ` = ${lowest}`}`,
      }),
    ],
  };
}

function randomRest(rng: Rng): Question {
  const context = pick(rng, Object.keys(REST_CONTEXTS));
  const [total, first, second] = drawUntil(() => {
    const first = pick(rng, FRACTIONS);
    const second = pick(rng, FRACTIONS);
    if (first.den === second.den || compare(add(first, second), ONE) >= 0) return null;
    const totals = range(12, 60).filter((n) => isWhole(first, n) && isWhole(second, n));
    return totals.length === 0 ? null : ([pick(rng, totals), first, second] as const);
  });
  return restQuestion(context, total, first, second);
}

function randomPartOfRest(rng: Rng): Question {
  const context = pick(rng, Object.keys(PART_OF_REST_CONTEXTS));
  const { maxTotal, multipleOf } = PART_OF_REST_CONTEXTS[context]!;
  const [total, first, second] = drawUntil(() => {
    const first = pick(rng, FRACTIONS);
    const second = pick(rng, FRACTIONS);
    const totals = range(12, maxTotal).filter(
      (n) =>
        n % multipleOf === 0 &&
        isWhole(first, n) &&
        isWhole(second, n - Number(of(first, n).num)),
    );
    return totals.length === 0 ? null : ([pick(rng, totals), first, second] as const);
  });
  return partOfRestQuestion(context, total, first, second, rng() < 0.5);
}

function randomWhole(rng: Rng): Question {
  const context = pick(rng, Object.keys(WHOLE_CONTEXTS));
  const { minWhole, maxWhole } = WHOLE_CONTEXTS[context]!;
  const [fraction, m] = drawUntil(() => {
    const fraction = pick(rng, FRACTIONS);
    const m = randomInt(rng, 2, 12);
    const total = Number(fraction.den) * m;
    return total >= minWhole && total <= maxWhole ? ([fraction, m] as const) : null;
  });
  return wholeQuestion(context, fraction, m);
}

function randomWhichPart(rng: Rng): Question {
  const context = pick(rng, Object.keys(WHICH_PART_CONTEXTS));
  const { maxTotal } = WHICH_PART_CONTEXTS[context]!;
  const [total, given] = drawUntil(() => {
    const total = randomInt(rng, 12, maxTotal);
    const given = randomInt(rng, 1, total - 1);
    const rest = rational(BigInt(total - given), BigInt(total));
    return rest.den <= 12n ? ([total, given] as const) : null;
  });
  return whichPartQuestion(context, total, given);
}

/** One question of the given form. */
export function buildFractionProblem(rng: Rng, form: Form): Question {
  switch (form) {
    case 'rest':
      return randomRest(rng);
    case 'partOfRest':
      return randomPartOfRest(rng);
    case 'whole':
      return randomWhole(rng);
    case 'whichPart':
      return randomWhichPart(rng);
  }
}

/** Four forms, each equally likely (spec §5.77). */
export function generateFractionProblems(rng: Rng): Question {
  return buildFractionProblem(rng, pick(rng, FORMS));
}
