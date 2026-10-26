import { drawUntil, pick, randomInt, shuffle, type Rng } from '../random';
import { fromInteger } from '../rational';
import { choiceStep, numberStep } from '../steps';
import type { Question } from '../types';

const DAY = 1440;
const HALF_DAY = 720;

/** Minutes since midnight, wrapped into 0–1439. */
const wrap = (minutes: number) => ((minutes % DAY) + DAY) % DAY;

const clockText = (hours: number, minutes: number) =>
  `${hours}:${String(minutes).padStart(2, '0')}`;

/** `H:MM` in 24-hour notation without a leading zero for the hour: 0:05, 8:20, 19:35. */
export function formatClock(minutes: number): string {
  const time = wrap(minutes);
  return clockText(Math.floor(time / 60), time % 60);
}

/** The same time on a 12-hour clock (1–12): 19:35 → 7:35, 0:05 → 12:05. */
function formatClock12(minutes: number): string {
  const time = wrap(minutes);
  return clockText(((Math.floor(time / 60) + 11) % 12) + 1, time % 60);
}

const OVER_PHRASES: Readonly<Record<number, string>> = {
  5: 'vijf over',
  10: 'tien over',
  15: 'kwart over',
};

/** `tien voor half 9` for 8:20 (spec §5.47). The hours are digits, as in the Cito examples. */
export function spokenTime(minutes: number): string {
  if (minutes % 5 !== 0) throw new RangeError(`Not a multiple of 5 minutes: ${minutes}`);
  const time = wrap(minutes);
  const hour = ((Math.floor(time / 60) + 11) % 12) + 1;
  const next = (hour % 12) + 1;
  const minute = time % 60;
  if (minute === 0) return `${hour} uur`;
  if (minute <= 15) return `${OVER_PHRASES[minute]} ${hour}`;
  if (minute === 20) return `tien voor half ${next}`;
  if (minute === 25) return `vijf voor half ${next}`;
  if (minute === 30) return `half ${next}`;
  if (minute === 35) return `vijf over half ${next}`;
  if (minute === 40) return `tien over half ${next}`;
  if (minute === 45) return `kwart voor ${next}`;
  if (minute === 50) return `tien voor ${next}`;
  return `vijf voor ${next}`;
}

/** `'s nachts` 0:00–5:59, `'s ochtends` 6:00–11:59, `'s middags` 12:00–17:59, `'s avonds` after. */
export function partOfDay(minutes: number): string {
  const hour = Math.floor(wrap(minutes) / 60);
  if (hour < 6) return "'s nachts";
  if (hour < 12) return "'s ochtends";
  if (hour < 18) return "'s middags";
  return "'s avonds";
}

/** From :20 up to the next boundary the spoken hour lies in the next part of the day. */
export function isExcluded(minutes: number): boolean {
  return minutes % 60 >= 20 && [5, 11, 17, 23].includes(Math.floor(minutes / 60));
}

/** The time that reads the other way round (voor ↔ over); none for :00 and :30. */
function mirror(minutes: number): number | null {
  const minute = minutes % 60;
  if (minute === 0 || minute === 30) return null;
  if (minute >= 20 && minute <= 40) return minutes + 60 - 2 * minute;
  if (minute <= 15) return minutes - 2 * minute;
  return minutes + 2 * (60 - minute);
}

/** `Hoe laat is tien voor half 9 's avonds?` with four times in chronological order. */
export function toDigitalQuestion(minutes: number): Question {
  const spoken = spokenTime(minutes);
  const part = partOfDay(minutes);
  const digital = formatClock(minutes);
  const twelve = formatClock12(minutes);
  const options = [
    ...new Set(
      [minutes, minutes + HALF_DAY, minutes + 60, mirror(minutes) ?? minutes - 60].map(wrap),
    ),
  ].sort((a, b) => a - b);
  const explanation =
    Math.floor(minutes / 60) === 0
      ? `${spoken} ${part} = ${digital}`
      : twelve === digital
        ? `${spoken} = ${digital}`
        : `${spoken} = ${twelve} → ${part} is dat ${digital}`;
  return {
    key: `clock:toDigital:${minutes}`,
    topic: 'clock',
    steps: [
      choiceStep({
        prompt: `Hoe laat is ${spoken} ${part}?`,
        options: options.map(formatClock),
        answer: digital,
        explanation,
      }),
    ],
  };
}

/** `Hoe zeg je 19:35?` with four phrases in random order. */
export function toWordsQuestion(minutes: number, rng: Rng): Question {
  const part = partOfDay(minutes);
  const answer = `${spokenTime(minutes)} ${part}`;
  const options = [
    answer,
    `${spokenTime(minutes - 60)} ${part}`,
    `${spokenTime(mirror(minutes) ?? minutes + 60)} ${part}`,
    `${spokenTime(minutes)} ${partOfDay(minutes + HALF_DAY)}`,
  ];
  const digital = formatClock(minutes);
  const twelve = formatClock12(minutes);
  return {
    key: `clock:toWords:${minutes}`,
    topic: 'clock',
    steps: [
      choiceStep({
        prompt: `Hoe zeg je ${digital}?`,
        options: shuffle(rng, options),
        answer,
        explanation: twelve === digital ? `${digital} → ${answer}` : `${digital} = ${twelve} → ${answer}`,
      }),
    ],
  };
}

/**
 * Splits start → end at the full hours: the rest of the first hour, the whole hours as one
 * segment, the part of the last hour. A zero-length segment is left out.
 */
export function elapsedExplanation(start: number, end: number): string {
  const firstHour = Math.ceil(start / 60) * 60;
  const lastHour = Math.floor(end / 60) * 60;
  const stops =
    firstHour > lastHour ? [start, end] : [start, firstHour, lastHour, end];
  const segments: [number, number][] = [];
  for (let index = 0; index < stops.length - 1; index++) {
    const [from, to] = [stops[index]!, stops[index + 1]!];
    if (to > from) segments.push([from, to]);
  }
  const text = segments
    .map(([from, to]) => `${formatClock(from)} → ${formatClock(to)} is ${to - from} min`)
    .join(', ');
  if (segments.length === 1) return text;
  const lengths = segments.map(([from, to]) => to - from);
  return `${text} → ${lengths.join(' + ')} = ${end - start}`;
}

/** `Van 9:45 tot 10:20. Hoeveel minuten is dat?` */
export function elapsedQuestion(start: number, end: number): Question {
  return {
    key: `clock:elapsed:${start}:${end}`,
    topic: 'clock',
    steps: [
      numberStep({
        prompt: `Van ${formatClock(start)} tot ${formatClock(end)}. Hoeveel minuten is dat?`,
        answer: fromInteger(end - start),
        suffix: 'min',
        explanation: elapsedExplanation(start, end),
      }),
    ],
  };
}

/** A multiple of 5 over the whole day, without the times of `isExcluded`. */
function randomTime(rng: Rng): number {
  return drawUntil(() => {
    const minutes = randomInt(rng, 0, DAY / 5 - 1) * 5;
    return isExcluded(minutes) ? null : minutes;
  });
}

function randomElapsed(rng: Rng): Question {
  const [start, end] = drawUntil(() => {
    const begin = randomInt(rng, 72, 264) * 5;
    const duration = randomInt(rng, 2, 19) * 5;
    return (begin % 60) + duration >= 60 && begin + duration < DAY
      ? [begin, begin + duration]
      : null;
  });
  return elapsedQuestion(start, end);
}

export function generateClock(rng: Rng): Question {
  switch (pick(rng, ['toDigital', 'toWords', 'elapsed'] as const)) {
    case 'toDigital':
      return toDigitalQuestion(randomTime(rng));
    case 'toWords':
      return toWordsQuestion(randomTime(rng), rng);
    case 'elapsed':
      return randomElapsed(rng);
  }
}
