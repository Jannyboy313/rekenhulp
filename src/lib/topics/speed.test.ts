import { beforeAll, describe, expect, it } from 'vitest';
import { formatRational, GROUP_SEPARATOR } from '../format';
import { createRng } from '../random';
import {
  compare,
  decimalPlaces,
  divide,
  fromInteger,
  multiply,
  parseDutchNumber,
  rational,
  type Rational,
} from '../rational';
import type { Question, Step } from '../types';
import {
  CONTEXT_SPEEDS,
  CONTEXTS,
  generateSpeed,
  hoursOf,
  MAX_DISTANCE,
  METRES_PER_SECOND,
  PROMPT_DURATIONS,
  promptTrips,
  speedConversionQuestion,
  timeExplanation,
  timeQuestion,
  timeTipFor,
  timeTrips,
  travelExplanation,
  travelQuestion,
  travelTip,
  type Duration,
  type SpeedContext,
  type SpeedForm,
  type TravelForm,
  type Trip,
} from './speed';

/** A value written in Dutch notation: '7,5'. */
function decimal(text: string): Rational {
  return parseDutchNumber(text)!;
}

/** What the user types for a value: the digits and the comma, without grouping. */
function typed(value: Rational): string {
  return formatRational(value).replaceAll(GROUP_SEPARATOR, '');
}

function stepOf(question: Question): Step {
  return question.steps[0]!;
}

/** The correct answer of a question, read back from its expected answer. */
function answerOf(question: Question): Rational {
  return decimal(stepOf(question).check('').expected.replaceAll(GROUP_SEPARATOR, ''));
}

/** A time written as in a prompt: '45 min', '2,5 uur'. */
function duration(text: string): Duration {
  const [amount, unit] = text.split(' ');
  return { amount: decimal(amount!), unit: unit as Duration['unit'] };
}

function timeText({ amount, unit }: Duration): string {
  return `${formatRational(amount)} ${unit}`;
}

/** The trip with its distance worked out independently of `hoursOf`: speed × time in hours. */
function tripOf(context: SpeedContext, speed: number, time: string): Trip {
  const given = duration(time);
  const hours = given.unit === 'min' ? divide(given.amount, fromInteger(60)) : given.amount;
  return { context, speed, duration: given, distance: multiply(fromInteger(speed), hours) };
}

/** A trip whose time is the answer, written as in the answer: '24 min', '2,5 uur'. */
function timeTripOf(context: SpeedContext, speed: number, km: number, time: string): Trip {
  return { context, speed, duration: duration(time), distance: fromInteger(km) };
}

function ask(form: TravelForm, trip: Trip, input: string) {
  return stepOf(travelQuestion(form, trip)).check(input);
}

function askTime(trip: Trip, input: string) {
  return stepOf(timeQuestion(trip)).check(input);
}

function askConversion(toMetresPerSecond: boolean, metresPerSecond: number, input: string) {
  return stepOf(speedConversionQuestion(toMetresPerSecond, metresPerSecond)).check(input);
}

const FORMS: readonly TravelForm[] = ['speed', 'distance'];
const SPEED_FORMS: readonly SpeedForm[] = ['speed', 'distance', 'time', 'conversion'];

const TIP_PER_HOUR = 'km/u is per uur: reken eerst uit hoeveel km je in 60 min aflegt.';
const TIP_FACTOR_TEN = 'Je antwoord is 10 keer te groot. Let op de komma en het aantal nullen.';
const TIP_FACTOR_TEN_SMALL =
  'Je antwoord is 10 keer te klein. Let op de komma en het aantal nullen.';
const TIP_HUNDRED = '1 uur = 60 min, niet 100 min.';
const TIP_TO_METRES_PER_SECOND = 'Naar m/s wordt het getal kleiner: deel door 3,6.';

describe('contexts', () => {
  it('lists the four contexts with the speeds and distances of spec §5.26', () => {
    expect(CONTEXTS).toEqual(['wandelen', 'fietsen', 'auto', 'trein']);
    expect(CONTEXT_SPEEDS).toEqual({
      wandelen: [4, 5, 6],
      fietsen: [12, 15, 16, 18, 20, 24],
      auto: [30, 50, 60, 80, 90, 100, 120],
      trein: [80, 100, 120, 150],
    });
    expect(MAX_DISTANCE).toEqual({ wandelen: 20, fietsen: 80, auto: 400, trein: 500 });
  });
});

describe('PROMPT_DURATIONS', () => {
  it('lists the minutes and the hours of spec §5.26', () => {
    expect(PROMPT_DURATIONS.map(timeText)).toEqual([
      '10 min',
      '12 min',
      '15 min',
      '20 min',
      '30 min',
      '40 min',
      '45 min',
      '1,5 uur',
      '2 uur',
      '2,5 uur',
      '3 uur',
      '4 uur',
    ]);
  });
});

describe('hoursOf', () => {
  it.each<[string, bigint, bigint]>([
    ['45 min', 3n, 4n],
    ['20 min', 1n, 3n],
    ['10 min', 1n, 6n],
    ['2,5 uur', 5n, 2n],
    ['4 uur', 4n, 1n],
  ])('writes %s as %s/%s uur', (time, num, den) => {
    expect(hoursOf(duration(time))).toEqual(rational(num, den));
  });
});

describe('promptTrips', () => {
  it.each<[SpeedContext, number, string, string | null]>([
    ['fietsen', 18, '20 min', '6'],
    ['wandelen', 4, '45 min', '3'],
    ['auto', 50, '45 min', '37,5'],
    ['fietsen', 16, '45 min', '12'],
    ['wandelen', 4, '12 min', '0,8'],
    ['wandelen', 5, '10 min', null], // 0,83 km
    ['wandelen', 5, '40 min', null], // 3,33 km
    ['fietsen', 15, '45 min', null], // 11,25 km: 2 decimals
    ['wandelen', 6, '4 uur', null], // 24 km > 20
    ['fietsen', 24, '4 uur', null], // 96 km > 80
    ['trein', 150, '4 uur', null], // 600 km > 500
    ['fietsen', 15, '2,5 uur', '37,5'],
  ])('%s at %i km/u for %s: distance %s', (context, speed, time, distance) => {
    const found = promptTrips(context).find(
      (trip) => trip.speed === speed && timeText(trip.duration) === time,
    );
    expect(found === undefined ? null : formatRational(found.distance)).toBe(distance);
  });

  it('has candidates with minutes and with hours for every context', () => {
    for (const context of CONTEXTS) {
      const units = new Set(promptTrips(context).map((trip) => trip.duration.unit));
      expect([...units].sort(), context).toEqual(['min', 'uur']);
    }
  });

  it('keeps the context, speed and time of every trip, and the distance in [0,5; maximum]', () => {
    for (const context of CONTEXTS) {
      const farthest = fromInteger(MAX_DISTANCE[context]);
      for (const trip of promptTrips(context)) {
        const { speed, duration: time, distance } = trip;
        const label = `${context} ${speed} km/u, ${timeText(time)}`;
        expect(trip.context, label).toBe(context);
        expect(CONTEXT_SPEEDS[context], label).toContain(speed);
        expect(PROMPT_DURATIONS.map(timeText), label).toContain(timeText(time));
        expect(distance, label).toEqual(tripOf(context, speed, timeText(time)).distance);
        expect(compare(distance, decimal('0,5')), label).toBeGreaterThanOrEqual(0);
        expect(compare(distance, farthest), label).toBeLessThanOrEqual(0);
      }
    }
  });

  it('has at most 1 decimal in every row of the ratio table', () => {
    for (const context of CONTEXTS) {
      for (const trip of promptTrips(context)) {
        const label = `${context} ${trip.speed} km/u, ${timeText(trip.duration)}`;
        for (const form of FORMS) {
          for (const [, km] of travelExplanation(form, trip).matchAll(/→ (\S+) km/gu)) {
            expect(decimalPlaces(decimal(km!)), label).toBeLessThanOrEqual(1);
          }
        }
      }
    }
  });
});

describe('travelQuestion', () => {
  it.each<[TravelForm, SpeedContext, number, string, string]>([
    ['speed', 'wandelen', 4, '45 min', 'Je wandelt 3 km in 45 min. Hoe snel is dat?'],
    ['speed', 'fietsen', 18, '20 min', 'Je fietst 6 km in 20 min. Hoe snel is dat?'],
    ['speed', 'auto', 80, '45 min', 'Een auto rijdt 60 km in 45 min. Hoe snel is dat?'],
    ['speed', 'trein', 120, '2,5 uur', 'Een trein rijdt 300 km in 2,5 uur. Hoe snel is dat?'],
    ['distance', 'wandelen', 5, '45 min', 'Je wandelt 5 km/u. Hoeveel km loop je in 45 min?'],
    ['distance', 'fietsen', 18, '40 min', 'Je fietst 18 km/u. Hoeveel km fiets je in 40 min?'],
    [
      'distance',
      'auto',
      80,
      '45 min',
      'Een auto rijdt 80 km/u. Hoeveel km rijdt de auto in 45 min?',
    ],
    [
      'distance',
      'trein',
      120,
      '2,5 uur',
      'Een trein rijdt 120 km/u. Hoeveel km rijdt de trein in 2,5 uur?',
    ],
  ])('words the %s form for %s at %i km/u and %s', (form, context, speed, time, prompt) => {
    expect(stepOf(travelQuestion(form, tripOf(context, speed, time))).prompt).toBe(prompt);
  });

  it('is a single number step with a key of the form, context, speed and time', () => {
    const question = travelQuestion('distance', tripOf('auto', 80, '45 min'));
    expect(question.topic).toBe('speed');
    expect(question.key).toBe('speed:distance:auto:80:45min');
    expect(question.steps).toHaveLength(1);
    expect(stepOf(question).kind).toBe('number');
    expect(travelQuestion('speed', tripOf('trein', 120, '2,5 uur')).key).toBe(
      'speed:speed:trein:120:2,5uur',
    );
  });

  it.each<[TravelForm, SpeedContext, number, string, string, string]>([
    ['speed', 'fietsen', 18, '20 min', '18', 'km/u'],
    ['speed', 'wandelen', 4, '45 min', '4', 'km/u'],
    ['speed', 'fietsen', 20, '2,5 uur', '20', 'km/u'],
    ['speed', 'fietsen', 20, '2 uur', '20', 'km/u'],
    ['distance', 'auto', 80, '45 min', '60', 'km'],
    ['distance', 'fietsen', 18, '20 min', '6', 'km'],
    ['distance', 'trein', 120, '2,5 uur', '300', 'km'],
    ['distance', 'auto', 120, '3 uur', '360', 'km'],
  ])('%s, %s at %i km/u and %s: answer %s %s', (form, context, speed, time, answer, suffix) => {
    const step = stepOf(travelQuestion(form, tripOf(context, speed, time)));
    expect(step.check(answer).correct).toBe(true);
    expect(step.check('').expected).toBe(answer);
    expect(step.suffix).toBe(suffix);
    expect(step.prefix).toBeUndefined();
  });

  it('shows the explanation for a correct and for a wrong answer', () => {
    const explanation = '20 min → 6 km, 60 min → 18 km';
    const trip = tripOf('fietsen', 18, '20 min');
    expect(ask('speed', trip, '18').explanation).toBe(explanation);
    expect(ask('speed', trip, '7').explanation).toBe(explanation);
  });
});

describe('travelExplanation', () => {
  it.each<[TravelForm, SpeedContext, number, string, string]>([
    ['speed', 'fietsen', 18, '20 min', '20 min → 6 km, 60 min → 18 km'],
    ['speed', 'wandelen', 4, '45 min', '45 min → 3 km, 15 min → 1 km, 60 min → 4 km'],
    ['speed', 'fietsen', 20, '2,5 uur', '2,5 uur → 50 km, 0,5 uur → 10 km, 1 uur → 20 km'],
    ['speed', 'fietsen', 20, '2 uur', '2 uur → 40 km, 1 uur → 20 km'],
    ['distance', 'auto', 80, '45 min', '60 min → 80 km, 15 min → 20 km, 45 min → 60 km'],
    ['distance', 'fietsen', 18, '20 min', '60 min → 18 km, 20 min → 6 km'],
    ['distance', 'trein', 120, '2,5 uur', '1 uur → 120 km, 0,5 uur → 60 km, 2,5 uur → 300 km'],
    ['distance', 'auto', 120, '3 uur', '1 uur → 120 km, 3 uur → 360 km'],
    ['speed', 'auto', 50, '45 min', '45 min → 37,5 km, 15 min → 12,5 km, 60 min → 50 km'],
    ['speed', 'wandelen', 4, '12 min', '12 min → 0,8 km, 60 min → 4 km'],
    ['speed', 'fietsen', 18, '40 min', '40 min → 12 km, 20 min → 6 km, 60 min → 18 km'],
    ['speed', 'fietsen', 15, '1,5 uur', '1,5 uur → 22,5 km, 0,5 uur → 7,5 km, 1 uur → 15 km'],
  ])('explains %s, %s at %i km/u and %s', (form, context, speed, time, explanation) => {
    expect(travelExplanation(form, tripOf(context, speed, time))).toBe(explanation);
  });
});

describe('travelTip', () => {
  it.each<[TravelForm, SpeedContext, number, string, string, string | undefined]>([
    ['speed', 'fietsen', 18, '20 min', '0,3', TIP_PER_HOUR],
    ['speed', 'fietsen', 20, '2 uur', '0,3', undefined], // hours: no minutes mistake
    ['speed', 'fietsen', 20, '2,5 uur', '20', undefined], // the correct answer
    ['speed', 'fietsen', 18, '20 min', '180', TIP_FACTOR_TEN],
    ['speed', 'fietsen', 18, '20 min', '6', undefined],
    ['distance', 'auto', 80, '45 min', '3600', '45 min is 3/4 uur, niet 45 uur.'],
    ['distance', 'fietsen', 18, '20 min', '360', '20 min is 1/3 uur, niet 20 uur.'],
    ['distance', 'fietsen', 18, '40 min', '720', '40 min is 2/3 uur, niet 40 uur.'],
    ['distance', 'auto', 80, '45 min', '59', undefined],
    ['distance', 'trein', 120, '2,5 uur', '300', undefined], // the correct answer
    ['distance', 'trein', 120, '2,5 uur', '120', undefined],
  ])('%s, %s at %i km/u and %s: typing %s', (form, context, speed, time, input, tip) => {
    expect(ask(form, tripOf(context, speed, time), input).tip).toBe(tip);
  });

  it('never recognises the correct answer', () => {
    const trip = tripOf('fietsen', 18, '20 min');
    expect(travelTip('speed', trip)(fromInteger(18))).toBeUndefined();
    expect(travelTip('distance', trip)(fromInteger(6))).toBeUndefined();
  });
});

describe('timeTrips', () => {
  it.each<[SpeedContext, number, number, string | null]>([
    ['wandelen', 5, 2, '24 min'],
    ['fietsen', 24, 10, '25 min'], // step 2 km → 5 min
    ['wandelen', 6, 1, '10 min'],
    ['trein', 120, 300, '2,5 uur'],
    ['auto', 100, 400, '4 uur'],
    ['fietsen', 16, 2, null], // 7,5 min
    ['auto', 90, 100, null], // 66,67 min
    ['auto', 60, 210, null], // 3,5 uur is not in the list
    ['wandelen', 6, 30, null], // 30 km > 20
  ])('%s at %i km/u over %i km: time %s', (context, speed, km, time) => {
    const found = timeTrips(context).find(
      (trip) => trip.speed === speed && compare(trip.distance, fromInteger(km)) === 0,
    );
    expect(found === undefined ? null : timeText(found.duration)).toBe(time);
  });

  it('has candidates with minutes and with hours for every context', () => {
    for (const context of CONTEXTS) {
      const units = new Set(timeTrips(context).map((trip) => trip.duration.unit));
      expect([...units].sort(), context).toEqual(['min', 'uur']);
    }
  });

  it('has a whole distance in [1; maximum] and the time distance ÷ speed', () => {
    for (const context of CONTEXTS) {
      for (const trip of timeTrips(context)) {
        const { speed, duration: time, distance } = trip;
        const label = `${context} ${speed} km/u, ${formatRational(distance)} km`;
        expect(trip.context, label).toBe(context);
        expect(CONTEXT_SPEEDS[context], label).toContain(speed);
        expect(distance.den, label).toBe(1n);
        expect(distance.num, label).toBeGreaterThanOrEqual(1n);
        expect(distance.num, label).toBeLessThanOrEqual(BigInt(MAX_DISTANCE[context]));
        expect(tripOf(context, speed, timeText(time)).distance, label).toEqual(distance);
      }
    }
  });

  it('asks minutes as a whole number in [5, 59] and hours from the list', () => {
    const hours = PROMPT_DURATIONS.filter(({ unit }) => unit === 'uur').map(timeText);
    for (const context of CONTEXTS) {
      for (const { duration: time, speed, distance } of timeTrips(context)) {
        const label = `${context} ${speed} km/u, ${formatRational(distance)} km`;
        if (time.unit === 'min') {
          expect(time.amount.den, label).toBe(1n);
          expect(time.amount.num, label).toBeGreaterThanOrEqual(5n);
          expect(time.amount.num, label).toBeLessThanOrEqual(59n);
        } else {
          expect(hours, label).toContain(timeText(time));
        }
      }
    }
  });

  it('has whole minutes, or whole half hours, in every row of the ratio table', () => {
    for (const context of CONTEXTS) {
      for (const trip of timeTrips(context)) {
        const label = `${context} ${trip.speed} km/u, ${formatRational(trip.distance)} km`;
        for (const [, amount, unit] of timeExplanation(trip).matchAll(/→ (\S+) (min|uur)/gu)) {
          const value = decimal(amount!);
          const wholes = unit === 'min' ? value : multiply(value, fromInteger(2));
          expect(wholes.den, label).toBe(1n);
        }
      }
    }
  });
});

describe('timeQuestion', () => {
  it.each<[SpeedContext, number, number, string, string]>([
    ['wandelen', 5, 2, '24 min', 'Je wandelt 5 km/u. Hoe lang doe je over 2 km?'],
    ['fietsen', 18, 12, '40 min', 'Je fietst 18 km/u. Hoe lang doe je over 12 km?'],
    ['auto', 80, 60, '45 min', 'Een auto rijdt 80 km/u. Hoe lang doet de auto over 60 km?'],
    [
      'trein',
      120,
      300,
      '2,5 uur',
      'Een trein rijdt 120 km/u. Hoe lang doet de trein over 300 km?',
    ],
  ])('words %s at %i km/u over %i km (%s)', (context, speed, km, time, prompt) => {
    expect(stepOf(timeQuestion(timeTripOf(context, speed, km, time))).prompt).toBe(prompt);
  });

  it('is a single number step with a key of the context, speed and distance', () => {
    const question = timeQuestion(timeTripOf('auto', 80, 60, '45 min'));
    expect(question.topic).toBe('speed');
    expect(question.key).toBe('speed:time:auto:80:60');
    expect(question.steps).toHaveLength(1);
    expect(stepOf(question).kind).toBe('number');
  });

  it.each<[SpeedContext, number, number, string, string, string]>([
    ['wandelen', 5, 2, '24 min', '24', 'min'],
    ['fietsen', 18, 12, '40 min', '40', 'min'],
    ['fietsen', 18, 6, '20 min', '20', 'min'],
    ['auto', 80, 60, '45 min', '45', 'min'],
    ['trein', 120, 300, '2,5 uur', '2,5', 'uur'],
    ['auto', 100, 400, '4 uur', '4', 'uur'],
  ])('%s at %i km/u over %i km (%s): answer %s %s', (context, speed, km, time, answer, suffix) => {
    const step = stepOf(timeQuestion(timeTripOf(context, speed, km, time)));
    expect(step.check(answer).correct).toBe(true);
    expect(step.check('').expected).toBe(answer);
    expect(step.suffix).toBe(suffix);
    expect(step.prefix).toBeUndefined();
  });

  it('shows the explanation for a correct and for a wrong answer', () => {
    const explanation = '5 km → 60 min, 1 km → 12 min, 2 km → 24 min';
    const trip = timeTripOf('wandelen', 5, 2, '24 min');
    expect(askTime(trip, '24').explanation).toBe(explanation);
    expect(askTime(trip, '7').explanation).toBe(explanation);
  });
});

describe('timeExplanation', () => {
  it.each<[SpeedContext, number, number, string, string]>([
    ['wandelen', 5, 2, '24 min', '5 km → 60 min, 1 km → 12 min, 2 km → 24 min'],
    ['fietsen', 18, 12, '40 min', '18 km → 60 min, 6 km → 20 min, 12 km → 40 min'],
    ['fietsen', 18, 6, '20 min', '18 km → 60 min, 6 km → 20 min'],
    ['auto', 80, 60, '45 min', '80 km → 60 min, 20 km → 15 min, 60 km → 45 min'],
    ['trein', 120, 300, '2,5 uur', '120 km → 1 uur, 60 km → 0,5 uur, 300 km → 2,5 uur'],
    ['auto', 100, 400, '4 uur', '100 km → 1 uur, 400 km → 4 uur'],
    ['fietsen', 24, 10, '25 min', '24 km → 60 min, 2 km → 5 min, 10 km → 25 min'],
  ])('explains %s at %i km/u over %i km (%s)', (context, speed, km, time, explanation) => {
    expect(timeExplanation(timeTripOf(context, speed, km, time))).toBe(explanation);
  });
});

describe('timeTipFor', () => {
  it.each<[SpeedContext, number, number, string, string, string | undefined]>([
    ['wandelen', 5, 2, '24 min', '0,4', 'Dat is in uren; gevraagd zijn minuten: 0,4 × 60 = 24.'],
    ['fietsen', 20, 5, '15 min', '0,25', 'Dat is in uren; gevraagd zijn minuten: 0,25 × 60 = 15.'],
    ['wandelen', 5, 2, '24 min', '40', TIP_HUNDRED],
    ['trein', 120, 300, '2,5 uur', '150', 'Dat is in minuten; gevraagd zijn uren: 150 : 60 = 2,5.'],
    ['trein', 120, 300, '2,5 uur', '1,5', TIP_HUNDRED],
    ['trein', 120, 300, '2,5 uur', '2,3', '30 min is 0,5 uur, niet 0,3 uur.'],
    ['fietsen', 24, 10, '25 min', '0,4', undefined], // 25 min = 5/12 uur: must not throw
    ['wandelen', 5, 2, '24 min', '2,4', TIP_FACTOR_TEN_SMALL],
    ['wandelen', 5, 2, '24 min', '240', TIP_FACTOR_TEN],
    ['wandelen', 5, 2, '24 min', '24', undefined], // the correct answer
    ['trein', 120, 300, '2,5 uur', '2,5', undefined], // the correct answer
    ['wandelen', 5, 2, '24 min', '23', undefined],
  ])('%s at %i km/u over %i km (%s): typing %s', (context, speed, km, time, input, tip) => {
    expect(askTime(timeTripOf(context, speed, km, time), input).tip).toBe(tip);
  });

  it('never throws for a typed answer, whatever the trip', () => {
    for (const context of CONTEXTS) {
      for (const trip of timeTrips(context)) {
        const minutes = multiply(hoursOf(trip.duration), fromInteger(60));
        const inputs = [decimal('0,4'), decimal('2,3'), fromInteger(150), minutes];
        for (const given of inputs) expect(() => timeTipFor(trip)(given)).not.toThrow();
      }
    }
  });
});

describe('METRES_PER_SECOND', () => {
  it('lists 5, 10, …, 40 (spec §5.26)', () => {
    expect(METRES_PER_SECOND).toEqual([5, 10, 15, 20, 25, 30, 35, 40]);
  });
});

describe('speedConversionQuestion', () => {
  it.each<[boolean, number, string]>([
    [true, 20, '72 km/u = ? m/s'],
    [false, 20, '20 m/s = ? km/u'],
    [false, 5, '5 m/s = ? km/u'],
    [true, 40, '144 km/u = ? m/s'],
  ])('words toMetresPerSecond %s for %i m/s', (toMetresPerSecond, metresPerSecond, prompt) => {
    expect(stepOf(speedConversionQuestion(toMetresPerSecond, metresPerSecond)).prompt).toBe(prompt);
  });

  it('is a single number step with a key of the direction and the speed in m/s', () => {
    const question = speedConversionQuestion(true, 20);
    expect(question.topic).toBe('speed');
    expect(question.key).toBe('speed:conversion:to-ms:20');
    expect(speedConversionQuestion(false, 20).key).toBe('speed:conversion:to-kmh:20');
    expect(question.steps).toHaveLength(1);
    expect(stepOf(question).kind).toBe('number');
  });

  it.each<[boolean, number, string, string]>([
    [true, 20, '20', 'm/s'],
    [false, 20, '72', 'km/u'],
    [false, 5, '18', 'km/u'],
    [true, 40, '40', 'm/s'],
    [true, 5, '5', 'm/s'],
    [false, 40, '144', 'km/u'],
  ])('toMetresPerSecond %s for %i m/s: answer %s %s', (toMetresPerSecond, ms, answer, suffix) => {
    const step = stepOf(speedConversionQuestion(toMetresPerSecond, ms));
    expect(step.check(answer).correct).toBe(true);
    expect(step.check('').expected).toBe(answer);
    expect(step.suffix).toBe(suffix);
    expect(step.prefix).toBeUndefined();
  });

  it.each<[boolean, number, string]>([
    [true, 20, '1 m/s = 3600 m/u = 3,6 km/u → 72 : 3,6 = 20'],
    [false, 20, '1 m/s = 3600 m/u = 3,6 km/u → 20 × 3,6 = 72'],
    [false, 5, '1 m/s = 3600 m/u = 3,6 km/u → 5 × 3,6 = 18'],
    [true, 40, '1 m/s = 3600 m/u = 3,6 km/u → 144 : 3,6 = 40'],
  ])('explains toMetresPerSecond %s for %i m/s', (toMetresPerSecond, ms, explanation) => {
    expect(askConversion(toMetresPerSecond, ms, '20').explanation).toBe(explanation);
    expect(askConversion(toMetresPerSecond, ms, '1').explanation).toBe(explanation);
  });

  it.each<[boolean, number, string, string | undefined]>([
    [true, 20, '259,2', TIP_TO_METRES_PER_SECOND],
    [true, 20, '2', TIP_FACTOR_TEN_SMALL],
    [true, 20, '200', TIP_FACTOR_TEN],
    [true, 20, '20', undefined], // the correct answer
    [true, 20, '75', undefined],
    [false, 20, '5,6', undefined], // the reverse mistake is never a finite decimal
    [false, 20, '72', undefined], // the correct answer
    [false, 20, '7,2', TIP_FACTOR_TEN_SMALL],
  ])('toMetresPerSecond %s for %i m/s: typing %s', (toMetresPerSecond, ms, input, tip) => {
    expect(askConversion(toMetresPerSecond, ms, input).tip).toBe(tip);
  });
});

describe('generateSpeed', () => {
  const COUNT = 1000;
  const rng = createRng(53);
  const questions = Array.from({ length: COUNT }, () => generateSpeed(rng));

  const SUBJECT = '(Je wandelt|Je fietst|Een auto rijdt|Een trein rijdt)';
  const HOW_FAR_PATTERN = '(loop je|fiets je|rijdt de auto|rijdt de trein)';
  const SPEED_PROMPT = new RegExp(
    `^${SUBJECT} (\\S+) km in (\\S+) (min|uur)\\. Hoe snel is dat\\?$`,
    'u',
  );
  const DISTANCE_PROMPT = new RegExp(
    `^${SUBJECT} (\\S+) km/u\\. Hoeveel km ${HOW_FAR_PATTERN} in (\\S+) (min|uur)\\?$`,
    'u',
  );
  const HOW_LONG_PATTERN = '(doe je|doet de auto|doet de trein)';
  const TIME_PROMPT = new RegExp(
    `^${SUBJECT} (\\S+) km/u\\. Hoe lang ${HOW_LONG_PATTERN} over (\\S+) km\\?$`,
    'u',
  );
  const TO_MS_PROMPT = /^(\d+) km\/u = \? m\/s$/u;
  const TO_KMH_PROMPT = /^(\d+) m\/s = \? km\/u$/u;
  const CONTEXT_OF: Record<string, SpeedContext> = {
    'Je wandelt': 'wandelen',
    'Je fietst': 'fietsen',
    'Een auto rijdt': 'auto',
    'Een trein rijdt': 'trein',
  };
  const HOW_FAR: Record<SpeedContext, string> = {
    wandelen: 'loop je',
    fietsen: 'fiets je',
    auto: 'rijdt de auto',
    trein: 'rijdt de trein',
  };
  const HOW_LONG: Record<SpeedContext, string> = {
    wandelen: 'doe je',
    fietsen: 'doe je',
    auto: 'doet de auto',
    trein: 'doet de trein',
  };

  interface Parsed {
    form: TravelForm | 'time';
    context: SpeedContext;
    speed: number;
    time: Duration;
    distance: Rational;
    question: Question;
  }

  interface ParsedConversion {
    toMetresPerSecond: boolean;
    metresPerSecond: number;
    question: Question;
  }

  const isConversion = (question: Question) => question.key.startsWith('speed:conversion:');

  function matchOf(pattern: RegExp, prompt: string): string[] {
    const match = pattern.exec(prompt);
    if (match === null) throw new Error(`Unexpected prompt: ${prompt}`);
    return match;
  }

  /** Reads the numbers back from the key and the prompt, so they are checked independently. */
  function parse(question: Question): Parsed {
    const [topic, form, context, speed, time] = question.key.split(':');
    expect(topic).toBe('speed');
    const { prompt } = stepOf(question);
    if (form === 'speed') {
      const match = matchOf(SPEED_PROMPT, prompt);
      const given = duration(`${match[3]} ${match[4]}`);
      expect(CONTEXT_OF[match[1]!], prompt).toBe(context);
      expect(`${formatRational(given.amount)}${given.unit}`, prompt).toBe(time);
      expect(answerOf(question), prompt).toEqual(fromInteger(Number(speed)));
      return {
        form,
        context: context as SpeedContext,
        speed: Number(speed),
        time: given,
        distance: decimal(match[2]!),
        question,
      };
    }
    if (form === 'time') {
      const match = matchOf(TIME_PROMPT, prompt);
      expect(CONTEXT_OF[match[1]!], prompt).toBe(context);
      expect(HOW_LONG[context as SpeedContext], prompt).toBe(match[3]);
      expect(decimal(match[2]!), prompt).toEqual(fromInteger(Number(speed)));
      expect(decimal(match[4]!), prompt).toEqual(fromInteger(Number(time)));
      return {
        form,
        context: context as SpeedContext,
        speed: Number(speed),
        time: { amount: answerOf(question), unit: stepOf(question).suffix as Duration['unit'] },
        distance: decimal(match[4]!),
        question,
      };
    }
    const match = matchOf(DISTANCE_PROMPT, prompt);
    const given = duration(`${match[4]} ${match[5]}`);
    expect(CONTEXT_OF[match[1]!], prompt).toBe(context);
    expect(HOW_FAR[context as SpeedContext], prompt).toBe(match[3]);
    expect(`${formatRational(given.amount)}${given.unit}`, prompt).toBe(time);
    expect(decimal(match[2]!), prompt).toEqual(fromInteger(Number(speed)));
    return {
      form: 'distance',
      context: context as SpeedContext,
      speed: Number(speed),
      time: given,
      distance: answerOf(question),
      question,
    };
  }

  /** Reads the speeds back from the key and the prompt: the key holds the speed in m/s. */
  function parseConversion(question: Question): ParsedConversion {
    const [topic, , direction, metresPerSecond] = question.key.split(':');
    expect(topic).toBe('speed');
    const { prompt } = stepOf(question);
    const toMetresPerSecond = direction === 'to-ms';
    const match = matchOf(toMetresPerSecond ? TO_MS_PROMPT : TO_KMH_PROMPT, prompt);
    const given = Number(match[1]);
    expect(given, prompt).toBe(
      toMetresPerSecond ? (Number(metresPerSecond) * 36) / 10 : Number(metresPerSecond),
    );
    return { toMetresPerSecond, metresPerSecond: Number(metresPerSecond), question };
  }

  let parsed: Parsed[] = [];
  let conversions: ParsedConversion[] = [];
  beforeAll(() => {
    parsed = questions.filter((question) => !isConversion(question)).map(parse);
    conversions = questions.filter(isConversion).map(parseConversion);
  });

  it('creates single-step number questions that accept their own answer', () => {
    for (const { form, time, question } of parsed) {
      expect(question.steps, question.key).toHaveLength(1);
      expect(stepOf(question).kind).toBe('number');
      const suffix = form === 'time' ? time.unit : form === 'speed' ? 'km/u' : 'km';
      expect(stepOf(question).suffix, question.key).toBe(suffix);
      const result = stepOf(question).check(typed(answerOf(question)));
      expect(result.correct, question.key).toBe(true);
      expect(result.explanation, question.key).toBeTruthy();
    }
  });

  it('uses the four forms about equally often', () => {
    for (const form of SPEED_FORMS) {
      const used = questions.filter((question) => question.key.split(':')[1] === form).length;
      expect(used, form).toBeGreaterThanOrEqual(200);
    }
  });

  it('uses both directions and every speed in m/s in the conversion form', () => {
    for (const toMetresPerSecond of [true, false]) {
      const used = conversions.filter((one) => one.toMetresPerSecond === toMetresPerSecond);
      expect(used.length, `toMetresPerSecond ${toMetresPerSecond}`).toBeGreaterThan(50);
    }
    expect(new Set(conversions.map((one) => one.metresPerSecond))).toEqual(
      new Set(METRES_PER_SECOND),
    );
  });

  it('accepts the answer of a conversion in the unit of its direction', () => {
    for (const { toMetresPerSecond, metresPerSecond, question } of conversions) {
      const result = stepOf(question).check(typed(answerOf(question)));
      expect(result.correct, question.key).toBe(true);
      expect(result.explanation, question.key).toBeTruthy();
      expect(stepOf(question).suffix, question.key).toBe(toMetresPerSecond ? 'm/s' : 'km/u');
      expect(stepOf(question).kind).toBe('number');
      expect(question.steps, question.key).toHaveLength(1);
      expect(answerOf(question), question.key).toEqual(
        fromInteger(toMetresPerSecond ? metresPerSecond : (metresPerSecond * 36) / 10),
      );
    }
  });

  it('gives the same prompt and answer to questions with the same key', () => {
    const seen = new Map<string, string>();
    for (const question of questions) {
      const shown = `${stepOf(question).prompt} ${stepOf(question).check('').expected}`;
      expect(seen.get(question.key) ?? shown, question.key).toBe(shown);
      seen.set(question.key, shown);
    }
    expect(seen.size).toBeGreaterThan(100);
  });

  it('uses every context about equally often', () => {
    for (const context of CONTEXTS) {
      const share =
        parsed.filter((question) => question.context === context).length / parsed.length;
      expect(share, context).toBeGreaterThan(0.18);
      expect(share, context).toBeLessThan(0.32);
    }
  });

  it('uses times in minutes and in hours in the speed and distance forms', () => {
    for (const unit of ['min', 'uur']) {
      const used = parsed.filter((one) => one.form !== 'time' && one.time.unit === unit).length;
      expect(used, unit).toBeGreaterThan(50);
    }
  });

  it('draws the speed of the context and, outside the time form, a time of the list', () => {
    for (const { form, context, speed, time, question } of parsed) {
      expect(CONTEXT_SPEEDS[context], question.key).toContain(speed);
      if (form === 'time') continue;
      expect(PROMPT_DURATIONS.map(timeText), question.key).toContain(timeText(time));
    }
  });

  it('asks the time in the time form in minutes and in hours', () => {
    const hours = PROMPT_DURATIONS.filter(({ unit }) => unit === 'uur').map(timeText);
    const asked = parsed.filter(({ form }) => form === 'time');
    for (const unit of ['min', 'uur']) {
      expect(asked.filter(({ time }) => time.unit === unit).length, unit).toBeGreaterThan(50);
    }
    for (const { time, question } of asked) {
      if (time.unit === 'uur') {
        expect(hours, question.key).toContain(timeText(time));
      } else {
        expect(time.amount.den, question.key).toBe(1n);
        expect(time.amount.num, question.key).toBeGreaterThanOrEqual(5n);
        expect(time.amount.num, question.key).toBeLessThanOrEqual(59n);
      }
    }
  });

  it('makes the distance speed × time, in [0,5; maximum] with at most 1 decimal', () => {
    for (const { context, speed, time, distance, question } of parsed) {
      const label = question.key;
      const farthest = fromInteger(MAX_DISTANCE[context]);
      expect(distance, label).toEqual(tripOf(context, speed, timeText(time)).distance);
      expect(compare(distance, decimal('0,5')), label).toBeGreaterThanOrEqual(0);
      expect(compare(distance, farthest), label).toBeLessThanOrEqual(0);
      expect(decimalPlaces(distance), label).toBeLessThanOrEqual(1);
    }
  });

  it('has at most 1 decimal in every row of the explanation', () => {
    for (const { question } of parsed) {
      const explanation = stepOf(question).check('').explanation!;
      const label = `${question.key}: ${explanation}`;
      for (const [, km] of explanation.matchAll(/→ (\S+) km/gu)) {
        expect(decimalPlaces(decimal(km!)), label).toBeLessThanOrEqual(1);
      }
    }
  });

  it('is deterministic for a fixed seed', () => {
    const keys = (seed: number) => {
      const seeded = createRng(seed);
      return Array.from({ length: 50 }, () => generateSpeed(seeded).key);
    };
    expect(keys(5)).toEqual(keys(5));
  });
});
