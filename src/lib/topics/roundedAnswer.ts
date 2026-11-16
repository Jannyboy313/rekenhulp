import { formatFixed, formatRational } from '../format';
import { drawUntil } from '../random';
import {
  add,
  compare,
  decimalPlaces,
  equals,
  multiply,
  powerOfTen,
  rational,
  roundHalfUp,
  subtract,
  type Rational,
} from '../rational';
import { numberStep } from '../steps';
import type { Question, Topic } from '../types';

/** How a calculator exercise asks its rounding: the last sentence of the prompt (calculator spec §6). */
export const ROUNDING_SENTENCE: Readonly<Record<0 | 1 | 2, string>> = {
  0: 'Rond af op een heel getal.',
  1: 'Rond af op 1 decimaal.',
  2: 'Rond af op 2 decimalen.',
};

const HALF = rational(1n, 2n);
/** A value this close to a rounding boundary is not asked (calculator spec §6). */
const BOUNDARY_MARGIN = rational(1n, 1000n);

/**
 * Whether a non-negative value is closer than 0,001 to a rounding boundary without being on it:
 * a rounded intermediate result could then flip the answer.
 */
export function nearBoundary(value: Rational, decimals: number): boolean {
  const scaled = multiply(value, powerOfTen(decimals));
  const boundary = add(rational(scaled.num / scaled.den), HALF);
  const distance = subtract(scaled, boundary);
  if (distance.num === 0n) return false;
  const absolute = distance.num < 0n ? rational(-distance.num, distance.den) : distance;
  return compare(multiply(absolute, powerOfTen(-decimals)), BOUNDARY_MARGIN) < 0;
}

/** A value in an explanation: exact when it terminates, otherwise cut after 3 decimals (`12,738…`). */
export function shownValue(value: Rational): string {
  if (decimalPlaces(value) !== null) return formatRational(value);
  const cut = rational((value.num * 1000n) / value.den, 1000n);
  return `${formatFixed(cut, 3)}…`;
}

/** An exercise with a rounded answer, before its value is checked against the boundary rule. */
export interface RoundedDraft {
  topic: Topic;
  /** Without the topic: the form, the variant and the numbers. */
  key: string;
  /** Without the rounding sentence. */
  prompt: string;
  /** The exact, unrounded value. */
  value: Rational;
  decimals: 0 | 1 | 2;
  suffix: string;
  /** The calculation up to its last `=`; the value and its rounding are added. */
  calculation: string;
  /** Written after the value in the explanation when it differs from the calculation's: `L`. */
  valueUnit?: string;
}

/**
 * The question of a draft (calculator spec §6): the rounding sentence closes the prompt, and only
 * the value rounded half up is correct, shown with the decimals asked.
 */
export function roundedQuestion(draft: RoundedDraft): Question {
  const { topic, key, prompt, value, decimals, suffix, calculation, valueUnit } = draft;
  const answer = roundHalfUp(value, decimals);
  const expected = formatFixed(answer, decimals);
  const withUnit = (text: string) => (valueUnit ? `${text} ${valueUnit}` : text);
  const outcome = equals(answer, value)
    ? withUnit(expected)
    : `${withUnit(shownValue(value))} → ${expected}`;
  const step = numberStep({
    prompt: `${prompt} ${ROUNDING_SENTENCE[decimals]}`,
    answer,
    expected,
    suffix,
    explanation: `${calculation} = ${outcome}`,
  });
  return { key: `${topic}:${key}`, topic, steps: [step] };
}

/** Draws until the value is clear of a rounding boundary. */
export function drawRounded(draw: () => RoundedDraft): Question {
  return drawUntil(() => {
    const draft = draw();
    return nearBoundary(draft.value, draft.decimals) ? null : roundedQuestion(draft);
  });
}
