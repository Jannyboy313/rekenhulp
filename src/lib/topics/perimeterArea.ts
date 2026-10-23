import { formatRational, MINUS } from '../format';
import { drawUntil, pick, randomInt, type Rng } from '../random';
import {
  add,
  fromInteger,
  isInteger,
  multiply,
  rational,
  subtract,
  type Rational,
} from '../rational';
import { numberStep } from '../steps';
import { exactTip, firstTip, type Diagnose } from '../tips';
import type { Question } from '../types';

export const PI = rational(314n, 100n);
const PI_TEXT = formatRational(PI);

export type PlaneFigure =
  | 'vierkant'
  | 'rechthoek'
  | 'driehoek'
  | 'rechthoekigeDriehoek'
  | 'parallellogram'
  | 'trapezium'
  | 'cirkel';
export type Measure = 'oppervlakte' | 'omtrek';
export type RectangleContext = 'tafelblad' | 'vloerkleed' | 'raam';
export type MissingSide =
  | 'rectangleFromArea'
  | 'rectangleFromPerimeter'
  | 'squareFromPerimeter'
  | 'squareFromArea';

/**
 * The given lengths of a figure in cm, in the order of its prompt: vierkant [zijde], rechthoek
 * [lengte, breedte], driehoeken [basis, hoogte] or [rechthoekszijde, rechthoekszijde],
 * parallellogram [basis, schuine zijde, hoogte], trapezium [a, b, hoogte], cirkel [the shown
 * radius or diameter]. `circleGiven` says whether the radius or the diameter is shown.
 */
export interface PlaneShape {
  figure: PlaneFigure;
  lengths: readonly number[];
  circleGiven?: 'straal' | 'diameter';
}

/** The answer of one measure, how it is worked out, and the mistake that belongs to it. */
interface Calculation {
  answer: Rational;
  explanation: string;
  mistake: Diagnose;
}

/** The area and, for the figures that have one in this topic, the perimeter. */
interface Measures {
  area: Calculation;
  perimeter?: Calculation;
}

const NO_MISTAKE: Diagnose = () => undefined;

function calculation(answer: Rational, formula: string, mistake = NO_MISTAKE): Calculation {
  return { answer, explanation: `${formula} = ${formatRational(answer)}`, mistake };
}

/** Shared with solids: the formula with the diameter used as the radius. */
export function diameterAsRadiusTip(diameter: number): string {
  const radius = formatRational(rational(BigInt(diameter), 2n));
  return `De straal is de helft van de diameter: ${diameter} : 2 = ${radius}.`;
}

function circleMeasures(shown: number, diameterShown: boolean): Measures {
  const radius = diameterShown ? shown / 2 : shown;
  const diameter = diameterShown ? shown : 2 * shown;
  const toRadius = diameterShown ? `straal = ${diameter} : 2 = ${radius} → ` : '';
  const toDiameter = diameterShown ? '' : `diameter = 2 × ${radius} = ${diameter} → `;
  return {
    area: calculation(
      multiply(PI, fromInteger(radius * radius)),
      `${toRadius}${PI_TEXT} × ${radius} × ${radius}`,
      diameterShown
        ? exactTip(multiply(PI, fromInteger(diameter * diameter)), diameterAsRadiusTip(diameter))
        : undefined,
    ),
    perimeter: calculation(
      multiply(PI, fromInteger(diameter)),
      `${toDiameter}${PI_TEXT} × ${diameter}`,
      diameterShown
        ? undefined
        : exactTip(
            multiply(PI, fromInteger(radius)),
            `De omtrek is π × diameter, en de diameter is 2 × ${radius} = ${diameter}.`,
          ),
    ),
  };
}

const HALF_TIP = 'Een driehoek is de helft van een rechthoek: deel nog door 2.';

/** The prompt start of a figure and its measures. */
function figureMeasures({ figure, lengths, circleGiven }: PlaneShape): {
  start: string;
  measures: Measures;
} {
  const [a, b, c] = lengths as readonly [number, number, number];
  switch (figure) {
    case 'vierkant':
      return {
        start: `Een vierkant heeft zijden van ${a} cm.`,
        measures: {
          area: calculation(fromInteger(a * a), `${a} × ${a}`),
          perimeter: calculation(fromInteger(4 * a), `4 × ${a}`),
        },
      };
    case 'rechthoek':
      return {
        start: `Een rechthoek is ${a} cm lang en ${b} cm breed.`,
        measures: {
          area: calculation(fromInteger(a * b), `${a} × ${b}`),
          perimeter: calculation(fromInteger(2 * (a + b)), `2 × (${a} + ${b})`),
        },
      };
    case 'driehoek':
    case 'rechthoekigeDriehoek':
      return {
        start:
          figure === 'driehoek'
            ? `Een driehoek heeft een basis van ${a} cm en een hoogte van ${b} cm.`
            : `Een rechthoekige driehoek heeft rechthoekszijden van ${a} cm en ${b} cm.`,
        measures: {
          area: calculation(
            rational(BigInt(a * b), 2n),
            `${a} × ${b} : 2`,
            exactTip(fromInteger(a * b), HALF_TIP),
          ),
        },
      };
    case 'parallellogram':
      return {
        start: `Een parallellogram heeft een basis van ${a} cm, schuine zijden van ${b} cm en een hoogte van ${c} cm.`,
        measures: {
          area: calculation(
            fromInteger(a * c),
            `${a} × ${c}`,
            exactTip(
              fromInteger(a * b),
              `Reken met de hoogte, niet met de schuine zijde: ${a} × ${c}.`,
            ),
          ),
          perimeter: calculation(fromInteger(2 * (a + b)), `2 × (${a} + ${b})`),
        },
      };
    case 'trapezium':
      return {
        start: `Een trapezium heeft evenwijdige zijden van ${a} cm en ${b} cm en een hoogte van ${c} cm.`,
        measures: {
          area: calculation(rational(BigInt((a + b) * c), 2n), `(${a} + ${b}) : 2 × ${c}`),
        },
      };
    case 'cirkel':
      return {
        start: `Een cirkel heeft een ${circleGiven === 'diameter' ? 'diameter' : 'straal'} van ${a} cm.`,
        measures: circleMeasures(a, circleGiven === 'diameter'),
      };
  }
}

const unitOf = (unit: 'cm' | 'm', measure: Measure) =>
  measure === 'oppervlakte' ? `${unit}²` : unit;

/**
 * The question for one measure. The other measure of the same figure is a mistake with its own
 * tip; `keyTail` is the figure or context and its numbers.
 */
function measureQuestion(
  keyTail: string,
  prompt: string,
  unit: 'cm' | 'm',
  { area, perimeter }: Measures,
  measure: Measure,
): Question {
  const isArea = measure === 'oppervlakte';
  const asked = isArea ? area : perimeter;
  if (asked === undefined) throw new RangeError('This figure has no perimeter');
  const other = isArea ? perimeter : area;
  return {
    key: `perimeterArea:${isArea ? 'area' : 'perimeter'}:${keyTail}`,
    topic: 'perimeterArea',
    steps: [
      numberStep({
        prompt,
        answer: asked.answer,
        suffix: unitOf(unit, measure),
        explanation: asked.explanation,
        diagnose:
          other === undefined
            ? asked.mistake
            : firstTip(
                asked.mistake,
                exactTip(
                  other.answer,
                  `Dat is de ${isArea ? 'omtrek' : 'oppervlakte'}; gevraagd is de ${measure}.`,
                ),
              ),
      }),
    ],
  };
}

/**
 * `Een rechthoek is 12 cm lang en 5 cm breed. Hoe groot is de omtrek?` Circle prompts end with
 * `Neem π = 3,14.` A triangle or a trapezium has no perimeter and throws.
 */
export function figureQuestion(shape: PlaneShape, measure: Measure): Question {
  const { start, measures } = figureMeasures(shape);
  const { figure, lengths } = shape;
  const hint = figure === 'cirkel' ? ` Neem π = ${PI_TEXT}.` : '';
  // A circle without `circleGiven` is shown by its radius (see figureMeasures).
  const circleGiven = figure === 'cirkel' ? [shape.circleGiven ?? 'straal'] : [];
  return measureQuestion(
    [figure, ...circleGiven, ...lengths].join(':'),
    `${start} Hoe groot is de ${measure}?${hint}`,
    'cm',
    measures,
    measure,
  );
}

/**
 * `Een tafelblad is 1,6 m lang en 80 cm breed. Hoe groot is de oppervlakte in m²?`: the width is
 * converted to m first.
 */
export function mixedRectangleQuestion(
  context: RectangleContext,
  lengthM: Rational,
  widthCm: number,
  measure: Measure,
): Question {
  const length = formatRational(lengthM);
  const widthM = rational(BigInt(widthCm), 100n);
  const width = formatRational(widthM);
  const conversion = `${widthCm} cm = ${width} m → `;
  return measureQuestion(
    `${context}:${length}:${widthCm}`,
    `Een ${context} is ${length} m lang en ${widthCm} cm breed. Hoe groot is de ${measure} in ${unitOf('m', measure)}?`,
    'm',
    {
      area: calculation(multiply(lengthM, widthM), `${conversion}${length} × ${width}`),
      perimeter: calculation(
        multiply(fromInteger(2), add(lengthM, widthM)),
        `${conversion}2 × (${length} + ${width})`,
      ),
    },
    measure,
  );
}

function notWhole(formula: string): RangeError {
  return new RangeError(`${formula} is not a whole number of cm`);
}

/** The prompt of a missing side, its answer, and how it is worked out. */
function missingSide(variant: MissingSide, first: number, second: number) {
  switch (variant) {
    case 'rectangleFromArea':
      return {
        prompt: `Een rechthoek heeft een oppervlakte van ${first} cm² en is ${second} cm breed. Hoe lang is de rechthoek?`,
        answer: rational(BigInt(first), BigInt(second)),
        formula: `${first} : ${second}`,
      };
    case 'rectangleFromPerimeter':
      return {
        prompt: `Een rechthoek heeft een omtrek van ${first} cm en is ${second} cm breed. Hoe lang is de rechthoek?`,
        answer: subtract(rational(BigInt(first), 2n), fromInteger(second)),
        formula: `${first} : 2 ${MINUS} ${second}`,
      };
    case 'squareFromPerimeter':
      return {
        prompt: `Een vierkant heeft een omtrek van ${first} cm. Hoe lang is een zijde?`,
        answer: rational(BigInt(first), 4n),
        formula: `${first} : 4`,
      };
    case 'squareFromArea': {
      // Exact integer check: a root that squares back to the area is a whole number.
      const root = Math.round(Math.sqrt(first));
      if (root * root !== first) throw notWhole(`√${first}`);
      return {
        prompt: `Een vierkant heeft een oppervlakte van ${first} cm². Hoe lang is een zijde?`,
        answer: fromInteger(root),
        formula: `√${first}`,
      };
    }
  }
}

/**
 * `Een rechthoek heeft een oppervlakte van 48 cm² en is 6 cm breed. Hoe lang is de rechthoek?`
 * `given` is the area or perimeter, then the width for a rectangle. The side must be a whole
 * number of cm. There are no topic tips, only the factor-of-ten fallback.
 */
export function missingSideQuestion(variant: MissingSide, given: readonly number[]): Question {
  const [first, second] = given as readonly [number, number];
  const { prompt, answer, formula } = missingSide(variant, first, second);
  if (!isInteger(answer) || answer.num <= 0n) throw notWhole(formula);
  return {
    key: `perimeterArea:missing:${variant}:${given.join(':')}`,
    topic: 'perimeterArea',
    steps: [
      numberStep({
        prompt,
        answer,
        suffix: 'cm',
        explanation: `${formula} = ${formatRational(answer)}`,
      }),
    ],
  };
}

type Form = 'area' | 'perimeter' | 'missing';
const FORMS: readonly Form[] = ['area', 'perimeter', 'missing'];
const AREA_FIGURES: readonly PlaneFigure[] = [
  'vierkant',
  'rechthoek',
  'driehoek',
  'parallellogram',
  'trapezium',
  'cirkel',
];
const PERIMETER_FIGURES: readonly PlaneFigure[] = [
  'vierkant',
  'rechthoek',
  'parallellogram',
  'cirkel',
];
const CONTEXTS: readonly RectangleContext[] = ['tafelblad', 'vloerkleed', 'raam'];
const MISSING_SIDES: readonly MissingSide[] = [
  'rectangleFromArea',
  'rectangleFromPerimeter',
  'squareFromPerimeter',
  'squareFromArea',
];
const RADII: readonly number[] = [1, 2, 3, 4, 5, 10];

const drawSide = (rng: Rng) => randomInt(rng, 2, 25);

/** Length in [3, 40], width in [2, 12], width < length. */
function drawRectangle(rng: Rng): { length: number; width: number } {
  return drawUntil(() => {
    const length = randomInt(rng, 3, 40);
    const width = randomInt(rng, 2, 12);
    return width < length ? { length, width } : null;
  });
}

function drawShape(rng: Rng, figure: PlaneFigure): PlaneShape {
  switch (figure) {
    case 'vierkant':
      return { figure, lengths: [drawSide(rng)] };
    case 'rechthoek': {
      const { length, width } = drawRectangle(rng);
      return { figure, lengths: [length, width] };
    }
    case 'driehoek':
    case 'rechthoekigeDriehoek':
      return {
        figure,
        lengths: drawUntil(() => {
          const base = randomInt(rng, 2, 20);
          const height = randomInt(rng, 2, 20);
          return (base * height) % 2 === 0 ? [base, height] : null;
        }),
      };
    case 'parallellogram': {
      const height = randomInt(rng, 2, 12);
      return {
        figure,
        lengths: [randomInt(rng, 3, 20), randomInt(rng, height + 1, 20), height],
      };
    }
    case 'trapezium':
      return {
        figure,
        lengths: [
          ...drawUntil(() => {
            const a = randomInt(rng, 2, 20);
            const b = randomInt(rng, 2, 20);
            return a !== b && (a + b) % 2 === 0 ? [a, b] : null;
          }),
          randomInt(rng, 2, 12),
        ],
      };
    case 'cirkel': {
      const radius = pick(rng, RADII);
      return rng() < 0.5
        ? { figure, lengths: [radius], circleGiven: 'straal' }
        : { figure, lengths: [2 * radius], circleGiven: 'diameter' };
    }
  }
}

function drawMissingSide(rng: Rng): Question {
  const variant = pick(rng, MISSING_SIDES);
  switch (variant) {
    case 'rectangleFromArea': {
      const { length, width } = drawRectangle(rng);
      return missingSideQuestion(variant, [length * width, width]);
    }
    case 'rectangleFromPerimeter': {
      const { length, width } = drawRectangle(rng);
      return missingSideQuestion(variant, [2 * (length + width), width]);
    }
    case 'squareFromPerimeter':
      return missingSideQuestion(variant, [4 * drawSide(rng)]);
    case 'squareFromArea': {
      const side = drawSide(rng);
      return missingSideQuestion(variant, [side * side]);
    }
  }
}

/**
 * The three forms equally likely. Area and perimeter: 25% a rectangle with mixed units, otherwise
 * a figure of the form (each equally likely, the triangle half of the time a right-angled one).
 */
export function generatePerimeterArea(rng: Rng): Question {
  const form = pick(rng, FORMS);
  if (form === 'missing') return drawMissingSide(rng);
  const measure = form === 'area' ? 'oppervlakte' : 'omtrek';
  if (rng() < 0.25) {
    return mixedRectangleQuestion(
      pick(rng, CONTEXTS),
      rational(BigInt(randomInt(rng, 10, 30)), 10n),
      10 * randomInt(rng, 3, 9),
      measure,
    );
  }
  const figure = pick(rng, form === 'area' ? AREA_FIGURES : PERIMETER_FIGURES);
  const shown = figure === 'driehoek' && rng() < 0.5 ? 'rechthoekigeDriehoek' : figure;
  return figureQuestion(drawShape(rng, shown), measure);
}
