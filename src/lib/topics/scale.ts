import { formatInteger, formatRational, NO_BREAK_SPACE } from '../format';
import { pick, range, type Rng } from '../random';
import {
  compare,
  decimalPlaces,
  divide,
  equals,
  fromInteger,
  HUNDRED,
  multiply,
  ONE,
  rational,
  type Rational,
} from '../rational';
import { numberStep } from '../steps';
import { powerOfTenShift, type Diagnose } from '../tips';
import type { Question, Step } from '../types';

/** The n of the scale 1 : n (spec §5.24): drawings up to 5000, maps from 10 000. */
export const SCALES: readonly number[] = [
  100, 200, 250, 500, 1000, 2000, 2500, 5000, 10_000, 20_000, 25_000, 50_000, 100_000, 200_000,
  250_000, 500_000, 1_000_000,
];

export type ScaleForm = 'mapToReal' | 'realToMap' | 'findScale';
const FORMS: readonly ScaleForm[] = ['mapToReal', 'realToMap', 'findScale'];

/** The largest n of a drawing (real distance in m); larger scales are maps (in km). */
const LARGEST_DRAWING_SCALE = 5000;

/** The unit of the real distance of a scale 1 : n: 'm' on a drawing, 'km' on a map. */
export function realUnit(n: number): 'm' | 'km' {
  return n <= LARGEST_DRAWING_SCALE ? 'm' : 'km';
}

const CENTIMETRES_PER_UNIT = { m: 100, km: 100_000 } as const;

/** The real distance of `mapCm` on the scale 1 : n, in `realUnit(n)`. */
export function realDistance(n: number, mapCm: Rational): Rational {
  return divide(multiply(mapCm, fromInteger(n)), fromInteger(CENTIMETRES_PER_UNIT[realUnit(n)]));
}

/** The real distance of `mapCm` in cm: 1 cm on the map is n cm in reality. */
function realCentimetres(n: number, mapCm: Rational): Rational {
  return multiply(mapCm, fromInteger(n));
}

/** 'tekening' for a drawing, 'kaart' for a map. */
function pictureOf(n: number): 'tekening' | 'kaart' {
  return realUnit(n) === 'm' ? 'tekening' : 'kaart';
}

/** 0,5 … 0,9, 1 … 9,9 in steps of 0,1, and 10 … 30 (spec §5.24), before the real distance. */
const MAP_DISTANCES: readonly Rational[] = [
  ...range(5, 99).map((tenths) => rational(BigInt(tenths), 10n)),
  ...range(10, 30).map(fromInteger),
];

const LEAST_REAL_DISTANCE = rational(1n, 10n);
const MOST_REAL_DISTANCE = fromInteger(1000);

/** At most 2 decimals, and 1 where the real distance has to be divided (spec §5.24). */
const MAX_REAL_DECIMALS: Readonly<Record<ScaleForm, number>> = {
  mapToReal: 2,
  realToMap: 1,
  findScale: 2,
};

/** In [0,1; 1000] with at most the decimals of the form. */
function isNiceRealDistance(form: ScaleForm, real: Rational): boolean {
  const decimals = decimalPlaces(real);
  return (
    decimals !== null &&
    decimals <= MAX_REAL_DECIMALS[form] &&
    compare(real, LEAST_REAL_DISTANCE) >= 0 &&
    compare(real, MOST_REAL_DISTANCE) <= 0
  );
}

// Per form and scale: the map distances whose real distance is nice. Computed once.
const MAP_DISTANCES_BY_SCALE: ReadonlyMap<string, readonly Rational[]> = new Map(
  FORMS.flatMap((form) =>
    SCALES.map((n): [string, readonly Rational[]] => [
      `${form}:${n}`,
      MAP_DISTANCES.filter((mapCm) => isNiceRealDistance(form, realDistance(n, mapCm))),
    ]),
  ),
);

/** The map distances in cm that give a supported real distance for the form on scale 1 : n. */
export function mapDistancesFor(n: number, form: ScaleForm): readonly Rational[] {
  const distances = MAP_DISTANCES_BY_SCALE.get(`${form}:${n}`);
  if (distances === undefined) throw new RangeError(`1 : ${n} is not a supported scale`);
  return distances;
}

/** '25 000 cm = 250 m = 0,25 km', or for a drawing '250 cm = 2,5 m': 1 cm on the map in reality. */
function realChain(n: number): string {
  const steps = [`${formatInteger(n)} cm`, `${formatRational(divide(fromInteger(n), HUNDRED))} m`];
  if (realUnit(n) === 'km') steps.push(`${formatRational(realDistance(n, ONE))} km`);
  return steps.join(' = ');
}

/** '1 cm = 25 000 cm = 250 m = 0,25 km', or for a drawing '1 cm = 250 cm = 2,5 m'. */
export function oneCentimetre(n: number): string {
  return `1 cm = ${realChain(n)}`;
}

/** The correct answer: the real distance, the map distance or the n of the scale. */
function answerOf(form: ScaleForm, n: number, mapCm: Rational): Rational {
  switch (form) {
    case 'mapToReal':
      return realDistance(n, mapCm);
    case 'realToMap':
      return mapCm;
    case 'findScale':
      return fromInteger(n);
  }
}

/** The prompt and the units around the input of a form (spec §5.24). */
function wording(
  form: ScaleForm,
  n: number,
  mapCm: Rational,
): Pick<Step, 'prompt' | 'prefix' | 'suffix'> {
  const unit = realUnit(n);
  const picture = `op de ${pictureOf(n)}`;
  const map = `${formatRational(mapCm)} cm`;
  const real = `${formatRational(realDistance(n, mapCm))} ${unit}`;
  switch (form) {
    case 'mapToReal':
      return {
        prompt: `Schaal 1 : ${formatInteger(n)}. ${map} ${picture} is in het echt ? ${unit}`,
        suffix: unit,
      };
    case 'realToMap':
      return {
        prompt: `Schaal 1 : ${formatInteger(n)}. ${real} in het echt is ${picture} ? cm`,
        suffix: 'cm',
      };
    case 'findScale':
      return {
        prompt: `${map} ${picture} is ${real} in het echt. Schaal 1 : ?`,
        prefix: `1${NO_BREAK_SPACE}:`,
      };
  }
}

/**
 * One exercise of the form: `Schaal 1 : 25 000. 4 cm op de kaart is in het echt ? km`. `mapCm` must
 * be one of `mapDistancesFor(n, form)`.
 */
export function scaleQuestion(form: ScaleForm, n: number, mapCm: Rational): Question {
  if (!mapDistancesFor(n, form).some((candidate) => equals(candidate, mapCm))) {
    throw new RangeError(`${formatRational(mapCm)} cm on 1 : ${n} is not a supported distance`);
  }
  return {
    key: `scale:${form}:${n}:${formatRational(mapCm)}`,
    topic: 'scale',
    steps: [
      numberStep({
        ...wording(form, n, mapCm),
        answer: answerOf(form, n, mapCm),
        explanation: scaleExplanation(form, n, mapCm),
        diagnose: scaleTip(form, n, mapCm),
      }),
    ],
  };
}

/**
 * What 1 cm is in reality, then the calculation (spec §5.24): '1 cm = 250 cm = 2,5 m → 3 × 2,5 =
 * 7,5 m', or for the scale '7,5 m = 750 cm → 750 : 3 = 250'.
 */
export function scaleExplanation(form: ScaleForm, n: number, mapCm: Rational): string {
  const unit = realUnit(n);
  const [map, real] = [formatRational(mapCm), formatRational(realDistance(n, mapCm))];
  const perCentimetre = formatRational(realDistance(n, ONE));
  switch (form) {
    case 'mapToReal':
      return `${oneCentimetre(n)} → ${map} × ${perCentimetre} = ${real} ${unit}`;
    case 'realToMap':
      return `${oneCentimetre(n)} → ${real} : ${perCentimetre} = ${map} cm`;
    case 'findScale': {
      const centimetres = formatRational(realCentimetres(n, mapCm));
      return `${real} ${unit} = ${centimetres} cm → ${centimetres} : ${map} = ${formatInteger(n)}`;
    }
  }
}

/**
 * An answer that is 10ᵏ times the correct one, k ≠ 0: the units were mixed up (spec §3.4.1). The
 * tip replaces the factor-of-ten fallback. The map ↔ real forms show what 1 cm is in reality, the
 * find-the-scale form converts the real distance to cm.
 */
export function scaleTip(form: ScaleForm, n: number, mapCm: Rational): Diagnose {
  const answer = answerOf(form, n, mapCm);
  const real = `${formatRational(realDistance(n, mapCm))} ${realUnit(n)}`;
  const centimetres = formatRational(realCentimetres(n, mapCm));
  const tip =
    form === 'findScale'
      ? `Reken eerst beide afstanden om naar cm: ${real} = ${centimetres} cm.`
      : `Reken in dezelfde eenheid: 1 cm op de ${pictureOf(n)} is ${realChain(n)} in het echt.`;
  return (given) => (powerOfTenShift(given, answer) === null ? undefined : tip);
}

/** `Schaal 1 : 25 000. 4 cm op de kaart is in het echt ? km` and its reverse forms. */
export function generateScale(rng: Rng): Question {
  const form = pick(rng, FORMS);
  const n = pick(rng, SCALES);
  return scaleQuestion(form, n, pick(rng, mapDistancesFor(n, form)));
}
