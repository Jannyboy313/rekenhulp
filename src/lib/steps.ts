import { formatFraction, formatRational } from './format';
import { decimalPlaces, equals, parseDutchNumber, parseFraction, type Rational } from './rational';
import type { AnswerKind, Step } from './types';

export interface NumberStepOptions {
  prompt: string;
  answer: Rational;
  prefix?: string;
  suffix?: string;
  /** Overrides the shown correct answer, e.g. '25,50' for money. */
  expected?: string;
  explanation?: string;
}

/** Turns keypad input into a value. A fraction step also accepts 'a/b' (spec §6). */
export function parseAnswer(kind: AnswerKind, input: string): Rational | null {
  return kind === 'fraction'
    ? (parseFraction(input) ?? parseDutchNumber(input))
    : parseDutchNumber(input);
}

export function numberStep(options: NumberStepOptions): Step {
  return exactStep('number', options, options.expected ?? formatRational(options.answer));
}

/** Any value equal to the answer is correct: '25/2', '50/4' and '12,5' alike. */
export function fractionStep(options: NumberStepOptions): Step {
  return exactStep('fraction', options, options.expected ?? formatFractionAnswer(options.answer));
}

/** '25', or both notations: '12,5 of 25/2'. Only the fraction when the decimal never ends. */
function formatFractionAnswer(answer: Rational): string {
  if (answer.den === 1n) return formatRational(answer);
  const fraction = formatFraction(answer);
  return decimalPlaces(answer) === null ? fraction : `${formatRational(answer)} of ${fraction}`;
}

function exactStep(
  kind: AnswerKind,
  { prompt, answer, prefix, suffix, explanation }: NumberStepOptions,
  expected: string,
): Step {
  return {
    kind,
    prompt,
    prefix,
    suffix,
    check(input) {
      const given = parseAnswer(kind, input);
      return { correct: given !== null && equals(given, answer), expected, explanation };
    },
  };
}
