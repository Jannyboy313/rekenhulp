import { formatRational } from '../format';
import { drawUntil, pick, randomInt, type Rng } from '../random';
import { compare, fromInteger, multiply, rational, type Rational } from '../rational';
import { numberStep } from '../steps';
import type { Question } from '../types';

export type Figure = 'vierkant' | 'rechthoek' | 'kubus' | 'balk';
export type Measure = 'omtrek' | 'oppervlakte' | 'inhoud';

const isSolid = (figure: Figure) => figure === 'kubus' || figure === 'balk';
const lengthsOf = (figure: Figure) => (isSolid(figure) ? 'ribben' : 'zijden');
/** The exponent of the scale factor: 1 for a length, 2 for an area, 3 for a volume. */
const DIMENSION: Readonly<Record<Measure, number>> = { omtrek: 1, oppervlakte: 2, inhoud: 3 };
const UNIT: Readonly<Record<Measure, string>> = { omtrek: 'cm', oppervlakte: 'cm²', inhoud: 'cm³' };

/** `3 × 3 = 9`: the scale factor of a length (`k`), an area (`k²`) or a volume (`k³`). */
function factorSum(measure: Measure, k: number): string {
  const dimension = DIMENSION[measure];
  return `${Array(dimension).fill(k).join(' × ')} = ${k ** dimension}`;
}

/** `inhoud: 3 × 3 × 3 = 27 keer`; for a length `omtrek: 3 keer`. */
function factorLine(measure: Measure, k: number): string {
  return measure === 'omtrek'
    ? `omtrek: ${k} keer`
    : `${measure}: ${factorSum(measure, k)} keer`;
}

function scalingQuestion(key: string, step: Parameters<typeof numberStep>[0]): Question {
  return { key: `scalingSolids:${key}`, topic: 'scalingSolids', steps: [numberStep(step)] };
}

/** `De ribben van een kubus worden 3 keer zo lang. Hoeveel keer zo groot wordt de inhoud?` */
export function factorQuestion(
  figure: Figure,
  measure: Measure,
  k: number,
  direction: 'lang' | 'klein',
): Question {
  return scalingQuestion(`factor:${figure}:${measure}:${direction}:${k}`, {
    prompt: `De ${lengthsOf(figure)} van een ${figure} worden ${k} keer zo ${direction}. Hoeveel keer zo ${direction === 'lang' ? 'groot' : 'klein'} wordt de ${measure}?`,
    answer: fromInteger(k ** DIMENSION[measure]),
    suffix: 'keer',
    explanation: factorLine(measure, k),
  });
}

/** The omtrek, oppervlakte or inhoud of a figure from its whole lengths (spec §5.81). */
function measureOf(figure: Figure, measure: Measure, lengths: readonly number[]): number {
  const [a = 0, b = a, c = a] = lengths;
  switch (measure) {
    case 'omtrek':
      return figure === 'vierkant' ? 4 * a : 2 * (a + b);
    case 'oppervlakte':
      return isSolid(figure) ? 2 * (a * b + a * c + b * c) : a * b;
    case 'inhoud':
      return a * b * c;
  }
}

function lengthsText(figure: Figure, lengths: readonly number[]): string {
  const cm = lengths.map((length) => `${length} cm`);
  const list = cm.length > 1 ? `${cm.slice(0, -1).join(', ')} en ${cm.at(-1)}` : cm[0];
  return `${lengthsOf(figure)} van ${list}`;
}

/** `Een kubus met ribben van 2 cm heeft een inhoud van 8 cm³. De ribben worden 3 keer zo lang. …` */
export function valueQuestion(
  figure: Figure,
  lengths: readonly number[],
  measure: Measure,
  k: number,
): Question {
  const given = measureOf(figure, measure, lengths);
  const answer = given * k ** DIMENSION[measure];
  const unit = UNIT[measure];
  const line = factorLine(measure, k);
  return scalingQuestion(`value:${figure}:${measure}:${lengths.join(':')}:${k}`, {
    prompt: `Een ${figure} met ${lengthsText(figure, lengths)} heeft een ${measure} van ${given} ${unit}. De ${lengthsOf(figure)} worden ${k} keer zo lang. Hoe groot wordt de ${measure}?`,
    answer: fromInteger(answer),
    suffix: unit,
    explanation: `${line} → ${given} × ${k ** DIMENSION[measure]} = ${answer}`,
  });
}

/** `Een maquette is 10 keer zo klein als het echte gebouw. Het dak van de maquette is 0,5 m². …` */
export function modelQuestion(k: number, area: Rational): Question {
  const answer = multiply(area, fromInteger(k * k));
  return scalingQuestion(`model:${k}:${formatRational(area)}`, {
    prompt: `Een maquette is ${k} keer zo klein als het echte gebouw. Het dak van de maquette is ${formatRational(area)} m². Hoe groot is het echte dak?`,
    answer,
    suffix: 'm²',
    explanation: `oppervlakte: ${factorSum('oppervlakte', k)} keer → ${formatRational(area)} × ${k * k} = ${formatRational(answer)}`,
  });
}

/** `De inhoud van een kubus wordt 8 keer zo groot. Hoeveel keer zo lang worden de ribben?` */
export function backQuestion(figure: Figure, measure: 'oppervlakte' | 'inhoud', k: number): Question {
  const factor = k ** DIMENSION[measure];
  const product = Array(DIMENSION[measure]).fill(k).join(' × ');
  return scalingQuestion(`back:${figure}:${measure}:${k}`, {
    prompt: `De ${measure} van een ${figure} wordt ${factor} keer zo groot. Hoeveel keer zo lang worden de ${lengthsOf(figure)}?`,
    answer: fromInteger(k),
    suffix: 'keer',
    explanation: `${factor} = ${product} → ${k} keer`,
  });
}

const FIGURES: readonly Figure[] = ['vierkant', 'rechthoek', 'kubus', 'balk'];
const LONG_FACTORS: readonly number[] = [2, 3, 4, 5, 10];
const SMALL_FACTORS: readonly number[] = [2, 3, 4, 5];
const VALUE_FACTORS: readonly number[] = [2, 3, 4, 5];
const MODEL_FACTORS: readonly number[] = [2, 5, 10, 20];
const VOLUME_FACTORS: readonly number[] = [2, 3, 4, 5, 10];
const MAX_VALUE = 10_000;
const MAX_MODEL = fromInteger(5000);
/** The omtrek (a length, the linear trap) is this share of the 2D exercises. */
const OMTREK_SHARE = 0.2;
/** Conservative bounds for the model roof: a real roof of at least 10 m² (spec gives only the top). */
const MIN_MODEL_ROOF = fromInteger(10);

function drawMeasure(rng: Rng, figure: Figure): Measure {
  if (isSolid(figure)) return pick(rng, ['oppervlakte', 'inhoud'] as const);
  return rng() < OMTREK_SHARE ? 'omtrek' : 'oppervlakte';
}

/** Whole lengths in [1, 10]; a rectangle is not a square and a box is not a cube. */
function drawLengths(rng: Rng, figure: Figure): number[] {
  const count = { vierkant: 1, kubus: 1, rechthoek: 2, balk: 3 }[figure];
  return drawUntil(() => {
    const lengths = Array.from({ length: count }, () => randomInt(rng, 1, 10));
    return count === 1 || new Set(lengths).size > 1 ? lengths : null;
  });
}

function drawFactor(rng: Rng): Question {
  const figure = pick(rng, FIGURES);
  const measure = drawMeasure(rng, figure);
  return rng() < 0.75
    ? factorQuestion(figure, measure, pick(rng, LONG_FACTORS), 'lang')
    : factorQuestion(figure, measure, pick(rng, SMALL_FACTORS), 'klein');
}

function drawValue(rng: Rng): Question {
  const figure = pick(rng, FIGURES);
  const measure = drawMeasure(rng, figure);
  return drawUntil(() => {
    const lengths = drawLengths(rng, figure);
    const k = pick(rng, VALUE_FACTORS);
    return measureOf(figure, measure, lengths) * k ** DIMENSION[measure] <= MAX_VALUE
      ? valueQuestion(figure, lengths, measure, k)
      : null;
  });
}

function drawModel(rng: Rng): Question {
  return drawUntil(() => {
    const k = pick(rng, MODEL_FACTORS);
    const area = rational(BigInt(randomInt(rng, 1, 125)), 10n);
    const answer = multiply(area, fromInteger(k * k));
    return compare(answer, MAX_MODEL) <= 0 && compare(answer, MIN_MODEL_ROOF) >= 0
      ? modelQuestion(k, area)
      : null;
  });
}

function drawBack(rng: Rng): Question {
  const figure = pick(rng, FIGURES);
  return !isSolid(figure) || rng() < 0.5
    ? backQuestion(figure, 'oppervlakte', randomInt(rng, 2, 10))
    : backQuestion(figure, 'inhoud', pick(rng, VOLUME_FACTORS));
}

export function generateScalingSolids(rng: Rng): Question {
  switch (pick(rng, ['factor', 'value', 'back'] as const)) {
    case 'factor':
      return drawFactor(rng);
    case 'value':
      return rng() < 0.5 ? drawModel(rng) : drawValue(rng);
    case 'back':
      return drawBack(rng);
  }
}
