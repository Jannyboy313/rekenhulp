import { formatFraction, formatRational } from '../format';
import { gcd } from '../primes';
import { pick, type Rng } from '../random';
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
import type { Diagnose } from '../tips';
import type { Question } from '../types';

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

/** The start of a prompt and how the distance is asked, per context. */
const WORDING: Readonly<Record<SpeedContext, { subject: string; howFar: string }>> = {
  wandelen: { subject: 'Je wandelt', howFar: 'Hoeveel km loop je' },
  fietsen: { subject: 'Je fietst', howFar: 'Hoeveel km fiets je' },
  auto: { subject: 'Een auto rijdt', howFar: 'Hoeveel km rijdt de auto' },
  trein: { subject: 'Een trein rijdt', howFar: 'Hoeveel km rijdt de trein' },
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
const TRAVEL_FORMS: readonly TravelForm[] = ['speed', 'distance'];

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

/** `Je fietst 6 km in 20 min. Hoe snel is dat?` and the distance form (spec §5.26). */
export function generateSpeed(rng: Rng): Question {
  const form = pick(rng, TRAVEL_FORMS);
  return travelQuestion(form, pick(rng, promptTrips(pick(rng, CONTEXTS))));
}
