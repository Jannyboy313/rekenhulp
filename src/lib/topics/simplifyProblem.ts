import { formatInteger as f, MINUS } from '../format';
import { pick, randomInt, range, type Rng } from '../random';
import { fromInteger } from '../rational';
import { numberStep } from '../steps';
import { exactTip, type Diagnose } from '../tips';
import type { Question } from '../types';

// Simplify the problem (spec §5.44).

/** n even in [10, 50] and 60, 70, 80, 90, 100: 26 values. */
export const GAUSS_ENDS: readonly number[] = [
  ...range(5, 25).map((half) => 2 * half),
  60,
  70,
  80,
  90,
  100,
];
export const DIVISIBLE_LIMITS: readonly number[] = [50, 100, 200];
export const POST_SPACINGS: readonly number[] = [2, 4, 5, 10, 20, 25];
export const FIGURE_NUMBERS: readonly number[] = [10, 12, 15, 20, 25, 30, 50, 100];

export type Pattern = 'vierkantjes' | 'driehoekjes' | 'tafels';
export interface PatternRule {
  /** The value of figure 1. */
  first: number;
  /** What each next figure adds. */
  step: number;
}
export const PATTERNS: Readonly<Record<Pattern, PatternRule>> = {
  vierkantjes: { first: 4, step: 3 },
  driehoekjes: { first: 3, step: 2 },
  tafels: { first: 4, step: 2 },
};

function question(
  key: string,
  prompt: string,
  answer: number,
  explanation: string,
  options: { diagnose?: Diagnose; prefix?: string } = {},
): Question {
  return {
    key: `simplifyProblem:${key}`,
    topic: 'simplifyProblem',
    steps: [
      numberStep({
        prompt,
        answer: fromInteger(answer),
        explanation: `Vereenvoudigen: ${explanation}`,
        ...options,
      }),
    ],
  };
}

export function gaussQuestion(n: number): Question {
  const pairs = n / 2;
  const pair = n + 1;
  const answer = pairs * pair;
  return question(
    `gauss:${n}`,
    `Wat is 1 + 2 + 3 + … + ${n}?`,
    answer,
    `maak paren van de buitenste getallen: 1 + ${n} = ${pair}, 2 + ${n - 1} = ${pair}, … → ${n} getallen zijn ${pairs} paren van ${pair} → ${pairs} × ${pair} = ${f(answer)}`,
    {
      diagnose: exactTip(
        fromInteger(n * pair),
        `${n} getallen maken ${pairs} paren, geen ${n}: ${pairs} × ${pair}.`,
      ),
    },
  );
}

export function divisibleQuestion(limit: number, divisor: number): Question {
  const answer = Math.floor(limit / divisor);
  return question(
    `divisible:${limit}:${divisor}`,
    `Hoeveel getallen van 1 tot en met ${limit} zijn deelbaar door ${divisor}?`,
    answer,
    `${divisor} = 1 × ${divisor}, …, ${answer * divisor} = ${answer} × ${divisor} en ${answer + 1} × ${divisor} = ${(answer + 1) * divisor} is te groot → ${answer} getallen`,
  );
}

export function inclusiveCountQuestion(from: number, to: number): Question {
  const answer = to - from + 1;
  return question(
    `inclusive:${from}:${to}`,
    `Hoeveel getallen zijn er van ${from} tot en met ${to}?`,
    answer,
    `van 1 tot en met ${to} zijn ${to} getallen; zonder 1 tot en met ${from - 1} blijven er ${to} ${MINUS} ${from - 1} = ${answer} over`,
    {
      diagnose: exactTip(
        fromInteger(to - from),
        `Tel ${from} en ${to} allebei mee: ${to} ${MINUS} ${from} + 1 = ${answer}.`,
      ),
    },
  );
}

export function fencePostQuestion(spacing: number, pieces: number): Question {
  const length = spacing * pieces;
  const answer = pieces + 1;
  return question(
    `posts:${spacing}:${pieces}`,
    `Langs een pad van ${length} meter staat om de ${spacing} meter een paaltje, ook aan het begin en aan het eind. Hoeveel paaltjes zijn dat?`,
    answer,
    `een pad van ${2 * spacing} meter heeft 3 paaltjes, 1 meer dan de 2 stukken → ${length} : ${spacing} = ${pieces} stukken → ${pieces} + 1 = ${answer} paaltjes`,
    {
      diagnose: exactTip(
        fromInteger(pieces),
        `Er staat ook een paaltje aan het begin: ${pieces} stukken hebben ${answer} paaltjes.`,
      ),
    },
  );
}

const LUCIFERS = (shape: string, { first, step }: PatternRule) =>
  `${shape} van lucifers op een rij: figuur 1 heeft ${first} lucifers, figuur 2 heeft ${first + step} en figuur 3 heeft ${first + 2 * step}.`;

interface PatternText {
  intro: string;
  value: (n: number) => string;
  reverse: (value: number) => string;
  /** The growth and the steps up to figure n, before `→ first + steps × step`. */
  growth: (n: number) => string;
  /** The extra amount over figure 1, before `→ … : step`. */
  extra: (value: number) => string;
  /** The figure from the steps. */
  figure: (steps: number, n: number) => string;
  stepsTip: (n: number) => string;
  prefix?: string;
}

function lucifersText(shape: string, rule: PatternRule): PatternText {
  return {
    intro: LUCIFERS(shape, rule),
    value: (n) => `Hoeveel lucifers heeft figuur ${n}?`,
    reverse: (value) => `Welke figuur heeft ${f(value)} lucifers?`,
    growth: (n) =>
      `elke figuur heeft ${rule.step} lucifers meer; van figuur 1 naar figuur ${n} zijn ${n - 1} stappen`,
    extra: (value) =>
      `${f(value)} ${MINUS} ${rule.first} = ${f(value - rule.first)} lucifers meer dan figuur 1`,
    figure: (steps, n) => `figuur 1 + ${steps} = figuur ${n}`,
    stepsTip: (n) => `Van figuur 1 naar figuur ${n} zijn ${n - 1} stappen, geen ${n}.`,
    prefix: 'figuur',
  };
}

const PATTERN_TEXTS: Readonly<Record<Pattern, PatternText>> = {
  vierkantjes: lucifersText('Vierkantjes', PATTERNS.vierkantjes),
  driehoekjes: lucifersText('Driehoekjes', PATTERNS.driehoekjes),
  tafels: {
    intro:
      'Tafels staan in een rij tegen elkaar. Aan 1 tafel passen 4 stoelen, aan 2 tafels 6 en aan 3 tafels 8.',
    value: (n) => `Hoeveel stoelen passen er aan ${n} tafels?`,
    reverse: (value) => `Hoeveel tafels heb je nodig voor ${f(value)} stoelen?`,
    growth: (n) =>
      `elke tafel geeft ${PATTERNS.tafels.step} stoelen meer; van 1 naar ${n} tafels zijn ${n - 1} stappen`,
    extra: (value) =>
      `${f(value)} ${MINUS} ${PATTERNS.tafels.first} = ${f(value - PATTERNS.tafels.first)} stoelen meer dan bij 1 tafel`,
    figure: (steps, n) => `1 + ${steps} = ${n} tafels`,
    stepsTip: (n) => `Van 1 naar ${n} tafels zijn ${n - 1} stappen, geen ${n}.`,
  },
};

/** Asks the value of figure `n`, or with `reverse` the figure with that value. */
export function figureQuestion(pattern: Pattern, n: number, reverse: boolean): Question {
  const { first, step } = PATTERNS[pattern];
  const text = PATTERN_TEXTS[pattern];
  const steps = n - 1;
  const value = first + steps * step;
  const key = `figure:${pattern}:${n}:${reverse ? 'reverse' : 'value'}`;
  if (reverse) {
    return question(
      key,
      `${text.intro} ${text.reverse(value)}`,
      n,
      `${text.extra(value)} → ${f(value - first)} : ${step} = ${steps} stappen → ${text.figure(steps, n)}`,
      { prefix: text.prefix },
    );
  }
  return question(
    key,
    `${text.intro} ${text.value(n)}`,
    value,
    `${text.growth(n)} → ${first} + ${steps} × ${step} = ${f(value)}`,
    { diagnose: exactTip(fromInteger(first + n * step), text.stepsTip(n)) },
  );
}

function drawCounting(rng: Rng): Question {
  switch (pick(rng, ['divisible', 'inclusive', 'posts'] as const)) {
    case 'divisible':
      return divisibleQuestion(pick(rng, DIVISIBLE_LIMITS), randomInt(rng, 3, 9));
    case 'inclusive': {
      const from = randomInt(rng, 11, 99);
      return inclusiveCountQuestion(from, from + randomInt(rng, 10, 150));
    }
    case 'posts': {
      const spacing = pick(rng, POST_SPACINGS);
      return fencePostQuestion(spacing, randomInt(rng, 3, Math.min(20, 500 / spacing)));
    }
  }
}

/** Gauss sums, counting and figure patterns, each 1/3. */
export function generateSimplifyProblem(rng: Rng): Question {
  switch (pick(rng, ['gauss', 'counting', 'figure'] as const)) {
    case 'gauss':
      return gaussQuestion(pick(rng, GAUSS_ENDS));
    case 'counting':
      return drawCounting(rng);
    case 'figure':
      return figureQuestion(
        pick(rng, ['vierkantjes', 'driehoekjes', 'tafels'] as const),
        pick(rng, FIGURE_NUMBERS),
        rng() < 0.5,
      );
  }
}
