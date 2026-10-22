import { formatFraction, formatRational } from '../format';
import { gcd } from '../primes';
import { pick, range, type Rng } from '../random';
import {
  compare,
  decimalPlaces,
  divide,
  equals,
  fromInteger,
  isInteger,
  multiply,
  ONE,
  rational,
  type Rational,
} from '../rational';
import { numberStep } from '../steps';
import { firstTip, type Diagnose } from '../tips';
import type { Question } from '../types';
import { HOUR, MINUTE, timeTip } from './measurement';

export type SpeedContext = 'wandelen' | 'fietsen' | 'auto' | 'trein';
export const CONTEXTS: readonly SpeedContext[] = ['wandelen', 'fietsen', 'auto', 'trein'];

/** Speeds in km/u and the largest distance in km per context (spec §5.26). */
export const CONTEXT_SPEEDS: Readonly<Record<SpeedContext, readonly number[]>> = {
  wandelen: [4, 5, 6],
  fietsen: [12, 15, 16, 18, 20, 24],
  auto: [30, 50, 60, 80, 90, 100, 120],
  trein: [80, 100, 120, 150],
};
export const MAX_DISTANCE: Readonly<Record<SpeedContext, number>> = {
  wandelen: 20,
  fietsen: 80,
  auto: 400,
  trein: 500,
};

/** The start of a prompt and how the distance and the time are asked, per context. */
interface Wording {
  subject: string;
  howFar: string;
  howLong: string;
}
const WORDING: Readonly<Record<SpeedContext, Wording>> = {
  wandelen: {
    subject: 'Je wandelt',
    howFar: 'Hoeveel km loop je',
    howLong: 'Hoe lang doe je over',
  },
  fietsen: {
    subject: 'Je fietst',
    howFar: 'Hoeveel km fiets je',
    howLong: 'Hoe lang doe je over',
  },
  auto: {
    subject: 'Een auto rijdt',
    howFar: 'Hoeveel km rijdt de auto',
    howLong: 'Hoe lang doet de auto over',
  },
  trein: {
    subject: 'Een trein rijdt',
    howFar: 'Hoeveel km rijdt de trein',
    howLong: 'Hoe lang doet de trein over',
  },
};

/** A time as shown: 45 min or 2,5 uur. */
export interface Duration {
  amount: Rational;
  unit: 'min' | 'uur';
}

/** {10, 12, 15, 20, 30, 40, 45} min and {1,5; 2; 2,5; 3; 4} uur (spec §5.26). */
export const PROMPT_DURATIONS: readonly Duration[] = [
  ...[10, 12, 15, 20, 30, 40, 45].map((minutes): Duration => ({
    amount: fromInteger(minutes),
    unit: 'min',
  })),
  ...[15, 20, 25, 30, 40].map((tenths): Duration => ({
    amount: rational(BigInt(tenths), 10n),
    unit: 'uur',
  })),
];

const MINUTES_PER_HOUR = 60;

export function hoursOf({ amount, unit }: Duration): Rational {
  return unit === 'min' ? divide(amount, fromInteger(MINUTES_PER_HOUR)) : amount;
}

function formatDuration({ amount, unit }: Duration): string {
  return `${formatRational(amount)} ${unit}`;
}

export interface Trip {
  context: SpeedContext;
  speed: number; // km/u
  duration: Duration;
  distance: Rational; // km
}

export type TravelForm = 'speed' | 'distance';

/** The time between the given time and one hour: gcd(60, t) min, or 0,5 uur; null if not needed. */
function tableStep({ amount, unit }: Duration): Duration | null {
  if (unit === 'uur') return isInteger(amount) ? null : { amount: rational(1n, 2n), unit };
  const step = gcd(MINUTES_PER_HOUR, Number(amount.num));
  return BigInt(step) === amount.num ? null : { amount: fromInteger(step), unit };
}

/** The ratio table from the given time to one hour: 45 min → 3 km, 15 min → 1 km, 60 min → 4 km. */
function ratioRows({ speed, duration }: Trip): { time: Duration; distance: Rational }[] {
  const { unit } = duration;
  const hour: Duration = { amount: unit === 'min' ? fromInteger(MINUTES_PER_HOUR) : ONE, unit };
  const step = tableStep(duration);
  return [duration, ...(step === null ? [] : [step]), hour].map((time) => ({
    time,
    distance: multiply(fromInteger(speed), hoursOf(time)),
  }));
}

/** At most 1 decimal everywhere in the ratio table, and the distance in [0,5; maximum]. */
function isNiceTrip(trip: Trip): boolean {
  return (
    compare(trip.distance, rational(1n, 2n)) >= 0 &&
    compare(trip.distance, fromInteger(MAX_DISTANCE[trip.context])) <= 0 &&
    ratioRows(trip).every(({ distance }) => {
      const decimals = decimalPlaces(distance);
      return decimals !== null && decimals <= 1;
    })
  );
}

function tripsOf(context: SpeedContext): readonly Trip[] {
  return CONTEXT_SPEEDS[context]
    .flatMap((speed) =>
      PROMPT_DURATIONS.map((duration) => ({
        context,
        speed,
        duration,
        distance: multiply(fromInteger(speed), hoursOf(duration)),
      })),
    )
    .filter(isNiceTrip);
}

// Per context: the trips that suit both the speed and the distance form. Computed once.
const TRIPS: Readonly<Record<SpeedContext, readonly Trip[]>> = {
  wandelen: tripsOf('wandelen'),
  fietsen: tripsOf('fietsen'),
  auto: tripsOf('auto'),
  trein: tripsOf('trein'),
};

/**
 * Trips with a prompt duration whose ratio table has at most 1 decimal everywhere, distance in
 * [0,5; MAX_DISTANCE]. The same candidates serve the speed and the distance form.
 */
export function promptTrips(context: SpeedContext): readonly Trip[] {
  return TRIPS[context];
}

/** `Je fietst 6 km in 20 min. Hoe snel is dat?` (suffix km/u) or the distance form (suffix km). */
export function travelQuestion(form: TravelForm, trip: Trip): Question {
  const { context, speed, duration, distance } = trip;
  const { subject, howFar } = WORDING[context];
  const time = formatDuration(duration);
  return {
    key: `speed:${form}:${context}:${speed}:${formatRational(duration.amount)}${duration.unit}`,
    topic: 'speed',
    steps: [
      numberStep({
        prompt:
          form === 'speed'
            ? `${subject} ${formatRational(distance)} km in ${time}. Hoe snel is dat?`
            : `${subject} ${speed} km/u. ${howFar} in ${time}?`,
        answer: form === 'speed' ? fromInteger(speed) : distance,
        suffix: form === 'speed' ? 'km/u' : 'km',
        explanation: travelExplanation(form, trip),
        diagnose: travelTip(form, trip),
      }),
    ],
  };
}

/**
 * The ratio table (spec §5.26): from the given time to one hour for the speed, back from one hour
 * to the given time for the distance.
 */
export function travelExplanation(form: TravelForm, trip: Trip): string {
  const rows = ratioRows(trip);
  return (form === 'speed' ? rows : rows.reverse())
    .map(({ time, distance }) => `${formatDuration(time)} → ${formatRational(distance)} km`)
    .join(', ');
}

/**
 * The mistake with minutes (spec §3.4.1): the speed form divides the distance by the minutes
 * (`6 : 20 = 0,3`), the distance form multiplies the speed by the minutes (`80 × 45 = 3600`).
 * Hours have no such mistake. The tip replaces the factor-of-ten fallback.
 */
export function travelTip(form: TravelForm, trip: Trip): Diagnose {
  const { speed, duration, distance } = trip;
  if (duration.unit === 'uur') return () => undefined;
  const minutes = formatRational(duration.amount);
  if (form === 'speed') {
    const mistaken = divide(distance, duration.amount);
    return (given) =>
      equals(given, mistaken)
        ? 'km/u is per uur: reken eerst uit hoeveel km je in 60 min aflegt.'
        : undefined;
  }
  const mistaken = multiply(fromInteger(speed), duration.amount);
  return (given) =>
    equals(given, mistaken)
      ? `${minutes} min is ${formatFraction(hoursOf(duration))} uur, niet ${minutes} uur.`
      : undefined;
}

/** `hours` written in the unit of a time. */
function inUnit(hours: Rational, unit: Duration['unit']): Duration {
  return { amount: unit === 'min' ? multiply(hours, fromInteger(MINUTES_PER_HOUR)) : hours, unit };
}

/** The time of a trip as asked: whole minutes in [5, 59], or one of the hour values of the list. */
function timeAnswer(hours: Rational): Duration | null {
  const minutes = inUnit(hours, 'min');
  if (isInteger(minutes.amount) && minutes.amount.num >= 5n && minutes.amount.num <= 59n) {
    return minutes;
  }
  return (
    PROMPT_DURATIONS.find(({ amount, unit }) => unit === 'uur' && equals(amount, hours)) ?? null
  );
}

/** The time of gcd(speed, distance) km: the step of the ratio table of the time form. */
function timeStep({ speed, distance, duration }: Trip): Duration {
  const km = fromInteger(gcd(speed, Number(distance.num)));
  return inUnit(divide(km, fromInteger(speed)), duration.unit);
}

/** The step is a whole number of minutes, or of half hours. */
function hasWholeStep(trip: Trip): boolean {
  const { amount, unit } = timeStep(trip);
  return isInteger(unit === 'min' ? amount : multiply(amount, fromInteger(2)));
}

function timeTripsOf(context: SpeedContext): readonly Trip[] {
  return CONTEXT_SPEEDS[context]
    .flatMap((speed) =>
      range(1, MAX_DISTANCE[context]).flatMap((km): Trip[] => {
        const distance = fromInteger(km);
        const duration = timeAnswer(divide(distance, fromInteger(speed)));
        return duration === null ? [] : [{ context, speed, duration, distance }];
      }),
    )
    .filter(hasWholeStep);
}

// Per context: the trips of the time form. Computed once.
const TIME_TRIPS: Readonly<Record<SpeedContext, readonly Trip[]>> = {
  wandelen: timeTripsOf('wandelen'),
  fietsen: timeTripsOf('fietsen'),
  auto: timeTripsOf('auto'),
  trein: timeTripsOf('trein'),
};

/**
 * A trip whose time is the answer: in whole minutes in [5, 59], or in hours from
 * {1,5; 2; 2,5; 3; 4}. The distance is a whole number of km in [1, MAX_DISTANCE].
 */
export function timeTrips(context: SpeedContext): readonly Trip[] {
  return TIME_TRIPS[context];
}

/** `Je wandelt 5 km/u. Hoe lang doe je over 2 km?`, suffix the unit of trip.duration. */
export function timeQuestion(trip: Trip): Question {
  const { context, speed, duration, distance } = trip;
  const { subject, howLong } = WORDING[context];
  const km = formatRational(distance);
  return {
    key: `speed:time:${context}:${speed}:${km}`,
    topic: 'speed',
    steps: [
      numberStep({
        prompt: `${subject} ${speed} km/u. ${howLong} ${km} km?`,
        answer: duration.amount,
        suffix: duration.unit,
        explanation: timeExplanation(trip),
        diagnose: timeTipFor(trip),
      }),
    ],
  };
}

/**
 * The ratio table (spec §5.26): the speed in one hour, the step gcd(speed, distance) km, and the
 * distance. A step equal to the first or last row is left out.
 */
export function timeExplanation(trip: Trip): string {
  const { speed, distance, duration } = trip;
  const first = fromInteger(speed);
  const step = fromInteger(gcd(speed, Number(distance.num)));
  const rows = [
    { km: first, time: inUnit(ONE, duration.unit) },
    ...(equals(step, first) || equals(step, distance) ? [] : [{ km: step, time: timeStep(trip) }]),
    { km: distance, time: duration },
  ];
  return rows
    .map(({ km, time }) => `${formatRational(km)} km → ${formatDuration(time)}`)
    .join(', ');
}

/**
 * The unit mistake (the time in hours when minutes are asked, and the other way round) and the
 * `time` mistakes of spec §3.4.1. The tip text is built after the equality check: 25 min is 5/12
 * uur, which has no decimal notation.
 */
export function timeTipFor(trip: Trip): Diagnose {
  const { amount, unit } = trip.duration;
  const hours = hoursOf(trip.duration);
  const otherUnit = unit === 'min' ? hours : multiply(amount, fromInteger(MINUTES_PER_HOUR));
  const unitTip: Diagnose = (given) => {
    if (!equals(given, otherUnit)) return undefined;
    const shown = formatRational(given);
    return unit === 'min'
      ? `Dat is in uren; gevraagd zijn minuten: ${shown} × 60 = ${formatRational(amount)}.`
      : `Dat is in minuten; gevraagd zijn uren: ${shown} : 60 = ${formatRational(amount)}.`;
  };
  return firstTip(unitTip, timeTip(HOUR, MINUTE, hours, unit === 'min'));
}

/** 5, 10, …, 40 (spec §5.26): in km/u that is 18, 36, …, 144. */
export const METRES_PER_SECOND: readonly number[] = [5, 10, 15, 20, 25, 30, 35, 40];

const KMH_PER_MS = rational(18n, 5n); // 3,6

/**
 * `72 km/u = ? m/s` (toMetresPerSecond) or `20 m/s = ? km/u`. The tip only exists for the first
 * direction: m/s : 3,6 is never a finite decimal for the values of METRES_PER_SECOND.
 */
export function speedConversionQuestion(
  toMetresPerSecond: boolean,
  metresPerSecond: number,
): Question {
  const ms = fromInteger(metresPerSecond);
  const kmh = multiply(ms, KMH_PER_MS);
  const factor = formatRational(KMH_PER_MS);
  const mistaken = multiply(kmh, KMH_PER_MS);
  const calculation = toMetresPerSecond
    ? `${formatRational(kmh)} : ${factor} = ${metresPerSecond}`
    : `${metresPerSecond} × ${factor} = ${formatRational(kmh)}`;
  return {
    key: `speed:conversion:${toMetresPerSecond ? 'to-ms' : 'to-kmh'}:${metresPerSecond}`,
    topic: 'speed',
    steps: [
      numberStep({
        prompt: toMetresPerSecond
          ? `${formatRational(kmh)} km/u = ? m/s`
          : `${metresPerSecond} m/s = ? km/u`,
        answer: toMetresPerSecond ? ms : kmh,
        suffix: toMetresPerSecond ? 'm/s' : 'km/u',
        explanation: `1 m/s = 3600 m/u = ${factor} km/u → ${calculation}`,
        diagnose: (given) =>
          toMetresPerSecond && equals(given, mistaken)
            ? `Naar m/s wordt het getal kleiner: deel door ${factor}.`
            : undefined,
      }),
    ],
  };
}

export type SpeedForm = TravelForm | 'time' | 'conversion';
const FORMS: readonly SpeedForm[] = ['speed', 'distance', 'time', 'conversion'];

/** The four forms equally likely, the context for the first three, the direction 50/50. */
export function generateSpeed(rng: Rng): Question {
  const form = pick(rng, FORMS);
  if (form === 'conversion') {
    return speedConversionQuestion(pick(rng, [true, false]), pick(rng, METRES_PER_SECOND));
  }
  const context = pick(rng, CONTEXTS);
  return form === 'time'
    ? timeQuestion(pick(rng, timeTrips(context)))
    : travelQuestion(form, pick(rng, promptTrips(context)));
}
