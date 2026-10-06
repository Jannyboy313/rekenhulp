import { parse, type Expr } from './expr/parser';
import { formatFraction, formatPrimeFactors, formatRational } from './format';
import { isPrime, primeFactors } from './primes';
import { decimalPlaces, equals, parseDutchNumber, parseFraction, type Rational } from './rational';
import type { AnswerKind, Step } from './types';

export interface NumberStepOptions {
  prompt: string;
  answer: Rational;
  prefix?: string;
  suffix?: string;
  /** Overrides the shown correct answer, e.g. '25,50' for money. */
  expected?: string;
  explanation?: string;
}

/** Turns keypad input into a value. A fraction step also accepts 'a/b' (spec §6). */
export function parseAnswer(kind: AnswerKind, input: string): Rational | null {
  return kind === 'fraction'
    ? (parseFraction(input) ?? parseDutchNumber(input))
    : parseDutchNumber(input);
}

export function numberStep(options: NumberStepOptions): Step {
  return exactStep('number', options, options.expected ?? formatRational(options.answer));
}

/** Any value equal to the answer is correct: '25/2', '50/4' and '12,5' alike. */
export function fractionStep(options: NumberStepOptions): Step {
  return exactStep('fraction', options, options.expected ?? formatFractionAnswer(options.answer));
}

/** '25', or both notations: '12,5 of 25/2'. Only the fraction when the decimal never ends. */
function formatFractionAnswer(answer: Rational): string {
  if (answer.den === 1n) return formatRational(answer);
  const fraction = formatFraction(answer);
  return decimalPlaces(answer) === null ? fraction : `${formatRational(answer)} of ${fraction}`;
}

function exactStep(
  kind: AnswerKind,
  { prompt, answer, prefix, suffix, explanation }: NumberStepOptions,
  expected: string,
): Step {
  return {
    kind,
    prompt,
    prefix,
    suffix,
    check(input) {
      const given = parseAnswer(kind, input);
      return { correct: given !== null && equals(given, answer), expected, explanation };
    },
  };
}

/** Labels of the two buttons of a boolean step; the tapped label is the input (spec §6). */
export const YES = 'Ja';
export const NO = 'Nee';

export interface BooleanStepOptions {
  prompt: string;
  answer: boolean;
  explanation?: string;
}

export function booleanStep({ prompt, answer, explanation }: BooleanStepOptions): Step {
  const expected = answer ? YES : NO;
  return {
    kind: 'boolean',
    prompt,
    check: (input) => ({ correct: input === expected, expected, explanation }),
  };
}

export interface Factor {
  base: bigint;
  exponent: bigint;
}

/** '2^2×3×7' → 2², 3, 7: integers joined by ×, each with an optional integer exponent. */
export function parseFactorization(input: string): Factor[] | null {
  const expr = parse(input);
  if (expr === null) return null;
  const factors: Factor[] = [];
  const integer = (node: Expr): bigint | null =>
    node.type === 'number' && node.value.den === 1n ? node.value.num : null;
  const collect = (node: Expr): boolean => {
    if (node.type === 'binary') {
      return node.operator === '×' && collect(node.left) && collect(node.right);
    }
    const base = integer(node.type === 'power' ? node.base : node);
    const exponent = node.type === 'power' ? integer(node.exponent) : 1n;
    if (base === null || exponent === null) return false;
    factors.push({ base, exponent });
    return true;
  };
  return collect(expr) ? factors : null;
}

export interface FactorizationStepOptions {
  prompt: string;
  value: number;
  explanation?: string;
}

/** Every base prime, every exponent ≥ 1, product = value; order and notation are free (§5.5). */
export function factorizationStep({ prompt, value, explanation }: FactorizationStepOptions): Step {
  const expected = formatPrimeFactors(primeFactors(value));
  return {
    kind: 'factorization',
    prompt,
    check(input) {
      const factors = parseFactorization(input);
      const correct = factors !== null && isPrimeFactorizationOf(factors, value);
      return { correct, expected, explanation };
    },
  };
}

function isPrimeFactorizationOf(factors: readonly Factor[], value: number): boolean {
  const target = BigInt(value);
  let product = 1n;
  for (const { base, exponent } of factors) {
    if (exponent < 1n || base > target || !isPrime(Number(base))) return false;
    // One factor at a time with an early exit, so a typed 2^99999999 costs nothing.
    for (let i = 0n; i < exponent; i++) {
      product *= base;
      if (product > target) return false;
    }
  }
  return product === target;
}
