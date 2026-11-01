import { formatInteger, formatMoney, formatRational, formatEuro, MINUS } from '../format';
import { drawUntil, pick, range, type Rng } from '../random';
import {
  add,
  divide,
  fromInteger,
  hasAtMostDecimals,
  HUNDRED,
  multiply,
  rational,
  subtract,
  type Rational,
} from '../rational';
import { fractionStep, numberStep } from '../steps';
import type { Question } from '../types';
import { hasAtMostTwoSignificantDigits, percentOf } from './percentages';

/** Spec §5.55. */
export const PERCENTAGES = [10, 20, 25, 50] as const;
const PERMILLES = [1, 2, 3, 4, 5, 8] as const;

const PRICES = range(20, 400).filter(hasAtMostTwoSignificantDigits);
const CONTENTS = range(100, 1000).filter(hasAtMostTwoSignificantDigits);
const POPULATIONS = range(10_000, 900_000).filter(hasAtMostTwoSignificantDigits);

export type PercentProblemForm = 'stacked' | 'total' | 'extra' | 'permille';
const FORMS: readonly PercentProblemForm[] = ['stacked', 'total', 'extra', 'permille'];

const money = (value: Rational) => formatMoney(value);

/** The price after a first and a second change, each a percentage; a decrease is negative. */
function afterChanges(price: number, first: number, second: number): Rational {
  const factor = (change: number) => rational(BigInt(100 + change), 100n);
  return multiply(multiply(fromInteger(price), factor(first)), factor(second));
}

export type StackedVariant = 'discounts' | 'upDown';

/** `Een jas kost € 80. Je krijgt 25% korting en op de nieuwe prijs nog 10%. Wat betaal je?` */
export function stackedQuestion(
  variant: StackedVariant,
  price: number,
  first: number,
  second: number,
): Question {
  const discounts = variant === 'discounts';
  const answer = afterChanges(price, discounts ? -first : first, discounts ? -second : -first);
  const base = fromInteger(price);
  const firstStep = percentOf(fromInteger(first), base);
  const afterFirst = discounts ? subtract(base, firstStep) : add(base, firstStep);
  const secondPercent = fromInteger(discounts ? second : first);
  const secondStep = percentOf(secondPercent, afterFirst);
  const prompt = discounts
    ? `Een jas kost ${formatEuro(base)}. Je krijgt ${first}% korting en op de nieuwe prijs nog ${second}%. Wat betaal je?`
    : `Een jas kost ${formatEuro(base)}. De prijs stijgt met ${first}% en daalt daarna met ${first}%. Wat kost de jas daarna?`;
  const explanation = discounts
    ? `${first}% van ${money(base)} = ${money(firstStep)} → ${money(afterFirst)} → ${formatRational(secondPercent)}% van ${money(afterFirst)} = ${money(secondStep)} → ${money(answer)}`
    : `${first}% van ${formatRational(base)} = ${formatRational(firstStep)} → ${formatRational(base)} + ${formatRational(firstStep)} = ${formatRational(afterFirst)} → ${first}% van ${formatRational(afterFirst)} = ${formatRational(secondStep)} → ${formatRational(afterFirst)} ${MINUS} ${formatRational(secondStep)} = ${formatRational(answer)}`;
  return {
    key: `percentProblems:stacked:${variant}:${price}:${first}:${discounts ? second : first}`,
    topic: 'percentProblems',
    steps: [
      numberStep({ prompt, answer, prefix: '€', expected: money(answer), explanation }),
    ],
  };
}

/** The total discount of two discounts in a row, in percent. */
export function totalPercentage(first: number, second: number): Rational {
  return subtract(HUNDRED, divide(fromInteger((100 - first) * (100 - second)), HUNDRED));
}

/** `Eerst 20% korting en op de nieuwe prijs nog 10% korting. Hoeveel procent korting is dat samen?` */
export function totalQuestion(first: number, second: number): Question {
  const answer = totalPercentage(first, second);
  const afterFirst = 100 - first;
  const taken = rational(BigInt(afterFirst * second), 100n);
  const left = subtract(fromInteger(afterFirst), taken);
  return {
    key: `percentProblems:total:${first}:${second}`,
    topic: 'percentProblems',
    steps: [
      fractionStep({
        prompt: `Eerst ${first}% korting en op de nieuwe prijs nog ${second}% korting. Hoeveel procent korting is dat samen?`,
        answer,
        suffix: '%',
        explanation: `stel 100 → ${first}% korting: ${afterFirst} → ${second}% van ${afterFirst} = ${formatRational(taken)}: ${formatRational(left)} → 100 ${MINUS} ${formatRational(left)} = ${formatRational(answer)}%`,
      }),
    ],
  };
}

interface ExtraContext {
  action: string;
  normal: string;
  unit: string;
}

export const EXTRA_CONTEXTS: Readonly<Record<string, ExtraContext>> = {
  shampoo: { action: 'actiefles shampoo', normal: 'gewone fles', unit: 'ml' },
  koffie: { action: 'actiepak koffie', normal: 'gewoon pak', unit: 'g' },
  chips: { action: 'actiezak chips', normal: 'gewone zak', unit: 'g' },
};

/** The percentage whose share of the action content is easy to find. */
function stepPercentage(percentage: number): number {
  return percentage === 20 ? 10 : percentage;
}

/** `Een actiefles shampoo bevat 20% extra: 360 ml. Hoeveel ml zit er in een gewone fles?` */
export function extraQuestion(context: string, percentage: number, normal: number): Question {
  const { action, normal: normalNoun, unit } = EXTRA_CONTEXTS[context]!;
  const actionContent = (normal * (100 + percentage)) / 100;
  const step = stepPercentage(percentage);
  const stepValue = rational(BigInt(actionContent * step), BigInt(100 + percentage));
  return {
    key: `percentProblems:extra:${context}:${percentage}:${normal}`,
    topic: 'percentProblems',
    steps: [
      numberStep({
        prompt: `Een ${action} bevat ${percentage}% extra: ${formatInteger(actionContent)} ${unit}. Hoeveel ${unit} zit er in een ${normalNoun}?`,
        answer: fromInteger(normal),
        suffix: unit,
        explanation: `${100 + percentage}% = ${formatInteger(actionContent)} → ${step}% = ${formatRational(stepValue)} → 100% = ${formatInteger(normal)}`,
      }),
    ],
  };
}

export type PermilleGrowthVariant = 'growth' | 'after';

/** `Een gemeente heeft 550 000 inwoners en groeit in een jaar met 2‰. Met hoeveel inwoners groeit ze?` */
export function permilleGrowthQuestion(
  variant: PermilleGrowthVariant,
  population: number,
  permille: number,
): Question {
  const onePermille = formatRational(rational(BigInt(population), 1000n));
  const growth = (population * permille) / 1000;
  const answer = variant === 'growth' ? growth : population + growth;
  const question =
    variant === 'growth' ? 'Met hoeveel inwoners groeit ze?' : 'Hoeveel inwoners heeft ze na een jaar?';
  const calculation = `1‰ = ${formatInteger(population)} : 1000 = ${onePermille} → ${permille}‰ = ${formatInteger(growth)}`;
  return {
    key: `percentProblems:permille:${variant}:${population}:${permille}`,
    topic: 'percentProblems',
    steps: [
      numberStep({
        prompt: `Een gemeente heeft ${formatInteger(population)} inwoners en groeit in een jaar met ${permille}‰. ${question}`,
        answer: fromInteger(answer),
        suffix: 'inwoners',
        explanation:
          variant === 'growth'
            ? calculation
            : `${calculation} → ${formatInteger(population)} + ${formatInteger(growth)} = ${formatInteger(answer)}`,
      }),
    ],
  };
}

function randomStacked(rng: Rng): Question {
  if (rng() < 0.7) {
    const [price, first, second] = drawUntil(() => {
      const draw = [pick(rng, PRICES), pick(rng, PERCENTAGES), pick(rng, PERCENTAGES)] as const;
      return hasAtMostDecimals(afterChanges(draw[0], -draw[1], -draw[2]), 2) ? draw : null;
    });
    return stackedQuestion('discounts', price, first, second);
  }
  const [price, percentage] = drawUntil(() => {
    const draw = [pick(rng, PRICES), pick(rng, PERCENTAGES)] as const;
    return hasAtMostDecimals(afterChanges(draw[0], draw[1], -draw[1]), 2) ? draw : null;
  });
  return stackedQuestion('upDown', price, percentage, percentage);
}

function randomTotal(rng: Rng): Question {
  return totalQuestion(pick(rng, PERCENTAGES), pick(rng, PERCENTAGES));
}

function randomExtra(rng: Rng): Question {
  const context = pick(rng, Object.keys(EXTRA_CONTEXTS));
  const [percentage, normal] = drawUntil(() => {
    const draw = [pick(rng, PERCENTAGES), pick(rng, CONTENTS)] as const;
    return (draw[1] * (100 + draw[0])) % 100 === 0 ? draw : null;
  });
  return extraQuestion(context, percentage, normal);
}

function randomPermille(rng: Rng): Question {
  const [population, permille] = drawUntil(() => {
    const draw = [pick(rng, POPULATIONS), pick(rng, PERMILLES)] as const;
    return (draw[0] * draw[1]) % 1000 === 0 ? draw : null;
  });
  return permilleGrowthQuestion(rng() < 0.5 ? 'growth' : 'after', population, permille);
}

export function generatePercentProblems(rng: Rng): Question {
  switch (pick(rng, FORMS)) {
    case 'stacked':
      return randomStacked(rng);
    case 'total':
      return randomTotal(rng);
    case 'extra':
      return randomExtra(rng);
    case 'permille':
      return randomPermille(rng);
  }
}
