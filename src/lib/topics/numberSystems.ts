import { drawUntil, pick, randomInt, type Rng } from '../random';
import { fromInteger } from '../rational';
import { numberStep, textStep } from '../steps';
import type { Question } from '../types';

// Number systems (spec §5.39).
export type Base = 2 | 5 | 16;

const BASES: readonly Base[] = [2, 5, 16];

const RANGES: Record<Base, readonly [number, number]> = {
  2: [5, 63],
  5: [6, 124],
  16: [26, 255],
};

const NAMES: Record<Base, string> = { 2: 'tweetallig', 5: 'vijftallig', 16: 'zestientallig' };

/** The digits of a value in a base, with the capitals A–F above 9. */
export function toBase(value: number, base: Base): string {
  return value.toString(base).toUpperCase();
}

export function fromBase(digits: string, base: Base): number {
  return parseInt(digits, base);
}

const stripLeadingZeros = (input: string) => input.replace(/^0+(?=.)/, '');

/** `Schrijf het tweetallige getal 1011 als gewoon getal.` or `Schrijf 180 in het zestientallig stelsel.` */
export function generateNumberSystems(rng: Rng): Question {
  const base = pick(rng, BASES);
  const toDecimal = rng() < 0.5;
  const [min, max] = RANGES[base];
  // Base 16 needs a letter digit, so that the keypad's A–F are practised.
  const value = drawUntil(() => {
    const drawn = randomInt(rng, min, max);
    return base === 16 && !/[A-F]/.test(toBase(drawn, 16)) ? null : drawn;
  });
  const digits = toBase(value, base);
  return {
    key: `numberSystems:${toDecimal ? 'to' : 'from'}:${base}:${value}`,
    topic: 'numberSystems',
    steps: [
      toDecimal
        ? numberStep({
            prompt: `Schrijf het ${NAMES[base]}e getal ${digits} als gewoon getal.`,
            answer: fromInteger(value),
            explanation: toDecimalExplanation(value, base),
          })
        : textStep({
            kind: 'baseDigits',
            prompt: `Schrijf ${value} in het ${NAMES[base]} stelsel.`,
            answer: digits,
            normalize: stripLeadingZeros,
            explanation: fromDecimalExplanation(value, base),
          }),
    ],
  };
}

interface Term {
  digit: number;
  place: number;
  /** The letter of a digit above 9, otherwise null. */
  letter: string | null;
}

/** The digits of a value with their place values, high to low. */
function terms(value: number, base: Base): Term[] {
  const digits = toBase(value, base);
  return [...digits].map((char, index) => ({
    digit: parseInt(char, base),
    place: base ** (digits.length - 1 - index),
    letter: /[A-F]/.test(char) ? char : null,
  }));
}

/** `B = 11` or `A = 10, F = 15`: each letter digit once, in the order it appears. */
function letterNames(all: readonly Term[]): string {
  const seen = new Map<string, number>();
  for (const { letter, digit } of all) if (letter !== null) seen.set(letter, digit);
  return [...seen].map(([letter, digit]) => `${letter} = ${digit}`).join(', ');
}

const times = ({ digit, place }: Term) => `${digit} × ${place}`;

/** `1 × 8 + 0 × 4 + 1 × 2 + 1 × 1 = 8 + 2 + 1 = 11`; a letter digit is named first. */
function toDecimalExplanation(value: number, base: Base): string {
  const all = terms(value, base);
  const nonZero = all.filter(({ digit }) => digit !== 0);
  const names = letterNames(all);
  const parts = [all.map(times).join(' + ')];
  if (nonZero.length > 1) parts.push(nonZero.map(({ digit, place }) => digit * place).join(' + '));
  parts.push(String(value));
  return `${names === '' ? '' : `${names}: `}${parts.join(' = ')}`;
}

/** `11 = 8 + 2 + 1 = 1 × 8 + 0 × 4 + 1 × 2 + 1 × 1 → 1011`; base 16 names its letters after it. */
function fromDecimalExplanation(value: number, base: Base): string {
  const all = terms(value, base);
  const nonZero = all.filter(({ digit }) => digit !== 0);
  const names = letterNames(all);
  const parts = [String(value)];
  // Only the binary system has place values worth adding up first.
  if (base === 2 && nonZero.length > 1) parts.push(nonZero.map(({ place }) => place).join(' + '));
  parts.push(all.map(times).join(' + '));
  return `${parts.join(' = ')}${names === '' ? '' : ` en ${names}`} → ${toBase(value, base)}`;
}
