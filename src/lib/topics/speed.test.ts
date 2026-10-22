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
  PROMPT_DURATIONS,
  promptTrips,
  travelExplanation,
  travelQuestion,
  travelTip,
  type Duration,
  type SpeedContext,
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

function ask(form: TravelForm, trip: Trip, input: string) {
  return stepOf(travelQuestion(form, trip)).check(input);
}

const FORMS: readonly TravelForm[] = ['speed', 'distance'];

const TIP_PER_HOUR = 'km/u is per uur: reken eerst uit hoeveel km je in 60 min aflegt.';
const TIP_FACTOR_TEN = 'Je antwoord is 10 keer te groot. Let op de komma en het aantal nullen.';

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

  interface Parsed {
    form: TravelForm;
    context: SpeedContext;
    speed: number;
    time: Duration;
    distance: Rational;
    question: Question;
  }

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

  let parsed: Parsed[] = [];
  beforeAll(() => {
    parsed = questions.map(parse);
  });

  it('creates single-step number questions that accept their own answer', () => {
    for (const { form, question } of parsed) {
      expect(question.steps, question.key).toHaveLength(1);
      expect(stepOf(question).kind).toBe('number');
      expect(stepOf(question).suffix, question.key).toBe(form === 'speed' ? 'km/u' : 'km');
      const result = stepOf(question).check(typed(answerOf(question)));
      expect(result.correct, question.key).toBe(true);
      expect(result.explanation, question.key).toBeTruthy();
    }
  });

  it('uses the speed and distance forms about equally often', () => {
    for (const form of FORMS) {
      const share = parsed.filter((question) => question.form === form).length / COUNT;
      expect(share, form).toBeGreaterThan(0.4);
      expect(share, form).toBeLessThan(0.6);
    }
  });

  it('uses every context about equally often', () => {
    for (const context of CONTEXTS) {
      const share = parsed.filter((question) => question.context === context).length / COUNT;
      expect(share, context).toBeGreaterThan(0.18);
      expect(share, context).toBeLessThan(0.32);
    }
  });

  it('uses times in minutes and in hours', () => {
    for (const unit of ['min', 'uur']) {
      const used = parsed.filter(({ time }) => time.unit === unit).length;
      expect(used, unit).toBeGreaterThan(50);
    }
  });

  it('draws the speed of the context and a time of the list', () => {
    for (const { context, speed, time, question } of parsed) {
      expect(CONTEXT_SPEEDS[context], question.key).toContain(speed);
      expect(PROMPT_DURATIONS.map(timeText), question.key).toContain(timeText(time));
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
