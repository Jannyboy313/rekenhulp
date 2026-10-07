import { formatEuro, formatInteger as f, formatRational } from '../format';
import { drawUntil, notRound, pick, randomInt, randomIntWhere, type Rng } from '../random';
import { decimalPlaces, divide, equals, fromInteger } from '../rational';
import { numberStep } from '../steps';
import type { Diagnose } from '../tips';
import type { Question } from '../types';

// Mental operations with larger numbers (spec §5.15).
export const MENTAL_FORMS = ['addSubtract', 'multiply', 'divide', 'remainder'] as const;
export type MentalForm = (typeof MENTAL_FORMS)[number];

/** The larger term of add / subtract. */
export const MIN_TERM = 1000;
export const MAX_TERM = 99_999;
/** Largest product and largest dividend of the forms with zeros. */
export const MAX_PRODUCT = 1_000_000;
/** Significant parts of quotient and divisor: 2 to 12 without 10. */
export const DIVIDE_FACTORS: readonly number[] = [2, 3, 4, 5, 6, 7, 8, 9, 11, 12];
/** smartCalculation (§5.9) splits a × 25, a × 50 and a × 125 with a not a multiple of 10. */
const SMART_FACTORS: readonly number[] = [25, 50, 125];

/** Remainder: the quotient q of total = q × divisor + rest, and the largest total. */
export const MIN_QUOTIENT = 3;
export const MAX_QUOTIENT = 40;
export const MAX_TOTAL = 1000;

function digitSum(value: number): number {
  let sum = 0;
  for (let rest = value; rest > 0; rest = Math.floor(rest / 10)) sum += rest % 10;
  return sum;
}

/** Whether a + b needs a carry: each carry lowers the digit sum of the result by 9. */
export function hasCarry(a: number, b: number): boolean {
  return digitSum(a) + digitSum(b) !== digitSum(a + b);
}

/** Whether smartCalculation (§5.9) also generates this product. */
export function isSmartProduct(x: number, y: number): boolean {
  const smart = (factor: number, other: number) =>
    SMART_FACTORS.includes(factor) && notRound(other);
  return smart(x, y) || smart(y, x);
}

/** A positive integer as significant × scale, with scale a power of ten: 7200 → 72 × 100. */
function stripZeros(value: number): { significant: number; scale: number } {
  let scale = 1;
  while ((value / scale) % 10 === 0) scale *= 10;
  return { significant: value / scale, scale };
}

/** `6347 + 2000 = 8347 → 8347 + 800 = 9147`: b in two steps, its largest part first. */
export function explainAddSubtract(a: number, b: number, add: boolean): string {
  const unit = 10 ** (String(b).length - 1);
  const high = Math.floor(b / unit) * unit;
  const low = b - high;
  const sign = add ? '+' : '−';
  const middle = add ? a + high : a - high;
  const answer = add ? middle + low : middle - low;
  return (
    `${f(a)} ${sign} ${f(high)} = ${f(middle)} → ` +
    `${f(middle)} ${sign} ${f(low)} = ${f(answer)}`
  );
}

/** `28 × 5 = 140 → 28 × 500 = 140 × 100 = 14 000`: the table fact, then the zeros. */
export function explainMultiply(first: number, second: number): string {
  const x = stripZeros(first);
  const y = stripZeros(second);
  const fact = x.significant * y.significant;
  return (
    `${f(x.significant)} × ${f(y.significant)} = ${f(fact)} → ` +
    `${f(first)} × ${f(second)} = ${f(fact)} × ${f(x.scale * y.scale)} = ${f(first * second)}`
  );
}

/** `7200 : 80 = 720 : 8 = 90`, or `48 : 6 = 8 → 4800 : 6 = 800` when the divisor has no zeros. */
export function explainDivide(dividend: number, divisor: number): string {
  const quotient = dividend / divisor;
  const sum = `${f(dividend)} : ${f(divisor)}`;
  const { significant, scale } = stripZeros(divisor);
  if (scale > 1) return `${sum} = ${f(dividend / scale)} : ${f(significant)} = ${f(quotient)}`;
  const shown = stripZeros(quotient);
  return (
    `${f(dividend / shown.scale)} : ${f(divisor)} = ${f(shown.significant)} → ` +
    `${sum} = ${f(quotient)}`
  );
}

function arithmetic(key: string, prompt: string, answer: number, explanation: string): Question {
  return {
    key: `mentalOperations:${key}`,
    topic: 'mentalOperations',
    steps: [numberStep({ prompt: `${prompt} = ?`, answer: fromInteger(answer), explanation })],
  };
}

/** `6347 + 2800`, `15 213 − 470`: with at least one carry or borrow. */
function addSubtract(rng: Rng): Question {
  const add = rng() < 0.5;
  const { a, b } = drawUntil(() => {
    const a = randomInt(rng, MIN_TERM, MAX_TERM);
    // Two significant digits, then one or two zeros: 2800, 470.
    const digits = randomIntWhere(rng, 11, 99, notRound);
    const b = digits * 10 ** randomInt(rng, 1, 2);
    // A borrow in a − b is a carry in (a − b) + b.
    const ok = add ? hasCarry(a, b) : a > b && hasCarry(a - b, b);
    return ok ? { a, b } : null;
  });
  const prompt = `${f(a)} ${add ? '+' : '−'} ${f(b)}`;
  return arithmetic(prompt, prompt, add ? a + b : a - b, explainAddSubtract(a, b, add));
}

/** `28 × 500`: p × 10ⁱ and q × 10ʲ with i + j ∈ [1, 4], in random order. */
function multiplyByZeros(rng: Rng): Question {
  const { first, second } = drawUntil(() => {
    const p = randomIntWhere(rng, 2, 99, notRound);
    const q = randomInt(rng, 2, 9);
    const zeros = randomInt(rng, 1, 4);
    const i = randomInt(rng, 0, zeros);
    const a = p * 10 ** i;
    const b = q * 10 ** (zeros - i);
    if (a * b > MAX_PRODUCT || isSmartProduct(a, b)) return null;
    return rng() < 0.5 ? { first: a, second: b } : { first: b, second: a };
  });
  const prompt = `${f(first)} × ${f(second)}`;
  // As in §5.9, `28 × 500` and `500 × 28` count as one calculation.
  const key = `${f(Math.min(first, second))} × ${f(Math.max(first, second))}`;
  return arithmetic(key, prompt, first * second, explainMultiply(first, second));
}

/** `7200 : 80`: quotient p × 10ⁱ and divisor q × 10ʲ, with i + j ∈ [1, 4]. */
function divideByZeros(rng: Rng): Question {
  const { dividend, divisor } = drawUntil(() => {
    const zeros = randomInt(rng, 1, 4);
    const i = randomInt(rng, 0, zeros);
    const quotient = pick(rng, DIVIDE_FACTORS) * 10 ** i;
    const divisor = pick(rng, DIVIDE_FACTORS) * 10 ** (zeros - i);
    const dividend = quotient * divisor;
    return dividend <= MAX_PRODUCT ? { dividend, divisor } : null;
  });
  const prompt = `${f(dividend)} : ${f(divisor)}`;
  return arithmetic(prompt, prompt, dividend / divisor, explainDivide(dividend, divisor));
}

/** What a remainder question asks: round up, round down, or the remainder itself. */
type Ask = 'up' | 'down' | 'rest';
const ASKS: readonly Ask[] = ['up', 'down', 'rest'];

interface RemainderContext {
  id: string;
  ask: Ask;
  minDivisor: number;
  maxDivisor: number;
  prompt: (total: number, divisor: number) => string;
  prefix?: string;
  suffix?: string;
  /** What the answer means, after the arrow of the explanation: '29 busjes'. */
  conclusion: (answer: number) => string;
  /** The tip for the typical mistake: q for up and rest, q + 1 for down (spec §3.4.1). */
  tip: (remainder: number) => string;
  /** Up and down only: the tip for the exact quotient, e.g. 28,75 busjes. */
  decimalTip?: (quotient: string) => string;
}

const euro = (value: number) => formatEuro(fromInteger(value));
const WHOLE = 'het antwoord is een heel aantal.';

/** The contexts of spec §5.15. A question picks its ask first, then one of these. */
export const REMAINDER_CONTEXTS: readonly RemainderContext[] = [
  {
    id: 'busjes',
    ask: 'up',
    minDivisor: 6,
    maxDivisor: 50,
    prompt: (n, d) =>
      `${f(n)} leerlingen gaan met busjes van ${d} plaatsen. Hoeveel busjes zijn er nodig?`,
    suffix: 'busjes',
    conclusion: (answer) => `${answer} busjes`,
    tip: (rest) => `Er blijven ${rest} leerlingen over; daarvoor is nog een busje nodig.`,
    decimalTip: (quotient) => `Je kunt geen ${quotient} busjes nemen: ${WHOLE}`,
  },
  {
    id: 'tafels',
    ask: 'up',
    minDivisor: 4,
    maxDivisor: 12,
    prompt: (n, d) =>
      `Aan een tafel passen ${d} gasten. Hoeveel tafels zijn er nodig voor ${f(n)} gasten?`,
    suffix: 'tafels',
    conclusion: (answer) => `${answer} tafels`,
    tip: (rest) => `Er blijven ${rest} gasten over; daarvoor is nog een tafel nodig.`,
    decimalTip: (quotient) => `Je kunt geen ${quotient} tafels nemen: ${WHOLE}`,
  },
  {
    id: 'dozen',
    ask: 'down',
    minDivisor: 6,
    maxDivisor: 30,
    prompt: (n, d) =>
      `In een doos passen ${d} eieren. Hoeveel volle dozen maak je van ${f(n)} eieren?`,
    suffix: 'dozen',
    conclusion: (answer) => `${answer} dozen`,
    tip: () => 'De laatste doos is niet vol: rond naar beneden af.',
    decimalTip: (quotient) => `Je kunt geen ${quotient} dozen vullen: ${WHOLE}`,
  },
  {
    id: 'dozen',
    ask: 'rest',
    minDivisor: 6,
    maxDivisor: 30,
    prompt: (n, d) =>
      `In een doos passen ${d} eieren. Je vult zoveel mogelijk dozen met ${f(n)} eieren. ` +
      'Hoeveel eieren houd je over?',
    suffix: 'eieren',
    conclusion: (answer) => `${answer} eieren over`,
    tip: () => 'Dat is het aantal dozen; gevraagd is wat je overhoudt.',
  },
  {
    id: 'kaartjes',
    ask: 'down',
    minDivisor: 3,
    maxDivisor: 25,
    prompt: (n, d) => `Een kaartje kost ${euro(d)}. Hoeveel kaartjes koop je voor ${euro(n)}?`,
    suffix: 'kaartjes',
    conclusion: (answer) => `${answer} kaartjes`,
    tip: () => 'Voor nog een kaartje is het geld niet genoeg: rond naar beneden af.',
    decimalTip: (quotient) => `Je kunt geen ${quotient} kaartjes kopen: ${WHOLE}`,
  },
  {
    id: 'kaartjes',
    ask: 'rest',
    minDivisor: 3,
    maxDivisor: 25,
    prompt: (n, d) =>
      `Een kaartje kost ${euro(d)}. Je koopt zoveel mogelijk kaartjes voor ${euro(n)}. ` +
      'Hoeveel geld houd je over?',
    prefix: '€',
    conclusion: (answer) => `${euro(answer)} over`,
    tip: () => 'Dat is het aantal kaartjes; gevraagd is wat je overhoudt.',
  },
];

function remainderTip(context: RemainderContext, total: number, divisor: number): Diagnose {
  const quotient = Math.floor(total / divisor);
  const mistaken = fromInteger(context.ask === 'down' ? quotient + 1 : quotient);
  const exact = divide(fromInteger(total), fromInteger(divisor));
  const { decimalTip } = context;
  return (given) => {
    if (equals(given, mistaken)) return context.tip(total % divisor);
    if (decimalTip && decimalPlaces(exact) !== null && equals(given, exact)) {
      return decimalTip(formatRational(exact));
    }
    return undefined;
  };
}

/** total = q × divisor + rest, asked in a context (spec §5.15). */
export function remainderQuestion(
  context: RemainderContext,
  total: number,
  divisor: number,
): Question {
  const quotient = Math.floor(total / divisor);
  const rest = total % divisor;
  const answer = context.ask === 'up' ? quotient + 1 : context.ask === 'down' ? quotient : rest;
  const conclusion = context.conclusion(answer);
  const explanation =
    context.ask === 'rest'
      ? `${f(total)} = ${quotient} × ${divisor} + ${rest} → ${conclusion}`
      : `${f(total)} : ${divisor} = ${quotient} rest ${rest} → ${conclusion}`;
  return {
    key: `mentalOperations:remainder:${context.id}:${context.ask}:${total}:${divisor}`,
    topic: 'mentalOperations',
    steps: [
      numberStep({
        prompt: context.prompt(total, divisor),
        answer: fromInteger(answer),
        prefix: context.prefix,
        suffix: context.suffix,
        explanation,
        diagnose: remainderTip(context, total, divisor),
      }),
    ],
  };
}

function remainder(rng: Rng): Question {
  const ask = pick(rng, ASKS);
  const context = pick(
    rng,
    REMAINDER_CONTEXTS.filter((candidate) => candidate.ask === ask),
  );
  const { total, divisor } = drawUntil(() => {
    const divisor = randomInt(rng, context.minDivisor, context.maxDivisor);
    const quotient = randomInt(rng, MIN_QUOTIENT, MAX_QUOTIENT);
    const total = quotient * divisor + randomInt(rng, 1, divisor - 1);
    return total <= MAX_TOTAL ? { total, divisor } : null;
  });
  return remainderQuestion(context, total, divisor);
}

const BUILDERS: Record<MentalForm, (rng: Rng) => Question> = {
  addSubtract,
  multiply: multiplyByZeros,
  divide: divideByZeros,
  remainder,
};

/** One question of the given form. */
export function buildMentalOperation(rng: Rng, form: MentalForm): Question {
  return BUILDERS[form](rng);
}

/** One of four forms, each equally likely (spec §5.15). */
export function generateMentalOperations(rng: Rng): Question {
  return buildMentalOperation(rng, pick(rng, MENTAL_FORMS));
}
