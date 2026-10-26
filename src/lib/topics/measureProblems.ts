import { formatInteger, formatRational, MINUS } from '../format';
import { drawUntil, pick, randomInt, shuffle, type Rng } from '../random';
import {
  add,
  compare,
  fromInteger,
  hasAtMostDecimals,
  isBetween,
  isInteger,
  multiply,
  powerOfTen,
  rational,
  subtract,
  type Rational,
} from '../rational';
import { SLOT } from '../slot';
import { numberStep } from '../steps';
import type { Question } from '../types';
import {
  LENGTH_UNITS,
  MASS_UNITS,
  randomMantissa,
  VOLUME_UNITS,
  type ScaleUnit,
} from './measurement';

/** The units of the sums: no dam or hm, no cubic units, no aliases, no ton (spec §5.50). */
const DIMENSIONS: Readonly<Record<string, readonly string[]>> = {
  length: ['mm', 'cm', 'dm', 'm', 'km'],
  capacity: ['ml', 'cl', 'dl', 'L'],
  mass: ['mg', 'g', 'kg'],
};

const UNITS: Readonly<Record<string, ScaleUnit>> = Object.fromEntries(
  [...LENGTH_UNITS, ...VOLUME_UNITS, ...MASS_UNITS].map((unit) => [unit.symbol, unit]),
);

/** `1,2 m` in cm is 120. */
function inUnit(value: Rational, from: string, to: string): Rational {
  return multiply(value, powerOfTen(UNITS[from]!.exponent - UNITS[to]!.exponent));
}

const tenths = (count: number) => rational(BigInt(count), 10n);
const show = formatRational;

export type FitContext = 'glazen' | 'stukken' | 'porties';

const FIT_UNITS: Readonly<Record<FitContext, readonly [string, string]>> = {
  glazen: ['L', 'cl'],
  stukken: ['m', 'cm'],
  porties: ['kg', 'g'],
};

/** `Hoeveel glazen van 25 cl kun je vullen uit een pak van 1,5 L?` (`vessel` is pak or fles). */
export function fitQuestion(
  context: FitContext,
  container: Rational,
  portion: number,
  vessel = 'pak',
): Question {
  const [big, small] = FIT_UNITS[context];
  const total = inUnit(container, big, small);
  const count = multiply(total, rational(1n, BigInt(portion)));
  const prompt = {
    glazen: `Hoeveel glazen van ${portion} cl kun je vullen uit een ${vessel} van ${show(container)} L?`,
    stukken: `Een plank van ${show(container)} m wordt in stukken van ${portion} cm gezaagd. Hoeveel stukken zijn dat?`,
    porties: `Een zak rijst van ${show(container)} kg wordt verdeeld in porties van ${portion} g. Hoeveel porties zijn dat?`,
  }[context];
  return {
    key: `measureProblems:fit:${context}:${show(container)}:${portion}`,
    topic: 'measureProblems',
    steps: [
      numberStep({
        prompt,
        answer: count,
        suffix: context,
        explanation: `${show(container)} ${big} = ${show(total)} ${small} → ${show(total)} : ${portion} = ${show(count)}`,
      }),
    ],
  };
}

export interface Term {
  value: Rational;
  unit: string;
}

type Operator = '+' | typeof MINUS;

/** `1,2 m + 45 cm + 8 dm = ? cm`: `operators` has the two signs between the three terms. */
export function sumQuestion(
  terms: readonly Term[],
  operators: readonly Operator[],
  unit: string,
): Question {
  const converted = terms.map((term) => inUnit(term.value, term.unit, unit));
  const sign = (index: number) => (index === 0 || operators[index - 1] === '+' ? 1 : -1);
  const answer = converted.reduce(
    (sum, value, index) => (sign(index) > 0 ? add(sum, value) : subtract(sum, value)),
    fromInteger(0),
  );
  const expression = terms
    .map(
      (term, index) =>
        `${index > 0 ? ` ${operators[index - 1]} ` : ''}${show(term.value)} ${term.unit}`,
    )
    .join('');
  const conversions = terms
    .map((term, index) => `${show(term.value)} ${term.unit} = ${show(converted[index]!)} ${unit}`)
    .filter((_, index) => terms[index]!.unit !== unit)
    .join(', ');
  const chain = converted
    .map((value, index) => `${index > 0 ? ` ${operators[index - 1]} ` : ''}${show(value)}`)
    .join('');
  return {
    key: `measureProblems:sum:${expression} = ${unit}`,
    topic: 'measureProblems',
    steps: [
      numberStep({
        prompt: `${expression} = ${SLOT} ${unit}`,
        answer,
        suffix: unit,
        explanation: `${conversions} → ${chain} = ${show(answer)}`,
      }),
    ],
  };
}

/** `Je koopt 6 flesjes van 33 cl. Hoeveel liter is dat?` */
export function bottlesQuestion(count: number, centilitres: number): Question {
  const total = count * centilitres;
  const litres = inUnit(fromInteger(total), 'cl', 'L');
  return {
    key: `measureProblems:total:flesjes:${count}:${centilitres}`,
    topic: 'measureProblems',
    steps: [
      numberStep({
        prompt: `Je koopt ${count} flesjes van ${centilitres} cl. Hoeveel liter is dat?`,
        answer: litres,
        suffix: 'L',
        explanation: `${count} × ${centilitres} = ${total} cl = ${show(litres)} L`,
      }),
    ],
  };
}

/** `Je koopt 4 pakken van 1,5 kg en 3 zakken van 750 g. Hoeveel kg is dat samen?` */
export function groceriesQuestion(
  packs: number,
  packKg: Rational,
  bags: number,
  bagGrams: number,
): Question {
  const packsKg = multiply(fromInteger(packs), packKg);
  const bagsGrams = bags * bagGrams;
  const bagsKg = inUnit(fromInteger(bagsGrams), 'g', 'kg');
  const answer = add(packsKg, bagsKg);
  return {
    key: `measureProblems:total:boodschappen:${packs}:${show(packKg)}:${bags}:${bagGrams}`,
    topic: 'measureProblems',
    steps: [
      numberStep({
        prompt: `Je koopt ${packs} pakken van ${show(packKg)} kg en ${bags} zakken van ${bagGrams} g. Hoeveel kg is dat samen?`,
        answer,
        suffix: 'kg',
        explanation: `${packs} × ${show(packKg)} = ${show(packsKg)} kg, ${bags} × ${bagGrams} = ${formatInteger(bagsGrams)} g = ${show(bagsKg)} kg → ${show(packsKg)} + ${show(bagsKg)} = ${show(answer)}`,
      }),
    ],
  };
}

/** `Je loopt 3 rondjes van 400 m en daarna nog 2,8 km. Hoeveel km loop je?` */
export function runningQuestion(laps: number, extraKm: Rational): Question {
  const metres = laps * 400;
  const lapsKm = inUnit(fromInteger(metres), 'm', 'km');
  const answer = add(lapsKm, extraKm);
  return {
    key: `measureProblems:total:hardlopen:${laps}:${show(extraKm)}`,
    topic: 'measureProblems',
    steps: [
      numberStep({
        prompt: `Je loopt ${laps} rondjes van 400 m en daarna nog ${show(extraKm)} km. Hoeveel km loop je?`,
        answer,
        suffix: 'km',
        explanation: `${laps} × 400 = ${formatInteger(metres)} m = ${show(lapsKm)} km → ${show(lapsKm)} + ${show(extraKm)} = ${show(answer)}`,
      }),
    ],
  };
}

export type RemainderContext = 'touw' | 'fles' | 'meel';

const REMAINDER_UNITS: Readonly<Record<RemainderContext, readonly [string, string]>> = {
  touw: ['m', 'cm'],
  fles: ['L', 'cl'],
  meel: ['kg', 'g'],
};

/** `Van een rol touw van 5 m knip je 3 stukken van 80 cm. Hoeveel cm blijft er over?` */
export function remainderQuestion(
  context: RemainderContext,
  container: Rational,
  pieces: number,
  portion: number,
): Question {
  const [big, small] = REMAINDER_UNITS[context];
  const total = inUnit(container, big, small);
  const used = pieces * portion;
  const rest = subtract(total, fromInteger(used));
  const prompt = {
    touw: `Van een rol touw van ${show(container)} m knip je ${pieces} stukken van ${portion} cm. Hoeveel cm blijft er over?`,
    fles: `Een fles bevat ${show(container)} L. Je schenkt ${pieces} glazen van ${portion} cl in. Hoeveel cl blijft er over?`,
    meel: `Een zak bevat ${show(container)} kg meel. Je gebruikt ${pieces} keer ${portion} g. Hoeveel g blijft er over?`,
  }[context];
  return {
    key: `measureProblems:remainder:${context}:${show(container)}:${pieces}:${portion}`,
    topic: 'measureProblems',
    steps: [
      numberStep({
        prompt,
        answer: rest,
        suffix: small,
        explanation: `${show(container)} ${big} = ${show(total)} ${small}, ${pieces} × ${portion} = ${formatInteger(used)} → ${show(total)} ${MINUS} ${formatInteger(used)} = ${show(rest)}`,
      }),
    ],
  };
}

const GLASS_CL = [15, 20, 25];
const VESSEL_LITRES = [fromInteger(1), tenths(15), fromInteger(2), fromInteger(3)];

function randomFit(rng: Rng): Question {
  const context = pick(rng, ['glazen', 'stukken', 'porties'] as const);
  const [container, portion] = drawUntil(() => {
    const [value, size] = {
      glazen: [pick(rng, VESSEL_LITRES), pick(rng, GLASS_CL)] as const,
      stukken: [tenths(randomInt(rng, 12, 48)), pick(rng, [20, 25, 30, 40, 60, 80])] as const,
      porties: [
        pick(rng, [fromInteger(1), tenths(15), fromInteger(2), tenths(25), fromInteger(5)]),
        pick(rng, [50, 75, 100, 125, 250]),
      ] as const,
    }[context];
    const [big, small] = FIT_UNITS[context];
    const count = multiply(inUnit(value, big, small), rational(1n, BigInt(size)));
    return isInteger(count) && isBetween(count, fromInteger(3), fromInteger(40))
      ? ([value, size] as const)
      : null;
  });
  return fitQuestion(context, container, portion, pick(rng, ['pak', 'fles']));
}

/** A value of 1 to 3 significant digits with at most 2 decimals, in [0,01; 999]. */
function randomTerm(rng: Rng): Rational {
  return drawUntil(() => {
    const value = multiply(fromInteger(randomMantissa(rng)), powerOfTen(randomInt(rng, -2, 2)));
    return hasAtMostDecimals(value, 2) && isBetween(value, powerOfTen(-2), fromInteger(999))
      ? value
      : null;
  });
}

const POSITIVE = fromInteger(0);

function randomSum(rng: Rng): Question {
  // Decided before the redraws, which reject a minus more often: the share stays 30%.
  const withMinus = rng() < 0.3;
  return drawUntil(() => {
    const symbols = DIMENSIONS[pick(rng, Object.keys(DIMENSIONS))]!;
    const unit = pick(rng, symbols);
    const near = symbols.filter(
      (symbol) => Math.abs(UNITS[symbol]!.exponent - UNITS[unit]!.exponent) <= 3,
    );
    const units = [0, 1, 2].map(() => pick(rng, near));
    if (!units.includes(unit) || new Set(units).size < 2) return null;
    const terms = units.map((termUnit) => ({ value: randomTerm(rng), unit: termUnit }));
    const operators: Operator[] = withMinus ? shuffle<Operator>(rng, ['+', MINUS]) : ['+', '+'];
    const converted = terms.map((term) => inUnit(term.value, term.unit, unit));
    if (!converted.every((value) => hasAtMostDecimals(value, 2))) return null;
    let sum = converted[0]!;
    for (let index = 1; index < 3; index++) {
      sum =
        operators[index - 1] === '+'
          ? add(sum, converted[index]!)
          : subtract(sum, converted[index]!);
      if (compare(sum, POSITIVE) <= 0) return null;
    }
    return compare(sum, fromInteger(10_000)) <= 0 ? sumQuestion(terms, operators, unit) : null;
  });
}

function randomTotal(rng: Rng): Question {
  switch (pick(rng, ['flesjes', 'boodschappen', 'hardlopen'] as const)) {
    case 'flesjes':
      return bottlesQuestion(randomInt(rng, 2, 12), pick(rng, [25, 33, 50]));
    case 'boodschappen':
      return groceriesQuestion(
        randomInt(rng, 2, 6),
        pick(rng, [tenths(5), fromInteger(1), tenths(15), fromInteger(2)]),
        randomInt(rng, 2, 6),
        pick(rng, [250, 500, 750]),
      );
    case 'hardlopen':
      return runningQuestion(randomInt(rng, 2, 10), tenths(randomInt(rng, 5, 50)));
  }
}

function randomRemainder(rng: Rng): Question {
  const context = pick(rng, ['touw', 'fles', 'meel'] as const);
  return drawUntil(() => {
    const pieces = randomInt(rng, 2, 8);
    const [container, portion] = {
      touw: [fromInteger(pick(rng, [5, 10, 20])), randomInt(rng, 6, 18) * 5] as const,
      fles: [pick(rng, VESSEL_LITRES), pick(rng, GLASS_CL)] as const,
      meel: [
        pick(rng, [fromInteger(1), tenths(15), fromInteger(2), tenths(25)]),
        randomInt(rng, 2, 10) * 50,
      ] as const,
    }[context];
    const [big, small] = REMAINDER_UNITS[context];
    const rest = subtract(inUnit(container, big, small), fromInteger(pieces * portion));
    return compare(rest, POSITIVE) > 0
      ? remainderQuestion(context, container, pieces, portion)
      : null;
  });
}

export function generateMeasureProblems(rng: Rng): Question {
  switch (pick(rng, ['fit', 'sum', 'total', 'remainder'] as const)) {
    case 'fit':
      return randomFit(rng);
    case 'sum':
      return randomSum(rng);
    case 'total':
      return randomTotal(rng);
    case 'remainder':
      return randomRemainder(rng);
  }
}
