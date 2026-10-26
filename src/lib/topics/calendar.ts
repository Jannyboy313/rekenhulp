import { formatInteger } from '../format';
import { pick, randomInt, type Rng } from '../random';
import { SLOT } from '../slot';
import { fromInteger } from '../rational';
import { numberStep } from '../steps';
import type { Question } from '../types';

interface CalendarUnit {
  singular: string;
  plural: string;
}

const unit = (singular: string, plural: string): CalendarUnit => ({ singular, plural });

const ETMAAL = unit('etmaal', 'etmalen');
const UUR = unit('uur', 'uur');
const WEEK = unit('week', 'weken');
const DAG = unit('dag', 'dagen');
const JAAR = unit('jaar', 'jaar');
const MAAND = unit('maand', 'maanden');
const KWARTAAL = unit('kwartaal', 'kwartalen');
const LUSTRUM = unit('lustrum', 'lustra');
const DECENNIUM = unit('decennium', 'decennia');
const EEUW = unit('eeuw', 'eeuwen');
const MILLENNIUM = unit('millennium', 'millennia');

interface CalendarPair {
  larger: CalendarUnit;
  smaller: CalendarUnit;
  /** How many smaller units make one larger unit. */
  factor: number;
}

/** Spec §5.45. `maand ↔ dag`, `jaar ↔ week` and `jaar ↔ dag` have no exact factor. */
export const CALENDAR_PAIRS: readonly CalendarPair[] = [
  { larger: ETMAAL, smaller: UUR, factor: 24 },
  { larger: WEEK, smaller: DAG, factor: 7 },
  { larger: JAAR, smaller: MAAND, factor: 12 },
  { larger: JAAR, smaller: KWARTAAL, factor: 4 },
  { larger: KWARTAAL, smaller: MAAND, factor: 3 },
  { larger: LUSTRUM, smaller: JAAR, factor: 5 },
  { larger: DECENNIUM, smaller: JAAR, factor: 10 },
  { larger: DECENNIUM, smaller: LUSTRUM, factor: 2 },
  { larger: EEUW, smaller: JAAR, factor: 100 },
  { larger: EEUW, smaller: DECENNIUM, factor: 10 },
  { larger: MILLENNIUM, smaller: JAAR, factor: 1000 },
  { larger: MILLENNIUM, smaller: EEUW, factor: 10 },
];

/** `3 eeuwen = ? jaar` for `largerValue` 3, or `36 maanden = ? jaar` the other way round. */
export function calendarQuestion(
  { larger, smaller, factor }: CalendarPair,
  largerValue: number,
  toSmaller: boolean,
): Question {
  const [from, to] = toSmaller ? [larger, smaller] : [smaller, larger];
  const [value, answer] = toSmaller
    ? [largerValue, largerValue * factor]
    : [largerValue * factor, largerValue];
  const fact = `1 ${larger.singular} = ${factor} ${smaller.plural}`;
  return {
    key: `calendar:${from.singular}>${to.singular}:${value}`,
    topic: 'calendar',
    steps: [
      numberStep({
        prompt: `${formatInteger(value)} ${from.plural} = ${SLOT} ${to.plural}`,
        answer: fromInteger(answer),
        suffix: to.plural,
        explanation: toSmaller
          ? `${fact} → ${largerValue} × ${formatInteger(factor)} = ${formatInteger(answer)}`
          : `${fact} → ${formatInteger(value)} : ${formatInteger(factor)} = ${answer}`,
      }),
    ],
  };
}

export function generateCalendar(rng: Rng): Question {
  return calendarQuestion(pick(rng, CALENDAR_PAIRS), randomInt(rng, 2, 12), rng() < 0.5);
}
