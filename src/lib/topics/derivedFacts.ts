import { formatInteger as f, formatRational } from '../format';
import { notRound, pick, randomInt, randomIntWhere, type Rng } from '../random';
import { fromInteger, rational, type Rational } from '../rational';
import { SLOT } from '../slot';
import { numberStep } from '../steps';
import type { Question } from '../types';

// Derived facts (spec §5.64).
export const DERIVATIONS = ['oneMoreLess', 'inverse', 'doubleHalve', 'factorOfTen'] as const;
export type Derivation = (typeof DERIVATIONS)[number];

export const MAX_PRODUCT = 5000;

interface Variant {
  /** The asked sum without the answer: `37 × 25`. */
  asked: string;
  answer: Rational;
  explanation: string;
}

export interface DerivedFact extends Variant {
  a: number;
  b: number;
  derivation: Derivation;
  /** Index of the variant within the derivation. */
  variant: number;
}

/** The variants of each derivation for the fact a × b = p. */
export function variantsOf(a: number, b: number): Record<Derivation, Variant[]> {
  const p = a * b;
  const whole = (asked: string, steps: string, answer: number): Variant => ({
    asked,
    answer: fromInteger(answer),
    explanation: `${asked} = ${steps} = ${f(answer)}`,
  });
  const oneMoreLess: Variant[] = [
    whole(`${a} × ${b + 1}`, `${a} × ${b} + ${a} = ${f(p)} + ${a}`, p + a),
    whole(`${a} × ${b - 1}`, `${a} × ${b} − ${a} = ${f(p)} − ${a}`, p - a),
    whole(`${a + 1} × ${b}`, `${a} × ${b} + ${b} = ${f(p)} + ${b}`, p + b),
    whole(`${a - 1} × ${b}`, `${a} × ${b} − ${b} = ${f(p)} − ${b}`, p - b),
  ];
  const inverse = (divisor: number, quotient: number): Variant => ({
    asked: `${f(p)} : ${divisor}`,
    answer: fromInteger(quotient),
    explanation: `${f(p)} : ${divisor} = ${quotient}, want ${a} × ${b} = ${f(p)}`,
  });
  const doubleHalve: Variant[] = [
    whole(`${2 * a} × ${b}`, `2 × ${f(p)}`, 2 * p),
    ...(b % 2 === 0
      ? [
          whole(`${a} × ${b / 2}`, `${f(p)} : 2`, p / 2),
          whole(`${2 * a} × ${b / 2}`, `${a} × 2 × ${b} : 2`, p),
        ]
      : []),
  ];
  const tenth = formatRational(rational(BigInt(p), 10n));
  const factorOfTen: Variant[] = [
    whole(`${f(10 * a)} × ${b}`, `${f(p)} × 10`, 10 * p),
    {
      asked: `${formatRational(rational(BigInt(a), 10n))} × ${b}`,
      answer: rational(BigInt(p), 10n),
      explanation: `${formatRational(rational(BigInt(a), 10n))} × ${b} = ${f(p)} : 10 = ${tenth}`,
    },
    whole(`${f(10 * p)} : ${b}`, `${f(p)} × 10 : ${b} = ${a} × 10`, 10 * a),
  ];
  return {
    oneMoreLess,
    inverse: [inverse(b, a), inverse(a, b)],
    doubleHalve,
    factorOfTen,
  };
}

/** `a ∈ [13, 99]`, `b ∈ [12, 49]`, neither a multiple of 10, product at most 5000. */
export function drawDerivedFact(rng: Rng): DerivedFact {
  const derivation = pick(rng, DERIVATIONS);
  const a = randomIntWhere(rng, 13, 99, notRound);
  const b = randomIntWhere(rng, 12, Math.min(49, Math.floor(MAX_PRODUCT / a)), notRound);
  const variants = variantsOf(a, b)[derivation];
  const variant = randomInt(rng, 0, variants.length - 1);
  return { a, b, derivation, variant, ...variants[variant]! };
}

export function generateDerivedFacts(rng: Rng): Question {
  const { a, b, derivation, variant, asked, answer, explanation } = drawDerivedFact(rng);
  return {
    key: `derivedFacts:${a} × ${b}:${derivation}:${variant}`,
    topic: 'derivedFacts',
    steps: [
      numberStep({
        prompt: `${a} × ${b} = ${f(a * b)}. Hoeveel is ${asked} = ${SLOT}`,
        answer,
        explanation,
      }),
    ],
  };
}
