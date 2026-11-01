import {
  formatInteger as f,
  formatLiteral,
  formatRational,
  formatScientific,
  toSuperscript as sup,
  UNKNOWN_EXPONENT,
} from '../format';
import { drawUntil, pick, randomInt, range, type Rng } from '../random';
import { SLOT } from '../slot';
import { fromInteger, multiply, powerOfTen, rational } from '../rational';
import { numberStep, scientificStep } from '../steps';
import type { Question } from '../types';
import { NEGATIVE_POWERS, POSITIVE_POWERS } from './powersRoots';

// Calculating with powers (spec §5.72): rules, roots and sums of powers, scientific notation.
export type RuleKind = 'product' | 'quotient' | 'power';

const BASES = [2, 3, 5, 10] as const;
const MAX_RULE_EXPONENT = 12;
const NEGATIVE_BASE_SHARE = 0.2;
const MAX_SCIENTIFIC_EXPONENT = 15;
const MAX_TIMES = 10 ** 7;
/** Positive pairs of §5.18 with bases 2 to 9 and a value of at most 1000. */
const SUM_POWERS = POSITIVE_POWERS.filter(([base, exponent]) => base <= 9 && base ** exponent <= 1000);

/** `2³ × 2⁴ = 2ⁿ. n = ?`, `2⁶ : 2² = 2ⁿ. n = ?` or `(3²)³ = 3ⁿ. n = ?` */
export function powerRuleQuestion(kind: RuleKind, a: number, m: number, n: number): Question {
  const power = (exponent: number) => `${a}${sup(exponent)}`;
  const [left, rule, result] = {
    product: [`${power(m)} × ${power(n)}`, `${sup(m)}⁺${sup(n)}`, m + n],
    quotient: [`${power(m)} : ${power(n)}`, `${sup(m)}⁻${sup(n)}`, m - n],
    power: [`(${power(m)})${sup(n)}`, `${sup(m)}ˣ${sup(n)}`, m * n],
  }[kind] as [string, string, number];
  return {
    key: `powerCalc:rules:${kind}:${a}:${m}:${n}`,
    topic: 'powerCalc',
    steps: [
      numberStep({
        prompt: `${left} = ${a}${UNKNOWN_EXPONENT}. n = ${SLOT}`,
        answer: fromInteger(result),
        explanation: `${left} = ${a}${rule} = ${power(result)}`,
        // The answer is an exponent: a factor-of-ten tip would be meaningless (as in §5.18).
        noPowerOfTenTip: true,
      }),
    ],
  };
}

/** `√(36 × 25) = ?` for two squares. */
export function rootQuestion(p: number, q: number): Question {
  const [s, t] = [Math.sqrt(p), Math.sqrt(q)];
  return {
    key: `powerCalc:combined:root:${Math.min(p, q)}:${Math.max(p, q)}`,
    topic: 'powerCalc',
    steps: [
      numberStep({
        prompt: `√(${p} × ${q}) = ${SLOT}`,
        answer: fromInteger(s * t),
        explanation: `√(${p} × ${q}) = √${p} × √${q} = ${s} × ${t} = ${s * t}`,
      }),
    ],
  };
}

/** `2⁵ − 3³ = ?` or `(−2)³ + 5³ = ?`; a base is negative for a negative pair of §5.18. */
export function powerSumQuestion(
  a: number,
  m: number,
  operator: '+' | '−',
  b: number,
  n: number,
): Question {
  const text = (base: number, exponent: number) =>
    `${base < 0 ? `(${f(base)})` : f(base)}${sup(exponent)}`;
  const [first, second] = [a ** m, b ** n];
  const answer = operator === '+' ? first + second : first - second;
  const sum = `${text(a, m)} ${operator} ${text(b, n)}`;
  return {
    key: `powerCalc:combined:sum:${a}:${m}:${operator}:${b}:${n}`,
    topic: 'powerCalc',
    steps: [
      numberStep({
        prompt: `${sum} = ${SLOT}`,
        answer: fromInteger(answer),
        explanation: `${sum} = ${f(first)} ${operator} ${formatLiteral(second)} = ${f(answer)}`,
      }),
    ],
  };
}

const scientific = (coefficient: number, exponent: number) =>
  formatScientific(fromInteger(coefficient), exponent);
const tenPower = (exponent: number) => `10${sup(exponent)}`;

/** `(3 × 10⁴) × (5 × 10³) = ?`, answered normalised: `1,5 × 10⁸`. */
export function scientificProductQuestion(c1: number, m: number, c2: number, n: number): Question {
  const product = c1 * c2;
  const normalised = product >= 10;
  const coefficient = normalised ? rational(BigInt(product), 10n) : fromInteger(product);
  const exponent = m + n + (normalised ? 1 : 0);
  return {
    key: `powerCalc:scientific:product:${c1}:${m}:${c2}:${n}`,
    topic: 'powerCalc',
    steps: [
      scientificStep({
        prompt: `(${scientific(c1, m)}) × (${scientific(c2, n)}) = ${SLOT}`,
        coefficient,
        exponent,
        explanation:
          `${c1} × ${c2} = ${product} en ${tenPower(m)} × ${tenPower(n)} = ${tenPower(m + n)} → ` +
          `${product} × ${tenPower(m + n)}` +
          (normalised ? ` = ${formatScientific(coefficient, exponent)}` : ''),
      }),
    ],
  };
}

function quotientExplanation(c1: number, m: number, c2: number, n: number, result: string): string {
  return (
    `${c1} : ${c2} = ${c1 / c2} en ${tenPower(m)} : ${tenPower(n)} = ${tenPower(m - n)} → ` +
    result
  );
}

/** `(6 × 10⁸) : (2 × 10⁵) = ?`, answered normalised: `3 × 10³`. */
export function scientificQuotientQuestion(c1: number, m: number, c2: number, n: number): Question {
  const coefficient = fromInteger(c1 / c2);
  return {
    key: `powerCalc:scientific:quotient:${c1}:${m}:${c2}:${n}`,
    topic: 'powerCalc',
    steps: [
      scientificStep({
        prompt: `(${scientific(c1, m)}) : (${scientific(c2, n)}) = ${SLOT}`,
        coefficient,
        exponent: m - n,
        explanation: quotientExplanation(c1, m, c2, n, formatScientific(coefficient, m - n)),
      }),
    ],
  };
}

/** `Hoeveel keer zo groot is 6 × 10⁸ als 2 × 10⁵?`, a number answer: `3000`. */
export function scientificTimesQuestion(c1: number, m: number, c2: number, n: number): Question {
  const answer = multiply(fromInteger(c1 / c2), powerOfTen(m - n));
  return {
    key: `powerCalc:scientific:times:${c1}:${m}:${c2}:${n}`,
    topic: 'powerCalc',
    steps: [
      numberStep({
        prompt: `Hoeveel keer zo groot is ${scientific(c1, m)} als ${scientific(c2, n)}?`,
        answer,
        explanation: quotientExplanation(c1, m, c2, n, formatRational(answer)),
      }),
    ],
  };
}

function rules(rng: Rng): Question {
  const kind = pick(rng, ['product', 'quotient', 'power'] as const);
  const a = pick(rng, BASES);
  const { m, n } = drawUntil(() => {
    const [m, n] = [randomInt(rng, 2, 6), randomInt(rng, 2, 6)];
    const valid = {
      product: m + n <= MAX_RULE_EXPONENT,
      quotient: m > n,
      power: m * n <= MAX_RULE_EXPONENT,
    }[kind];
    return valid ? { m, n } : null;
  });
  return powerRuleQuestion(kind, a, m, n);
}

function root(rng: Rng): Question {
  const { s, t } = drawUntil(() => {
    const [s, t] = [randomInt(rng, 2, 10), randomInt(rng, 2, 10)];
    return s !== t ? { s, t } : null;
  });
  return rootQuestion(s * s, t * t);
}

const negate = ([base, exponent]: readonly [number, number]): [number, number] => [-base, exponent];

function powerSum(rng: Rng): Question {
  const negative = rng() < NEGATIVE_BASE_SHARE ? randomInt(rng, 0, 1) : null;
  return drawUntil(() => {
    const [a, m] = negative === 0 ? negate(pick(rng, NEGATIVE_POWERS)) : pick(rng, SUM_POWERS);
    const [b, n] = negative === 1 ? negate(pick(rng, NEGATIVE_POWERS)) : pick(rng, SUM_POWERS);
    const operator = pick(rng, ['+', '−'] as const);
    const answer = operator === '+' ? a ** m + b ** n : a ** m - b ** n;
    return Math.abs(a) !== Math.abs(b) && answer !== 0
      ? powerSumQuestion(a, m, operator, b, n)
      : null;
  });
}

function combined(rng: Rng): Question {
  return pick(rng, [root, powerSum])(rng);
}

function scientificForm(rng: Rng): Question {
  const variant = pick(rng, ['product', 'quotient', 'times'] as const);
  if (variant === 'product') {
    const { c1, m, c2, n } = drawUntil(() => {
      const [c1, c2] = [randomInt(rng, 1, 9), randomInt(rng, 1, 9)];
      const [m, n] = [randomInt(rng, 2, 9), randomInt(rng, 2, 9)];
      const exponent = m + n + (c1 * c2 >= 10 ? 1 : 0);
      return exponent <= MAX_SCIENTIFIC_EXPONENT ? { c1, m, c2, n } : null;
    });
    return scientificProductQuestion(c1, m, c2, n);
  }
  const c1 = randomInt(rng, 2, 9);
  const c2 = pick(rng, range(1, c1).filter((divisor) => c1 % divisor === 0));
  const { m, n } = drawUntil(() => {
    const n = randomInt(rng, 2, 8);
    const m = randomInt(rng, n + 1, 9);
    const fits = variant === 'quotient' || (c1 / c2) * 10 ** (m - n) <= MAX_TIMES;
    return fits ? { m, n } : null;
  });
  return variant === 'quotient'
    ? scientificQuotientQuestion(c1, m, c2, n)
    : scientificTimesQuestion(c1, m, c2, n);
}

/** One of three forms, each equally likely (spec §5.72). */
export function generatePowerCalc(rng: Rng): Question {
  return pick(rng, [rules, combined, scientificForm])(rng);
}
