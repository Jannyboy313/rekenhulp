import { describe, expect, it } from 'vitest';
import { GROUP_SEPARATOR as S, NO_BREAK_SPACE as NB } from '../format';
import { createRng } from '../random';
import {
  compare,
  equals,
  fromInteger,
  hasAtMostDecimals,
  isInteger,
  parseFraction,
  rational,
  type Rational,
} from '../rational';
import { hasSlot } from '../slot';
import type { Question } from '../types';
import { niceWholesBetween } from './niceWholes';
import {
  EXTRA_CONTEXTS,
  extraQuestion,
  generatePercentProblems,
  PERCENTAGES,
  permilleGrowthQuestion,
  stackedQuestion,
  totalQuestion,
} from './percentProblems';
import { decimal, stepOf, typed } from './testHelpers';

/** The expected answer, which may be a mixed number ('32 1/2'). */
function answerOf(question: Question): Rational {
  const expected = stepOf(question).check('').expected.replaceAll(S, '');
  return parseFraction(expected)?.value ?? decimal(expected);
}

const SAMPLES = 3000;

function sample(): Question[] {
  const rng = createRng(55);
  return Array.from({ length: SAMPLES }, () => generatePercentProblems(rng));
}

const ofForm = (questions: Question[], form: string) =>
  questions.filter(({ key }) => key.startsWith(`percentProblems:${form}:`));

describe('percentProblems fixed cases', () => {
  it('stacked discounts: 80, 25% and 10% → 54', () => {
    const step = stepOf(stackedQuestion('discounts', 80, 25, 10));
    expect(step.prompt).toBe(
      `Een jas kost €${NB}80. Je krijgt 25% korting en op de nieuwe prijs nog 10%. Wat betaal je?`,
    );
    expect(step.prefix).toBe('€');
    expect(step.check('54')).toEqual({
      correct: true,
      expected: '54',
      explanation: '25% van 80 = 20 → 60 → 10% van 60 = 6 → 54',
    });
  });

  it('stacked up and down: 20% up and 20% down is below the old price', () => {
    const question = stackedQuestion('upDown', 80, 20, 20);
    expect(stepOf(question).prompt).toContain('stijgt met 20% en daalt daarna met 20%');
    expect(answerOf(question)).toEqual(rational(384n, 5n));
    expect(stepOf(question).check('76,80').correct).toBe(true);
    expect(stepOf(question).check('76,8').correct).toBe(true);
  });

  it('total percentage: 20 + 10 → 28', () => {
    const step = stepOf(totalQuestion(20, 10));
    expect(step.suffix).toBe('%');
    expect(step.check('28')).toEqual({
      correct: true,
      expected: '28',
      explanation: 'stel 100 → 20% korting: 80 → 10% van 80 = 8: 72 → 100 − 72 = 28%',
    });
  });

  it('total percentage: 25 + 10 → 32 1/2, with 32,5 and 65/2 correct too', () => {
    const step = stepOf(totalQuestion(25, 10));
    expect(step.kind).toBe('fraction');
    expect(step.check('32 1/2')).toMatchObject({ correct: true, expected: '32 1/2' });
    expect(step.check('32,5').correct).toBe(true);
    expect(step.check('65/2').correct).toBe(true);
    expect(step.check('32').correct).toBe(false);
  });

  it('extra content: 360 ml with 20% extra → 300', () => {
    const step = stepOf(extraQuestion('shampoo', 20, 300));
    expect(step.prompt).toBe(
      'Een actiefles shampoo bevat 20% extra: 360 ml. Hoeveel ml zit er in een gewone fles?',
    );
    expect(step.suffix).toBe('ml');
    expect(step.check('300')).toEqual({
      correct: true,
      expected: '300',
      explanation: '120% = 360 → 10% = 30 → 100% = 300',
    });
  });

  it('permille growth: 550 000 and 2‰ → 1100, or 551 100 after a year', () => {
    const growth = stepOf(permilleGrowthQuestion('growth', 550_000, 2));
    expect(growth.prompt).toBe(
      `Een provincie heeft 550${S}000 inwoners en groeit in een jaar met 2‰. Met hoeveel inwoners groeit ze?`,
    );
    expect(growth.suffix).toBe('inwoners');
    expect(growth.check(`1100`)).toMatchObject({
      correct: true,
      explanation: `1‰ = 550${S}000 : 1000 = 550 → 2‰ = 1100`,
    });
    const after = stepOf(permilleGrowthQuestion('after', 550_000, 2));
    expect(after.prompt).toContain('Hoeveel inwoners heeft ze na een jaar?');
    expect(after.check('551100').correct).toBe(true);
  });
});

describe('generatePercentProblems', () => {
  const questions = sample();

  it('is a single step per question that accepts its expected answer', () => {
    for (const question of questions) {
      expect(question.topic).toBe('percentProblems');
      expect(question.steps).toHaveLength(1);
      const step = question.steps[0]!;
      expect(step.check(typed(answerOf(question))).correct, step.prompt).toBe(true);
      expect(step.check('987654').correct).toBe(false);
    }
  });

  it('uses the four forms with equal probability', () => {
    for (const form of ['stacked', 'total', 'extra', 'permille']) {
      const share = ofForm(questions, form).length / SAMPLES;
      expect(share, form).toBeGreaterThan(0.21);
      expect(share, form).toBeLessThan(0.29);
    }
  });

  it('stacked change: nice price in [20, 400], at most 2 decimals, 70/30 variants', () => {
    const prices = new Set(niceWholesBetween(20, 400));
    const stacked = ofForm(questions, 'stacked');
    let discounts = 0;
    for (const question of stacked) {
      const [, , variant, price, first, second] = question.key.split(':') as string[];
      expect(prices.has(Number(price)), question.key).toBe(true);
      expect(PERCENTAGES).toContain(Number(first));
      expect(PERCENTAGES).toContain(Number(second));
      const answer = answerOf(question);
      expect(hasAtMostDecimals(answer, 2)).toBe(true);
      if (variant === 'discounts') discounts++;
      else {
        expect(second).toBe(first);
        expect(compare(answer, fromInteger(Number(price)))).toBe(-1);
        expect(stepOf(question).prompt).toContain(`stijgt met ${first}% en daalt daarna`);
      }
      expect(stepOf(question).prefix).toBe('€');
    }
    expect(discounts / stacked.length).toBeGreaterThan(0.62);
    expect(discounts / stacked.length).toBeLessThan(0.78);
  });

  it('total percentage: 100 − (100 − p1)(100 − p2)/100', () => {
    const seen = new Set<string>();
    for (const question of ofForm(questions, 'total')) {
      const [, , first, second] = question.key.split(':').map(Number) as number[];
      const expected = rational(BigInt(10_000 - (100 - first!) * (100 - second!)), 100n);
      expect(equals(answerOf(question), expected)).toBe(true);
      seen.add(`${first}:${second}`);
    }
    expect(seen.size).toBe(16);
  });

  it('extra content: integer action content, normal content in [100, 1000], all contexts', () => {
    const contents = new Set(niceWholesBetween(100, 1000));
    const contexts = new Set<string>();
    for (const question of ofForm(questions, 'extra')) {
      const [, , context, percentage, normal] = question.key.split(':') as string[];
      contexts.add(context!);
      expect(PERCENTAGES).toContain(Number(percentage));
      expect(contents.has(Number(normal))).toBe(true);
      expect((Number(normal) * (100 + Number(percentage))) % 100).toBe(0);
      expect(stepOf(question).suffix).toBe(EXTRA_CONTEXTS[context!]!.unit);
      expect(isInteger(answerOf(question))).toBe(true);
    }
    expect([...contexts].sort()).toEqual(['chips', 'koffie', 'shampoo']);
  });

  it('permille growth: nice population in [10 000, 900 000], integer growth, both variants', () => {
    const populations = new Set(niceWholesBetween(10_000, 900_000));
    const variants = new Set<string>();
    const permilles = new Set<number>();
    for (const question of ofForm(questions, 'permille')) {
      const [, , variant, population, permille] = question.key.split(':') as string[];
      variants.add(variant!);
      permilles.add(Number(permille));
      expect(populations.has(Number(population))).toBe(true);
      expect((Number(population) * Number(permille)) % 1000).toBe(0);
      const growth = (Number(population) * Number(permille)) / 1000;
      expect(answerOf(question)).toEqual(
        fromInteger(variant === 'growth' ? growth : Number(population) + growth),
      );
    }
    expect([...variants].sort()).toEqual(['after', 'growth']);
    expect([...permilles].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 8]);
  });

  it('has a stable key and no slot', () => {
    expect(generatePercentProblems(createRng(5)).key).toBe(generatePercentProblems(createRng(5)).key);
    for (const { steps } of questions) expect(hasSlot(steps[0]!.prompt)).toBe(false);
  });
});
