import { formatFraction, formatInteger, formatMixedNumber, MINUS } from '../format';
import { gcd, lcm } from '../primes';
import { drawUntil, pick, randomInt, randomIntWhere, type Rng } from '../random';
import {
  add,
  compare,
  equals,
  fromInteger,
  isInteger,
  multiply,
  rational,
  subtract,
  type Rational,
} from '../rational';
import { numberStep, simplestFractionStep } from '../steps';
import type { Diagnose } from '../tips';
import type { Question } from '../types';

// Fraction arithmetic (spec §5.21).
export const ARITHMETIC_FORMS = [
  'simplify',
  'equivalent',
  'addSubtract',
  'multiplyDivide',
  'part',
  'whole',
] as const;
export type ArithmeticForm = (typeof ARITHMETIC_FORMS)[number];

/** Four equally likely groups; a group with two forms picks one of them (spec §5.21). */
const ARITHMETIC_GROUPS: readonly (readonly ArithmeticForm[])[] = [
  ['simplify', 'equivalent'],
  ['addSubtract'],
  ['multiplyDivide'],
  ['part', 'whole'],
];

export const EQUIVALENT_VARIANTS = [
  'upNumerator',
  'upDenominator',
  'downNumerator',
  'downDenominator',
] as const;
type EquivalentVariant = (typeof EQUIVALENT_VARIANTS)[number];

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

/** 18/12 → ['18/12', '3/2', '1 1/2']; 12/3 → ['12/3', '4']; 12/1 → ['12']; 3/4 → ['3/4']. */
function simplifySteps(num: bigint, den: bigint): string[] {
  if (den === 1n) return [formatInteger(num)];
  const value = rational(num, den);
  const steps = [terms(num, den)];
  if (isInteger(value)) return [...steps, formatInteger(value.num)];
  if (value.den !== den) steps.push(formatFraction(value));
  if (value.num > value.den) steps.push(formatMixedNumber(value));
  return steps;
}

/** A term of a sum: a proper fraction, written as a mixed number when `whole` > 0. */
export interface Term {
  whole: number;
  fraction: Rational;
}

function termValue({ whole, fraction }: Term): Rational {
  return add(fromInteger(whole), fraction);
}

/** '8/12', or '2 8/12' when there is a whole part. */
function mixedTerms(whole: number, num: bigint, den: bigint): string {
  return whole === 0 ? terms(num, den) : `${formatInteger(whole)} ${terms(num, den)}`;
}

function formatTerm({ whole, fraction }: Term): string {
  return mixedTerms(whole, fraction.num, fraction.den);
}

/**
 * `2/3 + 1/4 = ?` or `3 1/2 − 1 3/4 = ?`. Both terms are mixed numbers or neither is; a
 * subtraction has a positive result.
 */
export function addSubtractQuestion(left: Term, right: Term, subtracting: boolean): Question {
  const a = left.fraction;
  const b = right.fraction;
  const common = BigInt(lcm(Number(a.den), Number(b.den)));
  const numA = (a.num * common) / a.den;
  const numB = (b.num * common) / b.den;
  const answer = subtracting
    ? subtract(termValue(left), termValue(right))
    : add(termValue(left), termValue(right));
  const operator = subtracting ? ` ${MINUS} ` : ' + ';
  const shown = formatTerm(left) + operator + formatTerm(right);
  const rightTerm = mixedTerms(right.whole, numB, common);
  const chain = [shown, mixedTerms(left.whole, numA, common) + operator + rightTerm];
  let wholeA = left.whole;
  let numLeft = numA;
  // Only mixed numbers can need this: without wholes, a subtraction has a > b.
  if (subtracting && numA < numB) {
    wholeA -= 1;
    numLeft += common;
    chain.push(mixedTerms(wholeA, numLeft, common) + operator + rightTerm);
  }
  const resultWhole = subtracting ? wholeA - right.whole : wholeA + right.whole;
  const resultNum = subtracting ? numLeft - numB : numLeft + numB;
  if (resultWhole === 0) {
    chain.push(...simplifySteps(resultNum, common));
  } else {
    const written = mixedTerms(resultWhole, resultNum, common);
    const simplest = formatMixedNumber(answer);
    chain.push(...(written === simplest ? [written] : [written, simplest]));
  }
  const diagnose: Diagnose = (given) => {
    if (left.whole === 0) {
      // Numerators and denominators added (or subtracted) separately: 2/3 + 1/4 → 3/7.
      const num = subtracting ? a.num - b.num : a.num + b.num;
      const den = subtracting ? a.den - b.den : a.den + b.den;
      if (num <= 0n || den <= 0n) return undefined;
      const wrong = rational(num, den);
      const then = subtracting
        ? 'trek daarna alleen de tellers af'
        : 'tel daarna alleen de tellers op';
      return !equals(wrong, answer) && equals(given, wrong)
        ? `Maak eerst de noemers gelijk; ${then}.`
        : undefined;
    }
    if (subtracting && compare(a, b) < 0) {
      // The fraction parts subtracted the wrong way round: 3 1/2 − 1 3/4 → 2 1/4.
      const swapped = add(fromInteger(left.whole - right.whole), subtract(b, a));
      if (equals(given, swapped)) {
        return (
          `Je kunt ${formatFraction(b)} niet van ${formatFraction(a)} aftrekken: wissel eerst ` +
          `1 geheel om, ${formatTerm(left)} = ${mixedTerms(left.whole - 1, numA + common, common)}.`
        );
      }
    }
    return undefined;
  };
  return {
    key: `fractionArithmetic:addSubtract:${shown}`,
    topic: 'fractionArithmetic',
    steps: [
      simplestFractionStep({
        prompt: `${shown} = ?`,
        answer,
        decimalAllowed: true,
        explanation: chain.join(' = '),
        diagnose,
      }),
    ],
  };
}

/** '9/4', or '2' for a whole number: an inverse is shown as written, not as a mixed number. */
function formatPlain(value: Rational): string {
  return isInteger(value) ? formatInteger(value.num) : formatFraction(value);
}

/** `3/4 × 2/5 = ?`, `6 × 2/3 = ?`, `2/3 : 4/9 = ?`, `3/4 : 3 = ?` or `6 : 2/3 = ?`. */
export function multiplyDivideQuestion(x: Rational, y: Rational, dividing: boolean): Question {
  const shown = `${formatMixedNumber(x)} ${dividing ? ':' : '×'} ${formatMixedNumber(y)}`;
  const inverse = rational(y.den, y.num);
  const by = dividing ? inverse : y;
  const answer = multiply(x, by);
  const chain = [
    shown,
    ...(dividing ? [`${formatMixedNumber(x)} × ${formatPlain(inverse)}`] : []),
    ...simplifySteps(x.num * by.num, x.den * by.den),
  ];
  const diagnose: Diagnose = (given) => {
    if (!dividing) {
      // Both terms of the fraction times the whole number: 6 × 2/3 → 12/18 = 2/3.
      const wholeNumber = isInteger(x) ? x : isInteger(y) ? y : null;
      if (wholeNumber === null) return undefined;
      const fraction = wholeNumber === x ? y : x;
      if (!equals(given, fraction)) return undefined;
      const product = terms(wholeNumber.num * fraction.num, fraction.den);
      return `Alleen de teller gaat keer ${formatInteger(wholeNumber.num)}: ${shown} = ${product}.`;
    }
    if (equals(given, multiply(x, y))) {
      return isInteger(y)
        ? `Delen door ${formatInteger(y.num)} is keer 1/${formatInteger(y.num)}.`
        : `Delen door ${formatFraction(y)} is keer het omgekeerde: × ${formatFraction(inverse)}.`;
    }
    if (!isInteger(x) && !isInteger(y) && equals(given, rational(answer.den, answer.num))) {
      return 'Draai de breuk om waardoor je deelt, niet de eerste.';
    }
    return undefined;
  };
  return {
    key: `fractionArithmetic:multiplyDivide:${shown}`,
    topic: 'fractionArithmetic',
    steps: [
      simplestFractionStep({
        prompt: `${shown} = ?`,
        answer,
        decimalAllowed: true,
        explanation: chain.join(' = '),
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

function addSubtract(rng: Rng): Question {
  return drawUntil(() => {
    const a = pick(rng, PROPER_FRACTIONS);
    const b = pick(rng, PROPER_FRACTIONS);
    if (a.den === b.den || lcm(Number(a.den), Number(b.den)) > 36) return null;
    const subtracting = rng() < 0.5;
    if (rng() < 0.3) {
      const first = randomInt(rng, subtracting ? 2 : 1, 5);
      const second = subtracting ? randomInt(rng, 1, first - 1) : randomInt(rng, 1, 5);
      return addSubtractQuestion(
        { whole: first, fraction: a },
        { whole: second, fraction: b },
        subtracting,
      );
    }
    // Separate variables: destructuring an array literal would give `Rational | undefined`.
    const swap = subtracting && compare(a, b) < 0;
    const x = swap ? b : a;
    const y = swap ? a : b;
    return addSubtractQuestion({ whole: 0, fraction: x }, { whole: 0, fraction: y }, subtracting);
  });
}

/**
 * Multiply (50%): two fractions (60%) or a whole number and a fraction (40%, either order).
 * Divide (50%): two different fractions (60%), fraction : whole (20%), whole : fraction (20%).
 */
function multiplyDivide(rng: Rng): Question {
  const x = pick(rng, PROPER_FRACTIONS);
  const n = fromInteger(randomInt(rng, 2, 12));
  if (rng() < 0.5) {
    if (rng() < 0.6) return multiplyDivideQuestion(x, pick(rng, PROPER_FRACTIONS), false);
    return rng() < 0.5 ? multiplyDivideQuestion(n, x, false) : multiplyDivideQuestion(x, n, false);
  }
  const roll = rng();
  if (roll < 0.6) {
    const y = drawUntil(() => {
      const candidate = pick(rng, PROPER_FRACTIONS);
      return equals(candidate, x) ? null : candidate;
    });
    return multiplyDivideQuestion(x, y, true);
  }
  return roll < 0.8 ? multiplyDivideQuestion(x, n, true) : multiplyDivideQuestion(n, x, true);
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
  addSubtract,
  multiplyDivide,
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
