import { formatEuro, formatInteger, formatMoney, MINUS } from '../format';
import { gcd } from '../primes';
import { pick, range, type Rng } from '../random';
import {
  add,
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
import { firstTip, moneyTip, type Diagnose } from '../tips';
import type { Question } from '../types';
import {
  DISCOUNT_PERCENTAGES,
  formatPercentage,
  hasAtMostTwoDecimals,
  INCREASE_PERCENTAGES,
  NICE_WHOLES,
  partExplanation,
  percentLabel,
  percentOf,
  PERCENTAGES,
  pickByIntegerShare,
  type Percentage,
} from './percentages';

export type ChangeContext = 'price' | 'inhabitants' | 'visitors';
const CONTEXTS: readonly ChangeContext[] = ['price', 'inhabitants', 'visitors'];

export type VatRate = 21 | 9;
const VAT_RATES: readonly VatRate[] = [21, 9];

/** 10, 20, …, 90, 100, 200, …, 900: one significant digit, so 1% stays easy to see. */
const ONE_DIGIT_PRICES: readonly number[] = [10, 100].flatMap((unit) =>
  range(1, 9).map((digit) => digit * unit),
);

const DISCOUNT_ITEMS = ['een jas', 'een fiets', 'een tent'] as const;
const INCREASE_ITEMS = ['een abonnement', 'een kaartje', 'een les'] as const;

type PercentChangeForm = 'change' | 'vat' | 'original';
const FORMS: readonly PercentChangeForm[] = ['change', 'vat', 'original'];

export function generatePercentChange(rng: Rng): Question {
  switch (pick(rng, FORMS)) {
    case 'change':
      return generateChange(rng);
    case 'vat':
      return generateVat(rng);
    case 'original':
      return generateOriginal(rng);
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

/** The price with VAT: without × (100 + rate) / 100. Whole cents for a whole price. */
function priceWithVat(rate: VatRate, withoutVat: Rational): Rational {
  return percentOf(fromInteger(100 + rate), withoutVat);
}

/** One exercise of the form: `€ 80 zonder btw. Met 21% btw = ?` or its reverse. */
export function vatQuestion(rate: VatRate, adding: boolean, withoutVat: number): Question {
  if (!Number.isSafeInteger(withoutVat) || withoutVat <= 0) {
    throw new RangeError('The price without VAT must be a positive whole number');
  }
  const without = fromInteger(withoutVat);
  const withVat = priceWithVat(rate, without);
  const answer = adding ? withVat : without;
  const prompt = adding
    ? `${formatEuro(without)} zonder btw. Met ${rate}% btw = ?`
    : `${formatEuro(withVat)} met ${rate}% btw. Zonder btw = ?`;
  return {
    key: `percentChange:vat:${adding ? 'add' : 'remove'}:${rate}:${withoutVat}`,
    topic: 'percentChange',
    steps: [
      numberStep({
        prompt,
        answer,
        prefix: '€',
        expected: formatMoney(answer),
        explanation: vatExplanation(rate, adding, withoutVat),
        diagnose: adding ? vatAddedTip(rate, withoutVat) : vatRemovedTip(rate, withoutVat),
      }),
    ],
  };
}

/** The VAT itself, answered instead of the price with VAT (spec §3.4.1). */
export function vatAddedTip(rate: VatRate, withoutVat: number): Diagnose {
  const vat = percentOf(fromInteger(rate), fromInteger(withoutVat));
  return moneyTip(vat, 'Dat is de btw zelf; tel die nog op bij de prijs.');
}

/**
 * The price with VAT minus the VAT rate of it (the rate is of the price without VAT), or the VAT
 * itself, answered instead of the price without VAT (spec §3.4.1).
 */
export function vatRemovedTip(rate: VatRate, withoutVat: number): Diagnose {
  const without = fromInteger(withoutVat);
  const withVat = priceWithVat(rate, without);
  const minusRate = subtract(withVat, percentOf(fromInteger(rate), withVat));
  const rateText = `De btw is ${rate}% van de prijs zonder btw.`;
  return firstTip(
    moneyTip(
      minusRate,
      `${rateText} ${formatEuro(withVat)} is ${100 + rate}%: reken terug naar 1%.`,
    ),
    moneyTip(subtract(withVat, without), 'Dat is de btw; gevraagd is de prijs zonder btw.'),
  );
}

/**
 * Adding: '10% = 80 : 10 = 8, 20% = 16, 1% = 0,80 → 21% = 16,80 → 80 + 16,80 = 96,80'.
 * Removing: '121% = 96,80 → 1% = 96,80 : 121 = 0,80 → 100% = 80'. Amounts as money.
 */
export function vatExplanation(rate: VatRate, adding: boolean, withoutVat: number): string {
  const without = fromInteger(withoutVat);
  const withVat = priceWithVat(rate, without);
  const money = (percent: number) => formatMoney(percentOf(fromInteger(percent), without));
  if (!adding) {
    const inclusive = 100 + rate;
    const shown = formatMoney(withVat);
    const oneStep = `1% = ${shown} : ${inclusive} = ${money(1)}`;
    return `${inclusive}% = ${shown} → ${oneStep} → 100% = ${formatMoney(without)}`;
  }
  const tenth = `10% = ${formatMoney(without)} : 10 = ${money(10)}`;
  const vat = money(rate);
  const sum = `${formatMoney(without)} + ${vat} = ${formatMoney(withVat)}`;
  if (rate === 21) {
    return `${tenth}, 20% = ${money(20)}, 1% = ${money(1)} → 21% = ${vat} → ${sum}`;
  }
  return `${tenth}, 1% = ${money(1)} → 9% = ${money(10)} ${MINUS} ${money(1)} = ${vat} → ${sum}`;
}

/** `€ 80 zonder btw. Met 21% btw = ?` or `€ 96,80 met 21% btw. Zonder btw = ?` */
function generateVat(rng: Rng): Question {
  const rate = pick(rng, VAT_RATES);
  const adding = rng() < 0.5;
  return vatQuestion(rate, adding, pick(rng, adding ? NICE_WHOLES : ONE_DIGIT_PRICES));
}

/** (100 plus p)% of the old price after an increase, (100 minus p)% after a discount. */
function newPercent(p: Percentage, increase: boolean): Rational {
  return increase ? add(HUNDRED, p.value) : subtract(HUNDRED, p.value);
}

/** The base b = gcd(100, p) of the explanation, with 12½ for p = 12½ (on doubled integers). */
function explanationBase(p: Percentage): Rational {
  const doubled = Number((p.value.num * 2n) / p.value.den);
  return rational(BigInt(gcd(200, doubled)), 2n);
}

/** The new price, or null when it or the base amount of the explanation is no whole cents. */
function newPriceOf(p: Percentage, increase: boolean, oldPrice: number): Rational | null {
  const old = fromInteger(oldPrice);
  const newPrice = percentOf(newPercent(p, increase), old);
  const baseAmount = percentOf(explanationBase(p), old);
  return hasAtMostTwoDecimals(newPrice) && hasAtMostTwoDecimals(baseAmount) ? newPrice : null;
}

/**
 * One exercise of the form: `Na 25% korting kost een jas € 60. Wat was de oude prijs?` The item
 * is part of the prompt only, not of the key.
 */
export function originalQuestion(
  p: Percentage,
  increase: boolean,
  oldPrice: number,
  item: string = increase ? INCREASE_ITEMS[0] : DISCOUNT_ITEMS[0],
): Question {
  const allowed = increase ? INCREASE_PERCENTAGES : DISCOUNT_PERCENTAGES;
  if (!allowed.some(({ value }) => equals(value, p.value))) {
    throw new RangeError(`${percentLabel(p.value)} is no ${increase ? 'increase' : 'discount'}`);
  }
  if (!Number.isSafeInteger(oldPrice) || oldPrice <= 0) {
    throw new RangeError('The old price must be a positive whole number');
  }
  const newPrice = newPriceOf(p, increase, oldPrice);
  if (newPrice === null) throw new RangeError(`${oldPrice} gives no whole number of cents`);
  const direction = increase ? 'increase' : 'discount';
  return {
    key: `percentChange:original:${direction}:${formatPercentage(p.value)}:${oldPrice}`,
    topic: 'percentChange',
    steps: [
      numberStep({
        prompt: `Na ${percentLabel(p.value)} ${increase ? 'verhoging' : 'korting'} kost ${item} ${formatEuro(newPrice)}. Wat was de oude prijs?`,
        answer: fromInteger(oldPrice),
        prefix: '€',
        expected: formatMoney(fromInteger(oldPrice)),
        explanation: originalExplanation(p, increase, oldPrice),
        diagnose: originalTip(p, increase, newPrice),
      }),
    ],
  };
}

/**
 * The percentage taken of the new price instead of the old (new plus p% of it after a discount,
 * minus after an increase), or the change applied once more in the same direction (spec §3.4.1).
 * `newPrice` is whole cents.
 */
export function originalTip(p: Percentage, increase: boolean, newPrice: Rational): Diagnose {
  const change = percentOf(p.value, newPrice);
  const plus = add(newPrice, change);
  const minus = subtract(newPrice, change);
  const euro = formatEuro(newPrice);
  const noun = increase ? 'verhoging' : 'korting';
  const ofNewPrice = `De ${noun} is ${percentLabel(p.value)} van de oude prijs, niet van ${euro}.`;
  const wrongWay = increase
    ? `Na een verhoging is de prijs hoger, dus de oude prijs is lager dan ${euro}.`
    : `Na korting is de prijs lager, dus de oude prijs is hoger dan ${euro}.`;
  return firstTip(
    moneyTip(
      increase ? minus : plus,
      `${ofNewPrice} ${euro} is ${percentLabel(newPercent(p, increase))} van de oude prijs.`,
    ),
    moneyTip(increase ? plus : minus, wrongWay),
  );
}

/**
 * Via the base b = gcd(100, p): '75% = 60 → 25% = 20 → 100% = 80'. The middle step is left out
 * when b is the new percentage itself: '50% = 30 → 100% = 60'.
 */
export function originalExplanation(p: Percentage, increase: boolean, oldPrice: number): string {
  const old = fromInteger(oldPrice);
  const percent = newPercent(p, increase);
  const base = explanationBase(p);
  const steps = [`${percentLabel(percent)} = ${formatMoney(percentOf(percent, old))}`];
  if (!equals(base, percent)) {
    steps.push(`${percentLabel(base)} = ${formatMoney(percentOf(base, old))}`);
  }
  steps.push(`100% = ${formatMoney(old)}`);
  return steps.join(' → ');
}

/** `Na 25% korting kost een jas € 60. Wat was de oude prijs?` */
function generateOriginal(rng: Rng): Question {
  const increase = rng() < 0.5;
  const p = pick(rng, increase ? INCREASE_PERCENTAGES : DISCOUNT_PERCENTAGES);
  const candidates = NICE_WHOLES.flatMap((oldPrice) => {
    const newPrice = newPriceOf(p, increase, oldPrice);
    return newPrice === null ? [] : [{ oldPrice, newPrice }];
  });
  const { oldPrice } = pickByIntegerShare(rng, candidates, ({ newPrice }) => newPrice);
  const item = pick(rng, increase ? INCREASE_ITEMS : DISCOUNT_ITEMS);
  return originalQuestion(p, increase, oldPrice, item);
}
