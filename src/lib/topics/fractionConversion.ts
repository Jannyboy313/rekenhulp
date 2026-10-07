import { formatFraction, formatInteger, formatMixedNumber, formatRational } from '../format';
import { gcd } from '../primes';
import { pick, randomIntWhere, type Rng } from '../random';
import {
  decimalPlaces,
  equals,
  fromInteger,
  multiply,
  parseDutchNumber,
  rational,
  type Rational,
} from '../rational';
import { fractionStep, numberStep, simplestFractionStep } from '../steps';
import type { Diagnose } from '../tips';
import type { Question, Step } from '../types';

// Fraction ↔ decimal ↔ percentage (spec §5.20).
export const CONVERSION_DIRECTIONS = [
  'fractionToDecimal',
  'decimalToFraction',
  'fractionToPercentage',
  'percentageToFraction',
  'decimalToPercentage',
  'percentageToDecimal',
] as const;
export type ConversionDirection = (typeof CONVERSION_DIRECTIONS)[number];

/** Denominators whose fractions have a finite decimal. */
export const TERMINATING_DENOMINATORS: readonly number[] = [2, 4, 5, 8, 10, 20, 25, 50];
/** Fraction ↔ percentage also uses thirds and sixths: 33 1/3%. */
export const PERCENTAGE_DENOMINATORS: readonly number[] = [2, 3, 4, 5, 6, 8, 10, 20, 25, 50];

const HUNDRED = fromInteger(100);
const TO_PERCENT_TIP = 'Procent betekent honderdste: vermenigvuldig met 100.';
const FROM_PERCENT_TIP = 'Procent betekent honderdste: deel door 100.';

function usesPercentageDenominators(direction: ConversionDirection): boolean {
  return direction === 'fractionToPercentage' || direction === 'percentageToFraction';
}

/** The tip when the answer equals `wrong` exactly. */
function tipFor(wrong: Rational, tip: string): Diagnose {
  return (given) => (equals(given, wrong) ? tip : undefined);
}

/** 37,5, or a mixed number for thirds and sixths: 33 1/3. Without the % sign. */
export function formatPercentNumber(fraction: Rational): string {
  const percent = multiply(fraction, HUNDRED);
  return decimalPlaces(percent) === null ? formatMixedNumber(percent) : formatRational(percent);
}

/** 3/8 → '375/1000'; null when the denominator is a power of ten already (7/10). */
function overPowerOfTen(fraction: Rational): string | null {
  const decimals = decimalPlaces(fraction);
  if (decimals === null) throw new RangeError('Value has no finite decimal representation');
  const power = 10n ** BigInt(decimals);
  if (power === fraction.den) return null;
  return `${formatInteger((fraction.num * power) / fraction.den)}/${formatInteger(power)}`;
}

/** ['3/8', '375/1000', '0,375'], or ['7/10', '0,7']. */
function decimalChain(fraction: Rational): string[] {
  const middle = overPowerOfTen(fraction);
  return [formatFraction(fraction), ...(middle === null ? [] : [middle]), formatRational(fraction)];
}

/** Thirds and sixths via 100%: '100% : 3 = 33 1/3%' for p = 1, '2 × 33 1/3%' otherwise. */
function viaHundredPercent(fraction: Rational): string {
  const unit = formatPercentNumber(rational(1n, fraction.den));
  return fraction.num === 1n ? `100% : ${fraction.den}` : `${fraction.num} × ${unit}%`;
}

/** 3/8 = 0,375 = 37,5%; 1/3 = 100% : 3 = 33 1/3%; 5/6 = 5 × 16 2/3% = 83 1/3%. */
function toPercentExplanation(fraction: Rational): string {
  const percent = `${formatPercentNumber(fraction)}%`;
  const via =
    decimalPlaces(fraction) === null ? viaHundredPercent(fraction) : formatRational(fraction);
  return `${formatFraction(fraction)} = ${via} = ${percent}`;
}

/** 37,5% = 0,375 = 375/1000 = 3/8; 33 1/3% = 100% : 3 = 1/3; 66 2/3% = 2 × 33 1/3% = 2/3. */
function fromPercentExplanation(fraction: Rational): string {
  const percent = `${formatPercentNumber(fraction)}%`;
  if (decimalPlaces(fraction) === null) {
    return `${percent} = ${viaHundredPercent(fraction)} = ${formatFraction(fraction)}`;
  }
  return [percent, ...decimalChain(fraction).reverse()].join(' = ');
}

function conversionStep(direction: ConversionDirection, fraction: Rational): Step {
  const shownFraction = formatFraction(fraction);
  // Lazy: thirds and sixths (percentage directions only) have no finite decimal.
  const shownDecimal = () => formatRational(fraction);
  const percentNumber = formatPercentNumber(fraction);
  const percent = multiply(fraction, HUNDRED);
  switch (direction) {
    case 'fractionToDecimal': {
      const p = formatInteger(fraction.num);
      const q = formatInteger(fraction.den);
      const sideBySide = parseDutchNumber(`${fraction.num},${fraction.den}`);
      return numberStep({
        prompt: `Schrijf als kommagetal: ${shownFraction}`,
        answer: fraction,
        explanation: decimalChain(fraction).join(' = '),
        diagnose:
          sideBySide === null
            ? undefined
            : tipFor(sideBySide, `${shownFraction} betekent ${p} : ${q}, niet ${p},${q}.`),
      });
    }
    case 'decimalToFraction':
      return simplestFractionStep({
        prompt: `Schrijf als breuk: ${shownDecimal()}`,
        answer: fraction,
        decimalAllowed: false,
        explanation: decimalChain(fraction).reverse().join(' = '),
      });
    case 'fractionToPercentage':
      // The fraction keypad for every fraction, so the breuk key does not give away thirds.
      return fractionStep({
        prompt: `${shownFraction} = ?%`,
        answer: percent,
        suffix: '%',
        expected: percentNumber,
        explanation: toPercentExplanation(fraction),
        diagnose: tipFor(fraction, TO_PERCENT_TIP),
      });
    case 'percentageToFraction':
      return simplestFractionStep({
        prompt: `Schrijf als breuk: ${percentNumber}%`,
        answer: fraction,
        decimalAllowed: false,
        explanation: fromPercentExplanation(fraction),
      });
    case 'decimalToPercentage':
      return numberStep({
        prompt: `${shownDecimal()} = ?%`,
        answer: percent,
        suffix: '%',
        explanation: `${shownDecimal()} = ${shownDecimal()} × 100% = ${percentNumber}%`,
        diagnose: tipFor(fraction, TO_PERCENT_TIP),
      });
    case 'percentageToDecimal':
      return numberStep({
        prompt: `Schrijf als kommagetal: ${percentNumber}%`,
        answer: fraction,
        explanation: `${percentNumber}% = ${percentNumber} : 100 = ${shownDecimal()}`,
        diagnose: tipFor(percent, FROM_PERCENT_TIP),
      });
  }
}

/** One conversion of `fraction` in the given direction. */
export function conversionQuestion(direction: ConversionDirection, fraction: Rational): Question {
  return {
    key: `fractionConversion:${direction}:${fraction.num}/${fraction.den}`,
    topic: 'fractionConversion',
    steps: [conversionStep(direction, fraction)],
  };
}

/** p/q in lowest terms with 0 < p < q: first q uniformly, then p (spec §5.20). */
function randomFraction(rng: Rng, denominators: readonly number[]): Rational {
  const q = pick(rng, denominators);
  const p = randomIntWhere(rng, 1, q - 1, (candidate) => gcd(candidate, q) === 1);
  return rational(BigInt(p), BigInt(q));
}

/** One question in the given direction. */
export function buildFractionConversion(rng: Rng, direction: ConversionDirection): Question {
  const denominators = usesPercentageDenominators(direction)
    ? PERCENTAGE_DENOMINATORS
    : TERMINATING_DENOMINATORS;
  return conversionQuestion(direction, randomFraction(rng, denominators));
}

/** One of six directions, each equally likely (spec §5.20). */
export function generateFractionConversion(rng: Rng): Question {
  return buildFractionConversion(rng, pick(rng, CONVERSION_DIRECTIONS));
}
