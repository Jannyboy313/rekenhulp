import { formatInteger, formatRational, MINUS } from '../format';
import { drawUntil, pick, randomInt, type Rng } from '../random';
import {
  add,
  fromInteger,
  multiply,
  rational,
  subtract,
  type Rational,
} from '../rational';
import { numberStep } from '../steps';
import type { Question } from '../types';

function compositeQuestion(key: string, step: Parameters<typeof numberStep>[0]): Question {
  return { key: `compositeShapes:${key}`, topic: 'compositeShapes', steps: [numberStep(step)] };
}

/** `Uit een rechthoek van 8 m bij 6 m is een hoek van 3 m bij 2 m weggehaald. …` */
export function cornerQuestion(
  l: number,
  b: number,
  c: number,
  d: number,
  measure: 'omtrek' | 'oppervlakte',
): Question {
  const perimeter = measure === 'omtrek';
  const answer = perimeter ? 2 * (l + b) : l * b - c * d;
  return compositeQuestion(`corner:${measure}:${l}:${b}:${c}:${d}`, {
    prompt: `Uit een rechthoek van ${l} m bij ${b} m is een hoek van ${c} m bij ${d} m weggehaald. Hoe groot is de ${measure}?`,
    answer: fromInteger(answer),
    suffix: perimeter ? 'm' : 'm²',
    explanation: perimeter
      ? `omtrek: de hoek verschuift twee zijden naar binnen, de omtrek blijft 2 × (${l} + ${b}) = ${answer}`
      : `oppervlakte: ${l} × ${b} ${MINUS} ${c} × ${d} = ${answer}`,
  });
}

/** `Een gazon van 10 m bij 6 m heeft rondom een pad van 1 m breed. …` The width is 0,5, 1 or 2. */
export function pathQuestion(l: number, b: number, width: Rational): Question {
  const outerL = add(fromInteger(l), multiply(fromInteger(2), width));
  const outerB = add(fromInteger(b), multiply(fromInteger(2), width));
  const outer = multiply(outerL, outerB);
  const lawn = fromInteger(l * b);
  const widthText = formatRational(width);
  const answer = subtract(outer, lawn);
  return compositeQuestion(`path:${l}:${b}:${widthText}`, {
    prompt: `Een gazon van ${l} m bij ${b} m heeft rondom een pad van ${widthText} m breed. Hoe groot is de oppervlakte van het pad?`,
    answer,
    suffix: 'm²',
    explanation: `${formatRational(outerL)} × ${formatRational(outerB)} ${MINUS} ${l} × ${b} = ${formatRational(outer)} ${MINUS} ${l * b} = ${formatRational(answer)}`,
  });
}

/** `Een weiland is 250 m lang en 80 m breed. Hoeveel hectare is dat?` Sides are whole tens of m. */
export function areQuestion(l: number, b: number, unit: 'are' | 'hectare'): Question {
  const area = l * b;
  const answer = rational(BigInt(area), unit === 'are' ? 100n : 10_000n);
  const short = unit === 'are' ? 'are' : 'ha';
  return compositeQuestion(`are:${unit}:${l}:${b}`, {
    prompt: `Een weiland is ${l} m lang en ${b} m breed. Hoeveel ${unit} is dat?`,
    answer,
    suffix: short,
    explanation: `${l} × ${b} = ${formatInteger(area)} m² = ${formatRational(answer)} ${short}`,
  });
}

/** The whole-number sides `[a, b]`, `a ≤ b`, of every rectangle with this area. */
export function factorPairs(area: number): [number, number][] {
  const pairs: [number, number][] = [];
  for (let a = 1; a * a <= area; a++) if (area % a === 0) pairs.push([a, area / a]);
  return pairs;
}

/** `Een rechthoek heeft een oppervlakte van 24 cm². De zijden zijn hele cm. Wat is de kleinste …?` */
export function fixedAreaQuestion(area: number, kind: 'kleinste' | 'grootste'): Question {
  const pairs = factorPairs(area);
  // The pairs run from long and thin to square: the first has the largest perimeter, the last the smallest.
  const [a, b] = kind === 'kleinste' ? pairs.at(-1)! : pairs[0]!;
  const answer = 2 * (a + b);
  return compositeQuestion(`fixed:${kind}:${area}`, {
    prompt: `Een rechthoek heeft een oppervlakte van ${area} cm². De zijden zijn hele cm. Wat is de ${kind} mogelijke omtrek?`,
    answer: fromInteger(answer),
    suffix: 'cm',
    explanation: `${pairs.map(([x, y]) => `${x} × ${y}`).join(', ')} → ${a} × ${b}: 2 × (${a} + ${b}) = ${answer}`,
  });
}

const WIDTHS: readonly Rational[] = [rational(1n, 2n), fromInteger(1), fromInteger(2)];
const MIN_PAIRS = 3;

function drawCorner(rng: Rng): Question {
  const l = randomInt(rng, 5, 20);
  const b = randomInt(rng, 4, 15);
  return cornerQuestion(
    l,
    b,
    randomInt(rng, 1, l - 2),
    randomInt(rng, 1, b - 2),
    rng() < 0.5 ? 'omtrek' : 'oppervlakte',
  );
}

const drawPath = (rng: Rng) =>
  pathQuestion(randomInt(rng, 4, 20), randomInt(rng, 3, 12), pick(rng, WIDTHS));

/** A side that is a multiple of 10 m in [20, 500]. */
const drawSide = (rng: Rng) => 10 * randomInt(rng, 2, 50);

const drawAre = (rng: Rng) =>
  areQuestion(drawSide(rng), drawSide(rng), rng() < 0.5 ? 'are' : 'hectare');

function drawFixed(rng: Rng): Question {
  const area = drawUntil(() => {
    const candidate = randomInt(rng, 12, 100);
    return factorPairs(candidate).length >= MIN_PAIRS ? candidate : null;
  });
  return fixedAreaQuestion(area, rng() < 0.5 ? 'kleinste' : 'grootste');
}

export function generateCompositeShapes(rng: Rng): Question {
  switch (pick(rng, ['corner', 'path', 'are', 'fixed'] as const)) {
    case 'corner':
      return drawCorner(rng);
    case 'path':
      return drawPath(rng);
    case 'are':
      return drawAre(rng);
    case 'fixed':
      return drawFixed(rng);
  }
}
