import { formatRational } from '../format';
import { drawUntil, pick, randomInt, type Rng } from '../random';
import { compare, equals, rational, type Rational } from '../rational';
import { choiceStep } from '../steps';
import type { Question } from '../types';

/** Spec §5.87. */
export const MEASURES = [
  'het gemiddelde',
  'de mediaan',
  'de modus',
  'de spreidingsbreedte',
] as const;

export const MEAN_MEDIAN_OPTIONS = [
  'Het gemiddelde is groter dan de mediaan',
  'Het gemiddelde is kleiner dan de mediaan',
  'Het gemiddelde is gelijk aan de mediaan',
  'De modus is gelijk aan het gemiddelde',
] as const;

export const CONTEXTS = ['Cijfers:', 'Inkomens in € 1000:', 'Leeftijden:'] as const;

const mean = (values: readonly number[]): Rational =>
  rational(BigInt(values.reduce((sum, value) => sum + value, 0)), BigInt(values.length));

function median(values: readonly number[]): Rational {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = sorted.length >> 1;
  return sorted.length % 2 === 1
    ? rational(BigInt(sorted[middle]!))
    : rational(BigInt(sorted[middle - 1]! + sorted[middle]!), 2n);
}

/** The mode when it is unique, otherwise null. */
function uniqueMode(values: readonly number[]): number | null {
  const counts = new Map<number, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  const best = Math.max(...counts.values());
  const modes = [...counts].filter(([, count]) => count === best);
  return modes.length === 1 ? modes[0]![0] : null;
}

const spread = (values: readonly number[]) => Math.max(...values) - Math.min(...values);

/** A decimal comma and at most 2 decimals (rounded half up); the comparison uses exact values. */
function show(value: Rational): string {
  const cents = (value.num * 200n + value.den) / (2n * value.den);
  return formatRational(rational(cents, 100n));
}

/** `Cijfers: 5, 6, 6, 7, 9. Er komt een 10 bij. Welke maat blijft gelijk?` */
export function unchangedQuestion(values: readonly number[], added: number): Question {
  const after = [...values, added];
  const modeBefore = uniqueMode(values)!;
  const rows = [
    {
      before: show(mean(values)),
      after: show(mean(after)),
      same: equals(mean(values), mean(after)),
    },
    {
      before: show(median(values)),
      after: show(median(after)),
      same: equals(median(values), median(after)),
    },
    {
      before: String(modeBefore),
      after: String(uniqueMode(after)),
      same: modeBefore === uniqueMode(after),
    },
    {
      before: String(spread(values)),
      after: String(spread(after)),
      same: spread(values) === spread(after),
    },
  ];
  const answer = MEASURES[rows.findIndex(({ same }) => same)]!;
  const explanation = `voor → na: ${rows
    .map(
      ({ before, after, same }, index) =>
        `${MEASURES[index]!.replace(/^(het|de) /, '')} ${before} → ${after} (${same ? 'blijft' : 'verandert'})`,
    )
    .join(', ')}`;
  return {
    key: `statisticsReasoning:unchanged:${values.join(',')}:${added}`,
    topic: 'statisticsReasoning',
    steps: [
      choiceStep({
        prompt: `Cijfers: ${values.join(', ')}. Er komt een ${added} bij. Welke maat blijft gelijk?`,
        options: MEASURES,
        answer,
        explanation,
      }),
    ],
  };
}

/** `Inkomens in € 1000: 2, 2, 3, 3, 15. Welke uitspraak klopt?` */
export function meanMedianQuestion(context: string, values: readonly number[]): Question {
  const [average, middle] = [mean(values), median(values)];
  const order = compare(average, middle);
  const answer = MEAN_MEDIAN_OPTIONS[order > 0 ? 0 : order < 0 ? 1 : 2];
  const sum = values.reduce((total, value) => total + value, 0);
  const verdict = order > 0 ? 'groter dan' : order < 0 ? 'kleiner dan' : 'gelijk aan';
  return {
    key: `statisticsReasoning:meanMedian:${context}:${values.join(',')}`,
    topic: 'statisticsReasoning',
    steps: [
      choiceStep({
        prompt: `${context} ${values.join(', ')}. Welke uitspraak klopt?`,
        options: MEAN_MEDIAN_OPTIONS,
        answer,
        explanation: `gemiddelde ${sum} : ${values.length} = ${show(average)}, mediaan ${show(middle)} → het gemiddelde is ${verdict} de mediaan`,
      }),
    ],
  };
}

function randomUnchanged(rng: Rng): Question {
  const [values, added] = drawUntil(() => {
    const values = Array.from({ length: randomInt(rng, 5, 7) }, () => randomInt(rng, 1, 20));
    const added = randomInt(rng, 1, 25);
    const after = [...values, added];
    const [modeBefore, modeAfter] = [uniqueMode(values), uniqueMode(after)];
    if (modeBefore === null || modeAfter === null) return null;
    const same = [
      equals(mean(values), mean(after)),
      equals(median(values), median(after)),
      modeBefore === modeAfter,
      spread(values) === spread(after),
    ].filter(Boolean).length;
    return same === 1 ? ([values, added] as const) : null;
  });
  return unchangedQuestion(values, added);
}

function randomMeanMedian(rng: Rng): Question {
  const context = pick(rng, CONTEXTS);
  const values = drawUntil(() => {
    const values = Array.from({ length: 5 }, () => randomInt(rng, 1, 20));
    const mode = uniqueMode(values);
    return mode !== null && !equals(rational(BigInt(mode)), mean(values)) ? values : null;
  });
  return meanMedianQuestion(context, values);
}

export function generateStatisticsReasoning(rng: Rng): Question {
  return rng() < 0.5 ? randomUnchanged(rng) : randomMeanMedian(rng);
}
