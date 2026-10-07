import { formatEuro, formatInteger, formatMoney, formatRational, MINUS } from '../format';
import { pick, range, type Rng } from '../random';
import {
  add,
  compare,
  decimalPlaces,
  divide,
  equals,
  fromInteger,
  HUNDRED,
  isInteger,
  multiply,
  rational,
  subtract,
  type Rational,
} from '../rational';
import { fractionStep, numberStep } from '../steps';
import type { Diagnose } from '../tips';
import type { Question, Step } from '../types';

export interface Percentage {
  value: Rational;
  /** Known percentage the explanation goes through: base% = whole : (100 / base). */
  base: Rational;
}

function percentage(value: number, base: number): Percentage {
  return { value: fromInteger(value), base: fromInteger(base) };
}

const TWELVE_AND_A_HALF = rational(25n, 2n);

/** Spec §5.12. 100 / base and value / base are always whole numbers. */
export const PERCENTAGES: readonly Percentage[] = [
  percentage(1, 1),
  percentage(2, 1),
  percentage(5, 5),
  percentage(10, 10),
  { value: TWELVE_AND_A_HALF, base: TWELVE_AND_A_HALF },
  percentage(15, 5),
  percentage(20, 10),
  percentage(25, 25),
  percentage(30, 10),
  percentage(40, 10),
  percentage(50, 50),
  percentage(60, 10),
  percentage(75, 25),
  percentage(80, 10),
  percentage(90, 10),
  percentage(120, 10),
  percentage(150, 50),
];

const FIFTY = fromInteger(50);
const FIFTEEN = fromInteger(15);
const TEN = fromInteger(10);
const FIVE = fromInteger(5);

/** "120% korting" makes no sense; increases stay at most 50% (spec §5.12). */
export const DISCOUNT_PERCENTAGES: readonly Percentage[] = PERCENTAGES.filter(
  ({ value }) => compare(value, HUNDRED) < 0,
);
export const INCREASE_PERCENTAGES: readonly Percentage[] = PERCENTAGES.filter(
  ({ value }) => compare(value, FIFTY) <= 0,
);

const MIN_WHOLE = 10;
const MAX_WHOLE = 1000;

function hasAtMostTwoSignificantDigits(value: number): boolean {
  let digits = value;
  while (digits % 10 === 0) digits /= 10;
  return digits < 100;
}

/** Integers in [10, 1000] with at most 2 significant digits: 85 and 470, not 487. */
export const NICE_WHOLES: readonly number[] = range(MIN_WHOLE, MAX_WHOLE).filter(
  hasAtMostTwoSignificantDigits,
);

/** '15' or '12½'. Percentages are whole or half (spec §8). */
export function formatPercentage(value: Rational): string {
  if (isInteger(value)) return formatRational(value);
  if (value.den === 2n && value.num > 0n) return `${formatInteger((value.num - 1n) / 2n)}½`;
  throw new RangeError('Only whole and half percentages are supported');
}

function percentLabel(percent: Rational): string {
  return `${formatPercentage(percent)}%`;
}

/** p% of the whole, exactly. */
export function percentOf(percent: Rational, whole: Rational): Rational {
  return divide(multiply(percent, whole), HUNDRED);
}

/**
 * Strategy for p% of a whole: '10% = 80 : 10 = 8 → 30% = 3 × 8 = 24'. 5% and 15% go via 10%:
 * '10% = 8, 5% = 4 → 15% = 12'. `format` formats the amounts, e.g. formatMoney.
 */
export function partExplanation(
  p: Percentage,
  whole: Rational,
  format: (value: Rational) => string = formatRational,
): string {
  const of = (percent: Rational) => format(percentOf(percent, whole));
  if (equals(p.value, FIVE)) return `10% = ${of(TEN)} → 5% = ${of(FIVE)}`;
  if (equals(p.value, FIFTEEN)) return `10% = ${of(TEN)}, 5% = ${of(FIVE)} → 15% = ${of(FIFTEEN)}`;
  const divisor = formatRational(divide(HUNDRED, p.base));
  const first = `${percentLabel(p.base)} = ${format(whole)} : ${divisor} = ${of(p.base)}`;
  if (equals(p.value, p.base)) return first;
  const times = formatRational(divide(p.value, p.base));
  return `${first} → ${percentLabel(p.value)} = ${times} × ${of(p.base)} = ${of(p.value)}`;
}

/** Strategy from p% back to 100%: '20% = 14 → 10% = 7 → 100% = 10 × 7 = 70'. */
export function wholeExplanation(p: Percentage, whole: Rational): string {
  const part = formatRational(percentOf(p.value, whole));
  const factor = formatRational(divide(HUNDRED, p.base));
  const known = `${percentLabel(p.value)} = ${part}`;
  const total = formatRational(whole);
  if (equals(p.value, p.base)) return `${known} → 100% = ${factor} × ${part} = ${total}`;
  const baseValue = formatRational(percentOf(p.base, whole));
  return `${known} → ${percentLabel(p.base)} = ${baseValue} → 100% = ${factor} × ${baseValue} = ${total}`;
}

/** Share of integer answers (spec §5.12); the rest has 1 or 2 decimals. */
const INTEGER_SHARE = 0.8;
const MAX_DECIMALS = 2;

const WHOLES: readonly Rational[] = NICE_WHOLES.map(fromInteger);

type PercentageForm = 'partOfWhole' | 'whatPercentage' | 'priceChange' | 'backToWhole';
const FORMS: readonly PercentageForm[] = [
  'partOfWhole',
  'whatPercentage',
  'priceChange',
  'backToWhole',
];

export function generatePercentages(rng: Rng): Question {
  switch (pick(rng, FORMS)) {
    case 'partOfWhole':
      return partOfWhole(rng);
    case 'whatPercentage':
      return whatPercentage(rng);
    case 'priceChange':
      return priceChange(rng);
    case 'backToWhole':
      return backToWhole(rng);
  }
}

function hasAtMostTwoDecimals(value: Rational): boolean {
  const decimals = decimalPlaces(value);
  return decimals !== null && decimals <= MAX_DECIMALS;
}

/** An integer-valued candidate with probability INTEGER_SHARE, otherwise a non-integer one. */
function pickByIntegerShare<T>(
  rng: Rng,
  candidates: readonly T[],
  valueOf: (candidate: T) => Rational,
): T {
  const integers = candidates.filter((candidate) => isInteger(valueOf(candidate)));
  const others = candidates.filter((candidate) => !isInteger(valueOf(candidate)));
  const preferred = rng() < INTEGER_SHARE ? integers : others;
  return pick(rng, preferred.length > 0 ? preferred : candidates);
}

/** Every nice whole whose p% has at most 2 decimals. */
function partsOf(p: Percentage): { whole: Rational; part: Rational }[] {
  return WHOLES.map((whole) => ({ whole, part: percentOf(p.value, whole) })).filter(({ part }) =>
    hasAtMostTwoDecimals(part),
  );
}

function percentagesQuestion(form: string, p: Percentage, whole: Rational, step: Step): Question {
  return {
    key: `percentages:${form}:${formatPercentage(p.value)}:${whole.num}`,
    topic: 'percentages',
    steps: [step],
  };
}

/** `15% van 80 = ?` */
function partOfWhole(rng: Rng): Question {
  const p = pick(rng, PERCENTAGES);
  const { whole, part } = pickByIntegerShare(rng, partsOf(p), (candidate) => candidate.part);
  return percentagesQuestion(
    'of',
    p,
    whole,
    numberStep({
      prompt: `${percentLabel(p.value)} van ${formatRational(whole)} = ?`,
      answer: part,
      explanation: partExplanation(p, whole),
      diagnose: partTip(p, whole),
    }),
  );
}

/**
 * `30 is ?% van 120`. Always a fraction step, so `12½` can be typed as `25/2` and the breuk key
 * does not give the answer away.
 */
function whatPercentage(rng: Rng): Question {
  const p = pick(rng, PERCENTAGES);
  const { whole, part } = pick(
    rng,
    partsOf(p).filter((candidate) => isInteger(candidate.part)),
  );
  return percentagesQuestion(
    'what',
    p,
    whole,
    fractionStep({
      prompt: `${formatRational(part)} is ?% van ${formatRational(whole)}`,
      answer: p.value,
      suffix: '%',
      explanation: partExplanation(p, whole),
      diagnose: whatPercentageTip(part, whole),
    }),
  );
}

function changedPrice(p: Percentage, price: Rational, increase: boolean): Rational {
  const change = percentOf(p.value, price);
  return increase ? add(price, change) : subtract(price, change);
}

/** p% of the whole answered with the rest: '25% van 80' → 60 (spec §3.4.1). */
export function partTip(p: Percentage, whole: Rational): Diagnose {
  // At 100% or more there is no "rest" to confuse with the answer.
  if (compare(p.value, HUNDRED) >= 0) return () => undefined;
  const rest = subtract(whole, percentOf(p.value, whole));
  return (given) =>
    equals(given, rest)
      ? `Dat is wat er overblijft; gevraagd is ${percentLabel(p.value)} zelf.`
      : undefined;
}

/** `30 is ?% van 120` answered with 0,25, with 120 : 30 = 4, or with 400. */
export function whatPercentageTip(part: Rational, whole: Rational): Diagnose {
  const ratio = divide(part, whole);
  const inverse = divide(whole, part);
  return (given) => {
    if (equals(given, ratio)) {
      return 'Dat is deel : geheel, nog geen percentage; × 100 geeft het percentage.';
    }
    if (equals(given, inverse) || equals(given, multiply(inverse, HUNDRED))) {
      return 'Je hebt het geheel door het deel gedeeld; reken deel : geheel.';
    }
    return undefined;
  };
}

/** The change itself, or the change in the wrong direction. */
export function priceChangeTip(p: Percentage, price: Rational, increase: boolean): Diagnose {
  const change = percentOf(p.value, price);
  const wrongWay = changedPrice(p, price, !increase);
  return (given) => {
    if (equals(given, change)) {
      return increase
        ? 'Dat is de verhoging zelf; tel die nog op bij de prijs.'
        : 'Dat is de korting zelf; trek die nog af van de prijs.';
    }
    if (equals(given, wrongWay)) {
      return increase
        ? 'Bij een verhoging wordt de prijs hoger: tel de verhoging op.'
        : 'Bij korting wordt de prijs lager: trek de korting af.';
    }
    return undefined;
  };
}

/** `20% is 14. Hoeveel is 100%?` answered with 20% of 14. */
export function backToWholeTip(p: Percentage, part: Rational): Diagnose {
  const mistaken = percentOf(p.value, part);
  const label = percentLabel(p.value);
  const shown = formatRational(part);
  return (given) =>
    equals(given, mistaken)
      ? `Je hebt ${label} van ${shown} berekend, maar ${shown} is zelf al ${label}. Reken terug naar 100%.`
      : undefined;
}

/** '25% = 60 : 4 = 15 → 60 − 15 = 45', with money formatting. */
export function priceChangeExplanation(p: Percentage, price: Rational, increase: boolean): string {
  const change = formatMoney(percentOf(p.value, price));
  const answer = formatMoney(changedPrice(p, price, increase));
  const operator = increase ? '+' : MINUS;
  return `${partExplanation(p, price, formatMoney)} → ${formatMoney(price)} ${operator} ${change} = ${answer}`;
}

/** `€ 60 na 25% korting = ?` or `€ 40 na 15% verhoging = ?` */
function priceChange(rng: Rng): Question {
  const increase = rng() < 0.5;
  const p = pick(rng, increase ? INCREASE_PERCENTAGES : DISCOUNT_PERCENTAGES);
  const candidates = WHOLES.map((price) => ({
    price,
    answer: changedPrice(p, price, increase),
  })).filter(({ answer }) => hasAtMostTwoDecimals(answer));
  const { price, answer } = pickByIntegerShare(rng, candidates, (candidate) => candidate.answer);
  return percentagesQuestion(
    increase ? 'increase' : 'discount',
    p,
    price,
    numberStep({
      prompt: `${formatEuro(price)} na ${percentLabel(p.value)} ${increase ? 'verhoging' : 'korting'} = ?`,
      answer,
      prefix: '€',
      expected: formatMoney(answer),
      explanation: priceChangeExplanation(p, price, increase),
      diagnose: priceChangeTip(p, price, increase),
    }),
  );
}

/** `20% is 14. Hoeveel is 100%?` The answer is the whole, so it is always an integer. */
function backToWhole(rng: Rng): Question {
  const p = pick(rng, PERCENTAGES);
  const { whole, part } = pickByIntegerShare(rng, partsOf(p), (candidate) => candidate.part);
  return percentagesQuestion(
    'back',
    p,
    whole,
    numberStep({
      prompt: `${percentLabel(p.value)} is ${formatRational(part)}. Hoeveel is 100%?`,
      answer: whole,
      explanation: wholeExplanation(p, whole),
      diagnose: backToWholeTip(p, part),
    }),
  );
}
