import { capitalize, formatRational } from '../format';
import { drawUntil, pick, randomInt, shuffle, type Rng } from '../random';
import {
  compare,
  fromInteger,
  hasAtMostDecimals,
  isBetween,
  multiply,
  powerOfTen,
  rational,
  type Rational,
} from '../rational';
import { SLOT } from '../slot';
import { choiceStep } from '../steps';
import type { Question } from '../types';
import { randomMantissa } from './measurement';

interface Reference {
  prompt: string;
  /** In ascending order of size. */
  options: readonly string[];
  answer: string;
  explanation: string;
}

/** The nine Cito references (spec §5.48). */
export const REFERENCES: readonly Reference[] = [
  {
    prompt: 'Hoeveel drinken zit er ongeveer in een drinkpak?',
    options: ['100 ml', '1 L', '5 L', '10 L'],
    answer: '1 L',
    explanation: 'Een drinkpak bevat ongeveer 1 L.',
  },
  {
    prompt: 'Hoe lang is een volwassene ongeveer?',
    options: ['80 cm', '1,80 m', '2,50 m', '18 m'],
    answer: '1,80 m',
    explanation: 'Een volwassene is ongeveer 1,80 m lang.',
  },
  {
    prompt: 'Hoe hoog is een deur ongeveer?',
    options: ['1 m', '2 m', '4 m', '20 m'],
    answer: '2 m',
    explanation: 'Een deur is ongeveer 2 m hoog.',
  },
  {
    prompt: 'Hoe hoog is één woonlaag van een huis ongeveer?',
    options: ['1 m', '3 m', '10 m', '30 m'],
    answer: '3 m',
    explanation: 'Eén woonlaag is ongeveer 3 m hoog.',
  },
  {
    prompt: 'Hoe lang is een stap ongeveer?',
    options: ['10 cm', '1 m', '3 m', '10 m'],
    answer: '1 m',
    explanation: 'Een stap is ongeveer 1 m.',
  },
  {
    prompt: 'Hoe snel wandel je ongeveer?',
    options: ['1 km/u', '5 km/u', '17 km/u', '50 km/u'],
    answer: '5 km/u',
    explanation: 'Je wandelt ongeveer 5 km/u.',
  },
  {
    prompt: 'Hoe zwaar is 1 liter water ongeveer?',
    options: ['1 g', '100 g', '1 kg', '10 kg'],
    answer: '1 kg',
    explanation: '1 liter water weegt ongeveer 1 kg.',
  },
  {
    prompt: 'Hoe snel fiets je ongeveer op een gewone fiets?',
    options: ['5 km/u', '17 km/u', '45 km/u', '100 km/u'],
    answer: '17 km/u',
    explanation: 'Op een gewone fiets fiets je ongeveer 17 km/u.',
  },
  {
    prompt: 'Hoeveel inwoners heeft Nederland ongeveer?',
    options: ['1,8 miljoen', '18 miljoen', '180 miljoen', '1,8 miljard'],
    answer: '18 miljoen',
    explanation: 'Nederland heeft ongeveer 18 miljoen inwoners.',
  },
];

const INSTRUMENTS: readonly string[] = [
  'liniaal',
  'meetlint',
  'maatbeker',
  'weegschaal',
  'stopwatch',
  'snelheidsmeter',
  'thermometer',
];

interface InstrumentItem {
  what: string;
  answer: string;
  /** The neighbouring instrument that is never a distractor. */
  excluded?: string;
}

export const INSTRUMENT_ITEMS: readonly InstrumentItem[] = [
  { what: 'de lengte van een potlood', answer: 'liniaal', excluded: 'meetlint' },
  { what: 'de breedte van een kamer', answer: 'meetlint', excluded: 'liniaal' },
  { what: '250 ml melk voor een recept', answer: 'maatbeker', excluded: 'weegschaal' },
  { what: '200 gram bloem voor een taart', answer: 'weegschaal', excluded: 'maatbeker' },
  { what: 'hoe zwaar je bent', answer: 'weegschaal' },
  { what: 'hoe lang je over 100 meter hardlopen doet', answer: 'stopwatch' },
  { what: 'hoe hard een auto rijdt', answer: 'snelheidsmeter' },
  { what: 'hoe warm het buiten is', answer: 'thermometer' },
];

interface UnitItem {
  before: string;
  value: string;
  after: string;
  /** In ascending order of size. */
  options: readonly string[];
  answer: string;
  /** The same amount in a second unit, shown in the explanation. */
  also?: string;
}

/** `In een drinkglas past ongeveer 200 ?.` The unit is the slot (spec §5.48). */
export const UNIT_ITEMS: readonly UnitItem[] = [
  {
    before: 'In een drinkglas past ongeveer',
    value: '200',
    after: '.',
    options: ['ml', 'cl', 'dl', 'L'],
    answer: 'ml',
    also: '2 dl',
  },
  {
    before: 'In een theelepel past ongeveer',
    value: '5',
    after: '.',
    options: ['ml', 'cl', 'dl', 'L'],
    answer: 'ml',
  },
  {
    before: 'In een emmer past ongeveer',
    value: '10',
    after: '.',
    options: ['ml', 'cl', 'dl', 'L'],
    answer: 'L',
  },
  {
    before: 'Een vrachtwagen levert',
    value: '10',
    after: ' zand.',
    options: ['cl', 'L', 'kuub', 'km³'],
    answer: 'kuub',
    also: '10 m³',
  },
  {
    before: 'Het IJsselmeer bevat ongeveer',
    value: '6',
    after: ' water.',
    options: ['L', 'hl', 'm³', 'km³'],
    answer: 'km³',
  },
  {
    before: 'Een potlood is ongeveer',
    value: '18',
    after: ' lang.',
    options: ['mm', 'cm', 'dm', 'm'],
    answer: 'cm',
  },
  {
    before: 'Van Amsterdam naar Utrecht is het ongeveer',
    value: '40',
    after: '.',
    options: ['cm', 'm', 'hm', 'km'],
    answer: 'km',
  },
  {
    before: 'Een appel weegt ongeveer',
    value: '150',
    after: '.',
    options: ['mg', 'g', 'kg', 'ton'],
    answer: 'g',
  },
  {
    before: 'Een olifant weegt ongeveer',
    value: '5',
    after: '.',
    options: ['mg', 'g', 'kg', 'ton'],
    answer: 'ton',
    also: '5000 kg',
  },
  {
    before: "Een A4'tje is ongeveer",
    value: '600',
    after: ' groot.',
    options: ['mm²', 'cm²', 'dm²', 'm²'],
    answer: 'cm²',
  },
  {
    before: 'Een voetbalveld is ongeveer',
    value: '7000',
    after: ' groot.',
    options: ['dm²', 'm²', 'ha', 'km²'],
    answer: 'm²',
    also: '0,7 ha',
  },
  {
    before: 'Een film duurt ongeveer',
    value: '2',
    after: '.',
    options: ['s', 'min', 'uur', 'dagen'],
    answer: 'uur',
    also: '120 min',
  },
  {
    before: 'Een schooljaar duurt ongeveer',
    value: '40',
    after: '.',
    options: ['dagen', 'weken', 'maanden', 'jaar'],
    answer: 'weken',
  },
  {
    before: 'Een foto op je telefoon is ongeveer',
    value: '3',
    after: '.',
    options: ['kB', 'MB', 'GB', 'TB'],
    answer: 'MB',
  },
];

export function referenceQuestion(index: number): Question {
  const { prompt, options, answer, explanation } = REFERENCES[index]!;
  return {
    key: `measureSense:reference:${index}`,
    topic: 'measureSense',
    steps: [choiceStep({ prompt, options, answer, explanation })],
  };
}

export function unitQuestion(index: number): Question {
  const { before, value, after, options, answer, also } = UNIT_ITEMS[index]!;
  const filledIn = also ? `${answer} (${also})` : answer;
  return {
    key: `measureSense:unit:${index}`,
    topic: 'measureSense',
    steps: [
      choiceStep({
        prompt: `${before} ${value} ${SLOT}${after}`,
        options,
        answer,
        explanation: `${before} ${value} ${filledIn}${after}`,
      }),
    ],
  };
}

export function instrumentQuestion(index: number, rng: Rng): Question {
  const { what, answer, excluded } = INSTRUMENT_ITEMS[index]!;
  const others = INSTRUMENTS.filter((name) => name !== answer && name !== excluded);
  const options = shuffle(rng, [answer, ...shuffle(rng, others).slice(0, 3)]);
  return {
    key: `measureSense:instrument:${index}`,
    topic: 'measureSense',
    steps: [
      choiceStep({
        prompt: `Waarmee meet je ${what}?`,
        options,
        answer,
        explanation: `${capitalize(what)} meet je met een ${answer}.`,
      }),
    ],
  };
}

export const ORDER_UNITS: readonly string[] = ['mm', 'cm', 'dm', 'm'];

/** Millimetres per unit. */
const MM_PER_UNIT: Readonly<Record<string, number>> = { mm: 1, cm: 10, dm: 100, m: 1000 };

const DASH = ' – ';

export interface Length {
  value: Rational;
  unit: string;
}

type Direction = 'up' | 'down';

const sizeInMm = ({ value, unit }: Length) => multiply(value, fromInteger(MM_PER_UNIT[unit]!));
const formatLength = ({ value, unit }: Length) => `${formatRational(value)} ${unit}`;
const joined = (lengths: readonly Length[]) => lengths.map(formatLength).join(DASH);

/** Sorted by size, or by the bare number; `down` is the reverse. */
function sorted(
  lengths: readonly Length[],
  measure: (length: Length) => Rational,
  direction: Direction,
): Length[] {
  const sign = direction === 'up' ? 1 : -1;
  return [...lengths].sort((a, b) => sign * compare(measure(a), measure(b)));
}

/**
 * The right order, the order of the bare numbers and two of the three neighbour swaps of the
 * right order that differ from the bare order, shuffled (spec §5.48). Of the three swaps at most
 * one equals the bare order, so two always remain.
 */
export function orderingOptions(
  lengths: readonly Length[],
  direction: Direction,
  rng: Rng,
): string[] {
  const right = sorted(lengths, sizeInMm, direction);
  const bare = joined(sorted(lengths, ({ value }) => value, direction));
  const swaps = [0, 1, 2]
    .map((index) => {
      const copy = [...right];
      [copy[index], copy[index + 1]] = [copy[index + 1]!, copy[index]!];
      return joined(copy);
    })
    .filter((option) => option !== bare);
  return shuffle(rng, [joined(right), bare, ...shuffle(rng, swaps).slice(0, 2)]);
}

export function orderingQuestion(
  lengths: readonly Length[],
  direction: Direction,
  rng: Rng,
): Question {
  const values = ORDER_UNITS.map((unit) =>
    formatRational(lengths.find((length) => length.unit === unit)!.value),
  );
  const right = sorted(lengths, sizeInMm, direction);
  const inCm = right.map(({ value, unit }) =>
    formatRational(multiply(value, rational(BigInt(MM_PER_UNIT[unit]!), 10n))),
  );
  return {
    key: `measureSense:order:${direction}:${values.join(':')}`,
    topic: 'measureSense',
    steps: [
      choiceStep({
        prompt: `Welke rij staat van ${direction === 'up' ? 'klein naar groot' : 'groot naar klein'}?`,
        options: orderingOptions(lengths, direction, rng),
        answer: joined(right),
        explanation: `in cm: ${inCm.join(DASH)}`,
      }),
    ],
  };
}

const MIN_SIZE_MM = fromInteger(5);
const MAX_SIZE_MM = fromInteger(20_000);
/** Sizes differ by at least 10%. */
const MIN_RATIO = rational(11n, 10n);

/** At most 3 significant digits and 1 decimal, in [0,1; 999] as written, 5 mm to 20 m in size. */
function randomLength(rng: Rng, unit: string): Length {
  return drawUntil(() => {
    const value = multiply(fromInteger(randomMantissa(rng)), powerOfTen(randomInt(rng, -1, 2)));
    const length = { value, unit };
    return hasAtMostDecimals(value, 1) &&
      isBetween(value, powerOfTen(-1), fromInteger(999)) &&
      isBetween(sizeInMm(length), MIN_SIZE_MM, MAX_SIZE_MM)
      ? length
      : null;
  });
}

function randomOrdering(rng: Rng): Question {
  const lengths = drawUntil(() => {
    const draw = ORDER_UNITS.map((unit) => randomLength(rng, unit));
    const bySize = sorted(draw, sizeInMm, 'up');
    const closeTogether = bySize.some(
      (length, index) =>
        index > 0 &&
        compare(sizeInMm(length), multiply(sizeInMm(bySize[index - 1]!), MIN_RATIO)) < 0,
    );
    const byNumber = sorted(draw, ({ value }) => value, 'up');
    const tied = byNumber.some(
      (length, index) => index > 0 && compare(length.value, byNumber[index - 1]!.value) === 0,
    );
    const sameOrder = byNumber.every((length, index) => length.unit === bySize[index]!.unit);
    return closeTogether || tied || sameOrder ? null : draw;
  });
  return orderingQuestion(lengths, rng() < 0.5 ? 'up' : 'down', rng);
}

export function generateMeasureSense(rng: Rng): Question {
  switch (pick(rng, ['reference', 'instrument', 'unit', 'order'] as const)) {
    case 'reference':
      return referenceQuestion(randomInt(rng, 0, REFERENCES.length - 1));
    case 'instrument':
      return instrumentQuestion(randomInt(rng, 0, INSTRUMENT_ITEMS.length - 1), rng);
    case 'unit':
      return unitQuestion(randomInt(rng, 0, UNIT_ITEMS.length - 1));
    case 'order':
      return randomOrdering(rng);
  }
}
