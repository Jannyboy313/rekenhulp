import { formatEuro, formatFraction, formatInteger, formatMoney, formatRational } from '../format';
import { gcd } from '../primes';
import { drawUntil, pick, randomInt, range, type Rng } from '../random';
import {
  compare,
  divide,
  equals,
  fromInteger,
  HUNDRED,
  isInteger,
  multiply,
  ONE,
  rational,
  type Rational,
} from '../rational';
import { fractionStep, numberStep, simplestFractionStep } from '../steps';
import { moneyTip, type Diagnose } from '../tips';
import type { Question } from '../types';
import { formatPercentNumber } from './fractionConversion';

// Ratio word problems (spec §5.25): part of the whole, mixing and per unit.

type RatioForm = 'part' | 'mix' | 'unit';
const FORMS: readonly RatioForm[] = ['part', 'mix', 'unit'];

/** Which term of a ratio a : b: 0 is a, 1 is b. */
type Index = 0 | 1;
const INDEXES: readonly Index[] = [0, 1];

type Pair = readonly [number, number];

function termAt(a: number, b: number, index: Index): number {
  return index === 0 ? a : b;
}

function otherIndex(index: Index): Index {
  return index === 0 ? 1 : 0;
}

/** The simplified ratios a : b with a ≠ b and both terms in [1, max] that `accept` lets through. */
function simplifiedPairs(max: number, accept: (a: number, b: number) => boolean): Pair[] {
  return range(1, max).flatMap((a) =>
    range(1, max)
      .filter((b) => a !== b && gcd(a, b) === 1 && accept(a, b))
      .map((b): Pair => [a, b]),
  );
}

/** The story of a part-of-the-whole question: two groups in a ratio (spec §5.25). */
export interface GroupContext {
  id: 'class' | 'marbles' | 'audience';
  /** Plural names for tips and explanations: ['jongens', 'meisjes']. */
  groups: readonly [string, string];
  /** 'In een klas is jongens : meisjes = 2 : 3.' */
  intro(a: number, b: number): string;
  /** The question for group i: 'Welk deel van de klas is jongen?' / 'Hoeveel procent …' */
  question(index: Index, asPercentage: boolean): string;
}

interface GroupWording {
  /** The sentence up to 'is': 'In een klas'. */
  setting: string;
  /** The groups as the ratio names them: 'jongens', 'meisjes' or 'rood', 'blauw'. */
  named: readonly [string, string];
  /** The whole with its article: 'de klas'. */
  whole: string;
  /** One member of each group: 'jongen', 'meisje'. */
  members: readonly [string, string];
}

function groupContext(
  id: GroupContext['id'],
  groups: readonly [string, string],
  { setting, named, whole, members }: GroupWording,
): GroupContext {
  return {
    id,
    groups,
    intro: (a, b) => `${setting} is ${named[0]} : ${named[1]} = ${a} : ${b}.`,
    question: (index, asPercentage) =>
      `${asPercentage ? 'Hoeveel procent van' : 'Welk deel van'} ${whole} is ${members[index]}?`,
  };
}

export const GROUP_CONTEXTS: readonly GroupContext[] = [
  groupContext('class', ['jongens', 'meisjes'], {
    setting: 'In een klas',
    named: ['jongens', 'meisjes'],
    whole: 'de klas',
    members: ['jongen', 'meisje'],
  }),
  groupContext('marbles', ['rode knikkers', 'blauwe knikkers'], {
    setting: 'In een zak',
    named: ['rood', 'blauw'],
    whole: 'de knikkers',
    members: ['rood', 'blauw'],
  }),
  groupContext('audience', ['volwassenen', 'kinderen'], {
    setting: 'Bij een voorstelling',
    named: ['volwassenen', 'kinderen'],
    whole: 'het publiek',
    members: ['volwassen', 'kind'],
  }),
];

/** A fraction needs a + b ≤ 12 (spec §5.25). */
const MAX_FRACTION_SUM = 12;
/** A percentage needs a sum with a friendly percentage: 33 1/3, 25, 20, 16 2/3, 12,5, 10. */
const PERCENTAGE_SUMS: readonly number[] = [3, 4, 5, 6, 8, 10];

const FRACTION_PAIRS = simplifiedPairs(MAX_FRACTION_SUM - 1, (a, b) => a + b <= MAX_FRACTION_SUM);
const PERCENTAGE_PAIRS = simplifiedPairs(Math.max(...PERCENTAGE_SUMS) - 1, (a, b) =>
  PERCENTAGE_SUMS.includes(a + b),
);

/** The ratios a : b of a part-of-the-whole question as a fraction, or as a percentage. */
export function partPairsFor(asPercentage: boolean): readonly Pair[] {
  return asPercentage ? PERCENTAGE_PAIRS : FRACTION_PAIRS;
}

/**
 * One exercise of the form: `In een klas is jongens : meisjes = 2 : 3. Welk deel van de klas is
 * jongen?` The ratio a : b must be one of `partPairsFor(asPercentage)`; `index` is the group asked.
 */
export function partQuestion(
  context: GroupContext,
  a: number,
  b: number,
  index: Index,
  asPercentage: boolean,
): Question {
  if (!partPairsFor(asPercentage).some(([x, y]) => x === a && y === b)) {
    const form = asPercentage ? 'percentage' : 'fraction';
    throw new RangeError(`${a} : ${b} is not a supported ratio for a ${form}`);
  }
  const fraction = divide(fromInteger(termAt(a, b, index)), fromInteger(a + b));
  const prompt = `${context.intro(a, b)} ${context.question(index, asPercentage)}`;
  const explanation = partExplanation(context, a, b, index, asPercentage);
  const diagnose = partTip(context, a, b, index, asPercentage);
  const step = asPercentage
    ? fractionStep({
        prompt,
        answer: multiply(fraction, HUNDRED),
        suffix: '%',
        expected: formatPercentNumber(fraction),
        explanation,
        diagnose,
      })
    : simplestFractionStep({
        prompt,
        answer: fraction,
        decimalAllowed: true,
        explanation,
        diagnose,
      });
  const variant = asPercentage ? 'percent' : 'fraction';
  return {
    key: `ratioProblems:part:${context.id}:${a}:${b}:${index}:${variant}`,
    topic: 'ratioProblems',
    steps: [step],
  };
}

/** '2 + 3 = 5 delen → jongens = 2/5', and for a percentage '1 + 2 = 3 delen → 2/3 = 66 2/3%'. */
function partExplanation(
  context: GroupContext,
  a: number,
  b: number,
  index: Index,
  asPercentage: boolean,
): string {
  const asked = termAt(a, b, index);
  const parts = `${a} + ${b} = ${a + b} delen`;
  const share = `${asked}/${a + b}`;
  if (!asPercentage) return `${parts} → ${context.groups[index]} = ${share}`;
  const percent = formatPercentNumber(divide(fromInteger(asked), fromInteger(a + b)));
  return `${parts} → ${share} = ${percent}%`;
}

/**
 * The ratio of the two groups instead of the part of the whole, or the part of the other group
 * (spec §3.4.1). The ratio comes first; both are times 100 for a percentage.
 */
function partTip(
  context: GroupContext,
  a: number,
  b: number,
  index: Index,
  asPercentage: boolean,
): Diagnose {
  const asked = termAt(a, b, index);
  const other = termAt(a, b, otherIndex(index));
  const whole = a + b;
  const scaled = (value: Rational) => (asPercentage ? multiply(value, HUNDRED) : value);
  const ratio = scaled(divide(fromInteger(asked), fromInteger(other)));
  const otherPart = scaled(divide(fromInteger(other), fromInteger(whole)));
  const [first, second] = context.groups;
  const ratioTip =
    `${a} : ${b} is ${first} tegenover ${second}. ` +
    `Het geheel is ${a} + ${b} = ${whole} delen, dus ${asked}/${whole}.`;
  const otherTip =
    `Dat is het deel ${context.groups[otherIndex(index)]}; ` +
    `gevraagd is het deel ${context.groups[index]}.`;
  return (given) => {
    if (equals(given, ratio)) return ratioTip;
    if (equals(given, otherPart)) return otherTip;
    return undefined;
  };
}

/** A name with its article: 'siroop' and 'de siroop'. */
export interface Ingredient {
  name: string;
  withArticle: string;
}

export interface MixContext {
  id: 'syrup' | 'mortar' | 'paint';
  unit: 'ml' | 'kg' | 'L';
  ingredients: readonly [Ingredient, Ingredient];
  /** The mixture as the total is named: 'limonade'. */
  mixture: string;
  /** Siroop and cement are the smaller part (a < b). */
  smallerFirst: boolean;
  /** The largest size u of one part: 200, or 20 for paint. */
  maxPart: number;
}

export const MIX_CONTEXTS: readonly MixContext[] = [
  {
    id: 'syrup',
    unit: 'ml',
    ingredients: [
      { name: 'siroop', withArticle: 'de siroop' },
      { name: 'water', withArticle: 'het water' },
    ],
    mixture: 'limonade',
    smallerFirst: true,
    maxPart: 200,
  },
  {
    id: 'mortar',
    unit: 'kg',
    ingredients: [
      { name: 'cement', withArticle: 'het cement' },
      { name: 'zand', withArticle: 'het zand' },
    ],
    mixture: 'mortel',
    smallerFirst: true,
    maxPart: 200,
  },
  {
    id: 'paint',
    unit: 'L',
    ingredients: [
      { name: 'witte verf', withArticle: 'de witte verf' },
      { name: 'blauwe verf', withArticle: 'de blauwe verf' },
    ],
    mixture: 'lichtblauwe verf',
    smallerFirst: false,
    maxPart: 20,
  },
];

const MAX_MIX_TERM = 9;
const MIN_MIX_PART = 2;
const MAX_MIX_AMOUNT = 2000;
/** An amount that is given must stay easy to divide: 350, not 357; 140, not 137. */
const MAX_GIVEN_DIGITS = 2;

/** The digits of a whole number without its trailing zeros: 350 has 2. */
function significantDigits(value: number): number {
  return String(value).replace(/0+$/, '').length;
}

/**
 * The amount a mixing prompt gives: the 'total' (from the total) or the amount of ingredient 0 or 1
 * (from one part).
 */
export type GivenAmount = 'total' | Index;

/** How many parts the given amount is: all of them for the total, else the term of the ratio. */
function givenParts(a: number, b: number, given: GivenAmount): number {
  return given === 'total' ? a + b : termAt(a, b, given);
}

/** The ratios a : b of a mixing question: terms in [1, 9], the smaller part first if required. */
export function mixPairsFor(context: MixContext): readonly Pair[] {
  return simplifiedPairs(MAX_MIX_TERM, (a, b) => !context.smallerFirst || a < b);
}

function isMixPair(context: MixContext, a: number, b: number): boolean {
  const termsInRange = [a, b].every((term) => Number.isInteger(term) && term >= 1);
  return (
    termsInRange &&
    Math.max(a, b) <= MAX_MIX_TERM &&
    a !== b &&
    gcd(a, b) === 1 &&
    (!context.smallerFirst || a < b)
  );
}

function isMixPart(
  context: MixContext,
  a: number,
  b: number,
  part: number,
  given: GivenAmount,
): boolean {
  if (!Number.isInteger(part) || part < MIN_MIX_PART || part > context.maxPart) return false;
  const total = (a + b) * part;
  const givenAmount = givenParts(a, b, given) * part;
  return total <= MAX_MIX_AMOUNT && significantDigits(givenAmount) <= MAX_GIVEN_DIGITS;
}

/**
 * The sizes u of one part that fit the ratio a : b (one of `mixPairsFor`): the total
 * `(a + b) × u` is at most 2000, and the amount that is given (the total, or `a × u` or `b × u`)
 * has at most 2 significant digits. A part of 2 always fits.
 */
export function mixPartsFor(
  context: MixContext,
  a: number,
  b: number,
  given: GivenAmount,
): number[] {
  return range(MIN_MIX_PART, context.maxPart).filter((part) =>
    isMixPart(context, a, b, part, given),
  );
}

function checkMix(
  context: MixContext,
  a: number,
  b: number,
  part: number,
  given: GivenAmount,
): void {
  if (!isMixPair(context, a, b)) {
    throw new RangeError(`${a} : ${b} is not a supported ratio for ${context.id}`);
  }
  if (!isMixPart(context, a, b, part, given)) {
    throw new RangeError(`A part of ${part} is not supported for ${a} : ${b} in ${context.id}`);
  }
}

/** 'Siroop : water = 1 : 6.' */
function ratioLine(context: MixContext, a: number, b: number): string {
  const [first, second] = context.ingredients;
  const name = first.name.charAt(0).toUpperCase() + first.name.slice(1);
  return `${name} : ${second.name} = ${a} : ${b}.`;
}

/** '1 deel' or '6 delen'. */
function partsText(count: number): string {
  return `${count} ${count === 1 ? 'deel' : 'delen'}`;
}

/**
 * One exercise of the form: `Siroop : water = 1 : 6. Hoeveel ml siroop zit er in 350 ml
 * limonade?` `part` is the size u of one part and `asked` the ingredient asked for.
 */
export function mixFromTotalQuestion(
  context: MixContext,
  a: number,
  b: number,
  part: number,
  asked: Index,
): Question {
  checkMix(context, a, b, part, 'total');
  const total = (a + b) * part;
  const ingredient = context.ingredients[asked];
  const prompt =
    `${ratioLine(context, a, b)} Hoeveel ${context.unit} ${ingredient.name} zit er in ` +
    `${formatInteger(total)} ${context.unit} ${context.mixture}?`;
  return {
    key: `ratioProblems:mix:${context.id}:total:${a}:${b}:${part}:${asked}`,
    topic: 'ratioProblems',
    steps: [
      numberStep({
        prompt,
        answer: fromInteger(termAt(a, b, asked) * part),
        suffix: context.unit,
        explanation: mixFromTotalExplanation(context, a, b, part, asked),
        diagnose: mixFromTotalTip(context, a, b, part, asked),
      }),
    ],
  };
}

/** '1 + 6 = 7 delen → 1 deel = 350 : 7 = 50 → siroop = 1 deel = 50' */
function mixFromTotalExplanation(
  context: MixContext,
  a: number,
  b: number,
  part: number,
  asked: Index,
): string {
  const parts = a + b;
  const term = termAt(a, b, asked);
  const oneStep = `1 deel = ${formatInteger(parts * part)} : ${parts} = ${formatInteger(part)}`;
  const name = context.ingredients[asked].name;
  const answer = `${name} = ${partsText(term)} = ${formatInteger(term * part)}`;
  return `${a} + ${b} = ${parts} delen → ${oneStep} → ${answer}`;
}

/**
 * The other ingredient, or the total divided by one term of the ratio instead of by the number
 * of parts (spec §3.4.1). The other ingredient comes first.
 */
function mixFromTotalTip(
  context: MixContext,
  a: number,
  b: number,
  part: number,
  asked: Index,
): Diagnose {
  const total = fromInteger((a + b) * part);
  const otherAmount = fromInteger(termAt(a, b, otherIndex(asked)) * part);
  const dividedByTerm = [a, b].map((term) => divide(total, fromInteger(term)));
  const otherTip =
    `Dat is de hoeveelheid ${context.ingredients[otherIndex(asked)].name}; ` +
    `gevraagd is ${context.ingredients[asked].withArticle}.`;
  const divideTip = `Deel eerst door het totaal aantal delen: ${a} + ${b} = ${a + b}.`;
  return (given) => {
    if (equals(given, otherAmount)) return otherTip;
    if (dividedByTerm.some((divided) => equals(given, divided))) return divideTip;
    return undefined;
  };
}

/**
 * One exercise of the form: `Siroop : water = 1 : 6. Je hebt 50 ml siroop. Hoeveel ml water moet
 * erbij?` `part` is the size u of one part and `given` the ingredient that is given.
 */
export function mixFromPartQuestion(
  context: MixContext,
  a: number,
  b: number,
  part: number,
  given: Index,
): Question {
  checkMix(context, a, b, part, given);
  const asked = otherIndex(given);
  const prompt =
    `${ratioLine(context, a, b)} Je hebt ${formatInteger(termAt(a, b, given) * part)} ` +
    `${context.unit} ${context.ingredients[given].name}. ` +
    `Hoeveel ${context.unit} ${context.ingredients[asked].name} moet erbij?`;
  return {
    key: `ratioProblems:mix:${context.id}:part:${a}:${b}:${part}:${given}`,
    topic: 'ratioProblems',
    steps: [
      numberStep({
        prompt,
        answer: fromInteger(termAt(a, b, asked) * part),
        suffix: context.unit,
        explanation: mixFromPartExplanation(context, a, b, part, given),
        diagnose: mixFromPartTip(context, a, b, part, given),
      }),
    ],
  };
}

/**
 * Both ingredients in parts: 'siroop = 1 deel = 50 → water = 6 delen = 300'. When neither is one
 * part, 1 deel goes in between: 'cement = 2 delen = 100 → 1 deel = 50 → zand = 5 delen = 250'.
 */
function mixFromPartExplanation(
  context: MixContext,
  a: number,
  b: number,
  part: number,
  given: Index,
): string {
  const asked = otherIndex(given);
  const [givenTerm, askedTerm] = [termAt(a, b, given), termAt(a, b, asked)];
  const amountOf = (index: Index, term: number) =>
    `${context.ingredients[index].name} = ${partsText(term)} = ${formatInteger(term * part)}`;
  const oneStep = givenTerm === 1 || askedTerm === 1 ? [] : [`1 deel = ${formatInteger(part)}`];
  return [amountOf(given, givenTerm), ...oneStep, amountOf(asked, askedTerm)].join(' → ');
}

/** The total, answered instead of the amount of the other ingredient (spec §3.4.1). */
function mixFromPartTip(
  context: MixContext,
  a: number,
  b: number,
  part: number,
  given: Index,
): Diagnose {
  const total = fromInteger((a + b) * part);
  const tip =
    `Dat is de hele hoeveelheid ${context.mixture}; ` +
    `gevraagd is alleen ${context.ingredients[otherIndex(given)].withArticle}.`;
  return (answer) => (equals(answer, total) ? tip : undefined);
}

export type UnitContextId = 'cheese' | 'petrol' | 'wage';
const UNIT_CONTEXT_IDS: readonly UnitContextId[] = ['cheese', 'petrol', 'wage'];

/**
 * The amounts and prices of one per-unit context (spec §5.25). Amounts are counted in the counting
 * unit of the context: 100 g for cheese, 1 L for petrol and 1 uur for the wage.
 */
interface UnitSettings {
  /** The amounts are multiples of 1/amountParts counting units: half hours for the wage. */
  amountParts: number;
  /** The range of the amounts, in counting units. */
  minAmount: number;
  maxAmount: number;
  /** The price per counting unit: multiples of priceStepCents in [minPriceCents, maxPriceCents]. */
  minPriceCents: number;
  maxPriceCents: number;
  priceStepCents: number;
}

const UNIT_SETTINGS: Record<UnitContextId, UnitSettings> = {
  cheese: {
    amountParts: 1,
    minAmount: 2,
    maxAmount: 30,
    minPriceCents: 60,
    maxPriceCents: 250,
    priceStepCents: 10,
  },
  petrol: {
    amountParts: 1,
    minAmount: 5,
    maxAmount: 60,
    minPriceCents: 160,
    maxPriceCents: 220,
    priceStepCents: 10,
  },
  wage: {
    amountParts: 2,
    minAmount: 1,
    maxAmount: 10,
    minPriceCents: 1000,
    maxPriceCents: 2500,
    priceStepCents: 100,
  },
};

/** No price in a ratio table may be above € 200. */
const MAX_UNIT_TABLE_PRICE = fromInteger(200);
const FIVE = fromInteger(5);
const THOUSAND = fromInteger(1000);

/** Whether `value` is a whole multiple of `unit`. */
function isWholeMultiple(value: Rational, unit: Rational): boolean {
  return isInteger(divide(value, unit));
}

function isBetween(value: Rational, min: number, max: number): boolean {
  return compare(value, fromInteger(min)) >= 0 && compare(value, fromInteger(max)) <= 0;
}

/** A positive multiple of 1/amountParts counting units, the grid the amounts are written on. */
function isOnAmountGrid({ amountParts }: UnitSettings, amount: Rational): boolean {
  return amount.num > 0n && isWholeMultiple(amount, rational(1n, BigInt(amountParts)));
}

/**
 * An amount in counting units as the prompts write it: '1,5 kg', '400 g', '25 L', '2,5 uur'. Cheese
 * is in g below 1 kg and in kg from 1 kg. The amount must be on the grid of the context.
 */
export function formatAmount(context: UnitContextId, amount: Rational): string {
  if (!isOnAmountGrid(UNIT_SETTINGS[context], amount)) {
    throw new RangeError(`${formatFraction(amount)} is not an amount for ${context}`);
  }
  switch (context) {
    case 'cheese': {
      const grams = multiply(amount, HUNDRED);
      return compare(grams, THOUSAND) < 0
        ? `${formatRational(grams)} g`
        : `${formatRational(divide(grams, THOUSAND))} kg`;
    }
    case 'petrol':
      return `${formatRational(amount)} L`;
    case 'wage':
      return `${formatRational(amount)} uur`;
  }
}

/**
 * The step of the ratio table: 100 g for cheese, 1 uur for the wage and for petrol 5 L when both
 * amounts are multiples of 5, otherwise 1 L. Amounts are in counting units.
 */
export function stepAmount(context: UnitContextId, first: Rational, second: Rational): Rational {
  const fiveLitres =
    context === 'petrol' && isWholeMultiple(first, FIVE) && isWholeMultiple(second, FIVE);
  return fiveLitres ? FIVE : ONE;
}

/** Why the exercise is not a supported one (spec §5.25), or null when it is. */
function unitProblem(
  context: UnitContextId,
  first: Rational,
  firstPrice: Rational,
  second: Rational,
): string | null {
  const settings = UNIT_SETTINGS[context];
  for (const amount of [first, second]) {
    const supported =
      isBetween(amount, settings.minAmount, settings.maxAmount) && isOnAmountGrid(settings, amount);
    if (!supported) return `${formatFraction(amount)} is not a supported amount for ${context}`;
  }
  const unitPrice = divide(firstPrice, first);
  const cents = multiply(unitPrice, HUNDRED);
  const priceSupported =
    isBetween(cents, settings.minPriceCents, settings.maxPriceCents) &&
    isWholeMultiple(cents, fromInteger(settings.priceStepCents));
  if (!priceSupported) {
    return `${formatFraction(unitPrice)} is not a supported price per unit for ${context}`;
  }
  if (isWholeMultiple(first, second) || isWholeMultiple(second, first)) {
    return `${formatFraction(first)} and ${formatFraction(second)} are multiples of each other`;
  }
  const step = stepAmount(context, first, second);
  if (equals(first, step) || equals(second, step)) {
    return `An amount of ${formatFraction(step)} is the step, which leaves nothing to calculate`;
  }
  const prices = [firstPrice, multiply(second, unitPrice)];
  if (prices.some((price) => compare(price, MAX_UNIT_TABLE_PRICE) > 0)) {
    return 'A price above € 200 is not supported';
  }
  return null;
}

/** '1,5 kg kaas kost € 12. Wat kost 400 g?' */
function unitPrompt(
  context: UnitContextId,
  first: Rational,
  firstPrice: Rational,
  second: Rational,
): string {
  const [given, asked] = [formatAmount(context, first), formatAmount(context, second)];
  const price = formatEuro(firstPrice);
  switch (context) {
    case 'cheese':
      return `${given} kaas kost ${price}. Wat kost ${asked}?`;
    case 'petrol':
      return `${given} benzine kost ${price}. Wat kost ${asked}?`;
    case 'wage':
      return `Voor ${given} werk krijg je ${price}. Hoeveel voor ${asked}?`;
  }
}

/**
 * One exercise of the form: `1,5 kg kaas kost € 12. Wat kost 400 g?` Amounts are in the counting
 * unit of the context, so cheese 1,5 kg is `first = 15` (15 × 100 g) and 400 g is `second = 4`.
 * `firstPrice` is the price of the first amount; the price per counting unit follows from it and
 * must be one of the context (spec §5.25), as must the amounts and the way they relate.
 */
export function unitQuestion(
  context: UnitContextId,
  first: Rational,
  firstPrice: Rational,
  second: Rational,
): Question {
  const problem = unitProblem(context, first, firstPrice, second);
  if (problem !== null) throw new RangeError(problem);
  const unitPrice = divide(firstPrice, first);
  const answer = multiply(second, unitPrice);
  const amounts = `${formatRational(first)}:${formatRational(second)}`;
  return {
    key: `ratioProblems:unit:${context}:${amounts}:${formatRational(unitPrice)}`,
    topic: 'ratioProblems',
    steps: [
      numberStep({
        prompt: unitPrompt(context, first, firstPrice, second),
        answer,
        prefix: '€',
        expected: formatMoney(answer),
        explanation: unitExplanation(context, first, firstPrice, second),
        diagnose: inverseTip(context, first, firstPrice, second),
      }),
    ],
  };
}

/**
 * The ratio table with the step in between: '1,5 kg → € 12, 100 g → € 0,80, 400 g → € 3,20'.
 * The exercise must be a supported one.
 */
export function unitExplanation(
  context: UnitContextId,
  first: Rational,
  firstPrice: Rational,
  second: Rational,
): string {
  const unitPrice = divide(firstPrice, first);
  const step = stepAmount(context, first, second);
  const row = (amount: Rational, price: Rational) =>
    `${formatAmount(context, amount)} → ${formatEuro(price)}`;
  return [
    row(first, firstPrice),
    row(step, multiply(step, unitPrice)),
    row(second, multiply(second, unitPrice)),
  ].join(', ');
}

/**
 * The inverse scaling: the first price × first : second instead of × second : first (spec
 * §3.4.1). Typed as a price, so also when rounded half up to cents. The exercise must be a
 * supported one.
 */
export function inverseTip(
  context: UnitContextId,
  first: Rational,
  firstPrice: Rational,
  second: Rational,
): Diagnose {
  const mistaken = divide(multiply(firstPrice, first), second);
  const comparison = compare(second, first) < 0 ? 'minder' : 'meer';
  const verb = context === 'wage' ? 'je krijgt' : 'het kost';
  const [given, asked] = [formatAmount(context, first), formatAmount(context, second)];
  return moneyTip(
    mistaken,
    `Je hebt omgekeerd gerekend: ${asked} is ${comparison} dan ${given}, ` +
      `dus ${verb} ${comparison} dan ${formatEuro(firstPrice)}.`,
  );
}

/** `In een klas is jongens : meisjes = 2 : 3. Welk deel van de klas is jongen?` */
function generatePart(rng: Rng): Question {
  const context = pick(rng, GROUP_CONTEXTS);
  const asPercentage = rng() < 0.5;
  const [a, b] = pick(rng, partPairsFor(asPercentage));
  return partQuestion(context, a, b, pick(rng, INDEXES), asPercentage);
}

/** `Siroop : water = 1 : 6. Hoeveel ml siroop zit er in 350 ml limonade?` or from one part. */
function generateMix(rng: Rng): Question {
  const context = pick(rng, MIX_CONTEXTS);
  const fromTotal = rng() < 0.5;
  const [a, b] = pick(rng, mixPairsFor(context));
  const index = pick(rng, INDEXES);
  const part = pick(rng, mixPartsFor(context, a, b, fromTotal ? 'total' : index));
  return fromTotal
    ? mixFromTotalQuestion(context, a, b, part, index)
    : mixFromPartQuestion(context, a, b, part, index);
}

/** An amount on the grid of the context, between its smallest and largest amount. */
function drawUnitAmount(rng: Rng, { amountParts, minAmount, maxAmount }: UnitSettings): Rational {
  const parts = randomInt(rng, minAmount * amountParts, maxAmount * amountParts);
  return rational(BigInt(parts), BigInt(amountParts));
}

/** A price per counting unit on the grid of the context, between its smallest and largest. */
function drawUnitPrice(
  rng: Rng,
  { minPriceCents, maxPriceCents, priceStepCents }: UnitSettings,
): Rational {
  const steps = randomInt(rng, minPriceCents / priceStepCents, maxPriceCents / priceStepCents);
  return rational(BigInt(steps * priceStepCents), 100n);
}

/** `1,5 kg kaas kost € 12. Wat kost 400 g?` */
function generateUnit(rng: Rng): Question {
  const context = pick(rng, UNIT_CONTEXT_IDS);
  const settings = UNIT_SETTINGS[context];
  const { first, firstPrice, second } = drawUntil(() => {
    const unitPrice = drawUnitPrice(rng, settings);
    const first = drawUnitAmount(rng, settings);
    const second = drawUnitAmount(rng, settings);
    const firstPrice = multiply(first, unitPrice);
    const supported = unitProblem(context, first, firstPrice, second) === null;
    return supported ? { first, firstPrice, second } : null;
  });
  return unitQuestion(context, first, firstPrice, second);
}

export function generateRatioProblems(rng: Rng): Question {
  switch (pick(rng, FORMS)) {
    case 'part':
      return generatePart(rng);
    case 'mix':
      return generateMix(rng);
    case 'unit':
      return generateUnit(rng);
  }
}
