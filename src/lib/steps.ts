import { formatRational } from './format';
import { equals, parseDutchNumber, type Rational } from './rational';
import type { Step } from './types';

export interface NumberStepOptions {
  prompt: string;
  answer: Rational;
  suffix?: string;
  explanation?: string;
}

export function numberStep({ prompt, answer, suffix, explanation }: NumberStepOptions): Step {
  const expected = formatRational(answer);
  return {
    kind: 'number',
    prompt,
    suffix,
    check(input) {
      const given = parseDutchNumber(input);
      return { correct: given !== null && equals(given, answer), expected, explanation };
    },
  };
}
