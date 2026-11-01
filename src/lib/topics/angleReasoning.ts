import { formatRational, MINUS } from '../format';
import { drawUntil, pick, randomInt, shuffle, type Rng } from '../random';
import { fromInteger, rational, type Rational } from '../rational';
import { numberStep } from '../steps';
import type { Question } from '../types';
import { POLYGON_NAMES, REGULAR_SIDES } from './angles';

function reasoningQuestion(
  key: string,
  step: Omit<Parameters<typeof numberStep>[0], 'suffix'> & { suffix?: string },
): Question {
  return {
    key: `angleReasoning:${key}`,
    topic: 'angleReasoning',
    steps: [numberStep({ suffix: '°', ...step })],
  };
}

/** `Een driehoek heeft hoeken van 50° en 60°. Hoe groot is de buitenhoek bij de derde hoek?` */
export function triangleExteriorQuestion(first: number, second: number): Question {
  return reasoningQuestion(`exterior:triangle:${first}:${second}`, {
    prompt: `Een driehoek heeft hoeken van ${first}° en ${second}°. Hoe groot is de buitenhoek bij de derde hoek?`,
    answer: fromInteger(first + second),
    explanation: `buitenhoek = som van de twee andere hoeken: ${first} + ${second} = ${first + second}`,
  });
}

/** `Hoe groot is de buitenhoek van een regelmatige achthoek?` */
export function regularExteriorQuestion(sides: number): Question {
  const answer = rational(360n, BigInt(sides));
  return reasoningQuestion(`exterior:regular:${sides}`, {
    prompt: `Hoe groot is de buitenhoek van een regelmatige ${POLYGON_NAMES[sides]!}?`,
    answer,
    explanation: `360 : ${sides} = ${formatRational(answer)}`,
  });
}

/** `Een regelmatige veelhoek heeft hoeken van 140°. Hoeveel hoeken heeft hij?` */
export function polygonSidesQuestion(sides: number): Question {
  const angle = 180 - 360 / sides;
  const exterior = 180 - angle;
  return reasoningQuestion(`exterior:count:${sides}`, {
    prompt: `Een regelmatige veelhoek heeft hoeken van ${angle}°. Hoeveel hoeken heeft hij?`,
    answer: fromInteger(sides),
    suffix: 'hoeken',
    explanation: `buitenhoek 180 ${MINUS} ${angle} = ${exterior} → 360 : ${exterior} = ${sides}`,
  });
}

export type Asked = 'kleinste' | 'grootste' | 'middelste';

/** `De hoeken van een driehoek verhouden zich als 2 : 3 : 4. Hoe groot is de grootste hoek?` */
export function ratioQuestion(terms: readonly number[], asked: Asked): Question {
  const sum = terms.reduce((total, term) => total + term, 0);
  const sorted = [...terms].sort((a, b) => a - b);
  const term = { kleinste: sorted[0]!, middelste: sorted[1]!, grootste: sorted[2]! }[asked];
  const unit = 180 / sum;
  const ratio = terms.join(' : ');
  return reasoningQuestion(`ratio:${terms.join(':')}:${asked}`, {
    prompt: `De hoeken van een driehoek verhouden zich als ${ratio}. Hoe groot is de ${asked} hoek?`,
    answer: fromInteger(term * unit),
    explanation: `${terms.join(' + ')} = ${sum} delen → 1 deel = 180 : ${sum} = ${unit} → ${term} × ${unit} = ${term * unit}`,
  });
}

/** `De tophoek is 3 keer zo groot als een basishoek. Hoe groot is de tophoek?` Half degrees occur. */
export function isoscelesRatioQuestion(factor: number, asked: 'tophoek' | 'basishoek'): Question {
  const parts = factor + 2;
  const part = rational(180n, BigInt(parts));
  const answer: Rational =
    asked === 'tophoek' ? rational(180n * BigInt(factor), BigInt(parts)) : part;
  const how = `tophoek ${factor} delen, twee basishoeken 1 deel elk: ${factor} + 1 + 1 = ${parts} delen → 1 deel = 180 : ${parts} = ${formatRational(part)}`;
  return reasoningQuestion(`isosceles:${factor}:${asked}`, {
    prompt: `In een gelijkbenige driehoek is de tophoek ${factor} keer zo groot als een basishoek. Hoe groot is ${asked === 'tophoek' ? 'de tophoek' : 'een basishoek'}?`,
    answer,
    explanation:
      asked === 'tophoek'
        ? `${how} → ${factor} × ${formatRational(part)} = ${formatRational(answer)}`
        : how,
  });
}

/** `Hoe groot is de kleinste hoek tussen de wijzers om 4:20?` The minute is not 0 or 30 (spec §5.84). */
export function clockAngleQuestion(hour: number, minutes: number): Question {
  const half = (twice: number) => rational(BigInt(twice), 2n);
  const minuteHand = minutes * 6;
  const hourOnDial = hour % 12;
  const hourHandTwice = 60 * hourOnDial + minutes;
  const hourHand = half(hourHandTwice);
  const differenceTwice = Math.abs(hourHandTwice - 2 * minuteHand);
  const difference = half(differenceTwice);
  const [larger, smaller] =
    hourHandTwice > 2 * minuteHand
      ? [formatRational(hourHand), String(minuteHand)]
      : [String(minuteHand), formatRational(hourHand)];
  const wraps = differenceTwice > 360;
  const answer = wraps ? half(720 - differenceTwice) : difference;
  const subtraction = `${larger} ${MINUS} ${smaller} = ${formatRational(difference)}`;
  return reasoningQuestion(`clock:${hour}:${minutes}`, {
    prompt: `Hoe groot is de kleinste hoek tussen de wijzers om ${hour}:${String(minutes).padStart(2, '0')}?`,
    answer,
    explanation: `grote wijzer: ${minutes} × 6 = ${minuteHand}°, kleine wijzer: ${hourOnDial} × 30 + ${minutes} × 0,5 = ${formatRational(hourHand)}° → ${subtraction}${
      wraps
        ? ` is meer dan 180° → 360 ${MINUS} ${formatRational(difference)} = ${formatRational(answer)}`
        : ''
    }`,
  });
}

const POLYGON_COUNTS: readonly number[] = [5, 6, 8, 9, 10, 12, 15, 18, 20];
const ISOSCELES_FACTORS: readonly number[] = [2, 3, 4, 6, 7];
const ISOSCELES_SHARE = 0.3;
/** Minutes of the clock form: multiples of 5, not :00 or :30 (those are in `angles`). */
const CLOCK_MINUTES: readonly number[] = [5, 10, 15, 20, 25, 35, 40, 45, 50, 55];

/** Two angles as in `angles`: multiples of 5, each at least 20, together at most 160. */
function drawTriangle(rng: Rng): Question {
  const { first, second } = drawUntil(() => {
    const first = 5 * randomInt(rng, 4, 28);
    const second = 5 * randomInt(rng, 4, 28);
    return first + second <= 160 ? { first, second } : null;
  });
  return triangleExteriorQuestion(first, second);
}

function drawExterior(rng: Rng): Question {
  switch (pick(rng, ['triangle', 'regular', 'count'] as const)) {
    case 'triangle':
      return drawTriangle(rng);
    case 'regular':
      return regularExteriorQuestion(pick(rng, REGULAR_SIDES));
    case 'count':
      return polygonSidesQuestion(pick(rng, POLYGON_COUNTS));
  }
}

/** Terms in [1, 9], not all equal, summing to a divisor of 180; the middle one only if all differ. */
function drawRatio(rng: Rng): Question {
  const terms = drawUntil(() => {
    const draw = Array.from({ length: 3 }, () => randomInt(rng, 1, 9));
    const sum = draw[0]! + draw[1]! + draw[2]!;
    return 180 % sum === 0 && new Set(draw).size > 1 ? draw : null;
  });
  const asked: Asked[] =
    new Set(terms).size === 3 ? ['kleinste', 'grootste', 'middelste'] : ['kleinste', 'grootste'];
  return ratioQuestion(shuffle(rng, terms), pick(rng, asked));
}

function drawRatioForm(rng: Rng): Question {
  return rng() < ISOSCELES_SHARE
    ? isoscelesRatioQuestion(
        pick(rng, ISOSCELES_FACTORS),
        pick(rng, ['tophoek', 'basishoek'] as const),
      )
    : drawRatio(rng);
}

const drawClock = (rng: Rng) => clockAngleQuestion(randomInt(rng, 1, 12), pick(rng, CLOCK_MINUTES));

export function generateAngleReasoning(rng: Rng): Question {
  switch (pick(rng, ['exterior', 'ratio', 'clock'] as const)) {
    case 'exterior':
      return drawExterior(rng);
    case 'ratio':
      return drawRatioForm(rng);
    case 'clock':
      return drawClock(rng);
  }
}
