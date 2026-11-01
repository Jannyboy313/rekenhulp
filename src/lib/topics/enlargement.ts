import { formatRational, MINUS } from '../format';
import { drawUntil, pick, randomInt, type Rng } from '../random';
import {
  divide,
  fromInteger,
  hasAtMostDecimals,
  HUNDRED,
  isInteger,
  type Rational,
} from '../rational';
import { numberStep } from '../steps';
import type { Question } from '../types';
import { percentOf } from './percentages';

/** Spec §5.56. */
export const ENLARGE_PERCENTAGES = [10, 20, 25, 50, 100] as const;
export const REDUCE_PERCENTAGES = [10, 20, 25, 50] as const;
export const COPY_PERCENTAGES = [50, 75, 80, 120, 125, 150, 200] as const;

const MIN_LENGTH = 4;
const MAX_LENGTH = 40;

export type Direction = 'enlarge' | 'reduce';
export type Dimension = 'breed' | 'hoog';
export type Item = 'foto' | 'tekening' | 'plattegrond';
const ITEMS: readonly Item[] = ['foto', 'tekening', 'plattegrond'];
const DIMENSIONS: readonly Dimension[] = ['breed', 'hoog'];

export type EnlargementForm = 'withPercent' | 'atPercent' | 'findPercent' | 'back';
const FORMS: readonly EnlargementForm[] = ['withPercent', 'atPercent', 'findPercent', 'back'];

interface Context {
  item: Item;
  dimension: Dimension;
}

const cm = (value: Rational) => `${formatRational(value)} cm`;
const length = (value: number) => fromInteger(value);

/** The copier setting of a change: 125% for an enlargement of 25%, 80% for a reduction of 20%. */
const settingOf = (direction: Direction, percentage: number) =>
  direction === 'enlarge' ? 100 + percentage : 100 - percentage;

/** The percentage that is easiest to start from for `percentage`% of a length. */
function stepPercentage(percentage: number): number {
  if (percentage % 100 === 0) return 100;
  if (percentage % 50 === 0) return 50;
  if (percentage % 25 === 0) return 25;
  return 10;
}

function question(
  form: string,
  { item, dimension }: Context,
  numbers: readonly (number | string)[],
  prompt: string,
  answer: Rational,
  suffix: string,
  explanation: string,
): Question {
  return {
    key: `enlargement:${form}:${item}:${dimension}:${numbers.join(':')}`,
    topic: 'enlargement',
    steps: [numberStep({ prompt, answer, suffix, explanation })],
  };
}

/** `Je vergroot een foto van 12 cm breed met 25%. Hoe breed wordt de foto?` */
export function withPercentQuestion(
  context: Context,
  direction: Direction,
  percentage: number,
  original: number,
): Question {
  const { item, dimension } = context;
  const enlarge = direction === 'enlarge';
  const change = percentOf(fromInteger(percentage), length(original));
  const answer = percentOf(fromInteger(settingOf(direction, percentage)), length(original));
  return question(
    'withPercent',
    context,
    [direction, percentage, original],
    `Je ${enlarge ? 'vergroot' : 'verkleint'} een ${item} van ${original} cm ${dimension} met ${percentage}%. Hoe ${dimension} wordt de ${item}?`,
    answer,
    'cm',
    `${enlarge ? 'vergroten' : 'verkleinen'} met ${percentage}% → ${settingOf(direction, percentage)}% van ${original}: ${percentage}% = ${formatRational(change)} → ${original} ${enlarge ? '+' : MINUS} ${formatRational(change)} = ${formatRational(answer)}`,
  );
}

/** The explanation of `percentage`% of `original`: `80% van 20: 10% = 2 → 8 × 2 = 16`. */
function percentOfExplanation(percentage: number, original: number): string {
  const result = percentOf(fromInteger(percentage), length(original));
  const step = stepPercentage(percentage);
  if (step === percentage) return `${percentage}% van ${original} = ${formatRational(result)}`;
  const stepValue = percentOf(fromInteger(step), length(original));
  return `${percentage}% van ${original}: ${step}% = ${formatRational(stepValue)} → ${percentage / step} × ${formatRational(stepValue)} = ${formatRational(result)}`;
}

/** `Je kopieert een tekening van 20 cm breed op 80%. Hoe breed wordt de kopie?` */
export function atPercentQuestion(context: Context, setting: number, original: number): Question {
  const { item, dimension } = context;
  return question(
    'atPercent',
    context,
    [setting, original],
    `Je kopieert een ${item} van ${original} cm ${dimension} op ${setting}%. Hoe ${dimension} wordt de kopie?`,
    percentOf(fromInteger(setting), length(original)),
    'cm',
    percentOfExplanation(setting, original),
  );
}

/** `Een foto van 10 cm breed wordt 15 cm breed. Op hoeveel procent stel je het kopieerapparaat in?` */
export function findPercentQuestion(context: Context, setting: number, original: number): Question {
  const { item, dimension } = context;
  const result = percentOf(fromInteger(setting), length(original));
  return question(
    'findPercent',
    context,
    [setting, original],
    `Een ${item} van ${original} cm ${dimension} wordt ${cm(result)} ${dimension}. Op hoeveel procent stel je het kopieerapparaat in?`,
    fromInteger(setting),
    '%',
    `${formatRational(result)} : ${original} = ${formatRational(divide(fromInteger(setting), HUNDRED))} → ${setting}%`,
  );
}

/** `Na vergroten met 50% is een foto 18 cm breed. Hoe breed was hij?` */
export function backQuestion(
  context: Context,
  direction: Direction,
  percentage: number,
  original: number,
): Question {
  const { item, dimension } = context;
  const setting = settingOf(direction, percentage);
  const result = percentOf(fromInteger(setting), length(original));
  const step = stepPercentage(setting);
  const known = `${setting}% = ${formatRational(result)}`;
  const middle =
    step === setting || step === 100
      ? ''
      : ` → ${step}% = ${formatRational(percentOf(fromInteger(step), length(original)))}`;
  return question(
    'back',
    context,
    [direction, percentage, original],
    `Na ${direction === 'enlarge' ? 'vergroten' : 'verkleinen'} met ${percentage}% is een ${item} ${cm(result)} ${dimension}. Hoe ${dimension} was hij?`,
    length(original),
    'cm',
    `${known}${middle} → 100% = ${original}`,
  );
}

function randomContext(rng: Rng): Context {
  return { item: pick(rng, ITEMS), dimension: pick(rng, DIMENSIONS) };
}

function randomDirection(rng: Rng): { direction: Direction; percentage: number } {
  const direction: Direction = rng() < 0.5 ? 'enlarge' : 'reduce';
  return {
    direction,
    percentage: pick(rng, direction === 'enlarge' ? ENLARGE_PERCENTAGES : REDUCE_PERCENTAGES),
  };
}

/** An original in [4, 40] cm whose `setting`% has at most 1 decimal (and is whole if asked). */
function randomOriginal(rng: Rng, setting: number, whole = false): number {
  return drawUntil(() => {
    const original = randomInt(rng, MIN_LENGTH, MAX_LENGTH);
    const result = percentOf(fromInteger(setting), length(original));
    return (whole ? isInteger(result) : hasAtMostDecimals(result, 1)) ? original : null;
  });
}

export function generateEnlargement(rng: Rng): Question {
  const context = randomContext(rng);
  switch (pick(rng, FORMS)) {
    case 'withPercent': {
      const { direction, percentage } = randomDirection(rng);
      const original = randomOriginal(rng, settingOf(direction, percentage));
      return withPercentQuestion(context, direction, percentage, original);
    }
    case 'atPercent': {
      const setting = pick(rng, COPY_PERCENTAGES);
      return atPercentQuestion(context, setting, randomOriginal(rng, setting));
    }
    case 'findPercent': {
      const setting = pick(rng, COPY_PERCENTAGES);
      return findPercentQuestion(context, setting, randomOriginal(rng, setting, true));
    }
    case 'back': {
      const { direction, percentage } = randomDirection(rng);
      const original = randomOriginal(rng, settingOf(direction, percentage));
      return backQuestion(context, direction, percentage, original);
    }
  }
}
