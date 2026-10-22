// Helpers shared by the topic tests.
import { formatRational, GROUP_SEPARATOR } from '../format';
import { parseDutchNumber, type Rational } from '../rational';
import type { Question, Step } from '../types';

/** A value written in Dutch notation: '7,5'. */
export function decimal(text: string): Rational {
  return parseDutchNumber(text)!;
}

/** What the user types for a value: the digits and the comma, without grouping. */
export function typed(value: Rational): string {
  return formatRational(value).replaceAll(GROUP_SEPARATOR, '');
}

export function stepOf(question: Question): Step {
  return question.steps[0]!;
}

/** The correct answer of a question, read back from its expected answer. */
export function answerOf(question: Question): Rational {
  return decimal(stepOf(question).check('').expected.replaceAll(GROUP_SEPARATOR, ''));
}
