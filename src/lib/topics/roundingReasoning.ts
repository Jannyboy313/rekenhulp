import { formatEuro, formatInteger as f, formatMoney, formatRational } from '../format';
import { drawUntil, pick, randomInt, type Rng } from '../random';
import { add, fromInteger, rational, type Rational } from '../rational';
import { numberStep } from '../steps';
import type { Question } from '../types';

// Rounding reasoning (spec §5.70): the bounds of a rounded number, and cash rounding to 5 cent.
export const PLACES = ['tientallen', 'honderdtallen', 'duizendtallen'] as const;
export type Place = (typeof PLACES)[number];
export type Side = 'kleinste' | 'grootste';

const UNITS: Record<Place, number> = { tientallen: 10, honderdtallen: 100, duizendtallen: 1000 };
const MIN_WHOLE = 100;
const MAX_WHOLE = 99_000;
const WHOLE_SHARE = 0.7;
const NOTES = [5, 10, 20, 50] as const;

const euro = (cents: number) => formatEuro(rational(BigInt(cents), 100n));
const money = (cents: number) => formatMoney(rational(BigInt(cents), 100n));

/** `Een getal is afgerond op honderdtallen 4500. Wat is het kleinste getal dat het kan zijn?` */
export function wholeBoundsQuestion(place: Place, value: number, side: Side): Question {
  const unit = UNITS[place];
  const answer = side === 'kleinste' ? value - unit / 2 : value + unit / 2 - 1;
  // The pair of numbers on both sides of the boundary that the answer belongs to.
  const lower = side === 'kleinste' ? answer - 1 : answer;
  const lowerRounded = side === 'kleinste' ? value - unit : value;
  const first = `${f(lower)} wordt ${f(lowerRounded)}`;
  const second = `${f(lower + 1)} wordt ${f(lowerRounded + unit)}`;
  return {
    key: `roundingReasoning:bounds:whole:${side}:${place}:${value}`,
    topic: 'roundingReasoning',
    steps: [
      numberStep({
        prompt:
          `Een getal is afgerond op ${place} ${f(value)}. ` +
          `Wat is het ${side} getal dat het kan zijn?`,
        answer: fromInteger(answer),
        explanation: `${first}, ${second} → ${f(answer)}`,
      }),
    ],
  };
}

const HUNDREDTH = rational(1n, 100n);
const TENTH = rational(1n, 10n);

/** `Een getal met 2 decimalen is afgerond op 1 decimaal 3,7. Wat is het kleinste getal …?` */
export function decimalBoundsQuestion(value: Rational, side: Side): Question {
  const kleinste = side === 'kleinste';
  const answer = add(value, rational(kleinste ? -5n : 4n, 100n));
  // The pair of numbers on both sides of the boundary that the answer belongs to.
  const lower = kleinste ? add(answer, rational(-1n, 100n)) : answer;
  const lowerRounded = kleinste ? add(value, rational(-1n, 10n)) : value;
  const shown = formatRational(value);
  const first = `${formatRational(lower)} wordt ${formatRational(lowerRounded)}`;
  const second = `${formatRational(add(lower, HUNDREDTH))} wordt ${formatRational(add(lowerRounded, TENTH))}`;
  return {
    key: `roundingReasoning:bounds:decimal:${side}:${shown}`,
    topic: 'roundingReasoning',
    steps: [
      numberStep({
        prompt:
          `Een getal met 2 decimalen is afgerond op 1 decimaal ${shown}. ` +
          `Wat is het ${side} getal dat het kan zijn?`,
        answer,
        explanation: `${first}, ${second} → ${formatRational(answer)}`,
      }),
    ],
  };
}

/** Dutch cash rounding: 1 and 2 cent down, 3 to 7 to 5 cent, 8 and 9 up (in cents). */
function roundToFiveCents(cents: number): { rounded: number; target: number } {
  const last = cents % 10;
  const target = last <= 2 ? 0 : last <= 7 ? 5 : 10;
  return { rounded: cents - last + target, target };
}

/**
 * `Je boodschappen kosten € 7,93. Je betaalt contant. Hoeveel betaal je?` for an amount in cents;
 * with a note: `… Je betaalt contant met € 10. Hoeveel krijg je terug?`
 */
export function cashQuestion(cents: number, note?: number): Question {
  const { rounded, target } = roundToFiveCents(cents);
  const rounding = `${euro(cents)}: ${cents % 10} cent wordt ${target} cent → ${euro(rounded)}`;
  if (note === undefined) {
    return {
      key: `roundingReasoning:cash:pay:${formatRational(rational(BigInt(cents), 100n))}`,
      topic: 'roundingReasoning',
      steps: [
        numberStep({
          prompt: `Je boodschappen kosten ${euro(cents)}. Je betaalt contant. Hoeveel betaal je?`,
          answer: rational(BigInt(rounded), 100n),
          prefix: '€',
          expected: money(rounded),
          explanation: rounding,
        }),
      ],
    };
  }
  const change = note * 100 - rounded;
  return {
    key: `roundingReasoning:cash:change:${formatRational(rational(BigInt(cents), 100n))}:${note}`,
    topic: 'roundingReasoning',
    steps: [
      numberStep({
        prompt:
          `Je boodschappen kosten ${euro(cents)}. Je betaalt contant met ${euro(note * 100)}. ` +
          'Hoeveel krijg je terug?',
        answer: rational(BigInt(change), 100n),
        prefix: '€',
        expected: money(change),
        explanation: `${euro(cents)} → ${euro(rounded)} → ${note} − ${money(rounded)} = ${money(change)}`,
      }),
    ],
  };
}

function bounds(rng: Rng): Question {
  const side = pick(rng, ['kleinste', 'grootste'] as const);
  if (rng() < WHOLE_SHARE) {
    const place = pick(rng, PLACES);
    const unit = UNITS[place];
    const value = drawUntil(() => {
      const value =
        unit * randomInt(rng, Math.ceil(MIN_WHOLE / unit), Math.floor(MAX_WHOLE / unit));
      const significant = String(value).replace(/0+$/, '').length;
      return significant >= 2 && significant <= 3 ? value : null;
    });
    return wholeBoundsQuestion(place, value, side);
  }
  const tenths = drawUntil(() => {
    const tenths = randomInt(rng, 1, 999);
    return tenths % 10 === 0 ? null : tenths;
  });
  return decimalBoundsQuestion(rational(BigInt(tenths), 10n), side);
}

function cash(rng: Rng): Question {
  return drawUntil(() => {
    const cents = randomInt(rng, 100, 5000);
    if ([0, 5].includes(cents % 10)) return null;
    if (rng() < 0.5) return cashQuestion(cents);
    const { rounded } = roundToFiveCents(cents);
    // The note is above the rounded amount, so the change is never 0 (49,99 has no note).
    const notes = NOTES.filter((note) => note * 100 > rounded);
    return notes.length === 0 ? null : cashQuestion(cents, pick(rng, notes));
  });
}

/** One of two forms, 50/50 (spec §5.70). */
export function generateRoundingReasoning(rng: Rng): Question {
  return pick(rng, [bounds, cash])(rng);
}
