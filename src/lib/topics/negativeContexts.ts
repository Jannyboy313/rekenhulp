import { formatEuro, formatInteger as f, formatRational, NO_BREAK_SPACE } from '../format';
import { drawUntil, pick, randomInt, type Rng } from '../random';
import { fromInteger, negate, rational, subtract, type Rational } from '../rational';
import { numberStep } from '../steps';
import type { Question } from '../types';
import { explainAddSubtract } from './negativeNumbers';

// Negative numbers in context (spec §5.69): money, height (NAP, lift) and temperature.
export const MONEY_ITEMS = ['fiets', 'telefoon', 'laptop'] as const;
export type MoneyItem = (typeof MONEY_ITEMS)[number];

export const LOW_POINTS = ['polder', 'meer'] as const;
export const HIGH_POINTS = ['duin', 'dijk', 'heuvel'] as const;
export type LowPoint = (typeof LOW_POINTS)[number];
export type HighPoint = (typeof HIGH_POINTS)[number];

const ARTICLES: Record<LowPoint | HighPoint, string> = {
  polder: 'de',
  meer: 'het',
  duin: 'het',
  dijk: 'de',
  heuvel: 'de',
};

const euro = (value: number) => formatEuro(fromInteger(value));
const degrees = (value: number) => `${f(value)}${NO_BREAK_SPACE}°C`;
const metres = (value: Rational) => `${formatRational(value)}${NO_BREAK_SPACE}m NAP`;

/** `Je hebt € 312 op je rekening en betaalt € 774. Hoeveel sta je in het rood?` */
export function inTheRedQuestion(balance: number, payment: number): Question {
  const shortage = payment - balance;
  return {
    key: `negativeContexts:money:rood:${balance}:${payment}`,
    topic: 'negativeContexts',
    steps: [
      numberStep({
        prompt: `Je hebt ${euro(balance)} op je rekening en betaalt ${euro(payment)}. Hoeveel sta je in het rood?`,
        answer: fromInteger(shortage),
        prefix: '€',
        explanation: `${f(payment)} − ${f(balance)} = ${f(shortage)} → ${euro(shortage)} in het rood`,
      }),
    ],
  };
}

/** `Je staat € 145 in het rood. Je krijgt € 400 salaris. Wat is je saldo nu?` */
export function balanceQuestion(minus: number, income: number): Question {
  const balance = income - minus;
  return {
    key: `negativeContexts:money:saldo:${minus}:${income}`,
    topic: 'negativeContexts',
    steps: [
      numberStep({
        prompt: `Je staat ${euro(minus)} in het rood. Je krijgt ${euro(income)} salaris. Wat is je saldo nu?`,
        answer: fromInteger(balance),
        prefix: '€',
        explanation: explainAddSubtract(-minus, true, income),
      }),
    ],
  };
}

/** `Je wilt een fiets van € 849 kopen en hebt € 387 gespaard. Hoeveel kom je te kort?` */
export function shortfallQuestion(item: MoneyItem, price: number, savings: number): Question {
  const shortfall = price - savings;
  return {
    key: `negativeContexts:money:kort:${item}:${price}:${savings}`,
    topic: 'negativeContexts',
    steps: [
      numberStep({
        prompt: `Je wilt een ${item} van ${euro(price)} kopen en hebt ${euro(savings)} gespaard. Hoeveel kom je te kort?`,
        answer: fromInteger(shortfall),
        prefix: '€',
        explanation: `${f(price)} − ${f(savings)} = ${f(shortfall)}`,
      }),
    ],
  };
}

/** `Een polder ligt op −4 m NAP, een duin op 23 m NAP. Hoeveel meter hoger ligt het duin?` */
export function heightDifferenceQuestion(
  low: Rational,
  lowName: LowPoint,
  highName: HighPoint,
  high: number,
): Question {
  const highValue = fromInteger(high);
  const difference = subtract(highValue, low);
  const depth = formatRational(negate(low));
  return {
    key: `negativeContexts:height:verschil:${lowName}:${highName}:${formatRational(low)}:${high}`,
    topic: 'negativeContexts',
    steps: [
      numberStep({
        prompt:
          `Een ${lowName} ligt op ${metres(low)}, een ${highName} op ${metres(highValue)}. ` +
          `Hoeveel meter hoger ligt ${ARTICLES[highName]} ${highName}?`,
        answer: difference,
        suffix: 'm',
        explanation:
          `${f(high)} − (${formatRational(low)}) = ${f(high)} + ${depth} = ` +
          formatRational(difference),
      }),
    ],
  };
}

/** `Een lift staat op verdieping −2 en gaat 7 verdiepingen omhoog.` (move > 0: omhoog) */
export function liftQuestion(start: number, move: number): Question {
  const end = start + move;
  return {
    key: `negativeContexts:height:lift:${start}:${move}`,
    topic: 'negativeContexts',
    steps: [
      numberStep({
        prompt:
          `Een lift staat op verdieping ${f(start)} en gaat ${Math.abs(move)} verdiepingen ` +
          `${move > 0 ? 'omhoog' : 'omlaag'}. Op welke verdieping stopt hij?`,
        answer: fromInteger(end),
        explanation: explainAddSubtract(start, move > 0, Math.abs(move)),
      }),
    ],
  };
}

/** `'s Ochtends is het −3 °C. Het wordt 9 graden warmer en 's avonds weer 11 graden kouder.` */
export function temperatureQuestion(start: number, first: number, second: number): Question {
  const afterFirst = start + first;
  const end = afterFirst + second;
  const change = (value: number) => `${Math.abs(value)} graden ${value > 0 ? 'warmer' : 'kouder'}`;
  const step = (from: number, by: number) => explainAddSubtract(from, by > 0, Math.abs(by));
  return {
    key: `negativeContexts:temperature:${start}:${first}:${second}`,
    topic: 'negativeContexts',
    steps: [
      numberStep({
        prompt:
          `'s Ochtends is het ${degrees(start)}. Het wordt ${change(first)} en 's avonds weer ` +
          `${change(second)}. Hoeveel graden is het dan?`,
        answer: fromInteger(end),
        suffix: '°C',
        explanation: `${step(start, first)} → ${step(afterFirst, second)}`,
      }),
    ],
  };
}

const withSign = (rng: Rng, value: number) => (rng() < 0.5 ? -value : value);

function inTheRed(rng: Rng): Question {
  const { balance, payment } = drawUntil(() => {
    const balance = randomInt(rng, 50, 900);
    const payment = randomInt(rng, Math.max(100, balance + 1), 999);
    // At least one borrow: the ones, or the tens after a borrowed ten, fall short.
    const onesBorrow = payment % 10 < balance % 10;
    const tensBorrow =
      Math.floor(payment / 10) % 10 < (Math.floor(balance / 10) % 10) + (onesBorrow ? 1 : 0);
    return onesBorrow || tensBorrow ? { balance, payment } : null;
  });
  return inTheRedQuestion(balance, payment);
}

function balance(rng: Rng): Question {
  const { minus, income } = drawUntil(() => {
    const minus = randomInt(rng, 20, 900);
    const income = randomInt(rng, 100, 2000);
    return income !== minus && (income <= 1000 || income % 10 === 0) ? { minus, income } : null;
  });
  return balanceQuestion(minus, income);
}

function shortfall(rng: Rng): Question {
  const price = randomInt(rng, 100, 999);
  return shortfallQuestion(pick(rng, MONEY_ITEMS), price, randomInt(rng, 20, price - 10));
}

function heightDifference(rng: Rng): Question {
  return heightDifferenceQuestion(
    rational(BigInt(-randomInt(rng, 10, 70)), 10n),
    pick(rng, LOW_POINTS),
    pick(rng, HIGH_POINTS),
    randomInt(rng, 5, 50),
  );
}

function lift(rng: Rng): Question {
  const { start, move } = drawUntil(() => {
    const start = randomInt(rng, -3, 10);
    const move = withSign(rng, randomInt(rng, 2, 12));
    const end = start + move;
    return end >= -3 && end <= 12 && (start < 0 || end < 0) ? { start, move } : null;
  });
  return liftQuestion(start, move);
}

function temperature(rng: Rng): Question {
  const { start, first, second } = drawUntil(() => {
    const start = randomInt(rng, -10, 10);
    const first = withSign(rng, randomInt(rng, 2, 15));
    const second = -Math.sign(first) * randomInt(rng, 2, 15);
    const values = [start, start + first, start + first + second];
    const crosses = (from: number, to: number) => from * to < 0;
    const valid =
      values.every((value) => value >= -15 && value <= 20) &&
      (crosses(values[0]!, values[1]!) || crosses(values[1]!, values[2]!));
    return valid ? { start, first, second } : null;
  });
  return temperatureQuestion(start, first, second);
}

function money(rng: Rng): Question {
  return pick(rng, [inTheRed, balance, shortfall])(rng);
}

function height(rng: Rng): Question {
  return pick(rng, [heightDifference, lift])(rng);
}

/** One of three forms, each equally likely (spec §5.69). */
export function generateNegativeContexts(rng: Rng): Question {
  return pick(rng, [money, height, temperature])(rng);
}
