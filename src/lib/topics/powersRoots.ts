import {
  formatInteger as f,
  formatPowerOfTen,
  formatRational,
  toSuperscript,
  UNKNOWN_EXPONENT,
} from '../format';
import { pick, randomInt, randomIntWhere, range, type Rng } from '../random';
import {
  divide,
  equals,
  fromInteger,
  multiply,
  negate,
  power,
  powerOfTen,
  rational,
  type Rational,
} from '../rational';
import { numberStep } from '../steps';
import { powerOfTenShift, type Diagnose } from '../tips';
import type { Question } from '../types';

// Powers and roots (spec §5.18). Squares of whole numbers 2 to 25 stay in `squares` (§5.7).
export const POWER_FORMS = ['wholePower', 'decimalPower', 'negativeExponent', 'root'] as const;
export type PowerForm = (typeof POWER_FORMS)[number];

type Pair = readonly [base: number, exponent: number];

function pairs(base: number, from: number, to: number): Pair[] {
  return range(from, to).map((exponent) => [base, exponent] as const);
}

/** Positive bases with exponent ≥ 3: 23 pairs, drawn uniformly. */
export const POSITIVE_POWERS: readonly Pair[] = [
  ...pairs(2, 3, 10),
  ...pairs(3, 3, 5),
  ...pairs(4, 3, 4),
  ...pairs(5, 3, 4),
  ...pairs(6, 3, 3),
  ...pairs(7, 3, 3),
  ...pairs(8, 3, 3),
  ...pairs(9, 3, 3),
  ...pairs(10, 3, 6),
];

/** Bases b of (−b)ⁿ with bⁿ ≤ 125: 10 pairs, from (−2)² to (−5)³. */
export const NEGATIVE_POWERS: readonly Pair[] = [
  ...pairs(2, 2, 4),
  ...pairs(3, 2, 4),
  ...pairs(4, 2, 3),
  ...pairs(5, 2, 3),
];

export const POSITIVE_SHARE = 0.7;
export const NEGATIVE_SHARE = 0.2;
/** The remaining 10% has exponent 0 or 1, with a base from 2 to this. */
export const MAX_SMALL_EXPONENT_BASE = 20;

type DecimalPair = readonly [base: Rational, exponent: number];

const digits = range(1, 9);

/** The three equally likely groups of decimal powers (spec §5.18). */
export const DECIMAL_POWERS: readonly (readonly DecimalPair[])[] = [
  digits.flatMap((k): DecimalPair[] => [
    [rational(BigInt(k), 10n), 2],
    [rational(BigInt(k), 10n), 3],
  ]),
  digits.map((k): DecimalPair => [rational(BigInt(k), 100n), 2]),
  [11n, 12n, 15n, 25n, 35n].map((k): DecimalPair => [rational(k, 10n), 2]),
];

/** A base as a factor: a negative one in parentheses (§5.8). */
function factorText(base: Rational): string {
  const text = formatRational(base);
  return base.num < 0n ? `(${text})` : text;
}

function powerText(base: Rational, exponent: number): string {
  return `${factorText(base)}${toSuperscript(exponent)}`;
}

function repeated(base: Rational, exponent: number): string {
  return Array.from({ length: exponent }, () => factorText(base)).join(' × ');
}

/** `2⁵ = 2 × 2 × 2 × 2 × 2 = 32`, `7⁰ = 1: …`, `7¹ = 7` (spec §5.18). */
export function explainPower(base: Rational, exponent: number): string {
  const shown = powerText(base, exponent);
  if (exponent === 0) return `${shown} = 1: elk getal (behalve 0) tot de macht 0 is 1`;
  if (exponent === 1) return `${shown} = ${formatRational(base)}`;
  return `${shown} = ${repeated(base, exponent)} = ${formatRational(power(base, exponent))}`;
}

/** Exponent 0 as 0, a wrong sign with a negative base, then base × exponent (spec §3.4.1). */
function wholePowerTip(base: Rational, exponent: number): Diagnose {
  const answer = power(base, exponent);
  const shown = powerText(base, exponent);
  return (given) => {
    if (exponent === 0 && equals(given, fromInteger(0))) {
      return 'Elk getal (behalve 0) tot de macht 0 is 1.';
    }
    if (base.num < 0n && equals(given, negate(answer))) {
      const parity =
        exponent % 2 === 0
          ? 'een even aantal mintekens geeft plus'
          : 'een oneven aantal mintekens geeft min';
      return `${shown} = ${repeated(base, exponent)}: ${parity}.`;
    }
    if (exponent >= 2 && equals(given, multiply(base, fromInteger(exponent)))) {
      return (
        `Een macht is herhaald vermenigvuldigen: ${shown} = ${repeated(base, exponent)}, ` +
        `niet ${factorText(base)} × ${exponent}.`
      );
    }
    return undefined;
  };
}

/** Too few decimals: the answer 10ᵏ times too large (spec §3.4.1). */
function decimalPowerTip(base: Rational, exponent: number): Diagnose {
  const answer = power(base, exponent);
  const together = exponent === 2 ? 'beide getallen samen' : 'alle getallen samen';
  const tip =
    `${repeated(base, exponent)} = ${formatRational(answer)}: ` +
    `de uitkomst heeft evenveel decimalen als ${together}.`;
  return (given) => {
    const shift = powerOfTenShift(given, answer);
    return shift !== null && shift > 0 ? tip : undefined;
  };
}

function powerQuestion(base: Rational, exponent: number, diagnose: Diagnose): Question {
  const prompt = powerText(base, exponent);
  return {
    key: `powersRoots:${prompt}`,
    topic: 'powersRoots',
    steps: [
      numberStep({
        prompt: `${prompt} = ?`,
        answer: power(base, exponent),
        explanation: explainPower(base, exponent),
        diagnose,
      }),
    ],
  };
}

/** `2⁵ = ?`, `(−3)³ = ?` or `7⁰ = ?` */
export function wholePowerQuestion(base: number, exponent: number): Question {
  const value = fromInteger(base);
  return powerQuestion(value, exponent, wholePowerTip(value, exponent));
}

/** `0,3² = ?` */
export function decimalPowerQuestion(base: Rational, exponent: number): Question {
  return powerQuestion(base, exponent, decimalPowerTip(base, exponent));
}

/** `10⁻³ = ?`, or asking the exponent: `0,001 = 10ⁿ. n = ?` */
export function negativeExponentQuestion(n: number, askExponent: boolean): Question {
  const value = powerOfTen(-n);
  const shown = formatRational(value);
  const negativePower = formatPowerOfTen(-n);
  const division = `1 : ${f(10 ** n)}`;
  if (!askExponent) {
    return {
      key: `powersRoots:${negativePower}`,
      topic: 'powersRoots',
      steps: [
        numberStep({
          prompt: `${negativePower} = ?`,
          answer: value,
          explanation: `${negativePower} = 1 : ${formatPowerOfTen(n)} = ${division} = ${shown}`,
          diagnose: (given) =>
            equals(given, negate(powerOfTen(n)))
              ? `Een negatieve exponent maakt geen negatief getal: ${negativePower} = ${division}.`
              : undefined,
        }),
      ],
    };
  }
  return {
    key: `powersRoots:${shown} = 10${UNKNOWN_EXPONENT}`,
    topic: 'powersRoots',
    steps: [
      numberStep({
        prompt: `${shown} = 10${UNKNOWN_EXPONENT}. n = ?`,
        answer: fromInteger(-n),
        explanation: `${shown} = ${division} = 1 : ${formatPowerOfTen(n)} = ${negativePower}`,
        // The answer is an exponent: a factor-of-ten tip would be meaningless (as in §5.14).
        noPowerOfTenTip: true,
        diagnose: (given) => {
          if (equals(given, fromInteger(n))) {
            return 'Een getal kleiner dan 1 heeft een negatieve exponent.';
          }
          if (equals(given, fromInteger(1 - n))) {
            return (
              'Tel de plaatsen waarover de komma schuift: ' +
              `${shown} = ${division} = ${negativePower}.`
            );
          }
          return undefined;
        },
      }),
    ],
  };
}

/** `∛64 = ?` */
export function cubeRootQuestion(n: number): Question {
  const cube = f(n ** 3);
  return {
    key: `powersRoots:∛${cube}`,
    topic: 'powersRoots',
    steps: [
      numberStep({
        prompt: `∛${cube} = ?`,
        answer: fromInteger(n),
        explanation: `∛${cube} = ${n}, want ${n} × ${n} × ${n} = ${cube}`,
        diagnose: (given) =>
          equals(given, divide(fromInteger(n ** 3), fromInteger(3)))
            ? `∛${cube} is het getal dat 3 keer met zichzelf vermenigvuldigd ${cube} geeft, ` +
              `niet ${cube} : 3.`
            : undefined,
      }),
    ],
  };
}

/** `√0,49 = ?` or `√6400 = ?`: the root of a scaled square. */
export function squareRootQuestion(root: Rational): Question {
  const square = formatRational(power(root, 2));
  const shown = formatRational(root);
  return {
    key: `powersRoots:√${square}`,
    topic: 'powersRoots',
    steps: [
      numberStep({
        prompt: `√${square} = ?`,
        answer: root,
        explanation: `√${square} = ${shown}, want ${shown} × ${shown} = ${square}`,
      }),
    ],
  };
}

function wholePower(rng: Rng): Question {
  const draw = rng();
  if (draw < POSITIVE_SHARE) {
    const [base, exponent] = pick(rng, POSITIVE_POWERS);
    return wholePowerQuestion(base, exponent);
  }
  if (draw < POSITIVE_SHARE + NEGATIVE_SHARE) {
    const [base, exponent] = pick(rng, NEGATIVE_POWERS);
    return wholePowerQuestion(-base, exponent);
  }
  return wholePowerQuestion(randomInt(rng, 2, MAX_SMALL_EXPONENT_BASE), randomInt(rng, 0, 1));
}

function decimalPower(rng: Rng): Question {
  const [base, exponent] = pick(rng, pick(rng, DECIMAL_POWERS));
  return decimalPowerQuestion(base, exponent);
}

function negativeExponent(rng: Rng): Question {
  return negativeExponentQuestion(randomInt(rng, 1, 6), rng() < 0.5);
}

function root(rng: Rng): Question {
  if (rng() < 0.5) return cubeRootQuestion(randomInt(rng, 2, 10));
  const k = randomIntWhere(rng, 2, 15, (value) => value !== 10);
  return squareRootQuestion(rng() < 0.5 ? rational(BigInt(k), 10n) : fromInteger(k * 10));
}

const BUILDERS: Record<PowerForm, (rng: Rng) => Question> = {
  wholePower,
  decimalPower,
  negativeExponent,
  root,
};

/** One question of the given form. */
export function buildPowersRoots(rng: Rng, form: PowerForm): Question {
  return BUILDERS[form](rng);
}

/** One of four forms, each equally likely (spec §5.18). */
export function generatePowersRoots(rng: Rng): Question {
  return buildPowersRoots(rng, pick(rng, POWER_FORMS));
}
