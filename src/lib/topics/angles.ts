import { formatRational, MINUS } from '../format';
import { drawUntil, pick, randomInt, type Rng } from '../random';
import { fromInteger, multiply, rational, type Rational } from '../rational';
import { numberStep } from '../steps';
import { exactTip, firstTip, type Diagnose } from '../tips';
import type { Question } from '../types';

export const POLYGON_NAMES: Readonly<Record<number, string>> = {
  4: 'vierhoek',
  5: 'vijfhoek',
  6: 'zeshoek',
  8: 'achthoek',
  9: 'negenhoek',
  10: 'tienhoek',
  12: 'twaalfhoek',
};

/** The polygons of the angle sum and of the regular polygon (spec §5.30). */
export const SUM_SIDES: readonly number[] = [4, 5, 6, 8, 10, 12];
export const REGULAR_SIDES: readonly number[] = [5, 6, 8, 9, 10, 12];

const HOUR_ANGLE = 'elk uur op de klok is 360 : 12 = 30°';

interface Angle {
  /** The form and the numbers: the question key without `angles:`. */
  key: string;
  prompt: string;
  answer: Rational;
  /** How the answer is worked out; the explanation is this followed by ` = answer`. */
  formula: string;
  diagnose?: Diagnose;
}

function angleQuestion({ key, prompt, answer, formula, diagnose }: Angle): Question {
  return {
    key: `angles:${key}`,
    topic: 'angles',
    steps: [
      numberStep({
        prompt,
        answer,
        suffix: '°',
        explanation: `${formula} = ${formatRational(answer)}`,
        diagnose,
      }),
    ],
  };
}

/** `Een driehoek heeft hoeken van 50° en 70°. Hoe groot is de derde hoek?` */
export function triangleQuestion(first: number, second: number): Question {
  return angleQuestion({
    key: `triangle:${first}:${second}`,
    prompt: `Een driehoek heeft hoeken van ${first}° en ${second}°. Hoe groot is de derde hoek?`,
    answer: fromInteger(180 - first - second),
    formula: `180 ${MINUS} ${first} ${MINUS} ${second}`,
  });
}

/** The tophoek is asked from a base angle and the other way round. */
export function isoscelesQuestion(given: 'tophoek' | 'basishoek', angle: number): Question {
  const fromTop = given === 'tophoek';
  return angleQuestion({
    key: `isosceles:${given}:${angle}`,
    prompt: fromTop
      ? `Een gelijkbenige driehoek heeft een tophoek van ${angle}°. Hoe groot is een basishoek?`
      : `Een gelijkbenige driehoek heeft basishoeken van ${angle}°. Hoe groot is de tophoek?`,
    answer: fromTop ? rational(BigInt(180 - angle), 2n) : fromInteger(180 - 2 * angle),
    formula: fromTop ? `(180 ${MINUS} ${angle}) : 2` : `180 ${MINUS} 2 × ${angle}`,
  });
}

/** `Hoeveel graden zijn de hoeken van een zeshoek samen?` The mistake is `n × 180`. */
export function angleSumQuestion(sides: number): Question {
  const name = POLYGON_NAMES[sides]!;
  const triangles = sides - 2;
  return angleQuestion({
    key: `sum:${sides}`,
    prompt: `Hoeveel graden zijn de hoeken van een ${name} samen?`,
    answer: fromInteger(triangles * 180),
    formula: `(${sides} ${MINUS} 2) × 180`,
    diagnose: exactTip(
      fromInteger(sides * 180),
      `Een ${name} kun je verdelen in ${sides} ${MINUS} 2 = ${triangles} driehoeken: ${triangles} × 180°.`,
    ),
  });
}

/** `Hoe groot is één hoek van een regelmatige achthoek?` The mistake is the exterior angle. */
export function regularAngleQuestion(sides: number): Question {
  const exterior = rational(360n, BigInt(sides));
  const answer = rational(BigInt((sides - 2) * 180), BigInt(sides));
  return angleQuestion({
    key: `regular:${sides}`,
    prompt: `Hoe groot is één hoek van een regelmatige ${POLYGON_NAMES[sides]!}?`,
    answer,
    formula: `(${sides} ${MINUS} 2) × 180 : ${sides}`,
    diagnose: exactTip(
      exterior,
      `Dat is de buitenhoek; één hoek binnenin is 180° ${MINUS} ${formatRational(exterior)}° = ${formatRational(answer)}°.`,
    ),
  });
}

/**
 * `Hoe groot is de kleinste hoek tussen de wijzers om 4 uur?` for a whole hour 1 to 11, and
 * `… om half 4?` for a half hour by its Dutch name: `half 4` (3:30) is hour 4, half 1 to half 12.
 */
export function clockQuestion(hour: number, half: boolean): Question {
  const time = half ? `half ${hour}` : `${hour} uur`;
  const key = `clock:${half ? 'half' : 'uur'}:${hour}`;
  const prompt = `Hoe groot is de kleinste hoek tussen de wijzers om ${time}?`;
  if (!half) {
    // Past 6 the hours are counted the other way round the clock.
    const hours = Math.min(hour, 12 - hour);
    return angleQuestion({
      key,
      prompt,
      answer: fromInteger(hours * 30),
      formula: `${HOUR_ANGLE} → ${hours} × 30`,
    });
  }
  // The minute hand is on the 6, the hour hand halfway between `before` and `hour`: |6,5 − hour|.
  const before = hour === 1 ? 12 : hour - 1;
  const hours = rational(BigInt(Math.abs(13 - 2 * hour)), 2n);
  const tip = `Om half ${hour} staat de kleine wijzer halverwege de ${before} en de ${hour}.`;
  // The mistake: the hour hand on the whole hour before or at `hour`, |6 − position| × 30°.
  const handOn = (position: number) => exactTip(fromInteger(Math.abs(6 - position) * 30), tip);
  return angleQuestion({
    key,
    prompt,
    answer: multiply(hours, fromInteger(30)),
    formula: `de grote wijzer staat op de 6, de kleine halverwege de ${before} en de ${hour} → ${formatRational(hours)} × 30`,
    diagnose: firstTip(handOn(hour - 1), handOn(hour)),
  });
}

/** A multiple of `step` in [min, max]. */
function drawAngle(rng: Rng, step: number, min: number, max: number): number {
  return step * randomInt(rng, min / step, max / step);
}

function drawTriangle(rng: Rng): Question {
  if (rng() < 0.5) {
    const { first, second } = drawUntil(() => {
      const first = drawAngle(rng, 5, 20, 140);
      const second = drawAngle(rng, 5, 20, 140);
      return first + second <= 160 ? { first, second } : null;
    });
    return triangleQuestion(first, second);
  }
  return rng() < 0.5
    ? isoscelesQuestion('tophoek', drawAngle(rng, 10, 20, 160))
    : isoscelesQuestion('basishoek', drawAngle(rng, 5, 20, 85));
}

const FORMS = ['triangle', 'sum', 'regular', 'clock'] as const;

/**
 * The four forms equally likely. A triangle is half of the time two given angles and half of the
 * time isosceles (each direction half of the time); the clock shows a whole hour half of the time.
 */
export function generateAngles(rng: Rng): Question {
  switch (pick(rng, FORMS)) {
    case 'triangle':
      return drawTriangle(rng);
    case 'sum':
      return angleSumQuestion(pick(rng, SUM_SIDES));
    case 'regular':
      return regularAngleQuestion(pick(rng, REGULAR_SIDES));
    case 'clock':
      return rng() < 0.5
        ? clockQuestion(randomInt(rng, 1, 11), false)
        : clockQuestion(randomInt(rng, 1, 12), true);
  }
}
