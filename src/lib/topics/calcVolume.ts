import { formatInteger, formatRational } from '../format';
import { drawUntil, pick, randomInt, randomIntWhere, type Rng } from '../random';
import { divide, fromInteger, multiply, rational, type Rational } from '../rational';
import type { Question } from '../types';
import { drawRounded, roundedQuestion, type RoundedDraft } from './roundedAnswer';

/** Volume with the calculator (spec §5.99): `π = 3,14`, rounded to a whole number. */
const PI = rational(314n, 100n);
const FOUR_THIRDS = rational(4n, 3n);

export type Given = 'radius' | 'diameter';

type Parts = Omit<RoundedDraft, 'topic' | 'decimals'>;

const draft = (parts: Parts): RoundedDraft => ({ topic: 'calcVolume', decimals: 0, ...parts });

function sphere(r: number, given: Given): RoundedDraft {
  const length = given === 'radius' ? `straal van ${r}` : `diameter van ${2 * r}`;
  const toRadius = given === 'radius' ? '' : `straal = ${2 * r} : 2 = ${r} → `;
  return draft({
    key: `sphere:${given}:${r}`,
    prompt: `Een bol heeft een ${length} cm. De inhoud van een bol is 4/3 × π × straal³. Neem π = 3,14. Hoe groot is de inhoud?`,
    value: multiply(FOUR_THIRDS, multiply(PI, fromInteger(r ** 3))),
    suffix: 'cm³',
    calculation: `${toRadius}4 : 3 × 3,14 × ${r}³`,
  });
}

/** The radius in tenths; a given diameter is `2 × radius` and must be whole. */
function cylinder(radiusTenths: number, given: Given, h: number): RoundedDraft {
  if (given === 'diameter' && radiusTenths % 5 !== 0) {
    throw new RangeError(`No whole diameter for a radius of ${radiusTenths} tenths`);
  }
  const radius: Rational = rational(BigInt(radiusTenths), 10n);
  const r = formatRational(radius);
  const diameter = radiusTenths / 5;
  const length = given === 'radius' ? `straal van ${r}` : `diameter van ${diameter}`;
  const toRadius = given === 'radius' ? '' : `straal = ${diameter} : 2 = ${r} → `;
  return draft({
    key: `cylinder:${given}:${radiusTenths}:${h}`,
    prompt: `Een cilinder heeft een ${length} cm en een hoogte van ${h} cm. Hoe groot is de inhoud? Neem π = 3,14.`,
    value: multiply(PI, multiply(multiply(radius, radius), fromInteger(h))),
    suffix: 'cm³',
    calculation: `${toRadius}3,14 × ${r}² × ${h}`,
  });
}

function container(l: number, b: number, h: number): RoundedDraft {
  const cubic = l * b * h;
  const litres = divide(fromInteger(cubic), fromInteger(1000));
  return draft({
    key: `container:${l}:${b}:${h}`,
    prompt: `Een bak is ${l} cm lang, ${b} cm breed en ${h} cm hoog. Hoeveel liter past erin?`,
    value: litres,
    suffix: 'L',
    calculation: `${l} × ${b} × ${h} = ${formatInteger(cubic)} cm³`,
    valueUnit: 'L',
  });
}

/** `Een bol heeft een straal van 6 cm. De inhoud van een bol is 4/3 × π × straal³. …` */
export function sphereQuestion(r: number, given: Given): Question {
  return roundedQuestion(sphere(r, given));
}

/** `Een cilinder heeft een straal van 3,5 cm en een hoogte van 12 cm. …`: `3,14 × r × r × h`. */
export function cylinderQuestion(radiusTenths: number, given: Given, h: number): Question {
  return roundedQuestion(cylinder(radiusTenths, given, h));
}

/** `Een bak is 85 cm lang, 35 cm breed en 42 cm hoog. Hoeveel liter past erin? …` */
export function containerQuestion(l: number, b: number, h: number): Question {
  return roundedQuestion(container(l, b, h));
}

const GIVEN: readonly Given[] = ['radius', 'diameter'];

/** A radius of one decimal that is not whole in [1,5; 9,5], or an odd diameter in [3, 19]. */
function drawCylinder(rng: Rng): RoundedDraft {
  const h = randomInt(rng, 5, 30);
  return rng() < 0.5
    ? cylinder(
        randomIntWhere(rng, 15, 95, (value) => value % 10 !== 0),
        'radius',
        h,
      )
    : cylinder(5 * (2 * randomInt(rng, 1, 9) + 1), 'diameter', h);
}

/** Three round lengths are the mental exercise of §5.28: at most one is a multiple of 10. */
function drawContainer(rng: Rng): RoundedDraft {
  return drawUntil(() => {
    const b = randomInt(rng, 20, 60);
    const sizes = [randomInt(rng, Math.max(30, b), 120), b, randomInt(rng, 20, 60)] as const;
    return sizes.filter((size) => size % 10 === 0).length <= 1 ? container(...sizes) : null;
  });
}

const FORMS: readonly ((rng: Rng) => RoundedDraft)[] = [
  (rng) => sphere(randomInt(rng, 2, 12), pick(rng, GIVEN)),
  drawCylinder,
  drawContainer,
];

export function generateCalcVolume(rng: Rng): Question {
  const form = pick(rng, FORMS);
  return drawRounded(() => form(rng));
}
