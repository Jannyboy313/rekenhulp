import { formatRational, MINUS } from '../format';
import { drawUntil, pick, randomInt, type Rng } from '../random';
import { fromInteger, rational } from '../rational';
import { choiceStep, numberStep } from '../steps';
import type { Question } from '../types';
import { elapsedExplanation, formatClock } from './clock';

const DAY = 1440;

/** `145 minuten`, or `2 uur en 25 minuten` when `mixed` (only above 60 minutes). */
export function durationText(minutes: number, mixed: boolean): string {
  if (!mixed || minutes <= 60) return `${minutes} minuten`;
  const [hours, rest] = [Math.floor(minutes / 60), minutes % 60];
  if (rest === 0) return `${hours} uur`;
  return `${hours} uur en ${rest} ${rest === 1 ? 'minuut' : 'minuten'}`;
}

type Direction = 'later' | 'earlier';

/**
 * Whole hours first, then the minutes via the full hour when they pass one (spec §5.51):
 * `145 min = 2 uur en 25 min → 19:45 + 2 uur = 21:45 → 21:45 + 15 min = 22:00 → 22:00 + 10 min =
 * 22:10`. A departure repeats the question before it passes an hour: `9:10 − 25 min → …`.
 */
export function shiftExplanation(
  from: number,
  minutes: number,
  direction: Direction,
  givenMixed: boolean,
): string {
  const later = direction === 'later';
  const sign = later ? '+' : MINUS;
  const move = (time: number, delta: number) => (later ? time + delta : time - delta);
  const [hours, rest] = [Math.floor(minutes / 60), minutes % 60];
  const parts: string[] = [];
  let time = from;
  if (hours > 0) {
    if (!givenMixed) {
      parts.push(`${minutes} min = ${hours} uur${rest > 0 ? ` en ${rest} min` : ''}`);
    }
    const after = move(time, hours * 60);
    parts.push(`${formatClock(time)} ${sign} ${hours} uur = ${formatClock(after)}`);
    time = after;
  }
  if (rest > 0) {
    const inHour = ((time % 60) + 60) % 60;
    const toFullHour = later ? 60 - inHour : inHour;
    if (inHour === 0 || rest <= toFullHour) {
      parts.push(`${formatClock(time)} ${sign} ${rest} min = ${formatClock(move(time, rest))}`);
    } else {
      const full = move(time, toFullHour);
      if (!later) parts.push(`${formatClock(time)} ${sign} ${rest} min`);
      parts.push(`${formatClock(time)} ${sign} ${toFullHour} min = ${formatClock(full)}`);
      parts.push(
        `${formatClock(full)} ${sign} ${rest - toFullHour} min = ${formatClock(move(time, rest))}`,
      );
    }
  }
  return parts.join(' → ');
}

/** The answer, an hour earlier and later, and 10 minutes earlier or later, in time order. */
function timeOptions(answer: number, tenMinutes: 10 | -10): string[] {
  return [-60, tenMinutes, 0, 60]
    .sort((a, b) => a - b)
    .map((offset) => formatClock(answer + offset));
}

export type ArrivalContext = 'film' | 'treinreis' | 'nachtbus';
export type DepartureContext = 'school' | 'afspraak' | 'trein';

const ARRIVAL_PROMPTS: Readonly<
  Record<ArrivalContext, (start: string, duration: string) => string>
> = {
  film: (start, duration) =>
    `De film begint om ${start} en duurt ${duration}. Hoe laat is de film afgelopen?`,
  treinreis: (start, duration) =>
    `De trein vertrekt om ${start} en de reis duurt ${duration}. Hoe laat komt de trein aan?`,
  nachtbus: (start, duration) =>
    `De nachtbus vertrekt om ${start} en rijdt ${duration}. Hoe laat komt de bus aan?`,
};

const DEPARTURE_PROMPTS: Readonly<
  Record<DepartureContext, (arrival: string, duration: string) => string>
> = {
  school: (arrival, duration) =>
    `Je moet om ${arrival} op school zijn en fietst ${duration}. Hoe laat moet je vertrekken?`,
  afspraak: (arrival, duration) =>
    `Je hebt om ${arrival} een afspraak en de reis duurt ${duration}. Hoe laat moet je vertrekken?`,
  trein: (arrival, duration) =>
    `Je trein komt om ${arrival} aan en de reis duurt ${duration}. Hoe laat ben je vertrokken?`,
};

/** `De film begint om 19:45 en duurt 145 minuten. Hoe laat is de film afgelopen?` */
export function arrivalQuestion(
  context: ArrivalContext,
  start: number,
  duration: number,
  mixed: boolean,
  tenMinutes: 10 | -10,
): Question {
  const answer = (start + duration) % DAY;
  return {
    key: `timeCalc:arrival:${context}:${start}:${duration}`,
    topic: 'timeCalc',
    steps: [
      choiceStep({
        prompt: ARRIVAL_PROMPTS[context](formatClock(start), durationText(duration, mixed)),
        options: timeOptions(answer, tenMinutes),
        answer: formatClock(answer),
        explanation: shiftExplanation(start, duration, 'later', mixed && duration > 60),
      }),
    ],
  };
}

/** `Je moet om 8:50 op school zijn en fietst 35 minuten. Hoe laat moet je vertrekken?` */
export function departureQuestion(
  context: DepartureContext,
  arrival: number,
  duration: number,
  mixed: boolean,
  tenMinutes: 10 | -10,
): Question {
  const answer = (arrival - duration + DAY) % DAY;
  return {
    key: `timeCalc:departure:${context}:${arrival}:${duration}`,
    topic: 'timeCalc',
    steps: [
      choiceStep({
        prompt: DEPARTURE_PROMPTS[context](formatClock(arrival), durationText(duration, mixed)),
        options: timeOptions(answer, tenMinutes),
        answer: formatClock(answer),
        explanation: shiftExplanation(arrival, duration, 'earlier', mixed && duration > 60),
      }),
    ],
  };
}

/** `De trein vertrekt om 9:47 en komt om 11:22 aan. Hoeveel minuten duurt de reis?` */
export function journeyQuestion(start: number, end: number): Question {
  return {
    key: `timeCalc:reis:${start}:${end}`,
    topic: 'timeCalc',
    steps: [
      numberStep({
        prompt: `De trein vertrekt om ${formatClock(start)} en komt om ${formatClock(end)} aan. Hoeveel minuten duurt de reis?`,
        answer: fromInteger(end - start),
        suffix: 'min',
        explanation: elapsedExplanation(start, end),
      }),
    ],
  };
}

const spanText = (minutes: number) =>
  `${Math.floor(minutes / 60)} uur${minutes % 60 > 0 ? ` en ${minutes % 60} min` : ''}`;

/** `Je werkt van 8:30 tot 17:15 en hebt 45 minuten pauze. Hoeveel uur werk je?` */
export function workdayQuestion(start: number, end: number, pause: number): Question {
  const net = end - start - pause;
  const hours = rational(BigInt(net), 60n);
  const answerText = formatRational(hours);
  const worked = net % 60 === 0 ? `${net / 60} uur` : `${spanText(net)} = ${answerText} uur`;
  return {
    key: `timeCalc:werkdag:${start}:${end}:${pause}`,
    topic: 'timeCalc',
    steps: [
      numberStep({
        prompt: `Je werkt van ${formatClock(start)} tot ${formatClock(end)} en hebt ${pause} minuten pauze. Hoeveel uur werk je?`,
        answer: hours,
        suffix: 'uur',
        explanation: `${formatClock(start)} → ${formatClock(end)} is ${spanText(end - start)} → min ${pause} min pauze = ${worked}`,
      }),
    ],
  };
}

const tenMinutes = (rng: Rng): 10 | -10 => (rng() < 0.5 ? 10 : -10);
/** Only a duration above 60 minutes can be written as hours and minutes. */
const isMixed = (rng: Rng, duration: number) => duration > 60 && rng() < 0.5;

function randomArrival(rng: Rng): Question {
  const context = pick(rng, ['film', 'treinreis', 'nachtbus'] as const);
  const [start, duration] = drawUntil(() => {
    const [start, duration] = {
      film: [randomInt(rng, 156, 258) * 5, randomInt(rng, 17, 36) * 5],
      treinreis: [randomInt(rng, 360, 1320), randomInt(rng, 20, 150)],
      nachtbus: [randomInt(rng, 276, 287) * 5, randomInt(rng, 3, 15) * 5],
    }[context] as [number, number];
    return context !== 'nachtbus' || start + duration >= DAY ? [start, duration] : null;
  });
  return arrivalQuestion(context, start, duration, isMixed(rng, duration), tenMinutes(rng));
}

function randomDeparture(rng: Rng): Question {
  const context = pick(rng, ['school', 'afspraak', 'trein'] as const);
  const arrival = {
    school: randomInt(rng, 99, 105) * 5,
    afspraak: randomInt(rng, 108, 240) * 5,
    trein: randomInt(rng, 420, 1380),
  }[context];
  const duration = {
    school: randomInt(rng, 10, 45),
    afspraak: randomInt(rng, 3, 24) * 5,
    trein: randomInt(rng, 20, 150),
  }[context];
  return departureQuestion(context, arrival, duration, isMixed(rng, duration), tenMinutes(rng));
}

function randomDuration(rng: Rng): Question {
  if (rng() < 0.5) {
    const [start, end] = drawUntil(() => {
      const begin = randomInt(rng, 360, 1260);
      const finish = begin + randomInt(rng, 20, 240);
      return finish < DAY ? [begin, finish] : null;
    });
    return journeyQuestion(start, end);
  }
  const [start, end, pause] = drawUntil(() => {
    const [begin, finish] = [randomInt(rng, 28, 40) * 15, randomInt(rng, 48, 74) * 15];
    const rest = pick(rng, [30, 45, 60]);
    const hours = (finish - begin - rest) / 60;
    return hours >= 4 && hours <= 9 ? [begin, finish, rest] : null;
  });
  return workdayQuestion(start, end, pause);
}

export function generateTimeCalc(rng: Rng): Question {
  switch (pick(rng, ['arrival', 'departure', 'duration'] as const)) {
    case 'arrival':
      return randomArrival(rng);
    case 'departure':
      return randomDeparture(rng);
    case 'duration':
      return randomDuration(rng);
  }
}
