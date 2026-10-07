import { describe, expect, it } from 'vitest';
import { gcd } from '../primes';
import { createRng } from '../random';
import { divide, fromInteger, multiply, rational, type Rational } from '../rational';
import { parseFractionAnswer } from '../steps';
import type { Question, Step } from '../types';
import {
  ARITHMETIC_FORMS,
  type ArithmeticForm,
  buildFractionArithmetic,
  EQUIVALENT_VARIANTS,
  equivalentQuestion,
  generateFractionArithmetic,
  IMPROPER_FRACTIONS,
  PROPER_FRACTIONS,
  partQuestion,
  simplifyQuestion,
  wholeQuestion,
} from './fractionArithmetic';

const PER_FORM = 1000;
const SIMPLIFY = /^Vereenvoudig (\d+)\/(\d+)$/u;
const EQUIVALENT = /^(\d+)\/(\d+) = (\?|\d+)\/(\?|\d+)$/u;
const PART = /^(\d+)\/(\d+) van (\d+) = \?$/u;
const WHOLE = /^(\d+)\/(\d+) is (\d+)\. Hoeveel is het geheel\?$/u;

function questionsOf(form: ArithmeticForm): Question[] {
  const rng = createRng(900 + ARITHMETIC_FORMS.indexOf(form));
  return Array.from({ length: PER_FORM }, () => buildFractionArithmetic(rng, form));
}

function stepOf(question: Question): Step {
  return question.steps[0]!;
}

function fraction(num: string, den: string): Rational {
  return rational(BigInt(num), BigInt(den));
}

/** The expected answer as a value, read the way the keypad input is. */
function answerOf(step: Step): Rational {
  const parsed = parseFractionAnswer(step.check('').expected);
  if (parsed === null) throw new Error(`Unparsable expected answer in ${step.prompt}`);
  return parsed.value;
}

describe('fraction pools', () => {
  it('has the 45 proper and the 45 improper fractions with denominators 2 to 12', () => {
    expect(PROPER_FRACTIONS).toHaveLength(45);
    expect(IMPROPER_FRACTIONS).toHaveLength(45);
    for (const value of PROPER_FRACTIONS) {
      expect(value.num < value.den && value.den >= 2n && value.den <= 12n).toBe(true);
    }
    for (const value of IMPROPER_FRACTIONS) {
      expect(value.num > value.den && value.num < 2n * value.den && value.den <= 12n).toBe(true);
    }
  });
});

describe('generateFractionArithmetic', () => {
  it('produces every form, each accepting its expected answer', () => {
    const rng = createRng(1);
    const forms = new Set<string>();
    for (let i = 0; i < 2000; i++) {
      const question = generateFractionArithmetic(rng);
      expect(question.topic).toBe('fractionArithmetic');
      const step = stepOf(question);
      expect(step.check(step.check('').expected).correct, step.prompt).toBe(true);
      forms.add(question.key.split(':')[1]!);
    }
    expect([...forms].sort()).toEqual([...ARITHMETIC_FORMS].sort());
  });
});

describe('simplify', () => {
  const questions = questionsOf('simplify');

  it('shows an unsimplified fraction with terms up to 100 and expects its simplest form', () => {
    let improper = 0;
    for (const question of questions) {
      const step = stepOf(question);
      expect(step.kind).toBe('fraction');
      const match = SIMPLIFY.exec(step.prompt);
      expect(match, step.prompt).not.toBeNull();
      const [, num = '', den = ''] = match!;
      expect(Number(num)).toBeLessThanOrEqual(100);
      expect(Number(den)).toBeLessThanOrEqual(100);
      expect(gcd(Number(num), Number(den))).toBeGreaterThan(1);
      expect(answerOf(step)).toEqual(fraction(num, den));
      expect(parseFractionAnswer(step.check('').expected)!.simplest).toBe(true);
      if (Number(num) > Number(den)) improper++;
    }
    expect(improper).toBeGreaterThan(120);
    expect(improper).toBeLessThan(280);
  });

  it('explains the common factor and names an unfinished simplification', () => {
    const step = stepOf(simplifyQuestion(rational(3n, 4n), 6));
    expect(step.prompt).toBe('Vereenvoudig 18/24');
    expect(step.check('3/4')).toMatchObject({
      correct: true,
      expected: '3/4',
      explanation: '18/24 = 3/4 (teller en noemer : 6)',
    });
    expect(step.check('9/12').tip).toBe('De waarde klopt, maar vereenvoudig nog: 9/12 = 3/4.');
    expect(step.check('0,75').tip).toBe('Schrijf het antwoord als breuk, niet als kommagetal.');
  });

  it('accepts an improper answer and its mixed number', () => {
    const step = stepOf(simplifyQuestion(rational(5n, 4n), 3));
    expect(step.prompt).toBe('Vereenvoudig 15/12');
    expect(step.check('5/4').correct).toBe(true);
    expect(step.check('1 1/4')).toMatchObject({
      correct: true,
      expected: '1 1/4',
      explanation: '15/12 = 5/4 = 1 1/4 (teller en noemer : 3)',
    });
  });
});

describe('equivalent', () => {
  const questions = questionsOf('equivalent');

  it('has exactly one unknown term that makes both fractions equal', () => {
    const variants = new Set<string>();
    for (const question of questions) {
      const step = stepOf(question);
      expect(step.kind).toBe('number');
      const match = EQUIVALENT.exec(step.prompt);
      expect(match, step.prompt).not.toBeNull();
      const [, a = '', b = '', c = '', d = ''] = match!;
      expect([c, d].filter((term) => term === '?')).toHaveLength(1);
      const answer = step.check('').expected;
      const filled = fraction(c === '?' ? answer : c, d === '?' ? answer : d);
      expect(filled).toEqual(fraction(a, b));
      for (const term of [a, b, c, d, answer]) {
        if (term !== '?') expect(Number(term)).toBeLessThanOrEqual(100);
      }
      variants.add(question.key.split(':')[2]!);
    }
    expect([...variants].sort()).toEqual([...EQUIVALENT_VARIANTS].sort());
  });

  it('explains the factor and names the additive mistake', () => {
    const up = stepOf(equivalentQuestion(rational(3n, 4n), 3, 'upNumerator'));
    expect(up.prompt).toBe('3/4 = ?/12');
    expect(up.check('9')).toMatchObject({
      correct: true,
      explanation: '3/4 = 9/12 (teller en noemer × 3)',
    });
    const tip =
      'Vermenigvuldig of deel teller en noemer met hetzelfde getal; het verschil blijft niet gelijk.';
    expect(up.check('11').tip).toBe(tip);
    const down = stepOf(equivalentQuestion(rational(3n, 4n), 3, 'downDenominator'));
    expect(down.prompt).toBe('9/12 = 3/?');
    expect(down.check('4')).toMatchObject({
      correct: true,
      explanation: '9/12 = 3/4 (teller en noemer : 3)',
    });
    expect(down.check('6').tip).toBe(tip);
    expect(stepOf(equivalentQuestion(rational(3n, 4n), 3, 'upDenominator')).prompt).toBe(
      '3/4 = 9/?',
    );
    expect(stepOf(equivalentQuestion(rational(3n, 4n), 3, 'downNumerator')).prompt).toBe(
      '9/12 = ?/4',
    );
  });
});

describe('part of a number', () => {
  const questions = questionsOf('part');

  it('takes a proper fraction of a multiple of its denominator', () => {
    for (const question of questions) {
      const step = stepOf(question);
      expect(step.kind).toBe('number');
      const match = PART.exec(step.prompt);
      expect(match, step.prompt).not.toBeNull();
      const [, num = '', den = '', whole = ''] = match!;
      expect(Number(whole) % Number(den)).toBe(0);
      expect(Number(whole)).toBeLessThanOrEqual(144);
      expect(answerOf(step)).toEqual(multiply(fraction(num, den), fromInteger(Number(whole))));
    }
  });

  it('explains via one part and names one part and dividing', () => {
    const step = stepOf(partQuestion(rational(3n, 4n), 6));
    expect(step.prompt).toBe('3/4 van 24 = ?');
    expect(step.check('18')).toMatchObject({
      correct: true,
      explanation: '1/4 van 24 = 24 : 4 = 6 → 3/4 = 3 × 6 = 18',
    });
    expect(step.check('6').tip).toBe('Dat is 1/4 van 24; 3/4 is 3 keer zoveel.');
    expect(step.check('32').tip).toBe('Je hebt gedeeld; 3/4 van 24 is 24 : 4 × 3.');
    const unit = stepOf(partQuestion(rational(1n, 5n), 7));
    expect(unit.check('7').explanation).toBe('1/5 van 35 = 35 : 5 = 7');
    expect(unit.check('175').tip).toBe('Je hebt gedeeld; 1/5 van 35 is 35 : 5.');
  });
});

describe('back to the whole', () => {
  const questions = questionsOf('whole');

  it('gives a part and expects the whole', () => {
    for (const question of questions) {
      const step = stepOf(question);
      const match = WHOLE.exec(step.prompt);
      expect(match, step.prompt).not.toBeNull();
      const [, num = '', den = '', part = ''] = match!;
      expect(answerOf(step)).toEqual(divide(fromInteger(Number(part)), fraction(num, den)));
      expect(Number(step.check('').expected) % Number(den)).toBe(0);
    }
  });

  it('explains via one part and names the fraction of the part and one part', () => {
    const step = stepOf(wholeQuestion(rational(3n, 4n), 6));
    expect(step.prompt).toBe('3/4 is 18. Hoeveel is het geheel?');
    expect(step.check('24')).toMatchObject({
      correct: true,
      explanation: '3/4 = 18 → 1/4 = 18 : 3 = 6 → 4/4 = 4 × 6 = 24',
    });
    expect(step.check('13,5').tip).toBe(
      'Je hebt 3/4 van 18 berekend, maar 18 is zelf al 3/4. Reken terug naar het geheel.',
    );
    expect(step.check('6').tip).toBe('Dat is 1/4; het geheel is 4/4.');
    const unit = stepOf(wholeQuestion(rational(1n, 4n), 6));
    expect(unit.prompt).toBe('1/4 is 6. Hoeveel is het geheel?');
    expect(unit.check('24').explanation).toBe('1/4 = 6 → 4/4 = 4 × 6 = 24');
  });
});
