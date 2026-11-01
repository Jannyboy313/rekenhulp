import { formatEuro, formatInteger as f, formatMoney, formatRational } from '../format';
import { notRound, pick, randomInt, randomIntWhere, type Rng } from '../random';
import { fromInteger, rational, type Rational } from '../rational';
import { SLOT } from '../slot';
import { numberStep } from '../steps';
import type { Question } from '../types';

// Smart calculation, deeper (spec §5.66).
export const STRATEGIES = ['factorOut', 'decimalFactor', 'divideDecimal', 'money'] as const;
export type Strategy = (typeof STRATEGIES)[number];

/** n ± 1 is round: `a × 99 + a = a × 100`. */
export const FACTOR_OUT_NUMBERS = [9, 11, 99, 101, 999] as const;
export const SUMS = [100, 1000] as const;
export const MONEY_ENDINGS = [1, 2, 5] as const;
export const WHOLE_AMOUNTS = [10, 20, 50, 100] as const;

export interface DeepExercise {
  strategy: Strategy;
  /** Without ` = ?`. */
  prompt: string;
  /** The de-duplication key: the sum, factors in a fixed order (spec §5.66). */
  key: string;
  answer: Rational;
  explanation: string;
  money: boolean;
}

const decimal = (text: Rational) => formatRational(text);
const shuffled = <T>(rng: Rng, pair: readonly [T, T]): [T, T] =>
  rng() < 0.5 ? [pair[0], pair[1]] : [pair[1], pair[0]];
const cents = (value: number) => rational(BigInt(value), 100n);

function factorOut(rng: Rng): DeepExercise {
  const a = randomIntWhere(rng, 13, 99, notRound);
  if (rng() < 0.5) {
    // a × n ± a: the sign makes n ± 1 round.
    const n = pick(rng, FACTOR_OUT_NUMBERS);
    const plus = n === 9 || n === 99 || n === 999;
    const round = plus ? n + 1 : n - 1;
    const product = pick(rng, [`${a} × ${n}`, `${n} × ${a}`]);
    const answer = a * round;
    return {
      strategy: 'factorOut',
      prompt: plus ? pick(rng, [`${product} + ${a}`, `${a} + ${product}`]) : `${product} − ${a}`,
      key: `smartCalculationDeep:factorOut:${a}:${n}`,
      answer: fromInteger(answer),
      explanation: `${f(round)} × ${a} = ${f(answer)}`,
      money: false,
    };
  }
  // a × b + a × c with b + c = 100 or 1000.
  const total = pick(rng, SUMS);
  const b = randomIntWhere(rng, 11, total - 11, notRound);
  const c = total - b;
  const term = (x: number) => shuffled(rng, [`${a} × ${x}`, `${x} × ${a}`])[0];
  const [left, right] = shuffled(rng, [b, c]);
  const answer = a * total;
  return {
    strategy: 'factorOut',
    prompt: `${term(left)} + ${term(right)}`,
    key: `smartCalculationDeep:factorOut:${a}:${Math.min(b, c)}+${Math.max(b, c)}`,
    answer: fromInteger(answer),
    explanation: `${a} × ${f(total)} = ${f(answer)}`,
    money: false,
  };
}

function decimalFactor(rng: Rng): DeepExercise {
  const kind = pick(rng, ['quarter', 'twoAndAHalf', 'oneAndAQuarter'] as const);
  let factor: Rational;
  let other: Rational;
  let explanation: (other: string, answer: string) => string;
  if (kind === 'quarter') {
    factor = rational(1n, 4n);
    other = fromInteger(4 * randomInt(rng, 3, 50));
    explanation = (o, answer) => `${o} : 4 = ${answer}`;
  } else if (kind === 'twoAndAHalf') {
    // b is a multiple of 0,4 in [1,2; 12] with exactly 1 decimal.
    factor = rational(5n, 2n);
    other = rational(BigInt(4 * randomIntWhere(rng, 3, 30, (j) => j % 5 !== 0)), 10n);
    explanation = (o, answer) => `10 × ${o} : 4 = ${answer}`;
  } else {
    factor = rational(5n, 4n);
    other = fromInteger(8 * randomInt(rng, 2, 12));
    explanation = (o, answer) => `10 × ${o} : 8 = ${answer}`;
  }
  const answer = rational(factor.num * other.num, factor.den * other.den);
  const [first, second] = shuffled(rng, [decimal(factor), decimal(other)]);
  return {
    strategy: 'decimalFactor',
    prompt: `${first} × ${second}`,
    key: `smartCalculationDeep:decimalFactor:${kind}:${decimal(other)}`,
    answer,
    explanation: explanation(decimal(other), decimal(answer)),
    money: false,
  };
}

const DIVISORS = [
  { divisor: rational(1n, 2n), min: 11, max: 99, factor: 2 },
  { divisor: rational(1n, 4n), min: 3, max: 30, factor: 4 },
  { divisor: rational(1n, 5n), min: 3, max: 50, factor: 5 },
] as const;

function divideDecimal(rng: Rng): DeepExercise {
  const { divisor, min, max, factor } = pick(rng, DIVISORS);
  const a = randomInt(rng, min, max);
  return {
    strategy: 'divideDecimal',
    prompt: `${a} : ${decimal(divisor)}`,
    key: `smartCalculationDeep:divideDecimal:${a}:${decimal(divisor)}`,
    answer: fromInteger(a * factor),
    explanation: `${a} × ${factor} = ${a * factor}`,
    money: false,
  };
}

/** An amount ending in ,99 / ,98 / ,95 in cents, just below the whole euro `whole`. */
const justBelow = (whole: number, ending: number) => 100 * whole - ending;

function money(rng: Rng): DeepExercise {
  const ending = () => pick(rng, MONEY_ENDINGS);
  if (rng() < 0.5) {
    const [w1, w2] = [randomInt(rng, 2, 50), randomInt(rng, 2, 50)];
    const [e1, e2] = [ending(), ending()];
    const [x, y] = [justBelow(w1, e1), justBelow(w2, e2)];
    const deficit = e1 + e2;
    const answer = x + y;
    return {
      strategy: 'money',
      prompt: `${formatEuro(cents(x))} + ${formatEuro(cents(y))}`,
      key: `smartCalculationDeep:money:${x}+${y}`,
      answer: cents(answer),
      explanation: `${w1} + ${w2} − ${formatMoney(cents(deficit))} = ${formatMoney(cents(answer))}`,
      money: true,
    };
  }
  const whole = pick(rng, WHOLE_AMOUNTS);
  const w = randomInt(rng, 2, Math.min(50, whole - 1));
  const e = ending();
  const x = justBelow(w, e);
  const answer = 100 * whole - x;
  return {
    strategy: 'money',
    prompt: `${formatEuro(fromInteger(whole))} − ${formatEuro(cents(x))}`,
    key: `smartCalculationDeep:money:${whole}-${x}`,
    answer: cents(answer),
    explanation: `${whole} − ${w} + ${formatMoney(cents(e))} = ${formatMoney(cents(answer))}`,
    money: true,
  };
}

const BUILDERS: Record<Strategy, (rng: Rng) => DeepExercise> = {
  factorOut,
  decimalFactor,
  divideDecimal,
  money,
};

export function buildDeepExercise(rng: Rng, strategy: Strategy): DeepExercise {
  return BUILDERS[strategy](rng);
}

/** One of four strategies, each equally likely (spec §5.66). */
export function generateSmartCalculationDeep(rng: Rng): Question {
  const {
    prompt,
    key,
    answer,
    explanation,
    money: isMoney,
  } = buildDeepExercise(rng, pick(rng, STRATEGIES));
  return {
    key,
    topic: 'smartCalculationDeep',
    steps: [
      numberStep({
        prompt: `${prompt} = ${SLOT}`,
        answer,
        prefix: isMoney ? '€' : undefined,
        expected: isMoney ? formatMoney(answer) : undefined,
        explanation,
      }),
    ],
  };
}
