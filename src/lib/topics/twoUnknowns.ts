import { formatEuro, formatMoney, MINUS } from '../format';
import { pick, randomInt, type Rng } from '../random';
import { fromInteger, rational } from '../rational';
import { numberStep } from '../steps';
import type { Question } from '../types';

// Two unknowns (spec §5.96). Money is kept in whole cents, so every value stays exact.

const FAMILIES = {
  vader: { old: 'vader', child: 'zoon', possessive: 'zijn' },
  moeder: { old: 'moeder', child: 'dochter', possessive: 'haar' },
} as const;

type Family = keyof typeof FAMILIES;

const cents = (value: number) => rational(BigInt(value), 100n);
const euros = (value: number) => formatEuro(fromInteger(value));

const COINS = {
  euro: { low: euros(1), lowCents: 100, high: euros(2), highCents: 200, each: `munt van ${euros(2)}` },
  cent: { low: '50 cent', lowCents: 50, high: euros(1), highCents: 100, each: 'euro' },
} as const;

type CoinPair = keyof typeof COINS;

function question(key: string, prompt: string, answer: number, explanation: string, suffix?: string): Question {
  return {
    key: `twoUnknowns:${key}`,
    topic: 'twoUnknowns',
    steps: [numberStep({ prompt, answer: fromInteger(answer), explanation, suffix })],
  };
}

/** Father/son or mother/daughter: `factor` times the younger age, `young` the smaller age. */
export function agesQuestion(family: Family, factor: number, young: number, askOld: boolean): Question {
  const { old, child, possessive } = FAMILIES[family];
  const sum = (factor + 1) * young;
  const oldAge = factor * young;
  const last = askOld
    ? `de ${old} is ${factor} × ${young} = ${oldAge} jaar`
    : `de ${child} is ${young} jaar`;
  return question(
    `ages:${family}:${factor}:${young}:${askOld ? 'old' : 'young'}`,
    `Een ${old} is ${factor} keer zo oud als ${possessive} ${child}. Samen zijn ze ${sum} jaar. Hoe oud is de ${askOld ? old : child}?`,
    askOld ? oldAge : young,
    `Schema maken: ${child} 1 deel, ${old} ${factor} delen → samen ${factor + 1} delen = ${sum} → 1 deel = ${young} → ${last}`,
    'jaar',
  );
}

/** `count` coins of two kinds, `high` of the higher kind; the total follows from them. */
export function coinsQuestion(pair: CoinPair, count: number, high: number, askHigh: boolean): Question {
  const { low, lowCents, high: highLabel, highCents, each } = COINS[pair];
  const diff = highCents - lowCents;
  const baseCents = count * lowCents;
  const totalCents = baseCents + high * diff;
  const shortCents = high * diff;
  const division = diff === 100 ? '' : `${formatMoney(cents(shortCents))} : ${formatMoney(cents(diff))} = `;
  const steps = [
    `stel dat alle ${count} munten ${low} zijn: ${count} × ${formatMoney(cents(lowCents))} = ${formatEuro(cents(baseCents))}`,
    `${formatMoney(cents(totalCents))} ${MINUS} ${formatMoney(cents(baseCents))} = ${formatEuro(cents(shortCents))} te weinig`,
    `elke ${each} is ${formatEuro(cents(diff))} meer: ${division}${high}`,
  ];
  if (!askHigh) steps.push(`${count} ${MINUS} ${high} = ${count - high}`);
  return question(
    `coins:${pair}:${count}:${high}:${askHigh ? 'high' : 'low'}`,
    `Je hebt ${count} munten van ${low} en ${highLabel}, samen ${formatEuro(cents(totalCents))}. Hoeveel munten van ${askHigh ? highLabel : low} heb je?`,
    askHigh ? high : count - high,
    `Slim proberen: ${steps.join(' → ')}`,
  );
}

/** Length `factor` times the width; the perimeter is given. */
export function timesQuestion(factor: number, width: number): Question {
  const length = factor * width;
  const half = length + width;
  return question(
    `rect:times:${factor}:${width}`,
    `Een rechthoek heeft een omtrek van ${2 * half} cm. De lengte is ${factor} keer de breedte. Hoe groot is de oppervlakte?`,
    length * width,
    `Schema maken: halve omtrek ${2 * half} : 2 = ${half} = lengte + breedte → ${factor} + 1 = ${factor + 1} delen → ${half} : ${factor + 1} = ${width} = breedte, lengte ${length} → ${length} × ${width} = ${length * width}`,
    'cm²',
  );
}

/** Length `extra` cm longer than the width; the perimeter is given. */
export function plusQuestion(extra: number, width: number): Question {
  const length = width + extra;
  const half = 2 * width + extra;
  return question(
    `rect:plus:${extra}:${width}`,
    `Een rechthoek heeft een omtrek van ${2 * half} cm. De lengte is ${extra} cm langer dan de breedte. Hoe groot is de oppervlakte?`,
    width * length,
    `Schema maken: halve omtrek ${2 * half} : 2 = ${half} = lengte + breedte → ${half} ${MINUS} ${extra} = ${2 * width} = 2 × breedte → ${2 * width} : 2 = ${width} = breedte, lengte ${length} → ${length} × ${width} = ${width * length}`,
    'cm²',
  );
}

function drawAges(rng: Rng): Question {
  const family = pick(rng, ['vader', 'moeder'] as const);
  const factor = pick(rng, [2, 3, 4, 5]);
  const young = randomInt(rng, 4, Math.min(20, Math.floor(90 / (factor + 1))));
  return agesQuestion(family, factor, young, rng() < 0.5);
}

function drawCoins(rng: Rng): Question {
  const pair = pick(rng, ['euro', 'cent'] as const);
  const count = randomInt(rng, 6, 15);
  return coinsQuestion(pair, count, randomInt(rng, 1, count - 1), rng() < 0.5);
}

function drawRectangle(rng: Rng): Question {
  if (rng() < 0.5) return timesQuestion(pick(rng, [2, 3]), randomInt(rng, 2, 12));
  return plusQuestion(randomInt(rng, 2, 8), randomInt(rng, 3, 15));
}

/** Ages, coins or rectangle, each 1/3. */
export function generateTwoUnknowns(rng: Rng): Question {
  return pick(rng, [drawAges, drawCoins, drawRectangle])(rng);
}
