import type { PrimePower } from './primes';
import { decimalPlaces, type Rational } from './rational';

/** Typographic minus sign (U+2212). */
export const MINUS = '−';
/** Narrow no-break space (U+202F): a thin space for digit grouping that never wraps (spec §8). */
export const GROUP_SEPARATOR = '\u{202f}';

const MAX_DECIMALS = 20;

function groupDigits(digits: string): string {
  if (digits.length < 5) return digits;
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, GROUP_SEPARATOR);
}

export function formatInteger(value: number | bigint): string {
  const big = typeof value === 'bigint' ? value : BigInt(value);
  const negative = big < 0n;
  return (negative ? MINUS : '') + groupDigits((negative ? -big : big).toString());
}

/** Formats a terminating decimal in Dutch notation; throws for e.g. 1/3 (fractions come in v2). */
export function formatRational(value: Rational): string {
  const decimals = decimalPlaces(value);
  if (decimals === null) throw new RangeError('Value has no finite decimal representation');
  if (decimals > MAX_DECIMALS) throw new RangeError(`Too many decimals: ${decimals}`);
  const negative = value.num < 0n;
  const absolute = negative ? -value.num : value.num;
  const scaled = (absolute * 10n ** BigInt(decimals)) / value.den;
  const text = scaled.toString().padStart(decimals + 1, '0');
  const integerPart = text.slice(0, text.length - decimals);
  const fractionPart = text.slice(text.length - decimals);
  return (
    (negative ? MINUS : '') + groupDigits(integerPart) + (decimals > 0 ? `,${fractionPart}` : '')
  );
}

/** Keypad input uses ASCII '-'; the UI shows a typographic minus. */
export function formatInput(raw: string): string {
  return raw.replaceAll('-', MINUS);
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function formatSeconds(ms: number): string {
  return `${(ms / 1000).toFixed(1).replace('.', ',')} s`;
}

/** Indexed by digit; every character is a single UTF-16 code unit. */
export const SUPERSCRIPT_DIGITS = '⁰¹²³⁴⁵⁶⁷⁸⁹';
/** Superscript minus (U+207B). */
const SUPERSCRIPT_MINUS = '⁻';

/** Digit by digit, so a typed exponent of any length (or with a leading zero) is shown as is. */
function superscriptDigits(digits: string): string {
  return digits.replace(/\d/g, (digit) => SUPERSCRIPT_DIGITS.charAt(Number(digit)));
}

/** Writes an integer exponent in superscript: 12 → '¹²', −1 → '⁻¹'. */
export function toSuperscript(exponent: number): string {
  if (!Number.isSafeInteger(exponent)) throw new RangeError(`Not a safe integer: ${exponent}`);
  return (exponent < 0 ? SUPERSCRIPT_MINUS : '') + superscriptDigits(String(Math.abs(exponent)));
}

/** 10 with a superscript exponent, e.g. 10⁹ (spec §5.14). */
export function formatPowerOfTen(exponent: number): string {
  return `10${toSuperscript(exponent)}`;
}

/** No-break space (U+00A0): keeps '€' and the amount on one line. */
export const NO_BREAK_SPACE = '\u{a0}';

/** Euro amounts: whole euros without decimals, otherwise exactly two ('25,50'). Spec §8. */
export function formatMoney(value: Rational): string {
  const decimals = decimalPlaces(value);
  if (decimals === null || decimals > 2) throw new RangeError('Not a whole number of cents');
  const text = formatRational(value);
  return decimals === 1 ? `${text}0` : text;
}

/** '€ 25,50' with a no-break space. */
export function formatEuro(value: Rational): string {
  return `€${NO_BREAK_SPACE}${formatMoney(value)}`;
}

/** '25/2'. The sign goes on the numerator, because the denominator is always positive. */
export function formatFraction(value: Rational): string {
  return `${formatInteger(value.num)}/${formatInteger(value.den)}`;
}

/** Canonical prime factorization: '2² × 3 × 7' (spec §5.5). */
export function formatPrimeFactors(factors: readonly PrimePower[]): string {
  return factors
    .map(({ prime, exponent }) => formatInteger(prime) + (exponent === 1 ? '' : toSuperscript(exponent)))
    .join(' × ');
}

/** Factorization keypad input '2^2×3×7' as '2² × 3 × 7'. A '^' without exponent stays visible. */
export function formatFactorizationInput(raw: string): string {
  return raw
    .replace(/\^(\d+)/g, (_match, digits: string) => superscriptDigits(digits))
    .replaceAll('×', ' × ');
}

/** Expression keypad input '7×(13+87)' as '7 × (13 + 87)'; every '-' is the minus operator. */
export function formatExpressionInput(raw: string): string {
  return raw.replace(/[-+×:]/g, (operator) => ` ${operator === '-' ? MINUS : operator} `);
}
