import { formatRational } from '../format';
import { drawUntil, pick, randomInt, type Rng } from '../random';
import { fromInteger, multiply } from '../rational';
import { numberStep } from '../steps';
import { exactTip } from '../tips';
import type { Question } from '../types';
import { diameterAsRadiusTip, PI } from './perimeterArea';

const PI_TEXT = formatRational(PI);

export type Solid = 'kubus' | 'balk' | 'cilinder';
export type Container = 'aquarium' | 'koelbox' | 'opbergbox';

type Range = readonly [number, number];
type CylinderGiven = 'straal' | 'diameter';

/** Length × width × height ranges in cm, multiples of 10 (spec §5.28). */
export const CONTAINER_RANGES: Readonly<Record<Container, readonly [Range, Range, Range]>> = {
  aquarium: [
    [40, 100],
    [30, 50],
    [30, 60],
  ],
  koelbox: [
    [40, 60],
    [30, 40],
    [30, 40],
  ],
  opbergbox: [
    [40, 80],
    [30, 50],
    [20, 40],
  ],
};

const CM_PER_DM = 10;

function solidQuestion(key: string, step: Parameters<typeof numberStep>[0]): Question {
  return { key: `solids:${key}`, topic: 'solids', steps: [numberStep(step)] };
}

/** A cube [edge] or a box [length, width, height]: its prompt, volume and surface area. */
function box(solid: 'kubus' | 'balk', lengths: readonly number[]) {
  const [length = 0, width = length, height = length] = lengths;
  const faces = length * width + length * height + width * height;
  return {
    start:
      solid === 'kubus'
        ? `Een kubus heeft ribben van ${length} cm.`
        : `Een balk is ${length} cm lang, ${width} cm breed en ${height} cm hoog.`,
    volume: fromInteger(length * width * height),
    volumeFormula: `${length} × ${width} × ${height}`,
    surface: fromInteger(2 * faces),
    surfaceFormula:
      solid === 'kubus'
        ? `6 × ${length} × ${length}`
        : `2 × (${length} × ${width} + ${length} × ${height} + ${width} × ${height}) = 2 × ${faces}`,
  };
}

/** The cylinder volume; `lengths` is [the shown radius or diameter, the height]. */
function cylinderVolumeQuestion(lengths: readonly number[], given: CylinderGiven): Question {
  const [shown = 0, height = 0] = lengths;
  const radius = given === 'diameter' ? shown / 2 : shown;
  const answer = multiply(PI, fromInteger(radius * radius * height));
  const toRadius = given === 'diameter' ? `straal = ${shown} : 2 = ${radius} → ` : '';
  return solidQuestion(`volume:cilinder:${given}:${shown}:${height}`, {
    prompt: `Een cilinder heeft een ${given} van ${shown} cm en een hoogte van ${height} cm. Hoe groot is de inhoud? Neem π = ${PI_TEXT}.`,
    answer,
    suffix: 'cm³',
    explanation: `${toRadius}${PI_TEXT} × ${radius} × ${radius} × ${height} = ${formatRational(answer)}`,
    diagnose:
      given === 'diameter'
        ? exactTip(multiply(PI, fromInteger(shown * shown * height)), diameterAsRadiusTip(shown))
        : undefined,
  });
}

/**
 * `Een balk is 8 cm lang, 5 cm breed en 3 cm hoog. Hoe groot is de inhoud?` `lengths` is [edge] for
 * a cube, [length, width, height] for a box and [shown radius or diameter, height] for a cylinder.
 * The surface area of a cube or a box is a mistake with its own tip.
 */
export function volumeQuestion(
  solid: Solid,
  lengths: readonly number[],
  cylinderGiven: CylinderGiven = 'straal',
): Question {
  if (solid === 'cilinder') return cylinderVolumeQuestion(lengths, cylinderGiven);
  const { start, volume, volumeFormula, surface } = box(solid, lengths);
  return solidQuestion(`volume:${solid}:${lengths.join(':')}`, {
    prompt: `${start} Hoe groot is de inhoud?`,
    answer: volume,
    suffix: 'cm³',
    explanation: `${volumeFormula} = ${formatRational(volume)}`,
    diagnose: exactTip(surface, 'Dat is de oppervlakte; gevraagd is de inhoud.'),
  });
}

/** `Een kubus heeft ribben van 4 cm. Hoe groot is de oppervlakte?` The volume is a mistake. */
export function surfaceQuestion(solid: 'kubus' | 'balk', lengths: readonly number[]): Question {
  const { start, volume, surface, surfaceFormula } = box(solid, lengths);
  return solidQuestion(`surface:${solid}:${lengths.join(':')}`, {
    prompt: `${start} Hoe groot is de oppervlakte?`,
    answer: surface,
    suffix: 'cm²',
    explanation: `${surfaceFormula} = ${formatRational(surface)}`,
    diagnose: exactTip(volume, 'Dat is de inhoud; gevraagd is de oppervlakte.'),
  });
}

/**
 * `Een aquarium is 60 cm lang, 30 cm breed en 40 cm hoog. Hoeveel liter water past erin?` Every
 * length must be a whole number of dm. There are no topic tips, only the factor-of-ten fallback.
 */
export function litresQuestion(
  container: Container,
  lengths: readonly [number, number, number],
): Question {
  if (lengths.some((cm) => cm % CM_PER_DM !== 0)) {
    throw new RangeError(`${lengths.join(' × ')} cm is not a whole number of dm`);
  }
  const [length, width, height] = lengths;
  const litres = (length / CM_PER_DM) * (width / CM_PER_DM) * (height / CM_PER_DM);
  const conversion = lengths.map((cm) => `${cm} cm = ${cm / CM_PER_DM} dm`).join(', ');
  const product = lengths.map((cm) => cm / CM_PER_DM).join(' × ');
  return solidQuestion(`litres:${container}:${lengths.join(':')}`, {
    prompt: `Een ${container} is ${length} cm lang, ${width} cm breed en ${height} cm hoog. Hoeveel liter${container === 'aquarium' ? ' water' : ''} past erin?`,
    answer: fromInteger(litres),
    suffix: 'L',
    explanation: `${conversion} → ${product} = ${litres} dm³ = ${litres} L`,
  });
}

// Volume 50%, surface area 25%, litres 25%.
const FORMS = ['volume', 'volume', 'surface', 'litres'] as const;
const SOLIDS: readonly Solid[] = ['kubus', 'balk', 'cilinder'];
const CONTAINERS: readonly Container[] = ['aquarium', 'koelbox', 'opbergbox'];
const RADII: readonly number[] = [1, 2, 5, 10];

/** Three different whole lengths: length in [3, 20], width and height in [2, 10]. */
function drawBox(rng: Rng): number[] {
  return drawUntil(() => {
    const length = randomInt(rng, 3, 20);
    const width = randomInt(rng, 2, 10);
    const height = randomInt(rng, 2, 10);
    return new Set([length, width, height]).size === 3 ? [length, width, height] : null;
  });
}

function drawVolume(rng: Rng): Question {
  const solid = pick(rng, SOLIDS);
  switch (solid) {
    case 'kubus':
      return volumeQuestion(solid, [randomInt(rng, 2, 10)]);
    case 'balk':
      return volumeQuestion(solid, drawBox(rng));
    case 'cilinder': {
      const radius = pick(rng, RADII);
      const height = randomInt(rng, 1, 10);
      return rng() < 0.5
        ? volumeQuestion(solid, [radius, height], 'straal')
        : volumeQuestion(solid, [2 * radius, height], 'diameter');
    }
  }
}

function drawSurface(rng: Rng): Question {
  return rng() < 0.5
    ? surfaceQuestion('kubus', [randomInt(rng, 2, 10)])
    : surfaceQuestion('balk', drawBox(rng));
}

/** A length in cm that is a multiple of 10 within [min, max]. */
const drawTens = (rng: Rng, [min, max]: Range) =>
  CM_PER_DM * randomInt(rng, min / CM_PER_DM, max / CM_PER_DM);

function drawLitres(rng: Rng): Question {
  const container = pick(rng, CONTAINERS);
  const [length, width, height] = CONTAINER_RANGES[container];
  return litresQuestion(container, [
    drawTens(rng, length),
    drawTens(rng, width),
    drawTens(rng, height),
  ]);
}

export function generateSolids(rng: Rng): Question {
  switch (pick(rng, FORMS)) {
    case 'volume':
      return drawVolume(rng);
    case 'surface':
      return drawSurface(rng);
    case 'litres':
      return drawLitres(rng);
  }
}
