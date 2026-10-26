import { formatInteger as f, MINUS } from '../format';
import { randomInt, type Rng } from '../random';
import { fromInteger } from '../rational';
import { numberStep } from '../steps';
import { exactTip, type Diagnose } from '../tips';
import type { Question } from '../types';

// Guess and check (spec §5.43).
export type KindsContext = 'boerderij' | 'stalling';

export interface Kind {
  singular: string;
  plural: string;
  /** Legs or wheels each. */
  per: number;
}

/** kip/kippen 2, konijn/konijnen 4 (poten); fiets/fietsen 2, driewieler/driewielers 3 (wielen). */
export const KINDS: Readonly<Record<KindsContext, readonly [Kind, Kind]>> = {
  boerderij: [
    { singular: 'kip', plural: 'kippen', per: 2 },
    { singular: 'konijn', plural: 'konijnen', per: 4 },
  ],
  stalling: [
    { singular: 'fiets', plural: 'fietsen', per: 2 },
    { singular: 'driewieler', plural: 'driewielers', per: 3 },
  ],
};

const CONTEXTS = {
  boerderij: {
    prompt: (total: number, parts: number) =>
      `Op een boerderij lopen kippen en konijnen. Samen hebben ze ${total} koppen en ${parts} poten.`,
    question: (plural: string) => `Hoeveel ${plural} zijn er?`,
    guess: (total: number) => `stel dat alle ${total} dieren kippen zijn`,
    part: ['poot', 'poten'],
    each: 'elk konijn',
  },
  stalling: {
    prompt: (total: number, parts: number) =>
      `In een stalling staan fietsen en driewielers, samen ${total} stuks met ${parts} wielen.`,
    question: (plural: string) => `Hoeveel ${plural} staan er?`,
    guess: (total: number) => `stel dat alle ${total} fietsen zijn`,
    part: ['wiel', 'wielen'],
    each: 'elke driewieler',
  },
} as const;

function counted(count: number, singular: string, plural: string): string {
  return `${f(count)} ${count === 1 ? singular : plural}`;
}

function question(
  key: string,
  prompt: string,
  answer: number,
  explanation: string,
  diagnose: Diagnose,
): Question {
  return {
    key: `guessAndCheck:${key}`,
    topic: 'guessAndCheck',
    steps: [
      numberStep({
        prompt,
        answer: fromInteger(answer),
        explanation: `Slim proberen: ${explanation}`,
        diagnose,
      }),
    ],
  };
}

/** `first` of the first kind (2 per), `second` of the second; `askSecond` asks the second. */
export function twoKindsQuestion(
  context: KindsContext,
  first: number,
  second: number,
  askSecond: boolean,
): Question {
  const [low, high] = KINDS[context];
  const { prompt, question: ask, guess, part, each } = CONTEXTS[context];
  const total = first + second;
  const parts = first * low.per + second * high.per;
  const base = total * low.per;
  const short = parts - base;
  const more = high.per - low.per;
  const [partOne, partMany] = part;
  const division = more === 1 ? '' : `${f(short)} : ${more} = `;
  const steps = [
    `${guess(total)}: ${total} × ${low.per} = ${f(base)} ${partMany}`,
    `${f(parts)} ${MINUS} ${f(base)} = ${counted(short, partOne, partMany)} te weinig`,
    `${each} heeft ${counted(more, partOne, partMany)} meer: ${division}${counted(second, high.singular, high.plural)}`,
  ];
  if (!askSecond) {
    steps.push(`${total} ${MINUS} ${second} = ${counted(first, low.singular, low.plural)}`);
  }
  const asked = askSecond ? high : low;
  const other = askSecond ? low : high;
  return question(
    `kinds:${context}:${first}:${second}:${askSecond ? 'second' : 'first'}`,
    `${prompt(total, parts)} ${ask(asked.plural)}`,
    askSecond ? second : first,
    steps.join(' → '),
    exactTip(
      fromInteger(askSecond ? first : second),
      `Dat is het aantal ${other.plural}; gevraagd is het aantal ${asked.plural}.`,
    ),
  );
}

export function sumDifferenceQuestion(
  larger: number,
  smaller: number,
  askLarger: boolean,
): Question {
  const sum = larger + smaller;
  const difference = larger - smaller;
  const half = sum / 2;
  const shift = difference / 2;
  return question(
    `sum:${larger}:${smaller}:${askLarger ? 'larger' : 'smaller'}`,
    `Twee getallen zijn samen ${sum} en verschillen ${difference}. Wat is het ${askLarger ? 'grootste' : 'kleinste'} getal?`,
    askLarger ? larger : smaller,
    `${half} en ${half} zijn samen ${sum} maar verschillen 0 → maak het ene getal ${shift} groter en het andere ${shift} kleiner: ${larger} en ${smaller} verschillen ${difference} → ${askLarger ? larger : smaller}`,
    exactTip(
      fromInteger(askLarger ? smaller : larger),
      askLarger
        ? 'Dat is het kleinste getal; gevraagd is het grootste.'
        : 'Dat is het grootste getal; gevraagd is het kleinste.',
    ),
  );
}

function drawTwoKinds(rng: Rng): Question {
  const context: KindsContext = rng() < 0.5 ? 'boerderij' : 'stalling';
  const total = randomInt(rng, 5, 20);
  const second = randomInt(rng, 1, total - 1);
  return twoKindsQuestion(context, total - second, second, rng() < 0.5);
}

function drawSumDifference(rng: Rng): Question {
  const askLarger = rng() < 0.5;
  const sum = 2 * randomInt(rng, 5, 50);
  const smaller = randomInt(rng, 1, sum / 2 - 1);
  return sumDifferenceQuestion(sum - smaller, smaller, askLarger);
}

/** Two kinds and sum and difference, each 1/2. */
export function generateGuessAndCheck(rng: Rng): Question {
  return rng() < 0.5 ? drawTwoKinds(rng) : drawSumDifference(rng);
}
