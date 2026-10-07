import { parse, type Expr } from './expr/parser';
import { checkRewrite, type Property, type RewriteReason } from './expr/rewriteCheck';
import { formatFraction, formatInteger, formatPrimeFactors, formatRational } from './format';
import { isPrime, primeFactors } from './primes';
import {
  compare,
  decimalPlaces,
  equals,
  multiply,
  parseDutchNumber,
  parseFraction,
  parseMixedNumber,
  powerOfTen,
  rational,
  type Rational,
} from './rational';
import { powerOfTenTip, type Diagnose } from './tips';
import type { AnswerKind, Step } from './types';

export interface NumberStepOptions {
  prompt: string;
  answer: Rational;
  prefix?: string;
  suffix?: string;
  /** Overrides the shown correct answer, e.g. '25,50' for money. */
  expected?: string;
  explanation?: string;
  /** Names the likely mistake of a wrong answer (spec §3.4.1); tried before the fallback. */
  diagnose?: Diagnose;
  /** Skips the factor-of-ten fallback, e.g. when the answer is an exponent. */
  noPowerOfTenTip?: boolean;
}

/** Turns keypad input into a value. A fraction step also accepts 'a/b' and '12 1/2' (spec §6). */
export function parseAnswer(kind: AnswerKind, input: string): Rational | null {
  return kind === 'fraction'
    ? (parseFraction(input) ?? parseMixedNumber(input) ?? parseDutchNumber(input))
    : parseDutchNumber(input);
}

export function numberStep(options: NumberStepOptions): Step {
  return exactStep('number', options, options.expected ?? formatRational(options.answer));
}

/** Any value equal to the answer is correct: '25/2', '50/4', '12 1/2' and '12,5' alike. */
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
  { prompt, answer, prefix, suffix, explanation, diagnose, noPowerOfTenTip }: NumberStepOptions,
  expected: string,
): Step {
  return {
    kind,
    prompt,
    prefix,
    suffix,
    check(input) {
      const given = parseAnswer(kind, input);
      if (given !== null && equals(given, answer)) return { correct: true, expected, explanation };
      const tip =
        given === null
          ? undefined
          : (diagnose?.(given) ?? (noPowerOfTenTip ? undefined : powerOfTenTip(given, answer)));
      return { correct: false, expected, tip, explanation };
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
  // The parser also reads negative literals; factors must be non-negative integers.
  const integer = (node: Expr): bigint | null =>
    node.type === 'number' && node.value.den === 1n && node.value.num >= 0n
      ? node.value.num
      : null;
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
      const tip = correct || factors === null ? undefined : factorizationTip(factors, value);
      return { correct, expected, tip, explanation };
    },
  };
}

function isPrimeFactorizationOf(factors: readonly Factor[], value: number): boolean {
  const target = BigInt(value);
  // base > target first, so isPrime never runs on a huge typed number.
  const allPrime = factors.every(
    ({ base, exponent }) => exponent >= 1n && base <= target && isPrime(Number(base)),
  );
  return allPrime && boundedProduct(factors, target) === target;
}

/**
 * The product of the factors, or null as soon as it exceeds `limit`. Cheap for any exponent:
 * bases 0 and 1 are settled without looping, and any other base exceeds the limit quickly.
 */
function boundedProduct(factors: readonly Factor[], limit: bigint): bigint | null {
  let product = 1n;
  for (const { base, exponent } of factors) {
    if (exponent === 0n || base === 1n) continue;
    if (base === 0n) return 0n;
    for (let i = 0n; i < exponent; i++) {
      product *= base;
      if (product > limit) return null;
    }
  }
  return product;
}

/** Products up to this are shown exactly; larger ones, e.g. 2^99999999, only as "groter dan". */
const PRODUCT_LIMIT = 1_000_000n;

/** Spec §3.4.1: a factor 1, a composite factor, or primes with another product. */
export function factorizationTip(factors: readonly Factor[], value: number): string | undefined {
  const target = BigInt(value);
  if (factors.some(({ base }) => base === 1n)) return '1 is geen priemgetal: laat het weg.';
  const composite = factors.find(
    ({ base }) => base > 1n && base <= PRODUCT_LIMIT && !isPrime(Number(base)),
  );
  if (composite) return `${formatInteger(composite.base)} is geen priemgetal: ontbind het verder.`;
  // "groter dan" must stay true for a target above the limit too.
  const product = boundedProduct(factors, target > PRODUCT_LIMIT ? target : PRODUCT_LIMIT);
  const shown = formatInteger(value);
  if (product === null) return `Het product van je factoren is groter dan ${shown}.`;
  if (product !== target) {
    return `Het product van je factoren is ${formatInteger(product)}, niet ${shown}.`;
  }
  return undefined;
}

/** Dutch reasons of spec §5.11; a valid step with another property gets the topic's own hint. */
export const REWRITE_MESSAGES: Record<Exclude<RewriteReason, 'otherProperty'>, string> = {
  valueOnly: 'Schrijf een som op, niet alleen de uitkomst.',
  unchanged: 'Er is niets veranderd.',
  valueChanged: 'Deze stap verandert de uitkomst.',
  noProperty: 'Hier is nog geen eigenschap toegepast.',
  multipleSteps: 'Dit zijn meerdere stappen: pas één eigenschap per keer toe.',
  notForMinusOrDivide: 'Deze eigenschap geldt niet voor − en :.',
};

export interface RewriteStepOptions {
  prompt: string;
  /** The expression to rewrite. */
  original: Expr;
  property: Property;
  /** A valid rewrite with `property`, shown as the correct answer. */
  example: string;
  /**
   * The explanation for a valid step with another property, e.g. a hint at the useful one.
   * Gets the first detected property, in PROPERTIES order.
   */
  otherProperty: (detected: Property) => string;
}

/** Step 1 of a property exercise: one valid application of `property` (spec §5.11, §7.1). */
export function rewriteStep({
  prompt,
  original,
  property,
  example,
  otherProperty,
}: RewriteStepOptions): Step {
  return {
    kind: 'expression',
    prompt,
    check(input) {
      const rewritten = parse(input);
      // Validation keeps unparsable input away; should it get here, it is simply wrong.
      if (rewritten === null) return { correct: false, expected: example };
      const result = checkRewrite(original, rewritten, property);
      if (result.valid) return { correct: true, expected: example };
      const explanation =
        result.reason === 'otherProperty'
          ? otherProperty(result.detected[0])
          : REWRITE_MESSAGES[result.reason];
      return { correct: false, expected: example, explanation };
    },
  };
}

/** A scientific answer (spec §5.19): c × 10ⁿ, or a plain number when `exponent` is null. */
export interface ScientificInput {
  coefficient: Rational;
  exponent: number | null;
}

// An optional coefficient and ×, then 10, ^ and an integer exponent: '4,5×10^-3', '10^6'.
const SCIENTIFIC = /^(?:([\d,]+)×)?10\^([-−]?\d+)$/;

/**
 * '4,5×10^6', '10^6' (c = 1) or a plain number such as '4500000'. Null for anything else, e.g.
 * an unfinished power or another base than 10 (spec §6).
 */
export function parseScientific(input: string): ScientificInput | null {
  const match = SCIENTIFIC.exec(input.trim());
  if (match === null) {
    const plain = parseDutchNumber(input);
    return plain === null ? null : { coefficient: plain, exponent: null };
  }
  const [, coefficientText, exponentText = ''] = match;
  const coefficient =
    coefficientText === undefined ? rational(1n) : parseDutchNumber(coefficientText);
  if (coefficient === null) return null;
  return { coefficient, exponent: Number(exponentText.replace('−', '-')) };
}

export function scientificValue({ coefficient, exponent }: ScientificInput): Rational {
  return exponent === null ? coefficient : multiply(coefficient, powerOfTen(exponent));
}

const ONE = rational(1n);
const TEN = rational(10n);

/** c × 10ⁿ with 1 ≤ c < 10; a plain number is never normalised. */
export function isNormalised({ coefficient, exponent }: ScientificInput): boolean {
  return exponent !== null && compare(coefficient, ONE) >= 0 && compare(coefficient, TEN) < 0;
}
