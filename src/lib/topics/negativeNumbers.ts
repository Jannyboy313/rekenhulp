import { formatInteger as f, NO_BREAK_SPACE } from '../format';
import { drawUntil, pick, randomInt, randomIntWhere, type Rng } from '../random';
import { equals, fromInteger } from '../rational';
import { numberStep } from '../steps';
import type { Diagnose } from '../tips';
import type { Question } from '../types';

// Negative numbers (spec §5.16).
export const NEGATIVE_FORMS = ['addSubtract', 'multiplyDivide', 'temperature'] as const;
export type NegativeForm = (typeof NEGATIVE_FORMS)[number];

/** |a| and |b| of add / subtract. */
export const MAX_TERM = 20;
/** |x| and |y| of multiply / divide. */
export const MIN_FACTOR = 2;
export const MAX_FACTOR = 12;
/** Temperature change. */
export const MIN_START = -15;
export const MAX_START = 15;
export const MIN_CHANGE = 2;
export const MAX_CHANGE = 20;
export const MIN_RESULT = -20;
export const MAX_RESULT = 25;
/** Temperature difference. */
export const MIN_NIGHT = -20;
export const MAX_NIGHT = 5;
export const MIN_DAY = -10;
export const MAX_DAY = 30;

export const SIGN_TIP = 'Let op het teken van de uitkomst.';
export const PRODUCT_SIGN_TIP =
  'Twee negatieve getallen geven een positieve uitkomst, één negatief getal een negatieve.';

/** A literal in a sum (§5.8): a negative one in parentheses, except as the first term. */
function literal(value: number, first = false): string {
  return value < 0 && !first ? `(${f(value)})` : f(value);
}

function sumText(a: number, add: boolean, b: number): string {
  return `${literal(a, true)} ${add ? '+' : '−'} ${literal(b)}`;
}

/**
 * The explanation of a ± b (spec §5.16): a negative b turned around (`−4 − (−6) = −4 + 6 = 2`),
 * a split at zero when the sum crosses it (`3 − 8 = 3 − 3 − 5 = −5`), otherwise the sum itself.
 */
export function explainAddSubtract(a: number, add: boolean, b: number): string {
  const sum = sumText(a, add, b);
  const answer = add ? a + b : a - b;
  if (b < 0) return `${sum} = ${f(a)} ${add ? '−' : '+'} ${f(-b)} = ${f(answer)}`;
  const sign = add ? '+' : '−';
  const towardZero = add ? a < 0 : a > 0;
  if (towardZero && b > Math.abs(a)) {
    const toZero = Math.abs(a);
    return `${sum} = ${f(a)} ${sign} ${f(toZero)} ${sign} ${f(b - toZero)} = ${f(answer)}`;
  }
  return `${sum} = ${f(answer)}`;
}

/** Minus a negative number read as minus (spec §3.4.1), then a wrong sign. */
function addSubtractTip(a: number, add: boolean, b: number): Diagnose {
  const answer = add ? a + b : a - b;
  return (given) => {
    if (!add && b < 0 && equals(given, fromInteger(a + b))) {
      return `Min een negatief getal is plus: ${sumText(a, false, b)} = ${f(a)} + ${f(-b)}.`;
    }
    return equals(given, fromInteger(-answer)) ? SIGN_TIP : undefined;
  };
}

/** `−4 − (−6) = ?` */
export function addSubtractQuestion(a: number, add: boolean, b: number): Question {
  const prompt = sumText(a, add, b);
  return {
    key: `negativeNumbers:${prompt}`,
    topic: 'negativeNumbers',
    steps: [
      numberStep({
        prompt: `${prompt} = ?`,
        answer: fromInteger(add ? a + b : a - b),
        explanation: explainAddSubtract(a, add, b),
        diagnose: addSubtractTip(a, add, b),
      }),
    ],
  };
}

/** `6 × 4 = 24; één negatief getal → −24` (spec §5.16). */
export function explainSigns(left: number, operator: '×' | ':', right: number): string {
  const answer = operator === '×' ? left * right : left / right;
  const negatives = [left, right].filter((value) => value < 0).length;
  const rule = negatives === 1 ? 'één negatief getal' : 'twee negatieve getallen';
  const unsigned = `${f(Math.abs(left))} ${operator} ${f(Math.abs(right))} = ${f(Math.abs(answer))}`;
  return `${unsigned}; ${rule} → ${f(answer)}`;
}

/** `−6 × 4 = ?` or `−24 : (−3) = ?`; a division is always exact. */
export function multiplyDivideQuestion(left: number, operator: '×' | ':', right: number): Question {
  const answer = operator === '×' ? left * right : left / right;
  const prompt = `${literal(left, true)} ${operator} ${literal(right)}`;
  return {
    key: `negativeNumbers:${prompt}`,
    topic: 'negativeNumbers',
    steps: [
      numberStep({
        prompt: `${prompt} = ?`,
        answer: fromInteger(answer),
        explanation: explainSigns(left, operator, right),
        diagnose: (given) => (equals(given, fromInteger(-answer)) ? PRODUCT_SIGN_TIP : undefined),
      }),
    ],
  };
}

const degrees = (value: number) => `${f(value)}${NO_BREAK_SPACE}°C`;

/** `Het is −5 °C. Het wordt 8 graden warmer. Hoeveel graden is het dan?` (change > 0: warmer) */
export function changeQuestion(start: number, change: number): Question {
  const warmer = change > 0;
  const result = start + change;
  const direction = warmer ? 'warmer' : 'kouder';
  return {
    key: `negativeNumbers:change:${start}:${change}`,
    topic: 'negativeNumbers',
    steps: [
      numberStep({
        prompt:
          `Het is ${degrees(start)}. Het wordt ${Math.abs(change)} graden ${direction}. ` +
          'Hoeveel graden is het dan?',
        answer: fromInteger(result),
        suffix: '°C',
        explanation: explainAddSubtract(start, warmer, Math.abs(change)),
        diagnose: (given) =>
          result !== 0 && equals(given, fromInteger(-result)) ? SIGN_TIP : undefined,
      }),
    ],
  };
}

/** The difference of the absolute values when one is below zero, their sum when both are. */
function differenceTip(night: number, day: number): Diagnose {
  return (given) => {
    if (day > 0 && equals(given, fromInteger(Math.abs(day + night)))) {
      return (
        `Van ${f(night)} naar 0 is ${f(-night)} graden, van 0 naar ${f(day)} nog ${f(day)}: ` +
        `samen ${f(day - night)}.`
      );
    }
    if (day < 0 && equals(given, fromInteger(-day - night))) {
      return `Allebei onder nul: het verschil is ${f(-night)} − ${f(-day)} = ${f(day - night)}.`;
    }
    return undefined;
  };
}

/** `'s Nachts is het −7 °C, overdag 4 °C. Hoeveel graden is het verschil?` */
export function differenceQuestion(night: number, day: number): Question {
  return {
    key: `negativeNumbers:difference:${night}:${day}`,
    topic: 'negativeNumbers',
    steps: [
      numberStep({
        prompt:
          `'s Nachts is het ${degrees(night)}, overdag ${degrees(day)}. ` +
          'Hoeveel graden is het verschil?',
        answer: fromInteger(day - night),
        suffix: 'graden',
        explanation: explainAddSubtract(day, false, night),
        diagnose: differenceTip(night, day),
      }),
    ],
  };
}

const nonZeroTerm = (rng: Rng) => randomIntWhere(rng, -MAX_TERM, MAX_TERM, (value) => value !== 0);
const withSign = (rng: Rng, value: number) => (rng() < 0.5 ? -value : value);

function addSubtract(rng: Rng): Question {
  const { a, add, b } = drawUntil(() => {
    const a = nonZeroTerm(rng);
    const b = nonZeroTerm(rng);
    const add = rng() < 0.5;
    const answer = add ? a + b : a - b;
    // Not 0, and not a sum of positive numbers only (5 + 7).
    return answer !== 0 && (a < 0 || b < 0 || answer < 0) ? { a, add, b } : null;
  });
  return addSubtractQuestion(a, add, b);
}

function multiplyDivide(rng: Rng): Question {
  const { x, y } = drawUntil(() => {
    const x = withSign(rng, randomInt(rng, MIN_FACTOR, MAX_FACTOR));
    const y = withSign(rng, randomInt(rng, MIN_FACTOR, MAX_FACTOR));
    return x < 0 || y < 0 ? { x, y } : null;
  });
  return rng() < 0.5 ? multiplyDivideQuestion(x, '×', y) : multiplyDivideQuestion(x * y, ':', y);
}

function temperature(rng: Rng): Question {
  if (rng() < 0.5) {
    const { start, change } = drawUntil(() => {
      const start = randomInt(rng, MIN_START, MAX_START);
      const change = withSign(rng, randomInt(rng, MIN_CHANGE, MAX_CHANGE));
      const result = start + change;
      const inRange = result >= MIN_RESULT && result <= MAX_RESULT;
      return inRange && (start < 0 || result < 0) ? { start, change } : null;
    });
    return changeQuestion(start, change);
  }
  const { night, day } = drawUntil(() => {
    const night = randomInt(rng, MIN_NIGHT, MAX_NIGHT);
    const day = randomInt(rng, MIN_DAY, MAX_DAY);
    // With night < day, a night below zero puts at least one of them below zero.
    return night < day && night < 0 ? { night, day } : null;
  });
  return differenceQuestion(night, day);
}

const BUILDERS: Record<NegativeForm, (rng: Rng) => Question> = {
  addSubtract,
  multiplyDivide,
  temperature,
};

/** One question of the given form. */
export function buildNegativeNumbers(rng: Rng, form: NegativeForm): Question {
  return BUILDERS[form](rng);
}

/** One of three forms, each equally likely (spec §5.16). */
export function generateNegativeNumbers(rng: Rng): Question {
  return buildNegativeNumbers(rng, pick(rng, NEGATIVE_FORMS));
}
