import { formatRational } from '../format';
import { pick, randomInt, randomIntWhere, type Rng } from '../random';
import { divide, fromInteger, multiply, rational, type Rational } from '../rational';
import type { Question } from '../types';
import { drawRounded, roundedQuestion, shownValue, type RoundedDraft } from './roundedAnswer';

/** Circle with the calculator (spec §5.98): always `π = 3,14`, rounded to 1 decimal. */
const PI = rational(314n, 100n);
const TWO = fromInteger(2);

export type CircleLength = 'radius' | 'diameter';
export type CircleUnit = 'cm' | 'm';

const NAME: Readonly<Record<CircleLength, string>> = { radius: 'straal', diameter: 'diameter' };

const tenths = (value: number): Rational => rational(BigInt(value), 10n);

type Parts = Pick<RoundedDraft, 'key' | 'prompt' | 'value' | 'suffix' | 'calculation'>;

const draft = (parts: Parts): RoundedDraft => ({ topic: 'calcCircle', decimals: 1, ...parts });

function start(length: Rational, given: CircleLength, unit: CircleUnit): string {
  return `Een cirkel heeft een ${NAME[given]} van ${formatRational(length)} ${unit}.`;
}

function circumference(lengthTenths: number, given: CircleLength, unit: CircleUnit): RoundedDraft {
  const length = tenths(lengthTenths);
  const diameter = given === 'diameter' ? length : multiply(TWO, length);
  const d = formatRational(diameter);
  const toDiameter =
    given === 'diameter' ? '' : `diameter = 2 × ${formatRational(length)} = ${d} → `;
  return draft({
    key: `circumference:${given}:${unit}:${lengthTenths}`,
    prompt: `${start(length, given, unit)} Hoe groot is de omtrek? Neem π = 3,14.`,
    value: multiply(PI, diameter),
    suffix: unit,
    calculation: `${toDiameter}3,14 × ${d}`,
  });
}

function area(lengthTenths: number, given: CircleLength, unit: CircleUnit): RoundedDraft {
  const length = tenths(lengthTenths);
  const radius = given === 'radius' ? length : divide(length, TWO);
  const r = formatRational(radius);
  const toRadius = given === 'radius' ? '' : `straal = ${formatRational(length)} : 2 = ${r} → `;
  return draft({
    key: `area:${given}:${unit}:${lengthTenths}`,
    prompt: `${start(length, given, unit)} Hoe groot is de oppervlakte? Neem π = 3,14.`,
    value: multiply(PI, multiply(radius, radius)),
    suffix: `${unit}²`,
    calculation: `${toRadius}3,14 × ${r}²`,
  });
}

function back(circumferenceLength: number, asked: CircleLength, unit: CircleUnit): RoundedDraft {
  const diameter = divide(fromInteger(circumferenceLength), PI);
  const division = `${circumferenceLength} : 3,14`;
  return draft({
    key: `back:${asked}:${unit}:${circumferenceLength}`,
    prompt: `Een cirkel heeft een omtrek van ${circumferenceLength} ${unit}. Hoe groot is de ${NAME[asked]}? Neem π = 3,14.`,
    value: asked === 'diameter' ? diameter : divide(diameter, TWO),
    suffix: unit,
    calculation:
      asked === 'diameter' ? division : `diameter = ${division} = ${shownValue(diameter)} → straal`,
  });
}

/** `Een cirkel heeft een diameter van 7,5 cm. Hoe groot is de omtrek? …`: `3,14 × d`. */
export function circumferenceQuestion(
  lengthTenths: number,
  given: CircleLength,
  unit: CircleUnit,
): Question {
  return roundedQuestion(circumference(lengthTenths, given, unit));
}

/** `Een cirkel heeft een straal van 6,5 m. Hoe groot is de oppervlakte? …`: `3,14 × r × r`. */
export function circleAreaQuestion(
  lengthTenths: number,
  given: CircleLength,
  unit: CircleUnit,
): Question {
  return roundedQuestion(area(lengthTenths, given, unit));
}

/** `Een cirkel heeft een omtrek van 40 cm. Hoe groot is de diameter? …`: `omtrek : 3,14`. */
export function circleBackQuestion(
  circumferenceLength: number,
  asked: CircleLength,
  unit: CircleUnit,
): Question {
  return roundedQuestion(back(circumferenceLength, asked, unit));
}

const LENGTHS: readonly CircleLength[] = ['radius', 'diameter'];
const UNITS: readonly CircleUnit[] = ['cm', 'm'];

/** One decimal that is not a whole number, in [1,5; 25]. */
const drawLength = (rng: Rng) => randomIntWhere(rng, 15, 249, (value) => value % 10 !== 0);

const FORMS: readonly ((rng: Rng) => RoundedDraft)[] = [
  (rng) => circumference(drawLength(rng), pick(rng, LENGTHS), pick(rng, UNITS)),
  (rng) => area(drawLength(rng), pick(rng, LENGTHS), pick(rng, UNITS)),
  (rng) => back(randomInt(rng, 10, 200), pick(rng, LENGTHS), pick(rng, UNITS)),
];

export function generateCalcCircle(rng: Rng): Question {
  const form = pick(rng, FORMS);
  return drawRounded(() => form(rng));
}
