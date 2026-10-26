import {
  formatEuro,
  formatInteger,
  formatPowerOfTen,
  formatRational,
  UNKNOWN_EXPONENT,
} from '../format';
import { drawUntil, pick, randomInt, type Rng } from '../random';
import { SLOT } from '../slot';
import {
  divide,
  equals,
  fromInteger,
  hasAtMostDecimals,
  isBetween,
  multiply,
  ONE,
  powerOfTen,
  rational,
  type Rational,
} from '../rational';
import { numberStep } from '../steps';
import type { Diagnose } from '../tips';
import type { Question } from '../types';
import {
  coefficientOf,
  conversionQuestion,
  isNiceValue,
  MAX_DECIMALS,
  randomMantissa,
  randomScaleConversion,
  type ScaleLimits,
  type ScaleUnit,
} from './measurement';

/** Dutch long scale (spec §5.14): a biljoen is 10¹², not 10⁹. */
export const NUMBER_UNITS: readonly ScaleUnit[] = [
  { symbol: 'duizend', exponent: 3 },
  { symbol: 'miljoen', exponent: 6 },
  { symbol: 'miljard', exponent: 9 },
  { symbol: 'biljoen', exponent: 12 },
  { symbol: 'biljard', exponent: 15 },
  { symbol: 'triljoen', exponent: 18 },
  { symbol: 'triljard', exponent: 21 },
  { symbol: 'quadriljoen', exponent: 24 },
];

/** Neighbouring names only, values up to 100 000: prompts never show long runs of zeros. */
export const NUMBER_LIMITS: ScaleLimits = { maxShift: 3, maxValueExponent: 5 };

/**
 * Share of name → power questions that ask for a bare name, e.g. `1 miljard = 10ⁿ`.
 * The effective share is slightly higher: randomMantissa can also return 1.
 */
const BARE_NAME_SHARE = 0.4;

/** Power → name prompts start at 10³: the topic skips tien and honderd. */
export const MIN_POWER = 3;

type NumberUnitForm = 'nameToPower' | 'nameToName' | 'powerToName' | 'nameToNumber' | 'money';
const FORMS: readonly NumberUnitForm[] = [
  'nameToPower',
  'nameToName',
  'powerToName',
  'nameToNumber',
  'money',
];

export function generateNumberUnits(rng: Rng): Question {
  switch (pick(rng, FORMS)) {
    case 'nameToNumber':
      return nameToNumber(rng);
    case 'money':
      return money(rng);
    case 'nameToPower':
      return nameToPower(rng);
    case 'nameToName': {
      const { from, to, value, answer } = randomScaleConversion(rng, NUMBER_UNITS, NUMBER_LIMITS);
      return conversionQuestion('numberUnits', from.symbol, to.symbol, value, answer);
    }
    case 'powerToName':
      return powerToName(rng);
  }
}

/** Only the names that are written out in full (RWT A.1 goes up to a miljard). */
const FULL_NAMES: readonly ScaleUnit[] = NUMBER_UNITS.filter(({ symbol }) =>
  ['miljoen', 'miljard'].includes(symbol),
);

/** `10,6 miljoen = ?` or `6 500 000 = ? miljoen` */
export function nameToNumberQuestion(symbol: string, toNumber: boolean, value: Rational): Question {
  const unit = NUMBER_UNITS.find((candidate) => candidate.symbol === symbol)!;
  const factor = powerOfTen(unit.exponent);
  const [shown, factorText] = [formatRational(value), formatRational(factor)];
  const full = formatRational(multiply(value, factor));
  const fact = `1 ${symbol} = ${factorText}`;
  return {
    key: `numberUnits:number:${toNumber ? 'toNumber' : 'toName'}:${symbol}:${shown}`,
    topic: 'numberUnits',
    steps: [
      toNumber
        ? numberStep({
            prompt: `${shown} ${symbol} = ${SLOT}`,
            answer: multiply(value, factor),
            explanation: `${fact} → ${shown} × ${factorText} = ${full}`,
          })
        : numberStep({
            prompt: `${full} = ${SLOT} ${symbol}`,
            answer: value,
            suffix: symbol,
            explanation: `${fact} → ${full} : ${factorText} = ${shown}`,
          }),
    ],
  };
}

/** The value has 1 to 3 significant digits, lies in [1, 999] and has at most 2 decimals. */
function nameToNumber(rng: Rng): Question {
  const unit = pick(rng, FULL_NAMES);
  const value = drawUntil(() => {
    const candidate = multiply(fromInteger(randomMantissa(rng)), powerOfTen(randomInt(rng, -2, 2)));
    return isBetween(candidate, ONE, fromInteger(999)) && hasAtMostDecimals(candidate, 2)
      ? candidate
      : null;
  });
  return nameToNumberQuestion(unit.symbol, rng() < 0.5, value);
}

const TON = fromInteger(100_000);

type MoneyContext = 'huis' | 'winst';

/** `Een huis kost 3,5 ton. Hoeveel euro is dat?` or `Een huis kost € 350 000. Hoeveel ton?` */
export function moneyQuestion(context: MoneyContext, toEuro: boolean, ton: Rational): Question {
  const [lead, tail] =
    context === 'huis' ? ['Een huis kost ', ''] : ['Een bedrijf maakt ', ' winst'];
  const euros = multiply(ton, TON);
  const [shownTon, shownEuros, tonText] = [
    formatRational(ton),
    formatRational(euros),
    formatRational(TON),
  ];
  const fact = `1 ton = ${formatEuro(TON)}`;
  return {
    key: `numberUnits:money:${context}:${toEuro ? 'toEuro' : 'toTon'}:${shownTon}`,
    topic: 'numberUnits',
    steps: [
      toEuro
        ? numberStep({
            prompt: `${lead}${shownTon} ton${tail}. Hoeveel euro is dat?`,
            answer: euros,
            prefix: '€',
            explanation: `${fact} → ${shownTon} × ${tonText} = ${shownEuros}`,
          })
        : numberStep({
            prompt: `${lead}${formatEuro(euros)}${tail}. Hoeveel ton is dat?`,
            answer: ton,
            suffix: 'ton',
            explanation: `${fact} → ${shownEuros} : ${tonText} = ${shownTon}`,
          }),
    ],
  };
}

/** A huis costs 2 to 8 ton in halves, a winst is 0,5 to 9,9 ton in tenths. */
function money(rng: Rng): Question {
  const context: MoneyContext = rng() < 0.5 ? 'huis' : 'winst';
  const ton =
    context === 'huis'
      ? rational(BigInt(randomInt(rng, 4, 16)), 2n)
      : rational(BigInt(randomInt(rng, 5, 99)), 10n);
  return moneyQuestion(context, rng() < 0.5, ton);
}

/** An integer in [1, 999] with 1 to 3 significant digits: 7, 250 or 300 (spec §5.14). */
function randomValue(rng: Rng): number {
  const mantissa = randomMantissa(rng);
  return mantissa * 10 ** randomInt(rng, 0, 3 - String(mantissa).length);
}

/** Long-scale names whose English look-alike is 10³ⁿ smaller (spec §3.4.1). */
const ENGLISH_NAMES: Readonly<Record<string, { exponent: number; english: string }>> = {
  biljoen: { exponent: 9, english: 'billion' },
  triljoen: { exponent: 12, english: 'trillion' },
  quadriljoen: { exponent: 15, english: 'quadrillion' },
};

/** Name → power mistakes: the English short scale, or the shift of the coefficient forgotten. */
export function nameToPowerTip(unit: ScaleUnit, value: number, shift: number): Diagnose {
  const short = ENGLISH_NAMES[unit.symbol];
  return (given) => {
    if (short && equals(given, fromInteger(short.exponent + shift))) {
      const dutch = NUMBER_UNITS.find((candidate) => candidate.exponent === short.exponent)!;
      return `Een ${unit.symbol} is ${formatPowerOfTen(unit.exponent)}; ${formatPowerOfTen(short.exponent)} is een ${dutch.symbol} (Engels: ${short.english}).`;
    }
    if (shift > 0 && equals(given, fromInteger(unit.exponent))) {
      const coefficient = formatRational(divide(fromInteger(value), powerOfTen(shift)));
      return `${formatInteger(value)} = ${coefficient} × ${formatPowerOfTen(shift)}: tel ${shift} op bij ${unit.exponent}.`;
    }
    return undefined;
  };
}

/** `1 biljard = 10ⁿ. n = ?` or `250 miljoen = 2,5 × 10ⁿ. n = ?` */
function nameToPower(rng: Rng): Question {
  const unit = pick(rng, NUMBER_UNITS);
  const value = rng() < BARE_NAME_SHARE ? 1 : randomValue(rng);
  // value = coefficient × 10^shift, with the coefficient in [1, 10).
  const shift = String(value).length - 1;
  const coefficient = formatRational(divide(fromInteger(value), powerOfTen(shift)));
  const exponent = unit.exponent + shift;
  const prompt =
    value === 1
      ? `1 ${unit.symbol} = 10${UNKNOWN_EXPONENT}. n = ${SLOT}`
      : `${formatInteger(value)} ${unit.symbol} = ${coefficient} × 10${UNKNOWN_EXPONENT}. n = ${SLOT}`;
  return {
    key: `numberUnits:power:${value}:${unit.symbol}`,
    topic: 'numberUnits',
    steps: [
      numberStep({
        prompt,
        answer: fromInteger(exponent),
        explanation: nameToPowerExplanation(unit, value, coefficient, shift),
        noPowerOfTenTip: true,
        diagnose: nameToPowerTip(unit, value, shift),
      }),
    ],
  };
}

function nameToPowerExplanation(
  unit: ScaleUnit,
  value: number,
  coefficient: string,
  shift: number,
): string {
  const power = formatPowerOfTen(unit.exponent);
  if (value === 1) {
    const previous = NUMBER_UNITS.find((candidate) => candidate.exponent === unit.exponent - 3);
    return `1 ${unit.symbol} = ${previous ? `1000 ${previous.symbol}` : '1000'} = ${power}`;
  }
  const name = `${formatInteger(value)} ${unit.symbol}`;
  if (shift === 0) return `${name} = ${coefficient} × ${power}`;
  const total = formatPowerOfTen(unit.exponent + shift);
  return `${name} = ${coefficient} × ${formatPowerOfTen(shift)} × ${power} = ${coefficient} × ${total}`;
}

/** `2,5 × 10⁹ = ? miljoen` */
function powerToName(rng: Rng): Question {
  const unit = pick(rng, NUMBER_UNITS);
  const mantissa = randomMantissa(rng);
  const coefficient = coefficientOf(mantissa);
  // The answer is coefficient × 10^(exponent − unit.exponent). Shift 0 always fits.
  const options: { exponent: number; answer: Rational }[] = [];
  const lowest = Math.max(MIN_POWER, unit.exponent - MAX_DECIMALS);
  const highest = unit.exponent + NUMBER_LIMITS.maxValueExponent;
  for (let exponent = lowest; exponent <= highest; exponent++) {
    const answer = multiply(coefficient, powerOfTen(exponent - unit.exponent));
    if (isNiceValue(answer, NUMBER_LIMITS.maxValueExponent)) options.push({ exponent, answer });
  }
  const { exponent, answer } = pick(rng, options);

  const power = formatPowerOfTen(exponent);
  const shownCoefficient = formatRational(coefficient);
  const perUnit = formatRational(powerOfTen(exponent - unit.exponent));
  const fact = `${power} = ${perUnit} ${unit.symbol}`;
  const factOnly = mantissa === 1 || exponent === unit.exponent;
  return {
    key: `numberUnits:fromPower:${mantissa}:${exponent}:${unit.symbol}`,
    topic: 'numberUnits',
    steps: [
      numberStep({
        prompt: `${mantissa === 1 ? power : `${shownCoefficient} × ${power}`} = ${SLOT} ${unit.symbol}`,
        answer,
        suffix: unit.symbol,
        explanation: factOnly
          ? fact
          : `${fact} → ${shownCoefficient} × ${perUnit} = ${formatRational(answer)}`,
      }),
    ],
  };
}
