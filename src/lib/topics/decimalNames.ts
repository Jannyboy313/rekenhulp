import { formatRational } from '../format';
import { pick, randomInt, type Rng } from '../random';
import { rational } from '../rational';
import { choiceStep, numberStep } from '../steps';
import type { Question } from '../types';

interface Place {
  name: string;
  plural: string;
  /** The place is 10⁻ᵉˣᵖᵒⁿᵉⁿᵗ. */
  exponent: number;
}

/** Spec §5.73: tiende (10⁻¹) to miljardste (10⁻⁹), in the order of the options. */
export const PLACES: readonly Place[] = [
  { name: 'tiende', plural: 'tienden', exponent: 1 },
  { name: 'honderdste', plural: 'honderdsten', exponent: 2 },
  { name: 'duizendste', plural: 'duizendsten', exponent: 3 },
  { name: 'tienduizendste', plural: 'tienduizendsten', exponent: 4 },
  { name: 'honderdduizendste', plural: 'honderdduizendsten', exponent: 5 },
  { name: 'miljoenste', plural: 'miljoensten', exponent: 6 },
  { name: 'miljardste', plural: 'miljardsten', exponent: 9 },
];

/** The counts `k` and their words: 1 to 19 without 10, 25 and 75. */
export const COUNT_WORDS: readonly (readonly [number, string])[] = [
  [1, 'één'],
  [2, 'twee'],
  [3, 'drie'],
  [4, 'vier'],
  [5, 'vijf'],
  [6, 'zes'],
  [7, 'zeven'],
  [8, 'acht'],
  [9, 'negen'],
  [11, 'elf'],
  [12, 'twaalf'],
  [13, 'dertien'],
  [14, 'veertien'],
  [15, 'vijftien'],
  [16, 'zestien'],
  [17, 'zeventien'],
  [18, 'achttien'],
  [19, 'negentien'],
  [25, 'vijfentwintig'],
  [75, 'vijfenzeventig'],
];

const WINDOW = 4;

function wordOf(k: number): string {
  return COUNT_WORDS.find(([count]) => count === k)![1];
}

const valueOf = (k: number, place: Place) => rational(BigInt(k), 10n ** BigInt(place.exponent));

/** `Schrijf als kommagetal: acht duizendste` */
export function wordsToNumberQuestion(k: number, placeIndex: number): Question {
  const place = PLACES[placeIndex]!;
  const answer = valueOf(k, place);
  return {
    key: `decimalNames:words:${k}:${place.name}`,
    topic: 'decimalNames',
    steps: [
      numberStep({
        prompt: `Schrijf als kommagetal: ${wordOf(k)} ${place.name}`,
        answer,
        explanation: `${place.name} = ${formatRational(valueOf(1, place))} → ${k} × ${formatRational(valueOf(1, place))} = ${formatRational(answer)}`,
      }),
    ],
  };
}

/** `Hoe spreek je 0,007 uit?`; the options are the four places from `windowStart` on. */
export function numberToWordsQuestion(
  k: number,
  placeIndex: number,
  windowStart: number,
): Question {
  const place = PLACES[placeIndex]!;
  const shown = formatRational(valueOf(k, place));
  const text = (candidate: Place) => `${wordOf(k)} ${candidate.name}`;
  const lastDigit = k < 10 ? `de ${k}` : 'het laatste cijfer';
  return {
    key: `decimalNames:number:${k}:${place.name}`,
    topic: 'decimalNames',
    steps: [
      choiceStep({
        prompt: `Hoe spreek je ${shown} uit?`,
        options: PLACES.slice(windowStart, windowStart + WINDOW).map(text),
        answer: text(place),
        explanation: `${shown}: ${lastDigit} staat op de plek van de ${place.plural} → ${text(place)}`,
      }),
    ],
  };
}

export function generateDecimalNames(rng: Rng): Question {
  const [k] = pick(rng, COUNT_WORDS);
  const placeIndex = randomInt(rng, 0, PLACES.length - 1);
  if (rng() < 0.5) return wordsToNumberQuestion(k, placeIndex);
  const first = Math.max(0, placeIndex - WINDOW + 1);
  const last = Math.min(placeIndex, PLACES.length - WINDOW);
  return numberToWordsQuestion(k, placeIndex, randomInt(rng, first, last));
}
