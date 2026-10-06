import { formatInteger } from './format';
import { divide, type Rational } from './rational';

/**
 * Recognises a likely mistake in a wrong answer that parsed (spec §3.4.1). Returns the Dutch tip,
 * or undefined when the answer matches no known mistake.
 */
export type Diagnose = (given: Rational) => string | undefined;

/** The tip of the first diagnosis that recognises the answer. */
export function firstTip(...diagnoses: readonly Diagnose[]): Diagnose {
  return (given) => {
    for (const diagnose of diagnoses) {
      const tip = diagnose(given);
      if (tip !== undefined) return tip;
    }
    return undefined;
  };
}

/** k ≥ 1 when value = 10^k, otherwise null. */
function exactPowerOfTen(value: bigint): number | null {
  let rest = value;
  let k = 0;
  while (rest !== 0n && rest % 10n === 0n) {
    rest /= 10n;
    k++;
  }
  return rest === 1n && k > 0 ? k : null;
}

/** k ≠ 0 when given = answer × 10^k exactly, otherwise null. */
export function powerOfTenShift(given: Rational, answer: Rational): number | null {
  if (given.num === 0n || answer.num === 0n) return null;
  const ratio = divide(given, answer);
  if (ratio.den === 1n) return exactPowerOfTen(ratio.num);
  if (ratio.num !== 1n) return null;
  const k = exactPowerOfTen(ratio.den);
  return k === null ? null : -k;
}

/** The fallback tip of number and fraction steps: a factor 10, 100, … off. */
export function powerOfTenTip(given: Rational, answer: Rational): string | undefined {
  const shift = powerOfTenShift(given, answer);
  if (shift === null) return undefined;
  const times = formatInteger(10n ** BigInt(Math.abs(shift)));
  const direction = shift > 0 ? 'groot' : 'klein';
  return `Je antwoord is ${times} keer te ${direction}. Let op de komma en het aantal nullen.`;
}

/** The answer as a positive safe integer, or null: most checks only make sense for those. */
export function positiveInteger(given: Rational): number | null {
  if (given.den !== 1n || given.num <= 0n || given.num > BigInt(Number.MAX_SAFE_INTEGER)) {
    return null;
  }
  return Number(given.num);
}
