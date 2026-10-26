import { drawUntil, randomInt, type Rng } from '../random';
import { fromInteger } from '../rational';
import { numberStep, textStep } from '../steps';
import { exactTip } from '../tips';
import type { Question } from '../types';

// Roman numerals (spec §5.40).
const SYMBOL_VALUES: Readonly<Record<string, number>> = {
  I: 1,
  V: 5,
  X: 10,
  L: 50,
  C: 100,
  D: 500,
  M: 1000,
};

/** The symbols of one decimal place for the digits 1–9 (the thousands are Ms). */
const PLACES: readonly (readonly [place: number, one: string, five: string, ten: string])[] = [
  [100, 'C', 'D', 'M'],
  [10, 'X', 'L', 'C'],
  [1, 'I', 'V', 'X'],
];

const SUBTRACTIVE_PAIRS: ReadonlySet<string> = new Set(['IV', 'IX', 'XL', 'XC', 'CD', 'CM']);

/** The symbols of one decimal place: 'CM' for 900. */
interface RomanGroup {
  symbols: string;
  value: number;
}

/** The non-zero decimal places of a value (up to 3999), high to low. */
export function romanGroups(value: number): RomanGroup[] {
  const groups: RomanGroup[] = [];
  const thousands = Math.floor(value / 1000);
  if (thousands > 0) groups.push({ symbols: 'M'.repeat(thousands), value: thousands * 1000 });
  for (const [place, one, five, ten] of PLACES) {
    const digit = Math.floor(value / place) % 10;
    if (digit === 0) continue;
    const symbols =
      digit === 9
        ? one + ten
        : digit === 4
          ? one + five
          : (digit >= 5 ? five : '') + one.repeat(digit % 5);
    groups.push({ symbols, value: digit * place });
  }
  return groups;
}

export function toRoman(value: number): string {
  return romanGroups(value)
    .map(({ symbols }) => symbols)
    .join('');
}

/** Sum of all symbols, as if no pair were subtracted: XIV → 16. */
export function additiveValue(numeral: string): number {
  return [...numeral].reduce((sum, symbol) => sum + (SYMBOL_VALUES[symbol] ?? 0), 0);
}

const isPair = ({ symbols }: RomanGroup) => SUBTRACTIVE_PAIRS.has(symbols);

/** Symbols that never increase from left to right: no subtractive pair is used. */
function isNonIncreasing(numeral: string): boolean {
  return [...numeral].every(
    (symbol, index) =>
      index === 0 || (SYMBOL_VALUES[numeral[index - 1]!] ?? 0) >= (SYMBOL_VALUES[symbol] ?? 0),
  );
}

/** `900 = CM, 90 = XC en 4 = IV` */
function listPairs(pairs: readonly RomanGroup[]): string {
  const items = pairs.map(({ symbols, value }) => `${value} = ${symbols}`);
  return items.length === 1 ? items[0]! : `${items.slice(0, -1).join(', ')} en ${items.at(-1)}`;
}

/** `Schrijf MCMXCIV als gewoon getal.` or `Schrijf 1994 met Romeinse cijfers.` */
export function generateRomanNumerals(rng: Rng): Question {
  const toDecimal = rng() < 0.5;
  const year = rng() < 0.5;
  // The numeral always has a subtractive pair: that is what the topic is about.
  const value = drawUntil(() => {
    const drawn = year ? randomInt(rng, 1000, 2030) : randomInt(rng, 1, 100);
    return romanGroups(drawn).some(isPair) ? drawn : null;
  });
  const numeral = toRoman(value);
  const groups = romanGroups(value);
  return {
    key: `romanNumerals:${toDecimal ? 'to' : 'from'}:${value}`,
    topic: 'romanNumerals',
    steps: [
      toDecimal
        ? numberStep({
            prompt: `Schrijf ${numeral} als gewoon getal.`,
            answer: fromInteger(value),
            explanation: toDecimalExplanation(numeral, value, groups),
            diagnose: exactTip(
              fromInteger(additiveValue(numeral)),
              subtractTip(groups.find(isPair)!),
            ),
          })
        : textStep({
            kind: 'roman',
            prompt: `Schrijf ${value} met Romeinse cijfers.`,
            answer: numeral,
            explanation: fromDecimalExplanation(numeral, value, groups),
            tip: (input) =>
              isNonIncreasing(input) && additiveValue(input) === value
                ? `De waarde klopt, maar gebruik de aftrekregel: ${listPairs(groups.filter(isPair))}.`
                : undefined,
          }),
    ],
  };
}

/** The first subtractive pair of the numeral, e.g. `IV = 4, niet 6`. */
function subtractTip(pair: RomanGroup): string {
  return `Een kleiner teken vóór een groter teken trek je af: ${pair.symbols} = ${pair.value}, niet ${additiveValue(pair.symbols)}.`;
}

/** `MCMXCIV = M + CM + XC + IV = 1000 + 900 + 90 + 4 = 1994`; one group: `IX = 9`. */
function toDecimalExplanation(numeral: string, value: number, groups: readonly RomanGroup[]) {
  if (groups.length === 1) return `${numeral} = ${value}`;
  const symbols = groups.map(({ symbols }) => symbols).join(' + ');
  const values = groups.map(({ value }) => value).join(' + ');
  return `${numeral} = ${symbols} = ${values} = ${value}`;
}

/** `2024 = 2000 + 20 + 4 = MM + XX + IV → MMXXIV`; one group: `9 = IX`. */
function fromDecimalExplanation(numeral: string, value: number, groups: readonly RomanGroup[]) {
  if (groups.length === 1) return `${value} = ${numeral}`;
  const values = groups.map(({ value }) => value).join(' + ');
  const symbols = groups.map(({ symbols }) => symbols).join(' + ');
  return `${value} = ${values} = ${symbols} → ${numeral}`;
}
