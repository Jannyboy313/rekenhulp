import { describe, expect, it } from 'vitest';
import { gcd, lcm } from '../primes';
import { createRng } from '../random';
import { add, divide, fromInteger, multiply, rational, subtract, type Rational } from '../rational';
import { parseFractionAnswer } from '../steps';
import type { Question, Step } from '../types';
import {
  addSubtractQuestion,
  ARITHMETIC_FORMS,
  type ArithmeticForm,
  buildFractionArithmetic,
  EQUIVALENT_VARIANTS,
  equivalentQuestion,
  generateFractionArithmetic,
  IMPROPER_FRACTIONS,
  multiplyDivideQuestion,
  PROPER_FRACTIONS,
  partQuestion,
  simplifyQuestion,
  type Term,
  wholeQuestion,
} from './fractionArithmetic';

const PER_FORM = 1000;
const SIMPLIFY = /^Vereenvoudig (\d+)\/(\d+)$/u;
const EQUIVALENT = /^(\d+)\/(\d+) = (\?|\d+)\/(\?|\d+)$/u;
const PART = /^(\d+)\/(\d+) van (\d+) = \?$/u;
const WHOLE = /^(\d+)\/(\d+) is (\d+)\. Hoeveel is het geheel\?$/u;
const ADD_SUBTRACT = /^(?:(\d) )?(\d+)\/(\d+) ([+−]) (?:(\d) )?(\d+)\/(\d+) = \?$/u;
const MULTIPLY_DIVIDE = /^(\d+)(?:\/(\d+))? ([×:]) (\d+)(?:\/(\d+))? = \?$/u;

const term = (whole: number, num: bigint, den: bigint): Term => ({
  whole,
  fraction: rational(num, den),
});

function isProper(value: Rational): boolean {
  return value.num > 0n && value.num < value.den && value.den <= 12n;
}

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

describe('group shares', () => {
  it('picks the four groups about equally often', () => {
    const rng = createRng(2);
    const counts = new Map<string, number>();
    for (let i = 0; i < 4000; i++) {
      const form = generateFractionArithmetic(rng).key.split(':')[1]!;
      counts.set(form, (counts.get(form) ?? 0) + 1);
    }
    for (const group of ['addSubtract', 'multiplyDivide']) {
      expect(counts.get(group)).toBeGreaterThan(800);
      expect(counts.get(group)).toBeLessThan(1200);
    }
    for (const form of ['simplify', 'equivalent', 'part', 'whole']) {
      expect(counts.get(form)).toBeGreaterThan(350);
      expect(counts.get(form)).toBeLessThan(650);
    }
  });
});

describe('add / subtract', () => {
  const questions = questionsOf('addSubtract');

  it('adds or subtracts two proper fractions with different denominators, LCM up to 36', () => {
    let mixed = 0;
    for (const question of questions) {
      const step = stepOf(question);
      expect(step.kind).toBe('fraction');
      const match = ADD_SUBTRACT.exec(step.prompt);
      expect(match, step.prompt).not.toBeNull();
      const [, wholeA, numA = '', denA = '', operator, wholeB, numB = '', denB = ''] = match!;
      const a = fraction(numA, denA);
      const b = fraction(numB, denB);
      expect(isProper(a) && isProper(b)).toBe(true);
      expect(a.den).toBe(BigInt(denA));
      expect(b.den).toBe(BigInt(denB));
      expect(denA).not.toBe(denB);
      expect(lcm(Number(denA), Number(denB))).toBeLessThanOrEqual(36);
      expect(wholeA === undefined).toBe(wholeB === undefined);
      const left = add(fromInteger(Number(wholeA ?? 0)), a);
      const right = add(fromInteger(Number(wholeB ?? 0)), b);
      if (wholeA !== undefined) {
        mixed++;
        for (const whole of [wholeA, wholeB!]) {
          expect(Number(whole)).toBeGreaterThanOrEqual(1);
          expect(Number(whole)).toBeLessThanOrEqual(5);
        }
        if (operator === '−') expect(Number(wholeA)).toBeGreaterThan(Number(wholeB));
      }
      const answer = operator === '−' ? subtract(left, right) : add(left, right);
      expect(answer.num > 0n, step.prompt).toBe(true);
      expect(answerOf(step)).toEqual(answer);
      expect(parseFractionAnswer(step.check('').expected)!.simplest).toBe(true);
    }
    expect(mixed).toBeGreaterThan(200);
    expect(mixed).toBeLessThan(400);
  });

  it('makes the denominators equal, then simplifies and takes out the wholes', () => {
    const step = stepOf(addSubtractQuestion(term(0, 2n, 3n), term(0, 1n, 4n), false));
    expect(step.prompt).toBe('2/3 + 1/4 = ?');
    expect(step.check('11/12')).toMatchObject({
      correct: true,
      expected: '11/12',
      explanation: '2/3 + 1/4 = 8/12 + 3/12 = 11/12',
    });
    expect(step.check('3/7').tip).toBe(
      'Maak eerst de noemers gelijk; tel daarna alleen de tellers op.',
    );
    expect(step.check('22/24').tip).toBe('De waarde klopt, maar vereenvoudig nog: 22/24 = 11/12.');
    const improper = stepOf(addSubtractQuestion(term(0, 2n, 3n), term(0, 3n, 4n), false));
    expect(improper.check('17/12')).toMatchObject({
      correct: true,
      expected: '1 5/12',
      explanation: '2/3 + 3/4 = 8/12 + 9/12 = 17/12 = 1 5/12',
    });
    expect(improper.check('1 5/12').correct).toBe(true);
    const half = stepOf(addSubtractQuestion(term(0, 1n, 6n), term(0, 1n, 3n), false));
    expect(half.check('1/2').explanation).toBe('1/6 + 1/3 = 1/6 + 2/6 = 3/6 = 1/2');
    expect(half.check('0,5').correct).toBe(true);
  });

  it('subtracts and names subtracting numerators and denominators', () => {
    const step = stepOf(addSubtractQuestion(term(0, 3n, 4n), term(0, 1n, 6n), true));
    expect(step.prompt).toBe('3/4 − 1/6 = ?');
    expect(step.check('7/12').explanation).toBe('3/4 − 1/6 = 9/12 − 2/12 = 7/12');
    const other = stepOf(addSubtractQuestion(term(0, 5n, 6n), term(0, 1n, 4n), true));
    expect(other.check('2').tip).toBe(
      'Maak eerst de noemers gelijk; trek daarna alleen de tellers af.',
    );
  });

  it('keeps the wholes of mixed numbers', () => {
    const sum = stepOf(addSubtractQuestion(term(2, 2n, 3n), term(1, 3n, 4n), false));
    expect(sum.prompt).toBe('2 2/3 + 1 3/4 = ?');
    expect(sum.check('4 5/12')).toMatchObject({
      correct: true,
      explanation: '2 2/3 + 1 3/4 = 2 8/12 + 1 9/12 = 3 17/12 = 4 5/12',
    });
    expect(sum.check('53/12').correct).toBe(true);
    const plain = stepOf(addSubtractQuestion(term(3, 3n, 4n), term(1, 1n, 2n), true));
    expect(plain.check('2 1/4').explanation).toBe('3 3/4 − 1 1/2 = 3 3/4 − 1 2/4 = 2 1/4');
  });

  it('exchanges a whole when needed and names subtracting the wrong way round', () => {
    const step = stepOf(addSubtractQuestion(term(3, 1n, 2n), term(1, 3n, 4n), true));
    expect(step.prompt).toBe('3 1/2 − 1 3/4 = ?');
    expect(step.check('1 3/4')).toMatchObject({
      correct: true,
      explanation: '3 1/2 − 1 3/4 = 3 2/4 − 1 3/4 = 2 6/4 − 1 3/4 = 1 3/4',
    });
    expect(step.check('2 1/4').tip).toBe(
      'Je kunt 3/4 niet van 1/2 aftrekken: wissel eerst 1 geheel om, 3 1/2 = 2 6/4.',
    );
    const belowOne = stepOf(addSubtractQuestion(term(2, 1n, 2n), term(1, 3n, 4n), true));
    expect(belowOne.check('3/4').explanation).toBe(
      '2 1/2 − 1 3/4 = 2 2/4 − 1 3/4 = 1 6/4 − 1 3/4 = 3/4',
    );
  });
});

describe('multiply / divide', () => {
  const questions = questionsOf('multiplyDivide');

  it('combines proper fractions and at most one whole number from 2 to 12', () => {
    const seen = new Set<string>();
    for (const question of questions) {
      const step = stepOf(question);
      expect(step.kind).toBe('fraction');
      const match = MULTIPLY_DIVIDE.exec(step.prompt);
      expect(match, step.prompt).not.toBeNull();
      const [, numX = '', denX, operator, numY = '', denY] = match!;
      expect(denX === undefined && denY === undefined).toBe(false);
      const x = fraction(numX, denX ?? '1');
      const y = fraction(numY, denY ?? '1');
      for (const [value, den] of [
        [x, denX],
        [y, denY],
      ] as const) {
        if (den === undefined) {
          expect(Number(value.num)).toBeGreaterThanOrEqual(2);
          expect(Number(value.num)).toBeLessThanOrEqual(12);
        } else {
          expect(isProper(value)).toBe(true);
          expect(value.den).toBe(BigInt(den));
        }
      }
      if (operator === ':') expect(x).not.toEqual(y);
      const answer = operator === ':' ? divide(x, y) : multiply(x, y);
      expect(answerOf(step)).toEqual(answer);
      expect(parseFractionAnswer(step.check('').expected)!.simplest).toBe(true);
      const shape = `${denX === undefined ? 'n' : 'f'}${operator}${denY === undefined ? 'n' : 'f'}`;
      seen.add(shape);
    }
    expect([...seen].sort()).toEqual(['f:f', 'f:n', 'f×f', 'f×n', 'n:f', 'n×f'].sort());
  });

  it('multiplies numerators and denominators, then simplifies', () => {
    const step = stepOf(multiplyDivideQuestion(rational(3n, 4n), rational(2n, 5n), false));
    expect(step.prompt).toBe('3/4 × 2/5 = ?');
    expect(step.check('3/10')).toMatchObject({
      correct: true,
      explanation: '3/4 × 2/5 = 6/20 = 3/10',
    });
    expect(step.check('0,3').correct).toBe(true);
    expect(step.check('6/20').tip).toBe('De waarde klopt, maar vereenvoudig nog: 6/20 = 3/10.');
  });

  it('multiplies only the numerator by a whole number', () => {
    const step = stepOf(multiplyDivideQuestion(fromInteger(6), rational(2n, 3n), false));
    expect(step.prompt).toBe('6 × 2/3 = ?');
    expect(step.check('4')).toMatchObject({
      correct: true,
      expected: '4',
      explanation: '6 × 2/3 = 12/3 = 4',
    });
    expect(step.check('2/3').tip).toBe('Alleen de teller gaat keer 6: 6 × 2/3 = 12/3.');
    const swapped = stepOf(multiplyDivideQuestion(rational(2n, 3n), fromInteger(6), false));
    expect(swapped.check('2/3').tip).toBe('Alleen de teller gaat keer 6: 2/3 × 6 = 12/3.');
  });

  it('divides by multiplying with the inverse, and names both mistakes', () => {
    const step = stepOf(multiplyDivideQuestion(rational(2n, 3n), rational(4n, 9n), true));
    expect(step.prompt).toBe('2/3 : 4/9 = ?');
    expect(step.check('1 1/2')).toMatchObject({
      correct: true,
      explanation: '2/3 : 4/9 = 2/3 × 9/4 = 18/12 = 3/2 = 1 1/2',
    });
    expect(step.check('8/27').tip).toBe('Delen door 4/9 is keer het omgekeerde: × 9/4.');
    expect(step.check('2/3').tip).toBe('Draai de breuk om waardoor je deelt, niet de eerste.');
  });

  it('divides by and into whole numbers', () => {
    const byWhole = stepOf(multiplyDivideQuestion(rational(3n, 4n), fromInteger(3), true));
    expect(byWhole.check('1/4').explanation).toBe('3/4 : 3 = 3/4 × 1/3 = 3/12 = 1/4');
    expect(byWhole.check('9/4').tip).toBe('Delen door 3 is keer 1/3.');
    const intoWhole = stepOf(multiplyDivideQuestion(fromInteger(6), rational(2n, 3n), true));
    expect(intoWhole.check('9').explanation).toBe('6 : 2/3 = 6 × 3/2 = 18/2 = 9');
    expect(intoWhole.check('4').tip).toBe('Delen door 2/3 is keer het omgekeerde: × 3/2.');
    const byHalf = stepOf(multiplyDivideQuestion(fromInteger(6), rational(1n, 2n), true));
    expect(byHalf.check('12').explanation).toBe('6 : 1/2 = 6 × 2 = 12');
  });
});
