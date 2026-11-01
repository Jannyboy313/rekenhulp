import { formatInteger } from '../format';
import { gcd, lcm } from '../primes';
import { drawUntil, pick, randomInt, range, type Rng } from '../random';
import { fromInteger } from '../rational';
import { numberStep } from '../steps';
import type { Question } from '../types';
import { gcdExplanation, lcmExplanation, lcmListExplanation } from './numberTheory';

/** LCM and GCD in context (spec §5.59). */
export type Kind = 'kgv' | 'ggd';
export type Context = 'bus' | 'lampen' | 'groepjes' | 'planken' | 'fruit' | 'tegels';

const CONTEXTS: Record<Kind, readonly Context[]> = {
  kgv: ['bus', 'lampen', 'groepjes'],
  ggd: ['planken', 'fruit', 'tegels'],
};

const SUFFIXES: Record<Context, string> = {
  bus: 'min',
  lampen: 's',
  groepjes: 'kinderen',
  planken: 'cm',
  fruit: 'schalen',
  tegels: 'cm',
};

const CONCEPTS: Record<Context, string> = {
  bus: 'Weer samen = KGV.',
  lampen: 'Weer samen = KGV.',
  groepjes: 'Past in alle groepjes = KGV.',
  planken: 'Zo lang mogelijk = GGD.',
  fruit: 'Zoveel mogelijk gelijke schalen = GGD.',
  tegels: 'Zo groot mogelijk = GGD.',
};

const MIN_TERM = 4;
const MAX_TERM = 30;
const MAX_LCM = 120;
const MIN_GROUP = 2;
const MAX_GROUP = 12;
const MAX_GROUP_LCM = 60;
const THREE_GROUPS_SHARE = 0.3;
const SHARED_FACTOR_SHARE = 0.75;
const MAX_COMMON_DIVISOR = 30;
const MAX_TERM_GGD: Record<'planken' | 'fruit', number> = { planken: 200, fruit: 100 };
const MIN_TERM_PLANKEN = 50;
const MIN_TILE_FLOOR = 100;
const MAX_TILE_FLOOR = 900;
const MIN_TILE = 20;

type Pair = readonly [number, number];

/** Pairs a < b whose quotients by the GCD are both at least 2 (so neither divides the other). */
function ggdPairs(terms: readonly number[], accept: (g: number) => boolean): Pair[] {
  const pairs: Pair[] = [];
  for (const a of terms) {
    for (const b of terms) {
      const g = gcd(a, b);
      if (a < b && accept(g) && a / g >= 2) pairs.push([a, b]);
    }
  }
  return pairs;
}

const GGD_PAIRS: Record<'planken' | 'fruit' | 'tegels', readonly Pair[]> = {
  planken: ggdPairs(
    range(MIN_TERM_PLANKEN, MAX_TERM_GGD.planken),
    (g) => g >= 2 && g <= MAX_COMMON_DIVISOR,
  ),
  fruit: ggdPairs(range(2, MAX_TERM_GGD.fruit), (g) => g >= 2 && g <= MAX_COMMON_DIVISOR),
  tegels: ggdPairs(
    range(MIN_TILE_FLOOR / 10, MAX_TILE_FLOOR / 10).map((n) => n * 10),
    (g) => g >= MIN_TILE,
  ),
};

function hasSharedFactor(numbers: readonly number[]): boolean {
  return numbers.some((a, i) => numbers.slice(i + 1).some((b) => gcd(a, b) > 1));
}

/** Two terms (bus, lampen) or two or three group sizes; shares a factor in 75% (spec §5.2). */
function lcmTerms(rng: Rng, context: Context): number[] {
  const wantShared = rng() < SHARED_FACTOR_SHARE;
  const groups = context === 'groepjes';
  const count = groups && rng() < THREE_GROUPS_SHARE ? 3 : 2;
  const [min, max, limit] = groups
    ? [MIN_GROUP, MAX_GROUP, MAX_GROUP_LCM]
    : [MIN_TERM, MAX_TERM, MAX_LCM];
  return drawUntil(() => {
    const terms = Array.from({ length: count }, () => randomInt(rng, min, max));
    if (new Set(terms).size !== count) return null;
    if (terms.reduce((a, b) => lcm(a, b)) > limit) return null;
    return hasSharedFactor(terms) === wantShared ? terms : null;
  });
}

/** The two terms of a GGD problem, in random order. */
function ggdTerms(rng: Rng, context: Context): number[] {
  const pair = pick(rng, GGD_PAIRS[context as keyof typeof GGD_PAIRS]);
  return rng() < 0.5 ? [...pair] : [pair[1], pair[0]];
}

function groupSizes(numbers: readonly number[]): string {
  const sizes = numbers.map(formatInteger);
  return numbers.length === 3
    ? `in groepjes van ${sizes[0]}, ${sizes[1]} en ${sizes[2]}`
    : `in groepjes van ${sizes[0]} en in groepjes van ${sizes[1]}`;
}

/** The word problem of a context with its numbers in the order shown. */
export function lcmGcdPrompt(context: Context, numbers: readonly number[]): string {
  const [a, b] = numbers.map(formatInteger) as [string, string];
  switch (context) {
    case 'bus':
      return `Bus A vertrekt elke ${a} minuten, bus B elke ${b} minuten. Om 8:00 vertrekken ze samen. Na hoeveel minuten weer?`;
    case 'lampen':
      return `Lamp A knippert elke ${a} seconden, lamp B elke ${b} seconden. Ze knipperen nu samen. Na hoeveel seconden weer?`;
    case 'groepjes':
      return `Een klas kan ${groupSizes(numbers)}, zonder dat er iemand overblijft. Hoeveel kinderen zijn er minstens?`;
    case 'planken':
      return `Een plank van ${a} cm en een van ${b} cm zaag je in zo lang mogelijke gelijke stukken, zonder afval. Hoe lang is een stuk?`;
    case 'fruit':
      return `Je hebt ${a} appels en ${b} peren en maakt zoveel mogelijk gelijke fruitschalen zonder over te houden. Hoeveel schalen?`;
    case 'tegels':
      return `Een vloer van ${a} cm bij ${b} cm leg je vol met zo groot mogelijke vierkante tegels. Hoe lang is een zijde?`;
  }
}

/** The concept, then the §5.2 / §5.3 explanation. */
export function lcmGcdExplanation(
  kind: Kind,
  context: Context,
  numbers: readonly number[],
): string {
  const [a, b] = numbers as [number, number];
  const detail =
    kind === 'kgv'
      ? numbers.length === 2
        ? lcmExplanation(a, b)
        : lcmListExplanation(numbers)
      : gcdExplanation(a, b);
  return `${CONCEPTS[context]} ${detail}`;
}

/** `Bus A vertrekt elke 12 minuten, bus B elke 18 minuten. … Na hoeveel minuten weer?` */
export function generateLcmGcdProblems(rng: Rng): Question {
  const kind: Kind = rng() < 0.5 ? 'kgv' : 'ggd';
  const context = pick(rng, CONTEXTS[kind]);
  const numbers = kind === 'kgv' ? lcmTerms(rng, context) : ggdTerms(rng, context);
  const answer = numbers.reduce((a, b) => (kind === 'kgv' ? lcm(a, b) : gcd(a, b)));
  const ascending = [...numbers].sort((x, y) => x - y);
  return {
    key: `lcmGcdProblems:${kind}:${context}:${ascending.join(':')}`,
    topic: 'lcmGcdProblems',
    steps: [
      numberStep({
        prompt: lcmGcdPrompt(context, numbers),
        answer: fromInteger(answer),
        suffix: SUFFIXES[context],
        explanation: lcmGcdExplanation(kind, context, ascending),
      }),
    ],
  };
}
