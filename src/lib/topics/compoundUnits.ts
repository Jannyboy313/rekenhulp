import { formatEuro, formatInteger, formatMoney, formatRational } from '../format';
import { drawUntil, pick, randomInt, type Rng } from '../random';
import { fromInteger, multiply, rational } from '../rational';
import { SLOT } from '../slot';
import { numberStep } from '../steps';
import type { Question } from '../types';

const n = formatInteger;

interface SpeedContext {
  subject: string;
  verb: string;
  /** km/u */
  speeds: readonly number[];
}

/** Speed from a distance in metres or km and a short time (spec §5.49). */
export const SPEED_CONTEXTS: Readonly<Record<string, SpeedContext>> = {
  wandelaar: { subject: 'Een wandelaar', verb: 'loopt', speeds: [4, 5, 6] },
  hardloper: { subject: 'Een hardloper', verb: 'rent', speeds: [8, 9, 10, 12, 15] },
  schaatser: { subject: 'Een schaatser', verb: 'schaatst', speeds: [24, 30, 36] },
  wielrenner: { subject: 'Een wielrenner', verb: 'fietst', speeds: [24, 30, 36, 40] },
};

const MINUTES = [1, 2, 3, 4, 5, 6, 10, 12, 15, 20, 30];
const SECONDS = [10, 15, 20, 30, 45];

type TimeUnit = 'min' | 's';

/** The distance in metres of `speed` km/u during `time`, or null unless it is a nice number. */
function distanceInMetres(speed: number, unit: TimeUnit, time: number): number | null {
  const perUnit = unit === 'min' ? 60 : 3600;
  const metres = speed * 1000 * time;
  if (metres % perUnit !== 0) return null;
  const distance = metres / perUnit;
  if (distance < 100 || distance > 10_000) return null;
  return distance % (distance >= 1000 ? 100 : 10) === 0 ? distance : null;
}

/** `Een hardloper rent 500 m in 3 min. Hoe snel is dat in km/u?` The speed is the answer. */
export function speedFromMetresQuestion(
  context: string,
  speed: number,
  unit: TimeUnit,
  time: number,
): Question {
  const { subject, verb } = SPEED_CONTEXTS[context]!;
  const distance = distanceInMetres(speed, unit, time)!;
  const inKm = distance >= 1000;
  const shown = inKm ? `${formatRational(rational(BigInt(distance), 1000n))} km` : `${distance} m`;
  const hour = unit === 'min' ? 60 : 3600;
  const explanation = inKm
    ? `${time} ${unit} → ${shown}, ${hour} ${unit} → ${speed} km`
    : `${time} ${unit} → ${shown}, ${hour} ${unit} → ${n(speed * 1000)} m = ${speed} km`;
  return {
    key: `compoundUnits:speed:${context}:${speed}:${time}${unit}`,
    topic: 'compoundUnits',
    steps: [
      numberStep({
        prompt: `${subject} ${verb} ${shown} in ${time} ${unit}. Hoe snel is dat in km/u?`,
        answer: fromInteger(speed),
        suffix: 'km/u',
        explanation,
      }),
    ],
  };
}

const VEHICLES = ['trein', 'auto', 'bus'] as const;
type Vehicle = (typeof VEHICLES)[number];

const VEHICLE_MINUTES = [5, 10, 15, 20, 25, 35, 40, 50];

/** `Een trein rijdt 96 km/u. Hoeveel km rijdt de trein in 10 minuten?` */
export function speedDistanceQuestion(vehicle: Vehicle, speed: number, minutes: number): Question {
  const distance = (speed * minutes) / 60;
  return {
    key: `compoundUnits:distance:${vehicle}:${speed}:${minutes}`,
    topic: 'compoundUnits',
    steps: [
      numberStep({
        prompt: `Een ${vehicle} rijdt ${speed} km/u. Hoeveel km rijdt de ${vehicle} in ${minutes} minuten?`,
        answer: fromInteger(distance),
        suffix: 'km',
        explanation: `60 min → ${speed} km, ${minutes} min → ${distance} km`,
      }),
    ],
  };
}

const AREAS = [10, 20, 25, 40, 50, 80, 100, 120, 150, 200];

/** Densities of 1 or 2 significant digits in [100, 5000] per km². */
const DENSITIES = Array.from({ length: 4901 }, (_, index) => index + 100).filter(
  (density) => String(density).replace(/0+$/, '').length <= 2,
);

export type DensityVariant = 'density' | 'inhabitants' | 'area';

/** A gemeente with `area` km² and `density` inhabitants per km². */
export function densityQuestion(variant: DensityVariant, area: number, density: number): Question {
  const inhabitants = area * density;
  const variants: Record<DensityVariant, [string, number, string, string]> = {
    density: [
      `Een gemeente heeft ${n(inhabitants)} inwoners en is ${area} km² groot. Hoeveel inwoners per km² is dat?`,
      density,
      'per km²',
      `${n(inhabitants)} : ${area} = ${n(density)}`,
    ],
    inhabitants: [
      `Een gemeente is ${area} km² groot en heeft ${n(density)} inwoners per km². Hoeveel inwoners heeft de gemeente?`,
      inhabitants,
      'inwoners',
      `${n(density)} × ${area} = ${n(inhabitants)}`,
    ],
    area: [
      `Een gemeente heeft ${n(inhabitants)} inwoners, ${n(density)} per km². Hoe groot is de gemeente?`,
      area,
      'km²',
      `${n(inhabitants)} : ${n(density)} = ${area}`,
    ],
  };
  const [text, answer, suffix, explanation] = variants[variant];
  return {
    key: `compoundUnits:density:${variant}:${area}:${density}`,
    topic: 'compoundUnits',
    steps: [numberStep({ prompt: text, answer: fromInteger(answer), suffix, explanation })],
  };
}

interface FlowContext {
  /** 'een bad', 'het bad' */
  indefinite: string;
  definite: string;
  min: number;
  max: number;
}

export const FLOW_CONTEXTS: Readonly<Record<string, FlowContext>> = {
  bad: { indefinite: 'een bad', definite: 'het bad', min: 80, max: 200 },
  regenton: { indefinite: 'een regenton', definite: 'de regenton', min: 100, max: 250 },
  aquarium: { indefinite: 'een aquarium', definite: 'het aquarium', min: 40, max: 200 },
};

const RATES = [5, 6, 8, 10, 12, 15, 20, 25];

export type FlowVariant = 'time' | 'volume' | 'perHour';

/** A tap that gives `rate` liter per minute; `time` minutes fill `rate × time` liter. */
export function flowQuestion(
  variant: FlowVariant,
  context: string,
  rate: number,
  time: number,
): Question {
  const { indefinite, definite } = FLOW_CONTEXTS[context]!;
  const volume = rate * time;
  const tap = `Een kraan geeft ${rate} liter per minuut.`;
  const variants: Record<FlowVariant, [string, number, string, string]> = {
    time: [
      `${tap} Hoeveel minuten duurt het om ${indefinite} van ${volume} L te vullen?`,
      time,
      'min',
      `${volume} : ${rate} = ${time}`,
    ],
    volume: [
      `${tap} Hoeveel liter zit er na ${time} minuten in ${definite}?`,
      volume,
      'L',
      `${rate} × ${time} = ${volume}`,
    ],
    perHour: [
      `${rate} liter per minuut = ${SLOT} liter per uur`,
      rate * 60,
      'L per uur',
      `1 uur = 60 min → ${rate} × 60 = ${rate * 60}`,
    ],
  };
  const [prompt, answer, suffix, explanation] = variants[variant];
  return {
    key: `compoundUnits:flow:${variant}:${context}:${rate}:${time}`,
    topic: 'compoundUnits',
    steps: [numberStep({ prompt, answer: fromInteger(answer), suffix, explanation })],
  };
}

const EFFICIENCIES = [12, 15, 16, 18, 20, 25];
/** € per liter, in cents. */
const PRICES = [190, 200, 210];

export type FuelVariant = 'liters' | 'distance' | 'cost';

/** `1 op 15` is 15 km per liter; the car drives `liters` liter, `efficiency × liters` km. */
export function fuelQuestion(
  variant: FuelVariant,
  efficiency: number,
  liters: number,
  priceInCents = 200,
): Question {
  const distance = efficiency * liters;
  const price = rational(BigInt(priceInCents), 100n);
  const base = `Een auto rijdt 1 op ${efficiency}: op 1 liter benzine rijdt hij ${efficiency} km.`;
  const common = { topic: 'compoundUnits' as const };
  const key = `compoundUnits:fuel:${variant}:${efficiency}:${liters}:${priceInCents}`;
  if (variant === 'liters') {
    return {
      ...common,
      key,
      steps: [
        numberStep({
          prompt: `${base} Hoeveel liter heeft hij nodig voor ${n(distance)} km?`,
          answer: fromInteger(liters),
          suffix: 'L',
          explanation: `${n(distance)} : ${efficiency} = ${liters}`,
        }),
      ],
    };
  }
  if (variant === 'distance') {
    return {
      ...common,
      key,
      steps: [
        numberStep({
          prompt: `${base} Hoe ver komt hij met ${liters} liter?`,
          answer: fromInteger(distance),
          suffix: 'km',
          explanation: `${liters} × ${efficiency} = ${n(distance)}`,
        }),
      ],
    };
  }
  const cost = multiply(fromInteger(liters), price);
  return {
    ...common,
    key,
    steps: [
      numberStep({
        prompt: `${base} Benzine kost ${formatEuro(price)} per liter. Wat kost de benzine voor ${n(distance)} km?`,
        answer: cost,
        prefix: '€',
        expected: formatMoney(cost),
        explanation: `${n(distance)} : ${efficiency} = ${liters} L → ${liters} × ${formatEuro(price)} = ${formatEuro(cost)}`,
      }),
    ],
  };
}

function randomSpeed(rng: Rng): Question {
  if (rng() < 0.5) {
    const [context, speed, unit, time] = drawUntil(() => {
      const name = pick(rng, Object.keys(SPEED_CONTEXTS));
      const speedValue = pick(rng, SPEED_CONTEXTS[name]!.speeds);
      const timeUnit: TimeUnit = rng() < 0.5 ? 'min' : 's';
      const duration = pick(rng, timeUnit === 'min' ? MINUTES : SECONDS);
      return distanceInMetres(speedValue, timeUnit, duration) === null
        ? null
        : ([name, speedValue, timeUnit, duration] as const);
    });
    return speedFromMetresQuestion(context, speed, unit, time);
  }
  const vehicle = pick(rng, VEHICLES);
  const speeds = [36, 48, 60, 72, 84, 96, 108, 120, 132, 144].filter(
    (speed) => vehicle !== 'bus' || speed <= 84,
  );
  return speedDistanceQuestion(vehicle, pick(rng, speeds), pick(rng, VEHICLE_MINUTES));
}

function randomDensity(rng: Rng): Question {
  const [area, density] = drawUntil(() => {
    const areaValue = pick(rng, AREAS);
    const densityValue = pick(rng, DENSITIES);
    const inhabitants = areaValue * densityValue;
    return inhabitants >= 2000 && inhabitants <= 900_000
      ? ([areaValue, densityValue] as const)
      : null;
  });
  return densityQuestion(pick(rng, ['density', 'inhabitants', 'area'] as const), area, density);
}

function randomFlow(rng: Rng): Question {
  const variant = pick(rng, ['time', 'volume', 'perHour'] as const);
  const context = pick(rng, Object.keys(FLOW_CONTEXTS));
  const rate = pick(rng, RATES);
  if (variant === 'perHour') return flowQuestion(variant, context, rate, 0);
  const { min, max } = FLOW_CONTEXTS[context]!;
  const [low, high] = variant === 'time' ? [4, 40] : [2, 30];
  const time = drawUntil(() => {
    const minutes = randomInt(rng, low, high);
    return rate * minutes >= min && rate * minutes <= max ? minutes : null;
  });
  return flowQuestion(variant, context, rate, time);
}

function randomFuel(rng: Rng): Question {
  const variant = pick(rng, ['liters', 'distance', 'cost'] as const);
  const [efficiency, liters] = drawUntil(() => {
    const perLiter = pick(rng, EFFICIENCIES);
    const used = randomInt(rng, 4, 50);
    return perLiter * used <= 1000 ? ([perLiter, used] as const) : null;
  });
  return fuelQuestion(variant, efficiency, liters, pick(rng, PRICES));
}

export function generateCompoundUnits(rng: Rng): Question {
  switch (pick(rng, ['speed', 'density', 'flow', 'fuel'] as const)) {
    case 'speed':
      return randomSpeed(rng);
    case 'density':
      return randomDensity(rng);
    case 'flow':
      return randomFlow(rng);
    case 'fuel':
      return randomFuel(rng);
  }
}
