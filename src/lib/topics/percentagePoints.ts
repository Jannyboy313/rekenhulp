import { formatFraction, MINUS } from '../format';
import { drawUntil, pick, randomInt, type Rng } from '../random';
import { fromInteger, rational } from '../rational';
import { numberStep } from '../steps';
import { exactTip, type Diagnose } from '../tips';
import type { Question } from '../types';

// Percentage points (spec §5.34).
export type PointsContext = 'rente' | 'werkloosheid' | 'opkomst';
export type Unit = 'procentpunt' | 'procent';

/** The range of the old and the new percentage per context. */
export const POINTS_RANGES: Readonly<Record<PointsContext, readonly [number, number]>> = {
  rente: [1, 8],
  werkloosheid: [2, 12],
  opkomst: [40, 95],
};

export const RELATIVE_CHANGES: readonly number[] = [10, 20, 25, 50, 75, 100];

const SUBJECTS: Readonly<Record<PointsContext, { start: string; inQuestion: string }>> = {
  rente: { start: 'De rente', inQuestion: 'de rente' },
  werkloosheid: { start: 'De werkloosheid', inQuestion: 'de werkloosheid' },
  opkomst: { start: 'De opkomst bij de verkiezingen', inQuestion: 'de opkomst' },
};

/** The change in points and, relative to the old percentage, in percent. */
function change(oldPercent: number, newPercent: number) {
  const points = Math.abs(newPercent - oldPercent);
  return { points, percent: (points * 100) / oldPercent, increase: newPercent > oldPercent };
}

/** `1 van 4 = 1/4 = 25%`: the fraction is left out when it is whole. */
function shareText(points: number, oldPercent: number, percent: number): string {
  const fraction = rational(BigInt(points), BigInt(oldPercent));
  return `${points} van ${oldPercent} = ${fraction.den === 1n ? '' : `${formatFraction(fraction)} = `}${percent}%`;
}

/** Van o% naar n%: the change in procentpunten or in procent. */
export function differenceQuestion(
  context: PointsContext,
  oldPercent: number,
  newPercent: number,
  asked: Unit,
): Question {
  const { points, percent, increase } = change(oldPercent, newPercent);
  const { start, inQuestion } = SUBJECTS[context];
  const verb = increase ? 'stijgt' : 'daalt';
  const high = Math.max(oldPercent, newPercent);
  const low = Math.min(oldPercent, newPercent);
  const inPoints = asked === 'procentpunt';
  const diagnose: Diagnose = inPoints
    ? exactTip(
        fromInteger(percent),
        `Procentpunten is het verschil tussen de percentages: ${high} ${MINUS} ${low} = ${points}.`,
      )
    : exactTip(
        fromInteger(points),
        `Dat is het verschil in procentpunten; ${shareText(points, oldPercent, percent).replace(' = ', ' is ')}.`,
      );
  return {
    key: `percentagePoints:difference:${context}:${oldPercent}:${newPercent}:${asked}`,
    topic: 'percentagePoints',
    steps: [
      numberStep({
        prompt: `${start} ${verb} van ${oldPercent}% naar ${newPercent}%. ${
          inPoints ? 'Hoeveel procentpunt is dat?' : `Met hoeveel procent ${verb} ${inQuestion}?`
        }`,
        answer: fromInteger(inPoints ? points : percent),
        suffix: inPoints ? 'procentpunt' : '%',
        explanation: inPoints
          ? `${high} ${MINUS} ${low} = ${points} procentpunt`
          : `${high} ${MINUS} ${low} = ${points} → ${shareText(points, oldPercent, percent)}`,
        diagnose,
      }),
    ],
  };
}

/** o% changes by the amount in procentpunten or in procent: the new percentage n. */
export function newValueQuestion(
  context: PointsContext,
  oldPercent: number,
  newPercent: number,
  given: Unit,
): Question {
  const { points, percent, increase } = change(oldPercent, newPercent);
  const { start, inQuestion } = SUBJECTS[context];
  const sign = increase ? '+' : MINUS;
  const inPoints = given === 'procentpunt';
  const sum = `${oldPercent} ${sign} ${points} = ${newPercent}%`;
  // The mistake: the percentage added to or taken off the percentage itself.
  const diagnose: Diagnose | undefined = inPoints
    ? undefined
    : exactTip(
        fromInteger(increase ? oldPercent + percent : oldPercent - percent),
        `${percent}% van ${oldPercent}% is ${points} procentpunt: ${oldPercent}% ${sign} ${points}% = ${newPercent}%.`,
      );
  return {
    key: `percentagePoints:newValue:${context}:${oldPercent}:${newPercent}:${given}`,
    topic: 'percentagePoints',
    steps: [
      numberStep({
        prompt: `${start} is ${oldPercent}%. Die ${increase ? 'stijgt' : 'daalt'} met ${
          inPoints ? `${points} procentpunt` : `${percent}%`
        }. Hoeveel procent is ${inQuestion} nu?`,
        answer: fromInteger(newPercent),
        suffix: '%',
        explanation: inPoints ? sum : `${percent}% van ${oldPercent} = ${points} → ${sum}`,
        diagnose,
      }),
    ],
  };
}

const CONTEXTS = ['rente', 'werkloosheid', 'opkomst'] as const;
const UNITS = ['procentpunt', 'procent'] as const;

/** Difference or new value, each 1/2; the unit, the direction and the context are equally likely. */
export function generatePercentagePoints(rng: Rng): Question {
  const difference = rng() < 0.5;
  const context = pick(rng, CONTEXTS);
  const unit = pick(rng, UNITS);
  const increase = rng() < 0.5;
  const [min, max] = POINTS_RANGES[context];
  const { oldPercent, newPercent } = drawUntil(() => {
    const oldPercent = randomInt(rng, min, max);
    const relative = pick(rng, RELATIVE_CHANGES);
    if (!increase && relative > 75) return null;
    const scaled = oldPercent * (100 + (increase ? relative : -relative));
    const newPercent = scaled / 100;
    return Number.isInteger(newPercent) && newPercent >= min && newPercent <= max
      ? { oldPercent, newPercent }
      : null;
  });
  return difference
    ? differenceQuestion(context, oldPercent, newPercent, unit)
    : newValueQuestion(context, oldPercent, newPercent, unit);
}
