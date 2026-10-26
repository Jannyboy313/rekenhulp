import { formatInteger as f, formatLiteral, formatRational, MINUS } from '../format';
import { drawUntil, pick, randomInt, type Rng } from '../random';
import { fromInteger, rational, type Rational } from '../rational';
import { numberStep } from '../steps';
import { exactTip, type Diagnose } from '../tips';
import type { Question } from '../types';

// Statistics (spec §5.33).
export type StatsContext = 'cijfers' | 'doelpunten' | 'temperatuur';
export type Measure = 'mean' | 'median' | 'mode' | 'range';

export interface ContextRange {
  label: string;
  min: number;
  max: number;
  lengths: readonly number[];
}

export const STATS_CONTEXTS: Readonly<Record<StatsContext, ContextRange>> = {
  cijfers: { label: 'Cijfers:', min: 3, max: 10, lengths: [5, 6] },
  doelpunten: { label: 'Doelpunten per wedstrijd:', min: 0, max: 6, lengths: [5, 6, 7] },
  temperatuur: { label: 'Temperaturen deze week in °C:', min: -5, max: 15, lengths: [7] },
};

const QUESTIONS: Readonly<Record<Measure, string>> = {
  mean: 'Wat is het gemiddelde?',
  median: 'Wat is de mediaan?',
  mode: 'Wat is de modus?',
  range: 'Wat is de spreidingsbreedte?',
};

const MEDIAN_TIP = 'Zet de getallen eerst op volgorde; de mediaan is het middelste getal.';

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

/** The middle value of an odd list, the mean of the middle two of an even one. */
function middle(sorted: readonly number[]): Rational {
  const half = sorted.length >> 1;
  return sorted.length % 2 === 1
    ? fromInteger(sorted[half]!)
    : rational(BigInt(sorted[half - 1]! + sorted[half]!), 2n);
}

export function median(values: readonly number[]): Rational {
  return middle([...values].sort((a, b) => a - b));
}

/** The single most frequent value, or null when there is a tie. */
export function uniqueMode(values: readonly number[]): number | null {
  const counts = new Map<number, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  const highest = Math.max(...counts.values());
  const modes = [...counts].filter(([, count]) => count === highest);
  return modes.length === 1 ? modes[0]![0] : null;
}

/** `6 + 8 + 7`: a negative term in parentheses, except the first. */
function sumText(values: readonly number[]): string {
  return values.map((value, index) => formatLiteral(value, index === 0)).join(' + ');
}

function listText(values: readonly number[]): string {
  return values.map((value) => f(value)).join(', ');
}

interface Answered {
  answer: Rational;
  explanation: string;
  diagnose?: Diagnose;
}

function answerFor(measure: Measure, values: readonly number[]): Answered {
  const count = values.length;
  switch (measure) {
    case 'mean': {
      const total = sum(values);
      return {
        answer: rational(BigInt(total), BigInt(count)),
        explanation: `${sumText(values)} = ${f(total)} → ${f(total)} : ${count} = ${formatRational(rational(BigInt(total), BigInt(count)))}`,
        diagnose: exactTip(
          fromInteger(total),
          `Deel de som nog door het aantal getallen: ${f(total)} : ${count}.`,
        ),
      };
    }
    case 'median': {
      const sorted = [...values].sort((a, b) => a - b);
      const answer = middle(sorted);
      const order = `op volgorde: ${listText(sorted)}`;
      const half = count >> 1;
      const explanation =
        count % 2 === 1
          ? `${order} → de middelste is ${formatRational(answer)}`
          : `${order} → (${sumText([sorted[half - 1]!, sorted[half]!])}) : 2 = ${formatRational(answer)}`;
      // The mistake: the middle of the list as shown, without putting it in order.
      return { answer, explanation, diagnose: exactTip(middle(values), MEDIAN_TIP) };
    }
    case 'mode': {
      const mode = uniqueMode(values);
      if (mode === null) throw new RangeError(`No single mode in ${values.join(', ')}`);
      const times = values.filter((value) => value === mode).length;
      return {
        answer: fromInteger(mode),
        explanation: `${f(mode)} komt het vaakst voor (${times} keer)`,
      };
    }
    case 'range': {
      const highest = Math.max(...values);
      const lowest = Math.min(...values);
      return {
        answer: fromInteger(highest - lowest),
        explanation: `hoogste ${MINUS} laagste = ${f(highest)} ${MINUS} ${formatLiteral(lowest)} = ${f(highest - lowest)}`,
      };
    }
  }
}

/** `Cijfers: 6, 8, 7, 5, 9. Wat is het gemiddelde?` The list is shown in the given order. */
export function statisticsQuestion(
  context: StatsContext,
  measure: Measure,
  values: readonly number[],
): Question {
  const { answer, explanation, diagnose } = answerFor(measure, values);
  const temperature = context === 'temperatuur';
  return {
    key: `statistics:${measure}:${context}:${values.join(':')}`,
    topic: 'statistics',
    steps: [
      numberStep({
        prompt: `${STATS_CONTEXTS[context].label} ${listText(values)}. ${QUESTIONS[measure]}`,
        answer,
        suffix: temperature ? (measure === 'range' ? 'graden' : '°C') : undefined,
        explanation,
        diagnose,
      }),
    ],
  };
}

/** `6, 8 en 7`. */
function joinList(values: readonly number[]): string {
  const last = values[values.length - 1]!;
  return `${values.slice(0, -1).join(', ')} en ${last}`;
}

/** The grade still needed for a whole `mean` over the given grades and one more. */
export function missingValueQuestion(given: readonly number[], mean: number): Question {
  const count = given.length + 1;
  const total = count * mean;
  const answer = total - sum(given);
  return {
    key: `statistics:missing:${mean}:${given.join(':')}`,
    topic: 'statistics',
    steps: [
      numberStep({
        prompt: `Je hebt de cijfers ${joinList(given)}. Welk cijfer moet je nog halen om gemiddeld een ${mean} te staan?`,
        answer: fromInteger(answer),
        explanation: `gemiddeld ${mean} bij ${count} cijfers = ${count} × ${mean} = ${total} → ${total}${given.map((value) => ` ${MINUS} ${value}`).join('')} = ${answer}`,
      }),
    ],
  };
}

const MEASURES = ['mean', 'median', 'mode', 'range'] as const;
const CONTEXTS = ['cijfers', 'doelpunten', 'temperatuur'] as const;

/** A list of the context, redrawn until it is acceptable for the measure. */
function drawValues(rng: Rng, context: StatsContext, measure: Measure): number[] {
  const { min, max, lengths } = STATS_CONTEXTS[context];
  return drawUntil(() => {
    const values = Array.from({ length: pick(rng, lengths) }, () => randomInt(rng, min, max));
    if (context === 'temperatuur' && !values.some((value) => value < 0)) return null;
    if (measure === 'mean') return sum(values) % values.length === 0 ? values : null;
    if (measure === 'mode') {
      const mode = uniqueMode(values);
      const times = values.filter((value) => value === mode).length;
      return mode !== null && times >= 2 && times <= 3 ? values : null;
    }
    return values;
  });
}

function drawMissing(rng: Rng): Question {
  const { given, mean } = drawUntil(() => {
    const given = Array.from({ length: randomInt(rng, 3, 5) }, () => randomInt(rng, 3, 10));
    const mean = randomInt(rng, 5, 8);
    const answer = (given.length + 1) * mean - sum(given);
    return answer >= 4 && answer <= 10 ? { given, mean } : null;
  });
  return missingValueQuestion(given, mean);
}

/** Mean, median, mode, range and the missing value, each 1/5; the contexts 1/3 each. */
export function generateStatistics(rng: Rng): Question {
  const form = pick(rng, [...MEASURES, 'missing'] as const);
  if (form === 'missing') return drawMissing(rng);
  const context = pick(rng, CONTEXTS);
  return statisticsQuestion(context, form, drawValues(rng, context, form));
}
