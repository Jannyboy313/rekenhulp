import { formatEuro, formatInteger as f, formatMoney } from '../format';
import { drawUntil, pick, randomInt, type Rng } from '../random';
import { fromInteger, rational, type Rational } from '../rational';
import { numberStep } from '../steps';
import type { Question } from '../types';

// Multi-step problems (spec §5.65).
export const FORMS = ['operations', 'roundUp', 'roundDown'] as const;
export type Form = (typeof FORMS)[number];

export const OPERATIONS_CONTEXTS = ['schriften', 'wisselgeld', 'schoolreis'] as const;
export const ROUND_UP_CONTEXTS = ['busjes', 'dozen', 'tafels'] as const;
export const ROUND_DOWN_CONTEXTS = ['kaartjes', 'zakjes', 'stukken'] as const;
export type Context =
  | (typeof OPERATIONS_CONTEXTS)[number]
  | (typeof ROUND_UP_CONTEXTS)[number]
  | (typeof ROUND_DOWN_CONTEXTS)[number];

export const SCHRIFTEN_PER_DOOS = [12, 16, 20, 24, 25, 30] as const;
export const PAYMENTS = [50, 100, 200] as const;
export const BUS_COSTS = [300, 400, 450, 500, 600, 750] as const;
export const EGGS_PER_BOX = [6, 10, 12] as const;

export interface MultiStepProblem {
  form: Form;
  context: Context;
  /** The numbers of the prompt in order; the prices of wisselgeld are in half euros. */
  numbers: readonly number[];
  answer: Rational;
  question: Question;
}

interface Built {
  prompt: string;
  numbers: number[];
  answer: Rational;
  money: boolean;
  suffix?: string;
  explanation: string;
}

const euros = (value: number) => formatEuro(rational(BigInt(Math.round(value * 2)), 2n));

function schriften(rng: Rng): Built {
  const [boxes, perBox, classes] = drawUntil(() => {
    const d = randomInt(rng, 5, 40);
    const s = pick(rng, SCHRIFTEN_PER_DOOS);
    const k = randomInt(rng, 4, 30);
    return (d * s) % k === 0 && (d * s) / k >= 5 ? [d, s, k] : null;
  }) as [number, number, number];
  const total = boxes * perBox;
  return {
    prompt: `Een school bestelt ${boxes} dozen met elk ${perBox} schriften en verdeelt ze eerlijk over ${classes} klassen. Hoeveel schriften krijgt elke klas?`,
    numbers: [boxes, perBox, classes],
    answer: fromInteger(total / classes),
    money: false,
    suffix: 'schriften',
    explanation: `${boxes} × ${perBox} = ${f(total)} → ${f(total)} : ${classes} = ${f(total / classes)}`,
  };
}

/** The price in half euros: whole or half euros in [3, 25]. */
const halfEuros = (rng: Rng) => randomInt(rng, 6, 50);

function wisselgeld(rng: Rng): Built {
  // Prices are counted in half euros, so every amount is exact.
  const [a, p, b, q, payment] = drawUntil(() => {
    const first = randomInt(rng, 2, 6);
    const price = halfEuros(rng);
    const second = randomInt(rng, 2, 6);
    const otherPrice = halfEuros(rng);
    if (price === otherPrice) return null;
    const total = first * price + second * otherPrice;
    const above = PAYMENTS.filter((pay) => 2 * pay > total);
    return above.length === 0 ? null : [first, price, second, otherPrice, pick(rng, above)];
  }) as [number, number, number, number, number];
  const first = rational(BigInt(a * p), 2n);
  const second = rational(BigInt(b * q), 2n);
  const total = rational(BigInt(a * p + b * q), 2n);
  const change = rational(BigInt(2 * payment - a * p - b * q), 2n);
  const price = (half: number) => euros(half / 2);
  return {
    prompt: `Je koopt ${a} kaartjes van ${price(p)} en ${b} kaartjes van ${price(q)} en betaalt met ${formatEuro(fromInteger(payment))}. Hoeveel wisselgeld krijg je terug?`,
    numbers: [a, p, b, q, payment],
    answer: change,
    money: true,
    explanation: `${a} × ${price(p)} = ${formatEuro(first)}, ${b} × ${price(q)} = ${formatEuro(second)} → ${formatEuro(total)} → ${formatEuro(fromInteger(payment))} − ${formatEuro(total)} = ${formatEuro(change)}`,
  };
}

function schoolreis(rng: Rng): Built {
  const [bus, children] = drawUntil(() => {
    const cost = pick(rng, BUS_COSTS);
    const n = randomInt(rng, 20, 60);
    return cost % n === 0 ? [cost, n] : null;
  }) as [number, number];
  const entree = randomInt(rng, 3, 15);
  const share = bus / children;
  return {
    prompt: `De bus voor de schoolreis kost ${formatEuro(fromInteger(bus))} en wordt gedeeld door ${children} kinderen. Daarnaast betaalt elk kind ${formatEuro(fromInteger(entree))} entree. Hoeveel betaalt elk kind in totaal?`,
    numbers: [bus, children, entree],
    answer: fromInteger(share + entree),
    money: true,
    explanation: `${f(bus)} : ${children} = ${share} → ${share} + ${entree} = ${share + entree}`,
  };
}

/** Dividend in [20, 500], divisor in [3, 15] (or `divisors`), remainder not 0. */
function division(rng: Rng, divisors?: readonly number[]): [number, number] {
  return drawUntil(() => {
    const n = randomInt(rng, 20, 500);
    const m = divisors ? pick(rng, divisors) : randomInt(rng, 3, 15);
    return n % m === 0 ? null : [n, m];
  }) as [number, number];
}

const ROUND_UP_PROMPTS: Record<
  (typeof ROUND_UP_CONTEXTS)[number],
  (n: number, m: number) => string
> = {
  busjes: (n, m) =>
    `${n} kinderen gaan met busjes van ${m} plaatsen. Hoeveel busjes zijn er nodig?`,
  dozen: (n, m) => `Je hebt ${n} eieren en doet ze in dozen van ${m}. Hoeveel dozen heb je nodig?`,
  tafels: (n, m) =>
    `${n} gasten gaan zitten aan tafels met ${m} stoelen. Hoeveel tafels zijn er nodig?`,
};

function roundUp(rng: Rng, context: (typeof ROUND_UP_CONTEXTS)[number]): Built {
  const [n, m] = division(rng, context === 'dozen' ? EGGS_PER_BOX : undefined);
  const quotient = Math.floor(n / m);
  return {
    prompt: ROUND_UP_PROMPTS[context](n, m),
    numbers: [n, m],
    answer: fromInteger(quotient + 1),
    money: false,
    suffix: context,
    explanation: `${n} : ${m} = ${quotient} rest ${n % m} → ${quotient + 1} ${context}`,
  };
}

const ROUND_DOWN_PROMPTS: Record<
  (typeof ROUND_DOWN_CONTEXTS)[number],
  (n: number, m: number) => string
> = {
  kaartjes: (n, m) =>
    `Je hebt ${formatEuro(fromInteger(n))} en een kaartje kost ${formatEuro(fromInteger(m))}. Hoeveel kaartjes kun je kopen?`,
  zakjes: (n, m) =>
    `${n} snoepjes worden verdeeld over zakjes van ${m}. Hoeveel volle zakjes kun je maken?`,
  stukken: (n, m) =>
    `Van een plank van ${n} cm zaag je stukken van ${m} cm. Hoeveel stukken kun je zagen?`,
};

function roundDown(rng: Rng, context: (typeof ROUND_DOWN_CONTEXTS)[number]): Built {
  const [n, m] = division(rng);
  const quotient = Math.floor(n / m);
  return {
    prompt: ROUND_DOWN_PROMPTS[context](n, m),
    numbers: [n, m],
    answer: fromInteger(quotient),
    money: false,
    suffix: context,
    explanation: `${n} : ${m} = ${quotient} rest ${n % m} → ${quotient} ${context}`,
  };
}

/** One problem of the given form and context, with its parts exposed for tests. */
export function buildProblem(rng: Rng, form: Form, context: Context): MultiStepProblem {
  const built =
    form === 'operations'
      ? { schriften, wisselgeld, schoolreis }[context as (typeof OPERATIONS_CONTEXTS)[number]](rng)
      : form === 'roundUp'
        ? roundUp(rng, context as (typeof ROUND_UP_CONTEXTS)[number])
        : roundDown(rng, context as (typeof ROUND_DOWN_CONTEXTS)[number]);
  const { prompt, numbers, answer, money, suffix, explanation } = built;
  return {
    form,
    context,
    numbers,
    answer,
    question: {
      key: `multiStepProblems:${form}:${context}:${numbers.join(',')}`,
      topic: 'multiStepProblems',
      steps: [
        numberStep({
          prompt,
          answer,
          prefix: money ? '€' : undefined,
          suffix,
          expected: money ? formatMoney(answer) : undefined,
          explanation,
        }),
      ],
    },
  };
}

const CONTEXTS: Record<Form, readonly Context[]> = {
  operations: OPERATIONS_CONTEXTS,
  roundUp: ROUND_UP_CONTEXTS,
  roundDown: ROUND_DOWN_CONTEXTS,
};

/** Three forms, each equally likely; the operations form has three contexts (spec §5.65). */
export function drawMultiStepProblem(rng: Rng): MultiStepProblem {
  const form = pick(rng, FORMS);
  return buildProblem(rng, form, pick(rng, CONTEXTS[form]));
}

export function generateMultiStepProblems(rng: Rng): Question {
  return drawMultiStepProblem(rng).question;
}
