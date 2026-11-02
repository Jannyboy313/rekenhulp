import { formatInteger as f, NO_BREAK_SPACE } from '../format';
import { drawUntil, pick, randomInt, range, shuffle, type Rng } from '../random';
import { choiceStep } from '../steps';
import type { Question } from '../types';

// Words of arithmetic (spec §5.68): som, verschil, product, quotiënt, bijna / ruim, and cijfer.
export const ARITHMETIC_WORDS = ['som', 'verschil', 'product', 'quotiënt'] as const;
export type ArithmeticWord = (typeof ARITHMETIC_WORDS)[number];

export const APPROXIMATION_CONTEXTS = ['bedrag', 'kinderen', 'km', 'minuten'] as const;
export type ApproximationContext = (typeof APPROXIMATION_CONTEXTS)[number];
export type Direction = 'ruim' | 'bijna';

const ROUND_NUMBERS = [20, 50, 100, 200, 500, 1000] as const;
/** d is 2% to 8% of R, a whole number of at least 1; the far option is 30% from R. */
const MIN_PERCENT = 2;
const MAX_PERCENT = 8;
const FAR_PERCENT = 30;

const OPERATIONS: Record<
  ArithmeticWord,
  { article: string; verb: string; sign: string; apply: (a: number, b: number) => number }
> = {
  som: { article: 'de', verb: 'optellen', sign: '+', apply: (a, b) => a + b },
  verschil: { article: 'het', verb: 'aftrekken', sign: '−', apply: (a, b) => a - b },
  product: { article: 'het', verb: 'vermenigvuldigen', sign: '×', apply: (a, b) => a * b },
  quotiënt: { article: 'het', verb: 'delen', sign: ':', apply: (a, b) => a / b },
};

/** `Wat is het verschil van 48 en 12?` with the four results as options, ascending. */
export function operationQuestion(word: ArithmeticWord, a: number, b: number): Question {
  const { article, verb, sign, apply } = OPERATIONS[word];
  const options = ARITHMETIC_WORDS.map((other) => OPERATIONS[other].apply(a, b)).sort(
    (x, y) => x - y,
  );
  const answer = apply(a, b);
  return {
    key: `arithmeticWords:operation:${word}:${a}:${b}`,
    topic: 'arithmeticWords',
    steps: [
      choiceStep({
        prompt: `Wat is ${article} ${word} van ${f(a)} en ${f(b)}?`,
        options: options.map(f),
        answer: f(answer),
        explanation: `${word} = ${verb}: ${f(a)} ${sign} ${f(b)} = ${f(answer)}`,
      }),
    ],
  };
}

const NOUNS: Record<ApproximationContext, string> = {
  bedrag: 'Welk bedrag',
  kinderen: 'Welk aantal',
  km: 'Welke afstand',
  minuten: 'Welke tijd',
};

const withUnit = (context: ApproximationContext, value: number) =>
  context === 'bedrag' ? `€${NO_BREAK_SPACE}${f(value)}` : `${f(value)} ${context}`;

/** `Welk bedrag is ruim € 50?` for the round number `round` and the distance `d` to the answer. */
export function approximationQuestion(
  direction: Direction,
  context: ApproximationContext,
  round: number,
  d: number,
): Question {
  const ruim = direction === 'ruim';
  const far = round + ((ruim ? FAR_PERCENT : -FAR_PERCENT) * round) / 100;
  const answer = ruim ? round + d : round - d;
  const options = ruim ? [round - d, round, round + d, far] : [far, round - d, round, round + d];
  return {
    key: `arithmeticWords:approximation:${direction}:${context}:${round}:${d}`,
    topic: 'arithmeticWords',
    steps: [
      choiceStep({
        prompt: `${NOUNS[context]} is ${direction} ${withUnit(context, round)}?`,
        options: options.map((value) => withUnit(context, value)),
        answer: withUnit(context, answer),
        explanation: `${direction} ${withUnit(context, round)} = iets ${ruim ? 'meer' : 'minder'} dan ${withUnit(context, round)}`,
      }),
    ],
  };
}

/** The places from the right; index i holds the digit worth 10^i. */
export const PLACES = [
  'eenheden',
  'tientallen',
  'honderdtallen',
  'duizendtallen',
  'tienduizendtallen',
  'honderdduizendtallen',
] as const;
export type Place = (typeof PLACES)[number];

/** `Welk cijfer staat op de plaats van de duizendtallen in 207 458?`; `others` are three other digits of the number. */
export function digitQuestion(place: Place, number: number, others: readonly number[]): Question {
  const digits = [...String(number)].reverse().map(Number);
  const index = PLACES.indexOf(place);
  const answer = digits[index]!;
  const steps = PLACES.slice(0, index + 1).map((name, i) => `${digits[i]} ${name}`);
  return {
    key: `arithmeticWords:digit:${place}:${number}`,
    topic: 'arithmeticWords',
    steps: [
      choiceStep({
        prompt: `Welk cijfer staat op de plaats van de ${place} in ${f(number)}?`,
        options: [answer, ...others].sort((x, y) => x - y).map(String),
        answer: String(answer),
        explanation: `${f(number)}: ${steps.join(', ')} → ${answer}`,
      }),
    ],
  };
}

function digit(rng: Rng): Question {
  const number = drawUntil(() => {
    const candidate = randomInt(rng, 100000, 999999);
    return new Set(String(candidate)).size === 6 ? candidate : null;
  });
  const index = randomInt(rng, 0, PLACES.length - 1);
  const digits = [...String(number)].reverse().map(Number);
  const others = shuffle(rng, digits.filter((_, i) => i !== index)).slice(0, 3);
  return digitQuestion(PLACES[index]!, number, others);
}

function operation(rng: Rng): Question {
  const word = pick(rng, ARITHMETIC_WORDS);
  const { a, b } = drawUntil(() => {
    const b = randomInt(rng, 2, 12);
    const a = b * pick(rng, range(Math.ceil(12 / b), Math.floor(99 / b)));
    const results = ARITHMETIC_WORDS.map((other) => OPERATIONS[other].apply(a, b));
    return new Set(results).size === 4 ? { a, b } : null;
  });
  return operationQuestion(word, a, b);
}

function approximation(rng: Rng): Question {
  const round = pick(rng, ROUND_NUMBERS);
  const lowest = Math.max(1, Math.ceil((round * MIN_PERCENT) / 100));
  const highest = Math.floor((round * MAX_PERCENT) / 100);
  return approximationQuestion(
    pick(rng, ['ruim', 'bijna'] as const),
    pick(rng, APPROXIMATION_CONTEXTS),
    round,
    randomInt(rng, lowest, highest),
  );
}

/** One of three forms, each equally likely (spec §5.68). */
export function generateArithmeticWords(rng: Rng): Question {
  return pick(rng, [operation, approximation, digit])(rng);
}
