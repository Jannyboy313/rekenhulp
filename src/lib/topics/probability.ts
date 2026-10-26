import { formatFraction } from '../format';
import { drawUntil, pick, randomInt, shuffle, type Rng } from '../random';
import { rational } from '../rational';
import { simplestFractionStep } from '../steps';
import { exactTip } from '../tips';
import type { Question } from '../types';

// Probability (spec §5.38).
export interface DieEvent {
  text: string;
  outcomes: readonly number[];
}

/** The events of the die, in the order of the spec. */
export const DIE_EVENTS: readonly DieEvent[] = [
  { text: 'een 6', outcomes: [6] },
  { text: 'een even getal', outcomes: [2, 4, 6] },
  { text: 'een oneven getal', outcomes: [1, 3, 5] },
  { text: 'meer dan 4', outcomes: [5, 6] },
  { text: 'minder dan 3', outcomes: [1, 2] },
  { text: 'meer dan 2', outcomes: [3, 4, 5, 6] },
  { text: 'een 5 of een 6', outcomes: [5, 6] },
  { text: 'geen 6', outcomes: [1, 2, 3, 4, 5] },
  { text: 'een veelvoud van 3', outcomes: [3, 6] },
];

export type Colour = 'rood' | 'blauw' | 'groen' | 'geel';

export interface Marbles {
  colour: Colour;
  count: number;
}

const COLOURS: readonly Colour[] = ['rood', 'blauw', 'groen', 'geel'];

const ADJECTIVES: Readonly<Record<Colour, string>> = {
  rood: 'rode',
  blauw: 'blauwe',
  groen: 'groene',
  geel: 'gele',
};

/** `3/6 = 1/2`, or just `1/6` when the fraction is already in simplest form. */
function fractionText(count: number, total: number): string {
  const fraction = rational(BigInt(count), BigInt(total));
  const plain = `${count}/${total}`;
  return formatFraction(fraction) === plain ? plain : `${plain} = ${formatFraction(fraction)}`;
}

export function dieQuestion({ text, outcomes }: DieEvent): Question {
  return {
    key: `probability:die:${text}`,
    topic: 'probability',
    steps: [
      simplestFractionStep({
        prompt: `Je gooit met een dobbelsteen. Hoe groot is de kans op ${text}?`,
        answer: rational(BigInt(outcomes.length), 6n),
        decimalAllowed: true,
        explanation: `${outcomes.length} van de 6 uitkomsten: ${outcomes.join(', ')} → ${fractionText(outcomes.length, 6)}`,
      }),
    ],
  };
}

/** `3 rode, 5 blauwe en 2 groene`. */
function bagText(bag: readonly Marbles[]): string {
  const parts = bag.map(({ colour, count }) => `${count} ${ADJECTIVES[colour]}`);
  return `${parts.slice(0, -1).join(', ')} en ${parts[parts.length - 1]}`;
}

/** Asks `asked`, or with `not` a marble that is not `asked`. */
export function marblesQuestion(bag: readonly Marbles[], asked: Colour, not: boolean): Question {
  const total = bag.reduce((sum, { count }) => sum + count, 0);
  const own = bag.find(({ colour }) => colour === asked)!.count;
  const wanted = not ? total - own : own;
  const sum = bag.map(({ count }) => count).join(' + ');
  const verb = wanted === 1 ? 'is' : 'zijn';
  return {
    key: `probability:marbles:${bag.map(({ colour, count }) => `${colour}${count}`).join(',')}:${asked}:${not}`,
    topic: 'probability',
    steps: [
      simplestFractionStep({
        prompt: `In een zak zitten ${bagText(bag)} knikkers. Je pakt er zonder te kijken één. Hoe groot is de kans op ${
          not ? `een knikker die niet ${asked} is` : `een ${ADJECTIVES[asked]}`
        }?`,
        answer: rational(BigInt(wanted), BigInt(total)),
        decimalAllowed: true,
        explanation: `${wanted} van de ${sum} = ${total} knikkers ${verb} ${not ? 'niet ' : ''}${asked} → ${fractionText(wanted, total)}`,
        // The mistake: the marbles asked over the other marbles instead of over all of them.
        diagnose: exactTip(
          rational(BigInt(wanted), BigInt(total - wanted)),
          `Deel door het totaal aantal knikkers: ${sum} = ${total}.`,
        ),
      }),
    ],
  };
}

function drawMarbles(rng: Rng): Question {
  const colours = rng() < 0.5 ? 2 : 3;
  const not = rng() < 0.25;
  const { bag, asked } = drawUntil(() => {
    const chosen = shuffle(rng, COLOURS).slice(0, colours);
    // Shown in the order of the colours, not of the draw.
    const bag = COLOURS.filter((colour) => chosen.includes(colour)).map((colour) => ({
      colour,
      count: randomInt(rng, 1, 12),
    }));
    const total = bag.reduce((sum, { count }) => sum + count, 0);
    return total >= 5 && total <= 20 ? { bag, asked: pick(rng, bag).colour } : null;
  });
  return marblesQuestion(bag, asked, not);
}

/** The die and the marbles 1/2 each; the marbles ask "not" in 25%. */
export function generateProbability(rng: Rng): Question {
  return rng() < 0.5 ? dieQuestion(pick(rng, DIE_EVENTS)) : drawMarbles(rng);
}
