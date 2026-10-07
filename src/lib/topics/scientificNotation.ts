import { formatInteger, formatPowerOfTen, formatRational, formatScientific } from '../format';
import { drawUntil, pick, type Rng } from '../random';
import { equals, multiply, ONE, powerOfTen, type Rational } from '../rational';
import { numberStep, scientificStep, type ScientificInput } from '../steps';
import type { Question } from '../types';
import { coefficientOf, randomMantissa } from './measurement';

// Scientific notation (spec §5.19).
export const NOTATION_FORMS = ['toNotation', 'toNumber', 'normalise'] as const;
export type NotationForm = (typeof NOTATION_FORMS)[number];

/** n of c × 10ⁿ: a written-out number has at most 10 digits. */
export const EXPONENTS: readonly number[] = [-6, -5, -4, -3, -2, -1, 2, 3, 4, 5, 6, 7, 8, 9];
/** s of the prompt's m = c × 10ˢ in the normalise form. */
const SHIFTS: readonly number[] = [-2, -1, 1, 2, 3];

const NOTATION_PROMPT = 'Schrijf in wetenschappelijke notatie:';

/** The number written out: 4 500 000, 0,000045. */
function writtenOut(coefficient: Rational, exponent: number): string {
  return formatRational(multiply(coefficient, powerOfTen(exponent)));
}

/** Counted the zeros instead of the places the comma moves (spec §3.4.1). */
function zerosTip(mantissa: number, exponent: number) {
  const coefficient = coefficientOf(mantissa);
  const digits = String(mantissa).length;
  // 4 500 000 has 5 zeros (n = 6); 0,000045 has 4 zeros after the comma (n = −5).
  const zeros = exponent > 0 ? exponent - (digits - 1) : exponent + 1;
  return (given: ScientificInput) =>
    zeros !== exponent && given.exponent === zeros && equals(given.coefficient, coefficient)
      ? 'Tel de plaatsen waarover de komma schuift, niet de nullen.'
      : undefined;
}

/** Moved the exponent the wrong way: k − s instead of k + s (spec §3.4.1). */
function shiftTip(coefficient: Rational, shift: number, k: number) {
  const factor = formatInteger(10 ** Math.abs(shift));
  const tip =
    shift > 0
      ? `Het getal vóór × 10 wordt ${factor} keer kleiner, dus de exponent wordt ${shift} groter.`
      : `Het getal vóór × 10 wordt ${factor} keer groter, dus de exponent wordt ${-shift} kleiner.`;
  return (given: ScientificInput) =>
    given.exponent === k - shift && equals(given.coefficient, coefficient) ? tip : undefined;
}

/** `Schrijf in wetenschappelijke notatie: 4 500 000` */
export function toNotationQuestion(mantissa: number, exponent: number): Question {
  const coefficient = coefficientOf(mantissa);
  const shown = writtenOut(coefficient, exponent);
  const power = formatRational(powerOfTen(exponent));
  return {
    key: `scientificNotation:to:${mantissa}:${exponent}`,
    topic: 'scientificNotation',
    steps: [
      scientificStep({
        prompt: `${NOTATION_PROMPT} ${shown}`,
        coefficient,
        exponent,
        explanation:
          `${shown} = ${formatRational(coefficient)} × ${power} = ` +
          formatScientific(coefficient, exponent),
        diagnose: zerosTip(mantissa, exponent),
      }),
    ],
  };
}

/** `4,5 × 10⁻³ = ?`, or `10⁶ = ?` for c = 1 (as in §5.14). */
export function toNumberQuestion(mantissa: number, exponent: number): Question {
  const coefficient = coefficientOf(mantissa);
  const shown = writtenOut(coefficient, exponent);
  const bare = equals(coefficient, ONE);
  const prompt = bare ? formatPowerOfTen(exponent) : formatScientific(coefficient, exponent);
  const power = formatRational(powerOfTen(exponent));
  return {
    key: `scientificNotation:from:${mantissa}:${exponent}`,
    topic: 'scientificNotation',
    steps: [
      numberStep({
        prompt: `${prompt} = ?`,
        answer: multiply(coefficient, powerOfTen(exponent)),
        explanation: bare
          ? `${prompt} = ${shown}`
          : `${prompt} = ${formatRational(coefficient)} × ${power} = ${shown}`,
      }),
    ],
  };
}

/** `Schrijf in wetenschappelijke notatie: 450 × 10⁴`: m = c × 10ˢ and k = n − s. */
export function normaliseQuestion(mantissa: number, exponent: number, shift: number): Question {
  const coefficient = coefficientOf(mantissa);
  const k = exponent - shift;
  const shown =
    `${formatRational(multiply(coefficient, powerOfTen(shift)))} × ` + formatPowerOfTen(k);
  return {
    key: `scientificNotation:normalise:${mantissa}:${exponent}:${shift}`,
    topic: 'scientificNotation',
    steps: [
      scientificStep({
        prompt: `${NOTATION_PROMPT} ${shown}`,
        coefficient,
        exponent,
        explanation:
          `${shown} = ${formatRational(coefficient)} × ${formatPowerOfTen(shift)} × ` +
          `${formatPowerOfTen(k)} = ${formatScientific(coefficient, exponent)}`,
        diagnose: shiftTip(coefficient, shift, k),
      }),
    ],
  };
}

function toNotation(rng: Rng): Question {
  return toNotationQuestion(randomMantissa(rng), pick(rng, EXPONENTS));
}

function toNumber(rng: Rng): Question {
  return toNumberQuestion(randomMantissa(rng), pick(rng, EXPONENTS));
}

function normalise(rng: Rng): Question {
  const mantissa = randomMantissa(rng);
  const { exponent, shift } = drawUntil(() => {
    const exponent = pick(rng, EXPONENTS);
    const shift = pick(rng, SHIFTS);
    // k = n − s must not be 0: the prompt always shows a power of ten.
    return exponent !== shift ? { exponent, shift } : null;
  });
  return normaliseQuestion(mantissa, exponent, shift);
}

const BUILDERS: Record<NotationForm, (rng: Rng) => Question> = {
  toNotation,
  toNumber,
  normalise,
};

/** One question of the given form. */
export function buildScientificNotation(rng: Rng, form: NotationForm): Question {
  return BUILDERS[form](rng);
}

/** One of three forms, each equally likely (spec §5.19). */
export function generateScientificNotation(rng: Rng): Question {
  return buildScientificNotation(rng, pick(rng, NOTATION_FORMS));
}
