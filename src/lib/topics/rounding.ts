import { formatFixed, formatRational } from '../format';
import { drawUntil, pick, randomInt, type Rng } from '../random';
import { equals, rational, type Rational } from '../rational';
import { numberStep } from '../steps';
import type { Diagnose } from '../tips';
import type { Question } from '../types';

// Rounding, half up (spec §5.17).
interface Place {
  /** Dutch, after 'op': 'honderdtallen', '1 decimaal'. */
  label: string;
  /** The place as a power of ten: 2 for hundreds, −1 for one decimal. */
  exponent: number;
  /** The source has one of these numbers of decimals. */
  decimals: readonly number[];
  /** Whole places: the inclusive source range. Decimal places: the source lies in (0, max). */
  min: number;
  max: number;
  /** Neighbouring places of one group get the wrong-place tip (spec §3.4.1). */
  group?: 'integer' | 'decimal';
}

export const PLACES: readonly Place[] = [
  { label: 'tientallen', exponent: 1, decimals: [0], min: 101, max: 9999, group: 'integer' },
  {
    label: 'honderdtallen',
    exponent: 2,
    decimals: [0],
    min: 1001,
    max: 99_999,
    group: 'integer',
  },
  {
    label: 'duizendtallen',
    exponent: 3,
    decimals: [0],
    min: 10_001,
    max: 999_999,
    group: 'integer',
  },
  { label: 'miljoenen', exponent: 6, decimals: [0], min: 1_000_001, max: 99_999_999 },
  { label: 'een heel getal', exponent: 0, decimals: [1, 2], min: 0, max: 1000, group: 'decimal' },
  { label: '1 decimaal', exponent: -1, decimals: [2, 3], min: 0, max: 100, group: 'decimal' },
  { label: '2 decimalen', exponent: -2, decimals: [3], min: 0, max: 100, group: 'decimal' },
];

/** Share of exercises whose first dropped digit is 5, the edge case of the rule. */
export const FIVE_SHARE = 0.2;
/** Share of exercises where rounding up carries over a 9: 3970 → 4000 on hundreds. */
export const CARRY_SHARE = 0.15;

/** The digit of a non-negative integer at 10^position. */
export function digitAt(value: number, position: number): number {
  return Math.floor(value / 10 ** position) % 10;
}

/** `scaled` rounded half up to a multiple of 10^k. */
export function roundHalfUp(scaled: number, k: number): number {
  const unit = 10 ** k;
  const lower = Math.floor(scaled / unit) * unit;
  return digitAt(scaled, k - 1) >= 5 ? lower + unit : lower;
}

function toValue(scaled: number, decimals: number): Rational {
  return rational(BigInt(scaled), 10n ** BigInt(decimals));
}

/** The facts of rounding `scaled` (with `decimals` decimals) on `place`. */
function roundingFacts(place: Place, decimals: number, scaled: number) {
  const k = place.exponent + decimals;
  const unit = 10 ** k;
  const lower = Math.floor(scaled / unit) * unit;
  const decisive = digitAt(scaled, k - 1);
  const up = decisive >= 5;
  return { lower, upper: lower + unit, decisive, up, rounded: up ? lower + unit : lower };
}

/**
 * Rounded the wrong way, or on a neighbouring place of the same group (spec §3.4.1). A finer
 * place that would leave the source unrounded (`k ≤ 0`) is not a neighbour.
 */
function roundingTip(place: Place, decimals: number, scaled: number): Diagnose {
  const { lower, upper, decisive, up, rounded } = roundingFacts(place, decimals, scaled);
  const neighbours = PLACES.filter(
    (other) =>
      place.group !== undefined &&
      other.group === place.group &&
      Math.abs(other.exponent - place.exponent) === 1 &&
      other.exponent + decimals >= 1,
  );
  return (given) => {
    if (up && equals(given, toValue(lower, decimals))) {
      return `Het eerste cijfer dat wegvalt is ${decisive} (5 of meer): rond naar boven af.`;
    }
    if (!up && equals(given, toValue(upper, decimals))) {
      return `Het eerste cijfer dat wegvalt is ${decisive} (minder dan 5): rond naar beneden af.`;
    }
    for (const other of neighbours) {
      const value = roundHalfUp(scaled, other.exponent + decimals);
      if (value !== rounded && equals(given, toValue(value, decimals))) {
        return `Dat is afgerond op ${other.label}; gevraagd is ${place.label}.`;
      }
    }
    return undefined;
  };
}

/** `Rond 4386 af op honderdtallen`; the source has exactly `decimals` decimals. */
export function roundingQuestion(place: Place, decimals: number, scaled: number): Question {
  const { lower, upper, decisive, rounded } = roundingFacts(place, decimals, scaled);
  const shown = (value: number) =>
    formatFixed(toValue(value, decimals), Math.max(0, -place.exponent));
  const source = formatRational(toValue(scaled, decimals));
  return {
    key: `rounding:${place.label}:${source}`,
    topic: 'rounding',
    steps: [
      numberStep({
        prompt: `Rond ${source} af op ${place.label}`,
        answer: toValue(rounded, decimals),
        expected: shown(rounded),
        explanation:
          `${source} ligt tussen ${shown(lower)} en ${shown(upper)}; ` +
          `het eerste cijfer dat wegvalt is ${decisive} → ${shown(rounded)}`,
        diagnose: roundingTip(place, decimals, scaled),
      }),
    ],
  };
}

type Special = 'five' | 'carry' | 'any';

function pickSpecial(rng: Rng): Special {
  const draw = rng();
  if (draw < FIVE_SHARE) return 'five';
  return draw < FIVE_SHARE + CARRY_SHARE ? 'carry' : 'any';
}

/** One exercise on `place`, by rejection (spec §5.17). */
export function buildRounding(rng: Rng, place: Place): Question {
  const decimals = pick(rng, place.decimals);
  const k = place.exponent + decimals;
  const special = pickSpecial(rng);
  const min = decimals === 0 ? place.min : 1;
  const max = decimals === 0 ? place.max : place.max * 10 ** decimals - 1;
  const scaled = drawUntil(() => {
    const n = randomInt(rng, min, max);
    // Never rounded yet; a decimal source has exactly `decimals` decimals.
    if (n % 10 ** k === 0 || (decimals > 0 && n % 10 === 0)) return null;
    const decisive = digitAt(n, k - 1);
    if (special === 'five' && decisive !== 5) return null;
    if (special === 'carry' && (decisive < 5 || digitAt(n, k) !== 9)) return null;
    return roundHalfUp(n, k) === 0 ? null : n;
  });
  return roundingQuestion(place, decimals, scaled);
}

/** One of seven places, each equally likely (spec §5.17). */
export function generateRounding(rng: Rng): Question {
  return buildRounding(rng, pick(rng, PLACES));
}
