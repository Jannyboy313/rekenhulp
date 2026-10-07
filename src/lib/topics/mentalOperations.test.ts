import { describe, expect, it } from 'vitest';
import { evaluate } from '../expr/evaluate';
import { parse } from '../expr/parser';
import { GROUP_SEPARATOR } from '../format';
import { createRng, randomInt } from '../random';
import { parseDutchNumber } from '../rational';
import type { Question, Step } from '../types';
import {
  buildMentalOperation,
  DIVIDE_FACTORS,
  explainAddSubtract,
  explainDivide,
  explainMultiply,
  generateMentalOperations,
  hasCarry,
  isSmartProduct,
  MAX_PRODUCT,
  MAX_QUOTIENT,
  MAX_TERM,
  MAX_TOTAL,
  MENTAL_FORMS,
  type MentalForm,
  MIN_QUOTIENT,
  MIN_TERM,
  REMAINDER_CONTEXTS,
  remainderQuestion,
} from './mentalOperations';

const PER_FORM = 1000;

function questionsOf(form: MentalForm): Question[] {
  const rng = createRng(200 + MENTAL_FORMS.indexOf(form));
  return Array.from({ length: PER_FORM }, () => buildMentalOperation(rng, form));
}

function stepOf(question: Question): Step {
  return question.steps[0]!;
}

/** Text as typed on the keypad: no digit grouping. */
function plain(text: string): string {
  return text.replaceAll(GROUP_SEPARATOR, '');
}

/** The sum of a prompt `a + b = ?`, without ' = ?' and without grouping. */
function sumOf(question: Question): string {
  return plain(stepOf(question).prompt.slice(0, -' = ?'.length));
}

function expectedOf(question: Question): string {
  return stepOf(question).check('').expected;
}

/** Trailing zeros of a positive integer. */
function zeros(value: number): number {
  return /0*$/.exec(String(value))![0].length;
}

/** A positive integer without its trailing zeros. */
function significant(value: number): number {
  return value / 10 ** zeros(value);
}

/** Independent column check: some column of a + b adds up to 10 or more. */
function needsCarry(a: number, b: number): boolean {
  for (let x = a, y = b; x > 0 || y > 0; x = Math.floor(x / 10), y = Math.floor(y / 10)) {
    if ((x % 10) + (y % 10) >= 10) return true;
  }
  return false;
}

/** Independent column check: some column of a − b has a smaller top digit. */
function needsBorrow(a: number, b: number): boolean {
  for (let x = a, y = b; y > 0; x = Math.floor(x / 10), y = Math.floor(y / 10)) {
    if (x % 10 < y % 10) return true;
  }
  return false;
}

function contextOf(id: string, ask: string) {
  return REMAINDER_CONTEXTS.find((context) => context.id === id && context.ask === ask)!;
}

describe('generateMentalOperations', () => {
  it('produces all four forms, each accepting its expected answer', () => {
    const rng = createRng(1);
    const seen = new Set<string>();
    for (let i = 0; i < 2000; i++) {
      const question = generateMentalOperations(rng);
      expect(question.topic).toBe('mentalOperations');
      const step = stepOf(question);
      expect(step.check(plain(expectedOf(question))).correct, step.prompt).toBe(true);
      const remainder = question.key.startsWith('mentalOperations:remainder:');
      seen.add(remainder ? 'remainder' : sumOf(question).replace(/[\d ]/g, ''));
    }
    expect([...seen].sort()).toEqual(['+', ':', 'remainder', '×', '−'].sort());
  });
});

describe('add / subtract', () => {
  const questions = questionsOf('addSubtract');

  it('uses a number with two significant digits and one or two zeros', () => {
    for (const question of questions) {
      const match = /^(\d+) ([+−]) (\d+)$/.exec(sumOf(question));
      expect(match, sumOf(question)).not.toBeNull();
      const [, a = '', sign, b = ''] = match!;
      expect(Number(a)).toBeGreaterThanOrEqual(MIN_TERM);
      expect(Number(a)).toBeLessThanOrEqual(MAX_TERM);
      expect(b).toMatch(/^[1-9][1-9]0{1,2}$/);
      if (sign === '+') {
        expect(needsCarry(Number(a), Number(b)), sumOf(question)).toBe(true);
      } else {
        expect(Number(a)).toBeGreaterThan(Number(b));
        expect(needsBorrow(Number(a), Number(b)), sumOf(question)).toBe(true);
      }
    }
  });

  it('mixes sums and differences', () => {
    const sums = questions.filter((question) => sumOf(question).includes('+')).length;
    expect(sums).toBeGreaterThan(400);
    expect(sums).toBeLessThan(600);
  });

  it('expects the value of the sum', () => {
    for (const question of questions) {
      expect(parseDutchNumber(plain(expectedOf(question)))).toEqual(
        evaluate(parse(sumOf(question))!),
      );
    }
  });

  it('explains in two steps, the largest part first', () => {
    expect(explainAddSubtract(6347, 2800, true)).toBe('6347 + 2000 = 8347 → 8347 + 800 = 9147');
    expect(explainAddSubtract(15_213, 470, false)).toBe(
      '15\u{202f}213 − 400 = 14\u{202f}813 → 14\u{202f}813 − 70 = 14\u{202f}743',
    );
  });

  it('detects a carry like the column method', () => {
    expect(hasCarry(6347, 2800)).toBe(true);
    expect(hasCarry(6347, 1200)).toBe(false);
    expect(hasCarry(95, 5)).toBe(true);
    const rng = createRng(5);
    for (let i = 0; i < 1000; i++) {
      const a = randomInt(rng, 0, 99_999);
      const b = randomInt(rng, 0, 99_999);
      expect(hasCarry(a, b), `${a} + ${b}`).toBe(needsCarry(a, b));
    }
  });
});

describe('multiply by zeros', () => {
  const questions = questionsOf('multiply');

  it('multiplies a table fact with 1 to 4 zeros, up to a million', () => {
    for (const question of questions) {
      const [x = 0, y = 0] = sumOf(question).split(' × ').map(Number);
      const [small = 0, large = 0] = [significant(x), significant(y)].sort((u, v) => u - v);
      expect(small, sumOf(question)).toBeGreaterThanOrEqual(2);
      expect(small, sumOf(question)).toBeLessThanOrEqual(9);
      expect(large, sumOf(question)).toBeLessThanOrEqual(99);
      expect(zeros(x) + zeros(y)).toBeGreaterThanOrEqual(1);
      expect(zeros(x) + zeros(y)).toBeLessThanOrEqual(4);
      expect(x * y).toBeLessThanOrEqual(MAX_PRODUCT);
      expect(isSmartProduct(x, y), sumOf(question)).toBe(false);
    }
  });

  it('keys a product by its factors in ascending order', () => {
    for (const question of questions) {
      const factors = sumOf(question)
        .split(' × ')
        .map(Number)
        .sort((u, v) => u - v);
      expect(plain(question.key)).toBe(`mentalOperations:${factors.join(' × ')}`);
    }
  });

  it('shows the factors in both orders', () => {
    const largeFirst = questions.filter((question) => {
      const [x = 0, y = 0] = sumOf(question).split(' × ').map(Number);
      return x > y;
    }).length;
    expect(largeFirst).toBeGreaterThan(350);
    expect(largeFirst).toBeLessThan(650);
  });

  it('leaves out the products of smart calculation', () => {
    expect(isSmartProduct(48, 50)).toBe(true);
    expect(isSmartProduct(50, 48)).toBe(true);
    expect(isSmartProduct(125, 8)).toBe(true);
    expect(isSmartProduct(25, 300)).toBe(false);
    expect(isSmartProduct(28, 500)).toBe(false);
  });

  it('explains the table fact, then the zeros', () => {
    expect(explainMultiply(28, 500)).toBe('28 × 5 = 140 → 28 × 500 = 140 × 100 = 14\u{202f}000');
    expect(explainMultiply(60, 700)).toBe('6 × 7 = 42 → 60 × 700 = 42 × 1000 = 42\u{202f}000');
  });
});

describe('divide by zeros', () => {
  const questions = questionsOf('divide');

  it('divides exactly with table factors and 1 to 4 zeros, up to a million', () => {
    for (const question of questions) {
      const [dividend = 0, divisor = 0] = sumOf(question).split(' : ').map(Number);
      const quotient = dividend / divisor;
      expect(Number.isInteger(quotient), sumOf(question)).toBe(true);
      expect(dividend).toBeLessThanOrEqual(MAX_PRODUCT);
      expect(DIVIDE_FACTORS).toContain(significant(divisor));
      expect(DIVIDE_FACTORS).toContain(significant(quotient));
      expect(zeros(divisor) + zeros(quotient)).toBeGreaterThanOrEqual(1);
      expect(zeros(divisor) + zeros(quotient)).toBeLessThanOrEqual(4);
      expect(parseDutchNumber(plain(expectedOf(question)))).toEqual(
        evaluate(parse(sumOf(question))!),
      );
    }
  });

  it('strikes equal zeros when the divisor has them', () => {
    expect(explainDivide(7200, 80)).toBe('7200 : 80 = 720 : 8 = 90');
    expect(explainDivide(36_000, 900)).toBe('36\u{202f}000 : 900 = 360 : 9 = 40');
  });

  it('uses the table fact when the divisor has no zeros', () => {
    expect(explainDivide(4800, 6)).toBe('48 : 6 = 8 → 4800 : 6 = 800');
  });
});

describe('remainder in a context', () => {
  const questions = questionsOf('remainder');

  it('divides with a remainder within the ranges of its context', () => {
    for (const question of questions) {
      const [, , id = '', ask = '', totalText, divisorText] = question.key.split(':');
      const total = Number(totalText);
      const divisor = Number(divisorText);
      const context = contextOf(id, ask);
      const quotient = Math.floor(total / divisor);
      const rest = total % divisor;
      expect(divisor).toBeGreaterThanOrEqual(context.minDivisor);
      expect(divisor).toBeLessThanOrEqual(context.maxDivisor);
      expect(quotient).toBeGreaterThanOrEqual(MIN_QUOTIENT);
      expect(quotient).toBeLessThanOrEqual(MAX_QUOTIENT);
      expect(rest).toBeGreaterThanOrEqual(1);
      expect(total).toBeLessThanOrEqual(MAX_TOTAL);
      expect(stepOf(question).prompt).toBe(context.prompt(total, divisor));
      const answer = ask === 'up' ? quotient + 1 : ask === 'down' ? quotient : rest;
      expect(expectedOf(question)).toBe(String(answer));
    }
  });

  it('asks up, down and the rest about equally often', () => {
    for (const ask of ['up', 'down', 'rest']) {
      const count = questions.filter((question) => question.key.split(':')[3] === ask).length;
      expect(count, ask).toBeGreaterThan(250);
      expect(count, ask).toBeLessThan(420);
    }
  });

  it('rounds up for busjes, with tips for the remainder and the exact quotient', () => {
    const step = stepOf(remainderQuestion(contextOf('busjes', 'up'), 230, 8));
    expect(step.prompt).toBe(
      '230 leerlingen gaan met busjes van 8 plaatsen. Hoeveel busjes zijn er nodig?',
    );
    expect(step.suffix).toBe('busjes');
    expect(step.check('29')).toEqual({
      correct: true,
      expected: '29',
      explanation: '230 : 8 = 28 rest 6 → 29 busjes',
    });
    expect(step.check('28').tip).toBe(
      'Er blijven 6 leerlingen over; daarvoor is nog een busje nodig.',
    );
    expect(step.check('28,75').tip).toBe(
      'Je kunt geen 28,75 busjes nemen: het antwoord is een heel aantal.',
    );
    expect(step.check('3').tip).toBeUndefined();
  });

  it('rounds up for tafels', () => {
    const step = stepOf(remainderQuestion(contextOf('tafels', 'up'), 75, 6));
    expect(step.prompt).toBe(
      'Aan een tafel passen 6 gasten. Hoeveel tafels zijn er nodig voor 75 gasten?',
    );
    expect(step.check('13')).toMatchObject({
      correct: true,
      explanation: '75 : 6 = 12 rest 3 → 13 tafels',
    });
    expect(step.check('12').tip).toBe('Er blijven 3 gasten over; daarvoor is nog een tafel nodig.');
    expect(step.check('12,5').tip).toBe(
      'Je kunt geen 12,5 tafels nemen: het antwoord is een heel aantal.',
    );
  });

  it('rounds down for full boxes and names the box that is not full', () => {
    const step = stepOf(remainderQuestion(contextOf('dozen', 'down'), 200, 12));
    expect(step.prompt).toBe(
      'In een doos passen 12 eieren. Hoeveel volle dozen maak je van 200 eieren?',
    );
    expect(step.suffix).toBe('dozen');
    expect(step.check('16')).toMatchObject({
      correct: true,
      explanation: '200 : 12 = 16 rest 8 → 16 dozen',
    });
    expect(step.check('17').tip).toBe('De laatste doos is niet vol: rond naar beneden af.');
    // 200 : 12 has no finite decimal, so there is no exact-quotient tip.
    expect(step.check('16,67').tip).toBeUndefined();
  });

  it('asks for the eggs left over', () => {
    const step = stepOf(remainderQuestion(contextOf('dozen', 'rest'), 200, 12));
    expect(step.prompt).toBe(
      'In een doos passen 12 eieren. Je vult zoveel mogelijk dozen met 200 eieren. ' +
        'Hoeveel eieren houd je over?',
    );
    expect(step.suffix).toBe('eieren');
    expect(step.check('8')).toMatchObject({
      correct: true,
      explanation: '200 = 16 × 12 + 8 → 8 eieren over',
    });
    expect(step.check('16').tip).toBe('Dat is het aantal dozen; gevraagd is wat je overhoudt.');
  });

  it('rounds down for tickets', () => {
    const step = stepOf(remainderQuestion(contextOf('kaartjes', 'down'), 100, 7));
    expect(step.prompt).toBe(
      'Een kaartje kost €\u{a0}7. Hoeveel kaartjes koop je voor €\u{a0}100?',
    );
    expect(step.check('14')).toMatchObject({
      correct: true,
      explanation: '100 : 7 = 14 rest 2 → 14 kaartjes',
    });
    expect(step.check('15').tip).toBe(
      'Voor nog een kaartje is het geld niet genoeg: rond naar beneden af.',
    );
  });

  it('asks for the money left over in euros', () => {
    const step = stepOf(remainderQuestion(contextOf('kaartjes', 'rest'), 100, 7));
    expect(step.prompt).toBe(
      'Een kaartje kost €\u{a0}7. Je koopt zoveel mogelijk kaartjes voor €\u{a0}100. ' +
        'Hoeveel geld houd je over?',
    );
    expect(step.prefix).toBe('€');
    expect(step.suffix).toBeUndefined();
    expect(step.check('2')).toMatchObject({
      correct: true,
      explanation: '100 = 14 × 7 + 2 → €\u{a0}2 over',
    });
    expect(step.check('14').tip).toBe('Dat is het aantal kaartjes; gevraagd is wat je overhoudt.');
  });
});
