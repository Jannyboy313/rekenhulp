import { formatRational } from '../format';
import { gcd } from '../primes';
import { drawUntil, pick, randomInt, shuffle, type Rng } from '../random';
import { compare, decimalPlaces, rational, subtract, type Rational } from '../rational';
import { choiceStep, fractionStep } from '../steps';
import type { Question } from '../types';
import { absDifference, decimalShown, fractionShown, type Shown } from './fractionNotation';

/** Spec §5.74: the denominators of RWT B.4. */
export const DENOMINATORS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 20, 25] as const;
export const MAX_SPREAD = rational(1n, 5n);
export const MIN_GAP = rational(1n, 100n);

export type Extreme = 'grootst' | 'kleinst';
export type Direction = '<' | '>';

/** `62%`; only in the mixed form. */
export const percentShown = (percent: number): Shown => ({
  ...decimalShown(rational(BigInt(percent), 100n)),
  text: `${percent}%`,
});

/** `5 op de 8`, a part of a whole; only in the mixed form. */
export const ratioShown = (p: number, q: number): Shown => ({
  ...fractionShown(p, q),
  text: `${p} op de ${q}`,
});

const byValue = (a: Shown, b: Shown) => compare(a.value, b.value);

const truncate = (value: Rational, decimals: number): Rational => {
  const scale = 10n ** BigInt(decimals);
  return rational((value.num * scale) / value.den, scale);
};

/**
 * Every number as a decimal; a fraction without a finite decimal is cut off and ends in `…`
 * (`0,33…`), with as many decimals as keep the order of the numbers strict.
 */
function decimalTexts(numbers: readonly Shown[]): Map<Shown, string> {
  const sorted = [...numbers].sort(byValue);
  const finite = (shown: Shown) => decimalPlaces(shown.value) !== null;
  for (let decimals = 2; decimals <= 8; decimals++) {
    const cut = (shown: Shown) => (finite(shown) ? shown.value : truncate(shown.value, decimals));
    const strict = sorted.every(
      (shown, index) => index === 0 || compare(cut(sorted[index - 1]!), cut(shown)) < 0,
    );
    if (strict) {
      return new Map(
        numbers.map((shown) => [shown, formatRational(cut(shown)) + (finite(shown) ? '' : '…')]),
      );
    }
  }
  throw new RangeError('Numbers too close to tell apart');
}

const chainOf = (numbers: readonly string[], direction: Direction) =>
  numbers.join(` ${direction} `);

function explanationOf(
  numbers: readonly Shown[],
  direction: Direction,
  conclusion: string,
): string {
  const texts = decimalTexts(numbers);
  const sorted = [...numbers].sort(byValue);
  const converted = sorted
    .filter((shown) => texts.get(shown) !== shown.text)
    .map((shown) => `${shown.text} = ${texts.get(shown)}`)
    .join(' en ');
  if (direction === '>') sorted.reverse();
  return `${converted} → ${chainOf(
    sorted.map((shown) => texts.get(shown)!),
    direction,
  )} → ${conclusion}`;
}

const keyOf = (numbers: readonly Shown[]) =>
  [...numbers]
    .sort(byValue)
    .map(({ text }) => text)
    .join('|');

/** `Welk getal is het grootst: 3/5, 0,58 of 5/8?` The answer is written as in the prompt. */
export function extremeQuestion(extreme: Extreme, numbers: readonly Shown[]): Question {
  const sorted = [...numbers].sort(byValue);
  const answer = extreme === 'grootst' ? sorted[sorted.length - 1]! : sorted[0]!;
  const last = numbers[numbers.length - 1]!;
  const prompt = `Welk getal is het ${extreme}: ${numbers
    .slice(0, -1)
    .map(({ text }) => text)
    .join(', ')} of ${last.text}?`;
  return {
    key: `compareFractions:extreme:${extreme}:${keyOf(numbers)}`,
    topic: 'compareFractions',
    steps: [
      fractionStep({
        prompt,
        answer: answer.value,
        expected: answer.text,
        explanation: explanationOf(numbers, '<', answer.text),
      }),
    ],
  };
}

/** The right chain and the three chains that each swap one neighbouring pair, shuffled. */
export function orderQuestion(direction: Direction, numbers: readonly Shown[], rng: Rng): Question {
  const sorted = [...numbers].sort(byValue);
  if (direction === '>') sorted.reverse();
  const chain = (items: readonly Shown[]) =>
    chainOf(
      items.map(({ text }) => text),
      direction,
    );
  const answer = chain(sorted);
  const swapped = sorted.slice(0, -1).map((_, index) => {
    const copy = [...sorted];
    [copy[index], copy[index + 1]] = [copy[index + 1]!, copy[index]!];
    return chain(copy);
  });
  return {
    key: `compareFractions:order:${direction}:${keyOf(numbers)}`,
    topic: 'compareFractions',
    steps: [
      choiceStep({
        prompt: 'Welke rij klopt?',
        options: shuffle(rng, [answer, ...swapped]),
        answer,
        explanation: explanationOf(numbers, direction, answer),
      }),
    ],
  };
}

/** `Welke is het grootst?` with the four numbers as options. */
export function mixedQuestion(extreme: Extreme, numbers: readonly Shown[], rng: Rng): Question {
  const sorted = [...numbers].sort(byValue);
  const answer = extreme === 'grootst' ? sorted[sorted.length - 1]! : sorted[0]!;
  return {
    key: `compareFractions:mixed:${extreme}:${keyOf(numbers)}`,
    topic: 'compareFractions',
    steps: [
      choiceStep({
        prompt: `Welke is het ${extreme}?`,
        options: shuffle(rng, numbers.map(({ text }) => text)),
        answer: answer.text,
        explanation: explanationOf(numbers, '<', answer.text),
      }),
    ],
  };
}

function randomTerms(rng: Rng): [number, number] {
  const q = pick(rng, DENOMINATORS);
  const options = Array.from({ length: q - 1 }, (_, index) => index + 1).filter(
    (p) => gcd(p, q) === 1,
  );
  return [pick(rng, options), q];
}

const randomFraction = (rng: Rng) => fractionShown(...randomTerms(rng));

/** 1 to 3 decimals, the last one not 0, in (0, 1). */
function randomDecimal(rng: Rng): Shown {
  const decimals = randomInt(rng, 1, 3);
  const digits = drawUntil(() => {
    const value = randomInt(rng, 1, 10 ** decimals - 1);
    return value % 10 === 0 ? null : value;
  });
  return decimalShown(rational(BigInt(digits), 10n ** BigInt(decimals)));
}

function randomNumbers(rng: Rng, fractions: number, decimals: number): Shown[] {
  return shuffle(rng, [
    ...Array.from({ length: fractions }, () => randomFraction(rng)),
    ...Array.from({ length: decimals }, () => randomDecimal(rng)),
  ]);
}

const distinct = (numbers: readonly Shown[], gap: Rational) =>
  numbers.every((a, i) =>
    numbers.every((b, j) => i === j || compare(absDifference(a.value, b.value), gap) >= 0),
  );

/** Apart by at least MIN_GAP, and the largest and smallest within MAX_SPREAD. */
function close(numbers: readonly Shown[]): boolean {
  const values = [...numbers].sort(byValue);
  const spread = subtract(values[values.length - 1]!.value, values[0]!.value);
  return distinct(numbers, MIN_GAP) && compare(spread, MAX_SPREAD) <= 0;
}

const randomExtremeWord = (rng: Rng) => pick(rng, ['grootst', 'kleinst'] as const);

function randomExtreme(rng: Rng): Question {
  const fractions = randomInt(rng, 1, 2);
  const numbers = drawUntil(() => {
    const candidate = randomNumbers(rng, fractions, 3 - fractions);
    return close(candidate) ? candidate : null;
  });
  return extremeQuestion(randomExtremeWord(rng), numbers);
}

function randomMixed(rng: Rng): Question {
  const numbers = drawUntil(() => {
    const candidate = [
      randomFraction(rng),
      randomDecimal(rng),
      percentShown(randomInt(rng, 1, 99)),
      ratioShown(...randomTerms(rng)),
    ];
    return close(candidate) ? candidate : null;
  });
  return mixedQuestion(randomExtremeWord(rng), numbers, rng);
}

function randomOrder(rng: Rng): Question {
  const numbers = drawUntil(() => {
    const candidate = randomNumbers(rng, 2, 2);
    return distinct(candidate, rational(1n, 1000000n)) ? candidate : null;
  });
  return orderQuestion(pick(rng, ['<', '>'] as const), numbers, rng);
}

export function generateCompareFractions(rng: Rng): Question {
  return pick(rng, [randomExtreme, randomOrder, randomMixed])(rng);
}
