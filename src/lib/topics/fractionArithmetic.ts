import { formatFraction, formatInteger, formatMixedNumber } from '../format';
import { gcd } from '../primes';
import { pick, randomInt, randomIntWhere, type Rng } from '../random';
import { equals, fromInteger, multiply, rational, type Rational } from '../rational';
import { numberStep, simplestFractionStep } from '../steps';
import type { Diagnose } from '../tips';
import type { Question } from '../types';

// Fraction arithmetic (spec §5.21).
export const ARITHMETIC_FORMS = ['simplify', 'equivalent', 'part', 'whole'] as const;
export type ArithmeticForm = (typeof ARITHMETIC_FORMS)[number];

/** Equally likely groups; a group with two forms picks one of them (spec §5.21). */
export const ARITHMETIC_GROUPS: readonly (readonly ArithmeticForm[])[] = [
  ['simplify', 'equivalent'],
  ['part', 'whole'],
];

export const EQUIVALENT_VARIANTS = [
  'upNumerator',
  'upDenominator',
  'downNumerator',
  'downDenominator',
] as const;
export type EquivalentVariant = (typeof EQUIVALENT_VARIANTS)[number];

/** p/q in lowest terms with q ∈ [2, 12] and p < 2q that pass `accept`. */
function fractionsWhere(accept: (p: number, q: number) => boolean): Rational[] {
  const result: Rational[] = [];
  for (let q = 2; q <= 12; q++) {
    for (let p = 1; p < 2 * q; p++) {
      if (gcd(p, q) === 1 && accept(p, q)) result.push(rational(BigInt(p), BigInt(q)));
    }
  }
  return result;
}

/** Proper fractions: p/q in lowest terms with 0 < p < q and q ∈ [2, 12]. */
export const PROPER_FRACTIONS: readonly Rational[] = fractionsWhere((p, q) => p < q);
/** Improper answers of simplify: q < p < 2q. */
export const IMPROPER_FRACTIONS: readonly Rational[] = fractionsWhere((p, q) => p > q);

const EQUIVALENT_TIP =
  'Vermenigvuldig of deel teller en noemer met hetzelfde getal; het verschil blijft niet gelijk.';

/** 'a/b' from two terms. */
function terms(num: bigint, den: bigint): string {
  return `${formatInteger(num)}/${formatInteger(den)}`;
}

/** `Vereenvoudig 18/24`: the answer with both terms multiplied by k. */
export function simplifyQuestion(answer: Rational, k: number): Question {
  const factor = BigInt(k);
  const shown = terms(answer.num * factor, answer.den * factor);
  const result =
    answer.num > answer.den
      ? `${formatFraction(answer)} = ${formatMixedNumber(answer)}`
      : formatFraction(answer);
  return {
    key: `fractionArithmetic:simplify:${shown}`,
    topic: 'fractionArithmetic',
    steps: [
      simplestFractionStep({
        prompt: `Vereenvoudig ${shown}`,
        answer,
        decimalAllowed: false,
        explanation: `${shown} = ${result} (teller en noemer : ${k})`,
      }),
    ],
  };
}

/**
 * `3/4 = ?/12` (up) or `9/12 = ?/4` (down): the small fraction is `base`, the large one has both
 * terms × k. The unknown is the numerator or the denominator of the right-hand fraction.
 */
export function equivalentQuestion(
  base: Rational,
  k: number,
  variant: EquivalentVariant,
): Question {
  const factor = BigInt(k);
  const small = [base.num, base.den] as const;
  const large = [base.num * factor, base.den * factor] as const;
  const up = variant === 'upNumerator' || variant === 'upDenominator';
  const known = up ? small : large;
  const other = up ? large : small;
  const unknownNumerator = variant === 'upNumerator' || variant === 'downNumerator';
  const answer = unknownNumerator ? other[0] : other[1];
  const left = terms(known[0], known[1]);
  const right = unknownNumerator
    ? `?/${formatInteger(other[1])}`
    : `${formatInteger(other[0])}/?`;
  // The additive mistake keeps the difference: 3/4 = ?/12 → 3 + (12 − 4) = 11.
  const additive = unknownNumerator
    ? known[0] + (other[1] - known[1])
    : known[1] + (other[0] - known[0]);
  const diagnose: Diagnose = (given) =>
    additive > 0n && equals(given, rational(additive)) ? EQUIVALENT_TIP : undefined;
  return {
    key: `fractionArithmetic:equivalent:${variant}:${formatFraction(base)}:${k}`,
    topic: 'fractionArithmetic',
    steps: [
      numberStep({
        prompt: `${left} = ${right}`,
        answer: rational(answer),
        explanation: `${left} = ${terms(other[0], other[1])} (teller en noemer ${up ? '×' : ':'} ${k})`,
        diagnose,
      }),
    ],
  };
}

/** `3/4 van 24 = ?`: the whole is q × m. */
export function partQuestion(fraction: Rational, m: number): Question {
  const p = Number(fraction.num);
  const q = Number(fraction.den);
  const whole = q * m;
  const answer = p * m;
  const shown = formatFraction(fraction);
  const unit = `1/${q}`;
  const onePart = `${unit} van ${whole} = ${whole} : ${q} = ${m}`;
  const correctWay = p === 1 ? `${whole} : ${q}` : `${whole} : ${q} × ${p}`;
  const diagnose: Diagnose = (given) => {
    if (p > 1 && equals(given, fromInteger(m))) {
      return `Dat is ${unit} van ${whole}; ${shown} is ${p} keer zoveel.`;
    }
    if (equals(given, rational(BigInt(whole * q), BigInt(p)))) {
      return `Je hebt gedeeld; ${shown} van ${whole} is ${correctWay}.`;
    }
    return undefined;
  };
  return {
    key: `fractionArithmetic:part:${shown}:${whole}`,
    topic: 'fractionArithmetic',
    steps: [
      numberStep({
        prompt: `${shown} van ${whole} = ?`,
        answer: fromInteger(answer),
        explanation: p === 1 ? onePart : `${onePart} → ${shown} = ${p} × ${m} = ${answer}`,
        diagnose,
      }),
    ],
  };
}

/** `3/4 is 18. Hoeveel is het geheel?`: the part is p × m, the whole q × m. */
export function wholeQuestion(fraction: Rational, m: number): Question {
  const p = Number(fraction.num);
  const q = Number(fraction.den);
  const part = p * m;
  const whole = q * m;
  const shown = formatFraction(fraction);
  const unit = `1/${q}`;
  const toWhole = `${q}/${q} = ${q} × ${m} = ${whole}`;
  const diagnose: Diagnose = (given) => {
    if (equals(given, multiply(fraction, fromInteger(part)))) {
      return (
        `Je hebt ${shown} van ${part} berekend, maar ${part} is zelf al ${shown}. ` +
        'Reken terug naar het geheel.'
      );
    }
    if (p > 1 && equals(given, fromInteger(m))) return `Dat is ${unit}; het geheel is ${q}/${q}.`;
    return undefined;
  };
  return {
    key: `fractionArithmetic:whole:${shown}:${part}`,
    topic: 'fractionArithmetic',
    steps: [
      numberStep({
        prompt: `${shown} is ${part}. Hoeveel is het geheel?`,
        answer: fromInteger(whole),
        explanation:
          p === 1
            ? `${unit} = ${m} → ${toWhole}`
            : `${shown} = ${part} → ${unit} = ${part} : ${p} = ${m} → ${toWhole}`,
        diagnose,
      }),
    ],
  };
}

function simplify(rng: Rng): Question {
  const answer = rng() < 0.8 ? pick(rng, PROPER_FRACTIONS) : pick(rng, IMPROPER_FRACTIONS);
  const k = randomIntWhere(
    rng,
    2,
    10,
    (candidate) => candidate * Number(answer.num) <= 100 && candidate * Number(answer.den) <= 100,
  );
  return simplifyQuestion(answer, k);
}

function equivalent(rng: Rng): Question {
  const base = pick(rng, PROPER_FRACTIONS);
  const k = randomIntWhere(rng, 2, 10, (candidate) => candidate * Number(base.den) <= 100);
  return equivalentQuestion(base, k, pick(rng, EQUIVALENT_VARIANTS));
}

function part(rng: Rng): Question {
  return partQuestion(pick(rng, PROPER_FRACTIONS), randomInt(rng, 2, 12));
}

function whole(rng: Rng): Question {
  return wholeQuestion(pick(rng, PROPER_FRACTIONS), randomInt(rng, 2, 12));
}

const BUILDERS: Record<ArithmeticForm, (rng: Rng) => Question> = {
  simplify,
  equivalent,
  part,
  whole,
};

/** One question of the given form. */
export function buildFractionArithmetic(rng: Rng, form: ArithmeticForm): Question {
  return BUILDERS[form](rng);
}

/** A group, each equally likely, then one of its forms (spec §5.21). */
export function generateFractionArithmetic(rng: Rng): Question {
  return buildFractionArithmetic(rng, pick(rng, pick(rng, ARITHMETIC_GROUPS)));
}
