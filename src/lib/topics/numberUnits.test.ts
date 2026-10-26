import { describe, expect, it } from 'vitest';
import { GROUP_SEPARATOR, toSuperscript } from '../format';
import { createRng } from '../random';
import { SLOT } from '../slot';
import {
  compare,
  decimalPlaces,
  equals,
  fromInteger,
  isInteger,
  multiply,
  parseDutchNumber,
  powerOfTen,
  rational,
} from '../rational';
import type { Question } from '../types';
import { isNiceValue } from './measurement';
import {
  generateNumberUnits,
  MIN_POWER,
  moneyQuestion,
  nameToNumberQuestion,
  nameToPowerTip,
  NUMBER_LIMITS,
  NUMBER_UNITS,
} from './numberUnits';
import { decimal, stepOf } from './testHelpers';

const SAMPLES = 3000;

function sample(seed: number, count = SAMPLES): Question[] {
  const rng = createRng(seed);
  return Array.from({ length: count }, () => generateNumberUnits(rng));
}

function expectedOf(question: Question): string {
  return stepOf(question).check('').expected;
}

/** What the user types for a formatted number: the keypad has no group separator. */
function typed(formatted: string): string {
  return formatted.replaceAll(GROUP_SEPARATOR, '');
}

const questions = sample(17);
const exponentOf = new Map(NUMBER_UNITS.map((unit) => [unit.symbol, unit.exponent]));
const nameToPower = questions.filter((q) => q.key.startsWith('numberUnits:power:'));
const powerToName = questions.filter((q) => q.key.startsWith('numberUnits:fromPower:'));
const nameToName = questions.filter((q) => q.key.includes('>'));
const nameToNumber = questions.filter((q) => q.key.startsWith('numberUnits:number:'));
const money = questions.filter((q) => q.key.startsWith('numberUnits:money:'));
const shortNames = [nameToPower, powerToName, nameToName].flat();

describe('NUMBER_UNITS', () => {
  it('follows the Dutch long scale from duizend to quadriljoen', () => {
    expect(NUMBER_UNITS.map((unit) => [unit.symbol, unit.exponent])).toEqual([
      ['duizend', 3],
      ['miljoen', 6],
      ['miljard', 9],
      ['biljoen', 12],
      ['biljard', 15],
      ['triljoen', 18],
      ['triljard', 21],
      ['quadriljoen', 24],
    ]);
  });
});

describe('generateNumberUnits', () => {
  it('creates single-step numeric questions that accept their own answer', () => {
    for (const question of questions) {
      expect(question.topic).toBe('numberUnits');
      expect(question.steps).toHaveLength(1);
      expect(stepOf(question).kind).toBe('number');
      const result = stepOf(question).check(typed(expectedOf(question)));
      expect(result.correct).toBe(true);
      expect(result.explanation).toBeTruthy();
    }
  });

  it('uses the five forms about equally often', () => {
    expect(shortNames.length + nameToNumber.length + money.length).toBe(SAMPLES);
    for (const form of [nameToPower, powerToName, nameToName, nameToNumber, money]) {
      expect(form.length / SAMPLES).toBeGreaterThan(0.16);
      expect(form.length / SAMPLES).toBeLessThan(0.24);
    }
  });

  it('keeps every number in a prompt and every answer of the short names at most 100 000', () => {
    const limit = fromInteger(100_000);
    for (const question of shortNames) {
      // Superscript digits are not matched by \d, so 10⁹ yields just "10".
      const numbers = typed(stepOf(question).prompt).match(/\d+(,\d+)?/g) ?? [];
      for (const text of [...numbers, typed(expectedOf(question))]) {
        expect(compare(parseDutchNumber(text)!, limit)).toBeLessThanOrEqual(0);
      }
    }
  });

  it('is deterministic for a fixed seed', () => {
    const keys = (seed: number) => sample(seed, 50).map((question) => question.key);
    expect(keys(5)).toEqual(keys(5));
  });
});

// Rare keys (e.g. mantissa 1) are not in the 3000-sample set: look them up in a larger pool.
const pool = sample(99, 200_000);

function find(key: string): Question {
  const question = pool.find((candidate) => candidate.key === key);
  expect(question, key).toBeDefined();
  return question!;
}

function explanationOf(key: string): string {
  return stepOf(find(key)).check('').explanation!;
}

const SUPERSCRIPT_DIGITS = '⁰¹²³⁴⁵⁶⁷⁸⁹';
function fromSuperscript(text: string): number {
  return Number([...text].map((char) => SUPERSCRIPT_DIGITS.indexOf(char)).join(''));
}

describe('name → power', () => {
  it('asks for the exponent of the value', () => {
    for (const question of nameToPower) {
      const [, , value, symbol] = question.key.split(':');
      const [, promptValue, promptSymbol] = stepOf(question).prompt.match(/^(\d+) (\S+) = /)!;
      expect(promptValue).toBe(value);
      expect(promptSymbol).toBe(symbol);
      const exponent = exponentOf.get(promptSymbol!)! + promptValue!.length - 1;
      expect(expectedOf(question)).toBe(String(exponent));
      expect(stepOf(question).suffix).toBeUndefined();
      expect(stepOf(question).prompt).toMatch(/ = (\d(,\d+)? × )?10ⁿ\. n = \?$/);
      expect(
        stepOf(question)
          .check('')
          .explanation!.endsWith(`10${toSuperscript(exponent)}`),
      ).toBe(true);
    }
  });

  it('covers every name', () => {
    const names = new Set(nameToPower.map((question) => question.key.split(':')[3]));
    expect(names.size).toBe(NUMBER_UNITS.length);
  });

  it('asks for the bare name in about 40% of the cases', () => {
    const bare = nameToPower.filter((q) => q.key.startsWith('numberUnits:power:1:')).length;
    expect(bare / nameToPower.length).toBeGreaterThan(0.33);
    expect(bare / nameToPower.length).toBeLessThan(0.52);
  });

  it('explains a bare name via the previous name', () => {
    expect(stepOf(find('numberUnits:power:1:biljoen')).prompt).toBe('1 biljoen = 10ⁿ. n = ?');
    expect(explanationOf('numberUnits:power:1:biljoen')).toBe('1 biljoen = 1000 miljard = 10¹²');
    expect(explanationOf('numberUnits:power:1:duizend')).toBe('1 duizend = 1000 = 10³');
  });

  it('uses every value from 1 to 999 with 1 to 3 significant digits, trailing zeros included', () => {
    for (const question of nameToPower) {
      const value = Number(question.key.split(':')[2]);
      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThanOrEqual(999);
    }
    expect(nameToPower.some((q) => /^numberUnits:power:\d*0:/.test(q.key))).toBe(true);
  });

  it.each([
    ['numberUnits:power:7:miljard', '7 miljard = 7 × 10⁹'],
    ['numberUnits:power:250:miljoen', '250 miljoen = 2,5 × 10² × 10⁶ = 2,5 × 10⁸'],
  ])('explains %s exactly', (key, explanation) => {
    expect(explanationOf(key)).toBe(explanation);
  });
});

describe('power → name', () => {
  it('converts a power of 10 exactly into the named unit', () => {
    for (const question of powerToName) {
      const [, , mantissa, keyExponent, keySymbol] = question.key.split(':');
      const prompt = stepOf(question).prompt;
      const [, coefficientText, powerText, symbol] = prompt.match(
        /^(?:(\d(?:,\d+)?) × )?10([⁰¹²³⁴⁵⁶⁷⁸⁹]+) = \? (\S+)$/,
      )!;
      const exponent = fromSuperscript(powerText!);
      expect(symbol).toBe(keySymbol);
      expect(String(exponent)).toBe(keyExponent);
      expect(exponent).toBeGreaterThanOrEqual(MIN_POWER);
      // Without a coefficient the prompt shows a bare power: the mantissa is 1.
      const coefficient = coefficientText ? parseDutchNumber(coefficientText)! : rational(1n, 1n);
      expect(
        equals(coefficient, rational(BigInt(mantissa!), 10n ** BigInt(mantissa!.length - 1))),
      ).toBe(true);
      const answer = multiply(coefficient, powerOfTen(exponent - exponentOf.get(symbol!)!));
      expect(equals(parseDutchNumber(typed(expectedOf(question)))!, answer)).toBe(true);
      expect(isNiceValue(answer, NUMBER_LIMITS.maxValueExponent)).toBe(true);
      expect(stepOf(question).suffix).toBe(symbol);
    }
  });

  it('covers every name, including duizend', () => {
    const names = new Set(powerToName.map((question) => question.key.split(':')[4]));
    expect([...names].sort()).toEqual(NUMBER_UNITS.map((unit) => unit.symbol).sort());
  });

  it.each([
    ['numberUnits:fromPower:25:9:miljoen', '10⁹ = 1000 miljoen → 2,5 × 1000 = 2500'],
    ['numberUnits:fromPower:25:5:miljoen', '10⁵ = 0,1 miljoen → 2,5 × 0,1 = 0,25'],
    ['numberUnits:fromPower:25:6:miljoen', '10⁶ = 1 miljoen'],
    ['numberUnits:fromPower:1:9:miljoen', '10⁹ = 1000 miljoen'],
    ['numberUnits:fromPower:1:6:miljoen', '10⁶ = 1 miljoen'],
  ])('explains %s exactly', (key, explanation) => {
    expect(explanationOf(key)).toBe(explanation);
  });
});

describe('name ↔ name', () => {
  it('converts only between neighbouring names', () => {
    for (const question of nameToName) {
      const [from, to] = question.key.split(':')[1]!.split('>');
      expect(Math.abs(exponentOf.get(from!)! - exponentOf.get(to!)!)).toBe(3);
      expect(stepOf(question).suffix).toBe(to);
    }
  });
});

/** Builds the question a key names, so the rare values need no huge sample. */
function build(key: string): Question {
  const parts = key.split(':');
  const value = decimal(parts.at(-1)!);
  const question =
    parts[1] === 'number'
      ? nameToNumberQuestion(parts[3]!, parts[2] === 'toNumber', value)
      : moneyQuestion(parts[2] as 'huis' | 'winst', parts[3] === 'toEuro', value);
  expect(question.key).toBe(key);
  return question;
}

describe('name ↔ number', () => {
  const find = build;
  const explanationOf = (key: string) => stepOf(build(key)).check('').explanation!;

  it('writes a number with its name in full and back', () => {
    const toNumber = find('numberUnits:number:toNumber:miljoen:10,6');
    expect(stepOf(toNumber).prompt).toBe('10,6 miljoen = ?');
    expect(stepOf(toNumber).suffix).toBeUndefined();
    expect(expectedOf(toNumber)).toBe(`10${GROUP_SEPARATOR}600${GROUP_SEPARATOR}000`);
    expect(stepOf(toNumber).check('10600000').correct).toBe(true);
    expect(explanationOf('numberUnits:number:toNumber:miljoen:10,6')).toBe(
      `1 miljoen = 1${GROUP_SEPARATOR}000${GROUP_SEPARATOR}000 → 10,6 × 1${GROUP_SEPARATOR}000${GROUP_SEPARATOR}000 = 10${GROUP_SEPARATOR}600${GROUP_SEPARATOR}000`,
    );

    const toName = find('numberUnits:number:toName:miljoen:6,5');
    expect(stepOf(toName).prompt).toBe(`6${GROUP_SEPARATOR}500${GROUP_SEPARATOR}000 = ? miljoen`);
    expect(stepOf(toName).suffix).toBe('miljoen');
    expect(expectedOf(toName)).toBe('6,5');
    expect(explanationOf('numberUnits:number:toName:miljoen:6,5')).toBe(
      `1 miljoen = 1${GROUP_SEPARATOR}000${GROUP_SEPARATOR}000 → 6${GROUP_SEPARATOR}500${GROUP_SEPARATOR}000 : 1${GROUP_SEPARATOR}000${GROUP_SEPARATOR}000 = 6,5`,
    );
  });

  it('accepts a miljard in full', () => {
    const question = find('numberUnits:number:toNumber:miljard:2,75');
    expect(stepOf(question).check('2750000000').correct).toBe(true);
  });

  it('gives the factor-of-ten tip for a wrong number of zeros', () => {
    const step = stepOf(find('numberUnits:number:toNumber:miljoen:10,6'));
    const result = step.check('1060000');
    expect(result.correct).toBe(false);
    expect(result.tip).toBeTruthy();
  });

  it('uses miljoen and miljard with values in [1, 999] of at most 2 decimals', () => {
    const units = new Set<string>();
    for (const question of nameToNumber) {
      const [, , direction, unit, value] = question.key.split(':');
      units.add(unit!);
      expect(['toNumber', 'toName']).toContain(direction);
      const parsed = parseDutchNumber(value!)!;
      expect(compare(parsed, fromInteger(1))).toBeGreaterThanOrEqual(0);
      expect(compare(parsed, fromInteger(999))).toBeLessThanOrEqual(0);
      expect(decimalPlaces(parsed)!).toBeLessThanOrEqual(2);
      expect(
        value!.replace(',', '').replace(/^0+/, '').replace(/0+$/, '').length,
      ).toBeLessThanOrEqual(3);
      expect(isInteger(multiply(parsed, powerOfTen(exponentOf.get(unit!)!)))).toBe(true);
    }
    expect([...units].sort()).toEqual(['miljard', 'miljoen']);
  });
});

describe('money (ton)', () => {
  const find = build;
  const explanationOf = (key: string) => stepOf(build(key)).check('').explanation!;

  it('converts ton to euro and back', () => {
    const euro = find('numberUnits:money:huis:toEuro:3,5');
    expect(stepOf(euro).prompt).toBe('Een huis kost 3,5 ton. Hoeveel euro is dat?');
    expect(stepOf(euro).prefix).toBe('€');
    expect(stepOf(euro).check('350000').correct).toBe(true);
    expect(explanationOf('numberUnits:money:huis:toEuro:3,5')).toBe(
      `1 ton = €\u{a0}100${GROUP_SEPARATOR}000 → 3,5 × 100${GROUP_SEPARATOR}000 = 350${GROUP_SEPARATOR}000`,
    );

    const ton = find('numberUnits:money:huis:toTon:4,5');
    expect(stepOf(ton).prompt).toBe(
      `Een huis kost €\u{a0}450${GROUP_SEPARATOR}000. Hoeveel ton is dat?`,
    );
    expect(stepOf(ton).suffix).toBe('ton');
    expect(stepOf(ton).check('4,5').correct).toBe(true);
    expect(explanationOf('numberUnits:money:huis:toTon:4,5')).toBe(
      `1 ton = €\u{a0}100${GROUP_SEPARATOR}000 → 450${GROUP_SEPARATOR}000 : 100${GROUP_SEPARATOR}000 = 4,5`,
    );
  });

  it('words the winst context', () => {
    expect(stepOf(find('numberUnits:money:winst:toEuro:1,2')).prompt).toBe(
      'Een bedrijf maakt 1,2 ton winst. Hoeveel euro is dat?',
    );
    expect(stepOf(find('numberUnits:money:winst:toTon:1,2')).prompt).toBe(
      `Een bedrijf maakt €\u{a0}120${GROUP_SEPARATOR}000 winst. Hoeveel ton is dat?`,
    );
  });

  it('keeps a huis in halves from 2 to 8 ton and a winst in tenths from 0,5 to 9,9', () => {
    const seen = { huis: new Set<string>(), winst: new Set<string>() };
    for (const question of money) {
      const [, , context, , ton] = question.key.split(':');
      const value = parseDutchNumber(ton!)!;
      if (context === 'huis') {
        expect(isInteger(multiply(value, fromInteger(2)))).toBe(true);
        expect(compare(value, fromInteger(2))).toBeGreaterThanOrEqual(0);
        expect(compare(value, fromInteger(8))).toBeLessThanOrEqual(0);
        seen.huis.add(ton!);
      } else {
        expect(context).toBe('winst');
        expect(isInteger(multiply(value, fromInteger(10)))).toBe(true);
        expect(compare(value, rational(1n, 2n))).toBeGreaterThanOrEqual(0);
        expect(compare(value, rational(99n, 10n))).toBeLessThanOrEqual(0);
        seen.winst.add(ton!);
      }
    }
    expect(seen.huis.size).toBeGreaterThan(5);
    expect(seen.winst.size).toBeGreaterThan(20);
  });
});

describe('nameToPowerTip', () => {
  const unit = (symbol: string) => NUMBER_UNITS.find((candidate) => candidate.symbol === symbol)!;

  it('names the English short scale', () => {
    expect(nameToPowerTip(unit('biljoen'), 1, 0)(fromInteger(9))).toBe(
      'Een biljoen is 10¹²; 10⁹ is een miljard (Engels: billion).',
    );
    expect(nameToPowerTip(unit('triljoen'), 250, 2)(fromInteger(14))).toBe(
      'Een triljoen is 10¹⁸; 10¹² is een biljoen (Engels: trillion).',
    );
  });

  it('names the English quadrillion', () => {
    expect(nameToPowerTip(unit('quadriljoen'), 1, 0)(fromInteger(15))).toBe(
      'Een quadriljoen is 10²⁴; 10¹⁵ is een biljard (Engels: quadrillion).',
    );
  });

  it('names a forgotten shift of the coefficient', () => {
    expect(nameToPowerTip(unit('miljoen'), 250, 2)(fromInteger(6))).toBe(
      '250 = 2,5 × 10²: tel 2 op bij 6.',
    );
  });

  it('gives nothing for other answers', () => {
    expect(nameToPowerTip(unit('miljard'), 1, 0)(fromInteger(6))).toBeUndefined();
    expect(nameToPowerTip(unit('biljard'), 1, 0)(fromInteger(12))).toBeUndefined();
  });

  it('skips the factor-of-ten fallback for exponents', () => {
    const rng = createRng(3);
    let seen = 0;
    for (let i = 0; i < 1000; i++) {
      const step = generateNumberUnits(rng).steps[0]!;
      if (!step.prompt.endsWith(`n = ${SLOT}`)) continue;
      seen++;
      const exponent = Number(step.check('0').expected);
      expect(step.check(String(exponent * 10)).tip).toBeUndefined();
    }
    expect(seen).toBeGreaterThan(100);
  });
});
