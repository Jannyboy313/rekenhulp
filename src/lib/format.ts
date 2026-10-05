import { decimalPlaces, type Rational } from './rational';

/** Typographic minus sign (U+2212). */
export const MINUS = '−';
/** Narrow no-break space (U+202F): a thin space for digit grouping that never wraps (spec §8). */
export const GROUP_SEPARATOR = ' ';

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
  if (decimals === null || decimals > MAX_DECIMALS) {
    throw new RangeError('Value has no finite decimal representation');
  }
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

// Indexed by digit; every character is a single UTF-16 code unit.
const SUPERSCRIPT_DIGITS = '⁰¹²³⁴⁵⁶⁷⁸⁹';
/** Superscript minus (U+207B). */
const SUPERSCRIPT_MINUS = '⁻';

/** Writes an integer exponent in superscript: 12 → '¹²', −1 → '⁻¹'. */
export function toSuperscript(exponent: number): string {
  if (!Number.isSafeInteger(exponent)) throw new RangeError(`Not a safe integer: ${exponent}`);
  const digits = [...String(Math.abs(exponent))].map((digit) => SUPERSCRIPT_DIGITS[Number(digit)]);
  return (exponent < 0 ? SUPERSCRIPT_MINUS : '') + digits.join('');
}

export function formatPowerOfTen(exponent: number): string {
  return `10${toSuperscript(exponent)}`;
}
