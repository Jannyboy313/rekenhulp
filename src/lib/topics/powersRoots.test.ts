import { describe, expect, it } from 'vitest';
import { evaluate } from '../expr/evaluate';
import { parse } from '../expr/parser';
import { GROUP_SEPARATOR, SUPERSCRIPT_DIGITS } from '../format';
import { createRng } from '../random';
import {
  compare,
  divide,
  fromInteger,
  multiply,
  parseDutchNumber,
  powerOfTen,
  rational,
} from '../rational';
import type { Question, Step } from '../types';
import {
  buildPowersRoots,
  cubeRootQuestion,
  DECIMAL_POWERS,
  decimalPowerQuestion,
  explainPower,
  generatePowersRoots,
  MAX_SMALL_EXPONENT_BASE,
  NEGATIVE_POWERS,
  NEGATIVE_SHARE,
  negativeExponentQuestion,
  POSITIVE_POWERS,
  POSITIVE_SHARE,
  POWER_FORMS,
  type PowerForm,
  squareRootQuestion,
  wholePowerQuestion,
} from './powersRoots';

const PER_FORM = 1000;

function questionsOf(form: PowerForm): Question[] {
  const rng = createRng(500 + POWER_FORMS.indexOf(form));
  return Array.from({ length: PER_FORM }, () => buildPowersRoots(rng, form));
}

function stepOf(question: Question): Step {
  return question.steps[0]!;
}

/** Text as typed on the keypad: no digit grouping. */
function plain(text: string): string {
  return text.replaceAll(GROUP_SEPARATOR, '');
}

function promptOf(question: Question): string {
  return stepOf(question).prompt;
}

function expectedValue(question: Question) {
  return parseDutchNumber(plain(stepOf(question).check('').expected))!;
}

function fromSuperscript(text: string): number {
  return Number([...text].map((char) => SUPERSCRIPT_DIGITS.indexOf(char)).join(''));
}

const hasPair = (list: readonly (readonly [number, number])[], base: number, exponent: number) =>
  list.some(([b, e]) => b === base && e === exponent);

describe('power lists', () => {
  it('has 23 positive pairs with exponent at least 3', () => {
    expect(POSITIVE_POWERS).toHaveLength(23);
    expect(POSITIVE_POWERS.every(([, exponent]) => exponent >= 3)).toBe(true);
  });

  it('has 10 negative pairs up to 125', () => {
    expect(NEGATIVE_POWERS).toHaveLength(10);
    expect(NEGATIVE_POWERS.every(([base, exponent]) => base ** exponent <= 125)).toBe(true);
  });
});

describe('generatePowersRoots', () => {
  it('produces all four forms, each accepting its expected answer', () => {
    const rng = createRng(1);
    const shapes = new Set<string>();
    for (let i = 0; i < 2000; i++) {
      const question = generatePowersRoots(rng);
      expect(question.topic).toBe('powersRoots');
      const step = stepOf(question);
      expect(step.check(plain(step.check('').expected)).correct, step.prompt).toBe(true);
      shapes.add(/^[√∛]/.test(step.prompt) ? 'root' : step.prompt.includes('10⁻') ? 'tenth' : '');
    }
    expect(shapes).toContain('root');
    expect(shapes).toContain('tenth');
  });
});

describe('whole-number powers', () => {
  const questions = questionsOf('wholePower');
  const POWER = /^(\(−\d+\)|\d+)([⁰¹²³⁴⁵⁶⁷⁸⁹]+) = \?$/u;
  const parsed = questions.map((question) => {
    const match = POWER.exec(promptOf(question));
    expect(match, promptOf(question)).not.toBeNull();
    const base = Number(match![1]!.replace(/[()]/g, '').replace('−', '-'));
    return { question, base, exponent: fromSuperscript(match![2]!) };
  });

  it('draws from the pair lists or exponent 0 and 1', () => {
    for (const { base, exponent } of parsed) {
      if (exponent <= 1) {
        expect(base).toBeGreaterThanOrEqual(2);
        expect(base).toBeLessThanOrEqual(MAX_SMALL_EXPONENT_BASE);
      } else if (base < 0) {
        expect(hasPair(NEGATIVE_POWERS, -base, exponent), `${base}^${exponent}`).toBe(true);
      } else {
        expect(hasPair(POSITIVE_POWERS, base, exponent), `${base}^${exponent}`).toBe(true);
      }
    }
  });

  it('mixes positive bases, negative bases and exponents 0 and 1 by their shares', () => {
    const negative = parsed.filter(({ base }) => base < 0).length / PER_FORM;
    const small = parsed.filter(({ exponent }) => exponent <= 1).length / PER_FORM;
    expect(negative).toBeGreaterThan(NEGATIVE_SHARE - 0.05);
    expect(negative).toBeLessThan(NEGATIVE_SHARE + 0.05);
    expect(small).toBeGreaterThan(1 - POSITIVE_SHARE - NEGATIVE_SHARE - 0.04);
    expect(small).toBeLessThan(1 - POSITIVE_SHARE - NEGATIVE_SHARE + 0.04);
  });

  it('expects the value of the power', () => {
    for (const { question } of parsed) {
      expect(expectedValue(question)).toEqual(
        evaluate(parse(promptOf(question).slice(0, -' = ?'.length))!),
      );
    }
  });

  it('explains a power as repeated multiplication', () => {
    expect(explainPower(fromInteger(2), 5)).toBe('2⁵ = 2 × 2 × 2 × 2 × 2 = 32');
    expect(explainPower(fromInteger(-3), 3)).toBe('(−3)³ = (−3) × (−3) × (−3) = −27');
    expect(explainPower(fromInteger(7), 0)).toBe(
      '7⁰ = 1: elk getal (behalve 0) tot de macht 0 is 1',
    );
    expect(explainPower(fromInteger(7), 1)).toBe('7¹ = 7');
  });

  it('names base × exponent, exponent 0 and a wrong sign', () => {
    expect(stepOf(wholePowerQuestion(2, 5)).check('10').tip).toBe(
      'Een macht is herhaald vermenigvuldigen: 2⁵ = 2 × 2 × 2 × 2 × 2, niet 2 × 5.',
    );
    expect(stepOf(wholePowerQuestion(7, 0)).check('0').tip).toBe(
      'Elk getal (behalve 0) tot de macht 0 is 1.',
    );
    expect(stepOf(wholePowerQuestion(-3, 3)).check('27').tip).toBe(
      '(−3)³ = (−3) × (−3) × (−3): een oneven aantal mintekens geeft min.',
    );
    expect(stepOf(wholePowerQuestion(-2, 4)).check('-16').tip).toBe(
      '(−2)⁴ = (−2) × (−2) × (−2) × (−2): een even aantal mintekens geeft plus.',
    );
    // (−2)² = 4: −4 is both a wrong sign and base × exponent; the sign tip comes first.
    expect(stepOf(wholePowerQuestion(-2, 2)).check('-4').tip).toBe(
      '(−2)² = (−2) × (−2): een even aantal mintekens geeft plus.',
    );
  });
});

describe('decimal powers', () => {
  const questions = questionsOf('decimalPower');
  const allowed = DECIMAL_POWERS.flat();

  it('draws a base and exponent from the three groups, about equally often', () => {
    const perGroup = [0, 0, 0];
    for (const question of questions) {
      const match = /^(\d+,\d+)([²³]) = \?$/u.exec(promptOf(question));
      expect(match, promptOf(question)).not.toBeNull();
      const base = parseDutchNumber(match![1]!)!;
      const exponent = fromSuperscript(match![2]!);
      const group = DECIMAL_POWERS.findIndex((list) =>
        list.some(([b, e]) => e === exponent && b.num === base.num && b.den === base.den),
      );
      expect(group, promptOf(question)).toBeGreaterThanOrEqual(0);
      perGroup[group] = (perGroup[group] ?? 0) + 1;
      expect(expectedValue(question)).toEqual(
        evaluate(parse(promptOf(question).slice(0, -' = ?'.length))!),
      );
    }
    for (const count of perGroup) {
      expect(count).toBeGreaterThan(250);
      expect(count).toBeLessThan(420);
    }
    expect(allowed).toHaveLength(18 + 9 + 5);
  });

  it('explains and names too few decimals', () => {
    const step = stepOf(decimalPowerQuestion(rational(3n, 10n), 2));
    expect(step.check('0,09')).toMatchObject({
      correct: true,
      explanation: '0,3² = 0,3 × 0,3 = 0,09',
    });
    expect(step.check('0,9').tip).toBe(
      '0,3 × 0,3 = 0,09: de uitkomst heeft evenveel decimalen als beide getallen samen.',
    );
    expect(step.check('0,0009').tip).toBe(
      'Je antwoord is 100 keer te klein. Let op de komma en het aantal nullen.',
    );
    expect(stepOf(decimalPowerQuestion(rational(2n, 10n), 3)).check('0,08').tip).toBe(
      '0,2 × 0,2 × 0,2 = 0,008: de uitkomst heeft evenveel decimalen als alle getallen samen.',
    );
  });
});

describe('negative exponents', () => {
  const questions = questionsOf('negativeExponent');

  it('asks 10⁻ⁿ or the exponent of a decimal, for n from 1 to 6', () => {
    let exponentQuestions = 0;
    for (const question of questions) {
      const value = /^10⁻([¹²³⁴⁵⁶]) = \?$/u.exec(promptOf(question));
      const exponent = /^(0,0*1) = 10ⁿ\. n = \?$/u.exec(promptOf(question));
      expect(value ?? exponent, promptOf(question)).not.toBeNull();
      if (value) {
        expect(expectedValue(question)).toEqual(powerOfTen(-fromSuperscript(value[1]!)));
      } else {
        exponentQuestions++;
        const n = exponent![1]!.length - 2;
        expect(n).toBeGreaterThanOrEqual(1);
        expect(n).toBeLessThanOrEqual(6);
        expect(expectedValue(question)).toEqual(fromInteger(-n));
      }
    }
    expect(exponentQuestions).toBeGreaterThan(400);
    expect(exponentQuestions).toBeLessThan(600);
  });

  it('explains 10⁻ⁿ as 1 : 10ⁿ and names a negative answer', () => {
    const step = stepOf(negativeExponentQuestion(3, false));
    expect(step.prompt).toBe('10⁻³ = ?');
    expect(step.check('0,001')).toMatchObject({
      correct: true,
      explanation: '10⁻³ = 1 : 10³ = 1 : 1000 = 0,001',
    });
    expect(step.check('-1000').tip).toBe(
      'Een negatieve exponent maakt geen negatief getal: 10⁻³ = 1 : 1000.',
    );
  });

  it('asks the exponent, with tips for the sign and for counting zeros', () => {
    const step = stepOf(negativeExponentQuestion(3, true));
    expect(step.prompt).toBe('0,001 = 10ⁿ. n = ?');
    expect(step.check('-3')).toMatchObject({
      correct: true,
      explanation: '0,001 = 1 : 1000 = 1 : 10³ = 10⁻³',
    });
    expect(step.check('3').tip).toBe('Een getal kleiner dan 1 heeft een negatieve exponent.');
    expect(step.check('-2').tip).toBe(
      'Tel de plaatsen waarover de komma schuift: 0,001 = 1 : 1000 = 10⁻³.',
    );
    // The answer is an exponent: no factor-of-ten tip.
    expect(step.check('-30').tip).toBeUndefined();
  });
});

describe('roots', () => {
  const questions = questionsOf('root');

  it('takes cube roots up to 10 and square roots of scaled squares', () => {
    let cubes = 0;
    for (const question of questions) {
      const cube = /^∛(\d+) = \?$/u.exec(promptOf(question));
      const square = /^√([\d,\u{202f}]+) = \?$/u.exec(promptOf(question));
      expect(cube ?? square, promptOf(question)).not.toBeNull();
      const root = expectedValue(question);
      if (cube) {
        cubes++;
        expect(root.den).toBe(1n);
        expect(root.num).toBeGreaterThanOrEqual(2n);
        expect(root.num).toBeLessThanOrEqual(10n);
        expect(root.num ** 3n).toBe(BigInt(cube[1]!));
      } else {
        expect(multiply(root, root)).toEqual(parseDutchNumber(plain(square![1]!)));
        // root = k : 10 (at most 1,5) or k × 10 (at least 20), with k ∈ [2, 15] \ {10}.
        const small = compare(root, fromInteger(2)) < 0;
        const k = small ? multiply(root, fromInteger(10)) : divide(root, fromInteger(10));
        expect(k.den, promptOf(question)).toBe(1n);
        expect(k.num).toBeGreaterThanOrEqual(2n);
        expect(k.num).toBeLessThanOrEqual(15n);
        expect(k.num).not.toBe(10n);
      }
    }
    expect(cubes).toBeGreaterThan(400);
    expect(cubes).toBeLessThan(600);
  });

  it('explains a cube root and names dividing by 3', () => {
    const step = stepOf(cubeRootQuestion(3));
    expect(step.prompt).toBe('∛27 = ?');
    expect(step.check('3')).toMatchObject({
      correct: true,
      explanation: '∛27 = 3, want 3 × 3 × 3 = 27',
    });
    expect(step.check('9').tip).toBe(
      '∛27 is het getal dat 3 keer met zichzelf vermenigvuldigd 27 geeft, niet 27 : 3.',
    );
  });

  it('explains a square root of a scaled square', () => {
    const step = stepOf(squareRootQuestion(rational(7n, 10n)));
    expect(step.prompt).toBe('√0,49 = ?');
    expect(step.check('0,7')).toMatchObject({
      correct: true,
      explanation: '√0,49 = 0,7, want 0,7 × 0,7 = 0,49',
    });
    expect(stepOf(squareRootQuestion(fromInteger(80))).prompt).toBe('√6400 = ?');
    expect(stepOf(squareRootQuestion(fromInteger(120))).prompt).toBe('√14\u{202f}400 = ?');
  });
});
