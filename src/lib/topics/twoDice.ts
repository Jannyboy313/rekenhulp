import { formatFraction, MINUS } from '../format';
import { pick, range, type Rng } from '../random';
import { rational } from '../rational';
import { simplestFractionStep } from '../steps';
import type { Question } from '../types';

// Two dice and coins (spec §5.86). Counted by enumeration; the answer is a fraction.

type Pair = readonly [number, number];

const FACES = range(1, 6);
const DICE_TOTAL = 36;
const COIN_THROWS = [3, 4] as const;

/** The 36 equally likely outcomes of two dice, first die first. */
const PAIRS: readonly Pair[] = FACES.flatMap((a) => FACES.map((b): Pair => [a, b]));

export interface DiceEvent {
  text: string;
  outcomes: readonly Pair[];
  /** The way to the count, without the leading total: `een som van 5: 1 + 4, … = 4 uitkomsten`. */
  detail: string;
}

/** `4 uitkomsten`, `1 uitkomst`. */
function outcomesText(count: number): string {
  return `${count} ${count === 1 ? 'uitkomst' : 'uitkomsten'}`;
}

function listed(pairs: readonly Pair[], sign: string): string {
  return pairs.map(([a, b]) => `${a} ${sign} ${b}`).join(', ');
}

function diceEvent(
  text: string,
  wins: (pair: Pair) => boolean,
  detail: (outcomes: readonly Pair[]) => string,
): DiceEvent {
  const outcomes = PAIRS.filter(wins);
  return { text, outcomes, detail: `${text}: ${detail(outcomes)}` };
}

const sumEvent = (text: string, wins: (sum: number) => boolean) =>
  diceEvent(
    text,
    ([a, b]) => wins(a + b),
    (outcomes) => `${listed(outcomes, '+')} = ${outcomesText(outcomes.length)}`,
  );

export const DICE_EVENTS: readonly DiceEvent[] = [
  sumEvent('een som van 5', (sum) => sum === 5),
  sumEvent('een som van 7', (sum) => sum === 7),
  sumEvent('een som van 8', (sum) => sum === 8),
  sumEvent('een som van 11 of meer', (sum) => sum >= 11),
  sumEvent('een som kleiner dan 5', (sum) => sum < 5),
  diceEvent(
    'twee dezelfde getallen',
    ([a, b]) => a === b,
    (outcomes) => `1-1 t/m 6-6 = ${outcomesText(outcomes.length)}`,
  ),
  diceEvent(
    'twee even getallen',
    ([a, b]) => a % 2 === 0 && b % 2 === 0,
    (outcomes) => `3 × 3 = ${outcomesText(outcomes.length)}`,
  ),
  diceEvent(
    'minstens één zes',
    ([a, b]) => a === 6 || b === 6,
    (outcomes) =>
      `${DICE_TOTAL} ${MINUS} ${DICE_TOTAL - outcomes.length} = ${outcomesText(outcomes.length)}`,
  ),
  diceEvent(
    'geen enkele zes',
    ([a, b]) => a !== 6 && b !== 6,
    (outcomes) => `5 × 5 = ${outcomesText(outcomes.length)}`,
  ),
  diceEvent(
    'een even som',
    ([a, b]) => (a + b) % 2 === 0,
    (outcomes) => `de helft van ${DICE_TOTAL} = ${outcomesText(outcomes.length)}`,
  ),
  diceEvent(
    'een product van 12',
    ([a, b]) => a * b === 12,
    (outcomes) => `${listed(outcomes, '×')} = ${outcomesText(outcomes.length)}`,
  ),
];

export interface CoinEvent {
  text: string;
  /** An outcome of K (kop) and M (munt) per throw, such as 'KMM'. */
  wins: (outcome: string) => boolean;
  detail: (outcomes: readonly string[], throws: number) => string;
}

const heads = (outcome: string): number => outcome.replaceAll('M', '').length;

function listedCoins(text: string, wins: (outcome: string) => boolean): CoinEvent {
  return {
    text,
    wins,
    detail: (outcomes) => `${text}: ${outcomes.join(', ')} = ${outcomesText(outcomes.length)}`,
  };
}

export const COIN_EVENTS: readonly CoinEvent[] = [
  listedCoins('elke keer kop', (outcome) => !outcome.includes('M')),
  listedCoins('precies één keer kop', (outcome) => heads(outcome) === 1),
  listedCoins('precies twee keer kop', (outcome) => heads(outcome) === 2),
  {
    text: 'minstens één keer munt',
    wins: (outcome) => outcome.includes('M'),
    detail: (outcomes, throws) =>
      `minstens één keer munt: alles behalve ${'K'.repeat(throws)} → ${2 ** throws} ${MINUS} 1 = ${outcomes.length}`,
  },
];

/** Every outcome of the throws in binary order: KKK, KKM, KMK, … (K = kop, M = munt). */
function coinOutcomes(throws: number): string[] {
  return range(0, 2 ** throws - 1).map((index) =>
    Array.from({ length: throws }, (_, throwIndex) =>
      (index >> (throws - 1 - throwIndex)) & 1 ? 'M' : 'K',
    ).join(''),
  );
}

/** `3/6 = 1/2`, or just `1/6` when the fraction is already in simplest form. */
function fractionText(count: number, total: number): string {
  const plain = `${count}/${total}`;
  const simplest = formatFraction(rational(BigInt(count), BigInt(total)));
  return simplest === plain ? plain : `${plain} = ${simplest}`;
}

export function diceQuestion(event: DiceEvent): Question {
  const won = event.outcomes.length;
  return {
    key: `twoDice:dice:${event.text}`,
    topic: 'twoDice',
    steps: [
      simplestFractionStep({
        prompt: `Je gooit met twee dobbelstenen. Hoe groot is de kans op ${event.text}?`,
        answer: rational(BigInt(won), BigInt(DICE_TOTAL)),
        decimalAllowed: true,
        explanation: `${outcomesText(DICE_TOTAL)}; ${event.detail} → ${fractionText(won, DICE_TOTAL)}`,
      }),
    ],
  };
}

export function coinQuestion(throws: number, event: CoinEvent): Question {
  const outcomes = coinOutcomes(throws);
  const won = outcomes.filter(event.wins);
  const total = outcomes.length;
  const product = Array.from({ length: throws }, () => '2').join(' × ');
  return {
    key: `twoDice:coins:${throws}:${event.text}`,
    topic: 'twoDice',
    steps: [
      simplestFractionStep({
        prompt: `Je gooit ${throws} keer een munt op. Hoe groot is de kans op ${event.text}?`,
        answer: rational(BigInt(won.length), BigInt(total)),
        decimalAllowed: true,
        explanation: `${product} = ${outcomesText(total)}; ${event.detail(won, throws)} → ${fractionText(won.length, total)}`,
      }),
    ],
  };
}

/** Dice and coins 1/2 each; the coins throw 3 or 4 times. */
export function generateTwoDice(rng: Rng): Question {
  return rng() < 0.5
    ? diceQuestion(pick(rng, DICE_EVENTS))
    : coinQuestion(pick(rng, COIN_THROWS), pick(rng, COIN_EVENTS));
}
