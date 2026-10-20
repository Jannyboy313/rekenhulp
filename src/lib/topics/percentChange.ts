import { formatEuro, formatInteger, MINUS } from '../format';
import { pick, type Rng } from '../random';
import {
  divide,
  equals,
  fromInteger,
  HUNDRED,
  isInteger,
  multiply,
  type Rational,
} from '../rational';
import { fractionStep } from '../steps';
import type { Diagnose } from '../tips';
import type { Question } from '../types';
import {
  DISCOUNT_PERCENTAGES,
  NICE_WHOLES,
  partExplanation,
  percentLabel,
  percentOf,
  PERCENTAGES,
  type Percentage,
} from './percentages';

export type ChangeContext = 'price' | 'inhabitants' | 'visitors';
const CONTEXTS: readonly ChangeContext[] = ['price', 'inhabitants', 'visitors'];

type PercentChangeForm = 'change';
const FORMS: readonly PercentChangeForm[] = ['change'];

export function generatePercentChange(rng: Rng): Question {
  switch (pick(rng, FORMS)) {
    case 'change':
      return generateChange(rng);
  }
}

/** `part` as a percentage of `whole`, exactly. */
function asPercentOf(part: Rational, whole: Rational): Rational {
  return divide(multiply(part, HUNDRED), whole);
}

/** The percentage of the list (spec §5.12) that takes the old value to the new one. */
function percentageOfChange(oldValue: number, newValue: number): Percentage {
  const change = fromInteger(Math.abs(newValue - oldValue));
  const percent = asPercentOf(change, fromInteger(oldValue));
  const found = PERCENTAGES.find(({ value }) => equals(value, percent));
  if (found === undefined) {
    throw new RangeError(`${oldValue} to ${newValue} is not a supported percentage change`);
  }
  return found;
}

/** 'Een prijs gaat van € 80 naar € 92'. */
function describeChange(context: ChangeContext, oldValue: number, newValue: number): string {
  const [from, to] = [formatInteger(oldValue), formatInteger(newValue)];
  const euro = (value: number) => formatEuro(fromInteger(value));
  switch (context) {
    case 'price':
      return `Een prijs gaat van ${euro(oldValue)} naar ${euro(newValue)}`;
    case 'inhabitants':
      return `Een dorp gaat van ${from} naar ${to} inwoners`;
    case 'visitors':
      return `Een museum gaat van ${from} naar ${to} bezoekers per dag`;
  }
}

/** One exercise of the form: `Een prijs gaat van € 80 naar € 92. Hoeveel procent stijging?` */
export function changeQuestion(
  context: ChangeContext,
  oldValue: number,
  newValue: number,
): Question {
  if (!(oldValue > 0 && newValue > 0)) throw new RangeError('Both values must be positive');
  const p = percentageOfChange(oldValue, newValue);
  const noun = newValue > oldValue ? 'stijging' : 'daling';
  return {
    key: `percentChange:change:${context}:${oldValue}:${newValue}`,
    topic: 'percentChange',
    steps: [
      fractionStep({
        prompt: `${describeChange(context, oldValue, newValue)}. Hoeveel procent ${noun}?`,
        answer: p.value,
        suffix: '%',
        explanation: percentageChangeExplanation(oldValue, newValue),
        diagnose: percentageChangeTip(oldValue, newValue),
      }),
    ],
  };
}

/**
 * The change itself, the new value as a percentage of the old, or the change relative to the new
 * value (spec §3.4.1). Both values are positive and differ by a supported percentage.
 */
export function percentageChangeTip(oldValue: number, newValue: number): Diagnose {
  const increase = newValue > oldValue;
  const noun = increase ? 'stijging' : 'daling';
  const [old, now] = [fromInteger(oldValue), fromInteger(newValue)];
  const change = fromInteger(Math.abs(newValue - oldValue));
  const newAsPercent = asPercentOf(now, old);
  const changeAsPercentOfNew = asPercentOf(change, now);
  const [oldText, newText] = [formatInteger(oldValue), formatInteger(newValue)];
  return (given) => {
    if (equals(given, change)) {
      return `Dat is de ${noun} zelf; reken uit hoeveel procent van ${oldText} dat is.`;
    }
    if (equals(given, newAsPercent)) {
      const shown = percentLabel(newAsPercent);
      const calculation = increase ? `${shown} ${MINUS} 100%` : `100% ${MINUS} ${shown}`;
      const answer = percentLabel(asPercentOf(change, old));
      return `Dat is ${newText} als percentage van ${oldText}; de ${noun} is ${calculation} = ${answer}.`;
    }
    if (equals(given, changeAsPercentOfNew)) {
      return `Reken met de oude waarde: de ${noun} is een percentage van ${oldText}, niet van ${newText}.`;
    }
    return undefined;
  };
}

/** '92 − 80 = 12 → 10% = 8, 5% = 4 → 15% = 12' (partExplanation of §5.12 on the old value). */
export function percentageChangeExplanation(oldValue: number, newValue: number): string {
  const larger = Math.max(oldValue, newValue);
  const smaller = Math.min(oldValue, newValue);
  const difference = `${formatInteger(larger)} ${MINUS} ${formatInteger(smaller)}`;
  const strategy = partExplanation(percentageOfChange(oldValue, newValue), fromInteger(oldValue));
  return `${difference} = ${formatInteger(larger - smaller)} → ${strategy}`;
}

/** Old values for which p% is a whole number, so the new value is a whole number too. */
function wholesWithWholePart(p: Percentage): number[] {
  return NICE_WHOLES.filter((whole) => isInteger(percentOf(p.value, fromInteger(whole))));
}

/** `Een prijs gaat van € 80 naar € 92. Hoeveel procent stijging?` */
function generateChange(rng: Rng): Question {
  const increase = rng() < 0.5;
  const context = pick(rng, CONTEXTS);
  const p = pick(rng, increase ? PERCENTAGES : DISCOUNT_PERCENTAGES);
  const oldValue = pick(rng, wholesWithWholePart(p));
  const change = Number(percentOf(p.value, fromInteger(oldValue)).num);
  return changeQuestion(context, oldValue, increase ? oldValue + change : oldValue - change);
}
