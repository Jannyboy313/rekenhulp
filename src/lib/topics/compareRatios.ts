import { capitalize, formatEuro } from '../format';
import { gcd, lcm } from '../primes';
import { drawUntil, pick, randomInt, range, shuffle, type Rng } from '../random';
import { rational } from '../rational';
import { choiceStep } from '../steps';
import type { Question } from '../types';

/** Spec §5.57. */
export const NAME_PAIRS = [
  ['Jack', 'Jasmijn'],
  ['Sam', 'Noor'],
  ['Daan', 'Lotte'],
] as const;

export const EVEN = 'evenveel';
export const UNKNOWN = 'niet te zeggen';

export type Ratio = readonly [number, number];

/** `Jack bakt met appels : peren = 1 : 2, Jasmijn met 3 : 4. Ze gebruiken allebei 3 appels. …` */
export function recipeQuestion(
  names: readonly [string, string],
  first: Ratio,
  second: Ratio,
  apples: number,
): Question {
  const pears = (ratio: Ratio) => (apples / ratio[0]) * ratio[1];
  const [firstPears, secondPears] = [pears(first), pears(second)];
  const answer = firstPears > secondPears ? names[0] : firstPears < secondPears ? names[1] : EVEN;
  const shown = (name: string, count: number) => `${name}: ${apples} appels → ${count} peren`;
  return {
    key: `compareRatios:recipe:${names[0]}:${first.join(':')}:${second.join(':')}:${apples}`,
    topic: 'compareRatios',
    steps: [
      choiceStep({
        prompt: `${names[0]} bakt met appels : peren = ${first[0]} : ${first[1]}, ${names[1]} met ${second[0]} : ${second[1]}. Ze gebruiken allebei ${apples} appels. Wie gebruikt de meeste peren?`,
        options: [names[0], names[1], EVEN, UNKNOWN],
        answer,
        explanation: `${shown(names[0], firstPears)}, ${shown(names[1], secondPears)} → ${answer}`,
      }),
    ],
  };
}

export const PRODUCTS = ['pakken sap', 'bekers yoghurt', 'rollen koekjes'] as const;
export const OFFER_COUNTS = [2, 3, 4, 5, 6, 10] as const;
const MIN_PRICE_CENTS = 40;
const MAX_PRICE_CENTS = 300;
const PRICE_STEP_CENTS = 5;

export interface Offer {
  count: number;
  /** The price per item in cents. */
  cents: number;
}

const offerText = ({ count, cents }: Offer) =>
  `${count} voor ${formatEuro(rational(BigInt(count * cents), 100n))}`;
const perItem = ({ cents }: Offer) => formatEuro(rational(BigInt(cents), 100n));

/** `Je koopt pakken sap. Welke aanbieding is het voordeligst?` Options are shown in `offers` order. */
export function offerQuestion(product: string, offers: readonly Offer[]): Question {
  const cheapest = offers.reduce((best, offer) => (offer.cents < best.cents ? offer : best));
  const byCount = [...offers].sort((a, b) => a.count - b.count);
  return {
    key: `compareRatios:offer:${product}:${byCount.map(({ count, cents }) => `${count}x${cents}`).join(':')}`,
    topic: 'compareRatios',
    steps: [
      choiceStep({
        prompt: `Je koopt ${product}. Welke aanbieding is het voordeligst?`,
        options: offers.map(offerText),
        answer: offerText(cheapest),
        explanation: `${offers.map(perItem).join(' – ')} → ${offerText(cheapest)}`,
      }),
    ],
  };
}

export interface RelativeContext {
  /** 'klas', 'club', 'park': the option and the label of a group. */
  noun: string;
  /** The first group in full; the second group only gives its numbers. */
  statement(part: number, whole: number): string;
  question: string;
}

export const RELATIVE_CONTEXTS: Readonly<Record<string, RelativeContext>> = {
  klas: {
    noun: 'klas',
    statement: (part, whole) => `${part} van de ${whole} leerlingen zijn ziek.`,
    question: 'Waar is naar verhouding het meest ziek?',
  },
  club: {
    noun: 'club',
    statement: (part, whole) => `${part} van de ${whole} leden doen mee.`,
    question: 'Waar doen naar verhouding de meeste leden mee?',
  },
  vakantiepark: {
    noun: 'park',
    statement: (part, whole) => `${part} van de ${whole} huisjes zijn bezet.`,
    question: 'Waar zijn naar verhouding de meeste huisjes bezet?',
  },
};

export const RELATIVE_WHOLES = [20, 24, 25, 30, 40, 50, 60, 80, 100] as const;

export interface Group {
  part: number;
  whole: number;
}

/** The share in percent, when it is a whole percentage. */
export const shareOf = ({ part, whole }: Group): number | null =>
  (part * 100) % whole === 0 ? (part * 100) / whole : null;

/** `Klas A: 6 van de 24 leerlingen zijn ziek. Klas B: 8 van de 40. Waar is naar verhouding het meest ziek?` */
export function relativeQuestion(context: string, a: Group, b: Group): Question {
  const { noun, statement, question } = RELATIVE_CONTEXTS[context]!;
  const [shareA, shareB] = [shareOf(a)!, shareOf(b)!];
  const [labelA, labelB] = [`${noun} A`, `${noun} B`];
  const answer = shareA > shareB ? labelA : shareA < shareB ? labelB : EVEN;
  return {
    key: `compareRatios:relative:${context}:${a.part}/${a.whole}:${b.part}/${b.whole}`,
    topic: 'compareRatios',
    steps: [
      choiceStep({
        prompt: `${capitalize(labelA)}: ${statement(a.part, a.whole)} ${capitalize(labelB)}: ${b.part} van de ${b.whole}. ${question}`,
        options: [labelA, labelB, EVEN, UNKNOWN],
        answer,
        explanation: `${a.part}/${a.whole} = ${shareA}%, ${b.part}/${b.whole} = ${shareB}% → ${answer}`,
      }),
    ],
  };
}

const RATIO_TERMS = range(1, 6);

function randomRecipe(rng: Rng): Question {
  const names = pick(rng, NAME_PAIRS);
  const scaled = rng() < 0.2;
  const [first, second, apples] = drawUntil(() => {
    const a = pick(rng, RATIO_TERMS);
    const b = pick(rng, RATIO_TERMS);
    if (gcd(a, b) !== 1) return null;
    let second: Ratio;
    if (scaled) {
      const times = pick(rng, [2, 3]);
      second = [a * times, b * times];
    } else {
      second = [pick(rng, RATIO_TERMS), pick(rng, RATIO_TERMS)];
      if (second[0] === a || gcd(second[0], second[1]) !== 1) return null;
    }
    if (second[0] > 6 || second[1] > 6) return null;
    const common = lcm(a, second[0]);
    const choices = range(1, Math.floor(12 / common)).map((times) => times * common);
    if (choices.length === 0) return null;
    const apples = pick(rng, choices);
    const pears = [(apples / a) * b, (apples / second[0]) * second[1]];
    return pears.every((count) => count <= 30) ? ([[a, b], second, apples] as const) : null;
  });
  return recipeQuestion(names, first, second, apples);
}

function randomOffer(rng: Rng): Question {
  const offers = drawUntil(() => {
    const counts = shuffle(rng, OFFER_COUNTS).slice(0, 4);
    const draws = counts.map((count) => ({
      count,
      cents:
        MIN_PRICE_CENTS +
        PRICE_STEP_CENTS *
          randomInt(rng, 0, (MAX_PRICE_CENTS - MIN_PRICE_CENTS) / PRICE_STEP_CENTS),
    }));
    return new Set(draws.map(({ cents }) => cents)).size === 4 ? draws : null;
  });
  return offerQuestion(pick(rng, PRODUCTS), offers);
}

function randomRelative(rng: Rng): Question {
  const context = pick(rng, Object.keys(RELATIVE_CONTEXTS));
  const draw = rng();
  const [a, b] = drawUntil(() => {
    const wholes = [pick(rng, RELATIVE_WHOLES), pick(rng, RELATIVE_WHOLES)] as const;
    if (wholes[0] === wholes[1]) return null;
    const groups = wholes.map((whole): Group => {
      const parts = range(1, whole - 1).filter((part) => shareOf({ part, whole }) !== null);
      return { part: pick(rng, parts), whole };
    }) as [Group, Group];
    const [shareA, shareB] = [shareOf(groups[0])!, shareOf(groups[1])!];
    if (draw < 0.15) return shareA === shareB ? groups : null;
    if (shareA === shareB) return null;
    if (draw < 0.85) {
      const larger = shareA > shareB ? groups[0] : groups[1];
      const smaller = larger === groups[0] ? groups[1] : groups[0];
      return larger.part < smaller.part ? groups : null;
    }
    return groups;
  });
  return relativeQuestion(context, a, b);
}

export function generateCompareRatios(rng: Rng): Question {
  switch (pick(rng, ['recipe', 'offer', 'relative'] as const)) {
    case 'recipe':
      return randomRecipe(rng);
    case 'offer':
      return randomOffer(rng);
    case 'relative':
      return randomRelative(rng);
  }
}
