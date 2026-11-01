import { formatRational } from '../format';
import { pick, randomInt, type Rng } from '../random';
import { add, fromInteger, multiply, rational, type Rational } from '../rational';
import { numberStep } from '../steps';
import type { Question } from '../types';

function surfaceQuestion(key: string, step: Parameters<typeof numberStep>[0]): Question {
  return { key: `surfaceArea:${key}`, topic: 'surfaceArea', steps: [numberStep(step)] };
}

/**
 * `Een piramide heeft een vierkant grondvlak van 3 m bij 3 m. …` Either the height of a side
 * triangle is given (`height`) or the area of a side (`area`).
 */
export function pyramidQuestion(
  z: number,
  h: number,
  unit: 'm' | 'cm',
  given: 'height' | 'area',
): Question {
  const side = rational(BigInt(z * h), 2n);
  const sideText = formatRational(side);
  const answer = z * z + 2 * z * h;
  const start = `Een piramide heeft een vierkant grondvlak van ${z} ${unit} bij ${z} ${unit}.`;
  const baseArea = `grondvlak ${z} × ${z} = ${z * z}`;
  return surfaceQuestion(`pyramid:${given}:${unit}:${z}:${h}`, {
    prompt:
      given === 'height'
        ? `${start} Elk zijvlak is een driehoek met een basis van ${z} ${unit} en een hoogte van ${h} ${unit}. Hoe groot is de totale oppervlakte?`
        : `${start} Elk van de vier zijvlakken heeft een oppervlakte van ${sideText} ${unit}². Hoe groot is de totale oppervlakte?`,
    answer: fromInteger(answer),
    suffix: `${unit}²`,
    explanation:
      given === 'height'
        ? `${baseArea}, zijvlak ${z} × ${h} : 2 = ${sideText} → ${z * z} + 4 × ${sideText} = ${answer}`
        : `${baseArea} → ${z * z} + 4 × ${sideText} = ${answer}`,
  });
}

export type PrismContext = 'tent' | 'doos';

/** Right triangles with all three sides whole (spec §5.82). */
export const TRIPLES: readonly (readonly [number, number, number])[] = [
  [3, 4, 5],
  [6, 8, 10],
  [5, 12, 13],
];

const PRISM_UNIT: Readonly<Record<PrismContext, 'm' | 'cm'>> = {
  tent: 'm',
  doos: 'cm',
};

/** `Een tent is een prisma. De voorkant en achterkant zijn driehoeken met zijden van 3 m, … ` */
export function prismQuestion(
  context: PrismContext,
  [a, b, c]: readonly [number, number, number],
  length: number,
): Question {
  const unit = PRISM_UNIT[context];
  const triangles = a * b;
  const rectangles = (a + b + c) * length;
  return surfaceQuestion(`prism:${context}:${a}:${b}:${c}:${length}`, {
    prompt: `Een ${context} is een prisma. De voorkant en achterkant zijn driehoeken met zijden van ${a} ${unit}, ${b} ${unit} en ${c} ${unit} en een rechte hoek. De ${context} is ${length} ${unit} lang. Hoe groot is de totale oppervlakte?`,
    answer: fromInteger(triangles + rectangles),
    suffix: `${unit}²`,
    explanation: `2 driehoeken: 2 × (${a} × ${b} : 2) = ${triangles}, 3 rechthoeken: (${a} + ${b} + ${c}) × ${length} = ${rectangles} → ${triangles} + ${rectangles} = ${triangles + rectangles}`,
  });
}

export type CylinderContext = 'blik' | 'koker' | 'ton';

/** `Een blik heeft een grondvlak van 25,1 cm² en een mantel van 225,3 cm². …` */
export function cylinderQuestion(
  context: CylinderContext,
  base: Rational,
  mantle: Rational,
): Question {
  const unit = context === 'ton' ? 'dm²' : 'cm²';
  const answer = add(mantle, multiply(fromInteger(2), base));
  const [baseText, mantleText] = [formatRational(base), formatRational(mantle)];
  return surfaceQuestion(`cylinder:${context}:${baseText}:${mantleText}`, {
    prompt: `Een ${context} heeft een grondvlak van ${baseText} ${unit} en een mantel van ${mantleText} ${unit}. Hoe groot is de totale oppervlakte?`,
    answer,
    suffix: unit,
    explanation: `${mantleText} + 2 × ${baseText} = ${formatRational(answer)}`,
  });
}

const CYLINDER_CONTEXTS: readonly CylinderContext[] = ['blik', 'koker', 'ton'];

function drawPyramid(rng: Rng): Question {
  const z = randomInt(rng, 2, 12);
  const h = randomInt(rng, z, 20);
  return pyramidQuestion(z, h, pick(rng, ['m', 'cm'] as const), rng() < 0.5 ? 'area' : 'height');
}

/** Tent: only 3-4-5, 2-6 m. Doos: any triple, 5-20 cm (spec §5.82). */
const drawPrism = (rng: Rng) =>
  rng() < 0.5
    ? prismQuestion('tent', [3, 4, 5], randomInt(rng, 2, 6))
    : prismQuestion('doos', pick(rng, TRIPLES), randomInt(rng, 5, 20));

/** A value with 1 decimal in [min, max]. */
const drawTenths = (rng: Rng, min: number, max: number) =>
  rational(BigInt(randomInt(rng, min * 10, max * 10)), 10n);

const drawCylinder = (rng: Rng) =>
  cylinderQuestion(pick(rng, CYLINDER_CONTEXTS), drawTenths(rng, 5, 80), drawTenths(rng, 50, 500));

export function generateSurfaceArea(rng: Rng): Question {
  switch (pick(rng, ['pyramid', 'prism', 'cylinder'] as const)) {
    case 'pyramid':
      return drawPyramid(rng);
    case 'prism':
      return drawPrism(rng);
    case 'cylinder':
      return drawCylinder(rng);
  }
}
