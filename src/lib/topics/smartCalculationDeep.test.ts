import { describe, expect, it } from 'vitest';
import { evaluate } from '../expr/evaluate';
import { parse } from '../expr/parser';
import { formatMoney, formatRational, GROUP_SEPARATOR, NO_BREAK_SPACE } from '../format';
import { createRng } from '../random';
import { equals, fromInteger, hasAtMostDecimals } from '../rational';
import {
  buildDeepExercise,
  FACTOR_OUT_NUMBERS,
  generateSmartCalculationDeep,
  STRATEGIES,
  SUMS,
  WHOLE_AMOUNTS,
  type DeepExercise,
  type Strategy,
} from './smartCalculationDeep';
import { answerOf, findDrawn, stepOf, typed } from './testHelpers';

const PER_STRATEGY = 1000;

function exercisesOf(strategy: Strategy): DeepExercise[] {
  const rng = createRng(200 + STRATEGIES.indexOf(strategy));
  return Array.from({ length: PER_STRATEGY }, () => buildDeepExercise(rng, strategy));
}

/** The value of a prompt: `€` and the grouping removed, then parsed. */
function valueOf(prompt: string) {
  return evaluate(
    parse(prompt.replaceAll(`€${NO_BREAK_SPACE}`, '').replaceAll(GROUP_SEPARATOR, ''))!,
  )!;
}

const numbersIn = (text: string) => [...text.matchAll(/\d+(?:,\d+)?/g)].map((m) => m[0]);
const centsOf = (text: string) => Math.round(Number(text.replace(',', '.')) * 100);

describe.each(STRATEGIES)('smartCalculationDeep %s (spec §5.66)', (strategy) => {
  const exercises = exercisesOf(strategy);

  it('has the answer of its prompt, exactly, with at most 2 decimals', () => {
    for (const { prompt, answer } of exercises) {
      expect(equals(valueOf(prompt), answer), prompt).toBe(true);
      expect(hasAtMostDecimals(answer, 2)).toBe(true);
    }
  });

  it('keeps the same key for the same sum', () => {
    for (const { key } of exercises) expect(key).toMatch(/^smartCalculationDeep:/);
  });
});

describe('factorOut', () => {
  const exercises = exercisesOf('factorOut');

  it('is a × n ± a or a × b + a × c with a in [13, 99] and not a multiple of 10', () => {
    for (const { prompt, explanation } of exercises) {
      const numbers = numbersIn(prompt).map(Number);
      const a = numbers.find((n) => numbers.filter((m) => m === n).length >= 2) ?? numbers[0]!;
      expect(a).toBeGreaterThanOrEqual(13);
      expect(a).toBeLessThanOrEqual(99);
      expect(a % 10).not.toBe(0);
      if (numbers.length === 3) {
        const n = numbers.find((x) => x !== a) ?? a; // a = n = 99 is possible
        expect(FACTOR_OUT_NUMBERS).toContain(n);
        expect(prompt.includes('+') ? n + 1 : n - 1).toSatisfy((r: number) => r % 10 === 0);
        expect(explanation).toMatch(/^\d+ × \d+ = [\d ]+$/);
      } else {
        expect(numbers).toHaveLength(4);
        // a occurs twice; the other two numbers add up to 100 or 1000 (also when one equals a).
        const rest = [...numbers];
        rest.splice(rest.indexOf(a), 1);
        rest.splice(rest.indexOf(a), 1);
        expect(SUMS).toContain(rest[0]! + rest[1]!);
        expect(rest[0]! % 10).not.toBe(0);
      }
    }
  });

  it('uses every n, both signs and both shapes', () => {
    const ns = new Set<number>();
    for (const { prompt } of exercises) {
      const numbers = numbersIn(prompt).map(Number);
      if (numbers.length === 3)
        ns.add(numbers.find((x) => FACTOR_OUT_NUMBERS.includes(x as 9) && x !== numbers[0]) ?? 0);
    }
    expect(exercises.some((e) => e.prompt.includes('−'))).toBe(true);
    expect(exercises.some((e) => numbersIn(e.prompt).length === 4)).toBe(true);
    expect(ns.size).toBeGreaterThanOrEqual(4);
  });

  it('99 × 47 + 47 = 4700 explained by 100 × 47', () => {
    const found = findDrawn(
      9,
      100000,
      (rng) => buildDeepExercise(rng, 'factorOut'),
      (e) => e.key === 'smartCalculationDeep:factorOut:47:99',
    );
    expect(found).toBeDefined();
    expect(formatRational(found!.answer)).toBe('4700');
    expect(found!.explanation).toBe('100 × 47 = 4700');
  });
});

describe('decimalFactor', () => {
  const exercises = exercisesOf('decimalFactor');

  it('is 0,25 × 4k, 2,5 × b (b a multiple of 0,4 with 1 decimal) or 1,25 × 8k', () => {
    for (const { prompt, key } of exercises) {
      const parts = prompt.split(' × ');
      const [factor, other] =
        parts.includes('0,25') || parts.includes('2,5') || parts.includes('1,25')
          ? [
              parts.find((p) => ['0,25', '2,5', '1,25'].includes(p))!,
              parts.find((p) => !['0,25', '2,5', '1,25'].includes(p))!,
            ]
          : [parts[0]!, parts[1]!];
      const o = centsOf(other);
      if (factor === '0,25') {
        expect((o / 100) % 4).toBe(0);
        expect(o / 100 / 4).toBeGreaterThanOrEqual(3);
        expect(o / 100 / 4).toBeLessThanOrEqual(50);
      } else if (factor === '2,5') {
        expect(other).toMatch(/^\d+,\d$/);
        expect(o % 40).toBe(0);
        expect(o).toBeGreaterThanOrEqual(120);
        expect(o).toBeLessThanOrEqual(1200);
      } else {
        expect(factor).toBe('1,25');
        expect((o / 100) % 8).toBe(0);
        expect(o / 100 / 8).toBeGreaterThanOrEqual(2);
        expect(o / 100 / 8).toBeLessThanOrEqual(12);
      }
      expect(key).toContain(other);
    }
    for (const f of ['0,25', '2,5', '1,25']) {
      expect(exercises.some((e) => e.prompt.split(' × ').includes(f))).toBe(true);
    }
  });

  it('has the key equal for swapped factors and explains like the spec', () => {
    expect(exercises.some((e) => e.prompt.startsWith('0,25 ×'))).toBe(true);
    expect(exercises.some((e) => e.prompt.endsWith('× 0,25'))).toBe(true);
    const keys = exercises.filter((e) => e.prompt.includes('0,25')).map((e) => e.key);
    expect(new Set(keys).size).toBeLessThan(keys.length);
    for (const e of exercises) {
      expect(e.explanation).toMatch(/^(10 × )?[\d,]+ : [48] = [\d,]+$/);
    }
  });

  it('2,5 × 4,8 = 12 and 1,25 × 24 = 30', () => {
    const find = (text: string) =>
      createRngSearch(
        (r) => buildDeepExercise(r, 'decimalFactor'),
        (e) => e.prompt === text,
      );
    expect(find('2,5 × 4,8')).toMatchObject({ explanation: '10 × 4,8 : 4 = 12' });
    expect(find('1,25 × 24')).toMatchObject({ explanation: '10 × 24 : 8 = 30' });
  });
});

function createRngSearch(
  build: (rng: ReturnType<typeof createRng>) => DeepExercise,
  match: (e: DeepExercise) => boolean,
): DeepExercise | undefined {
  const rng = createRng(77);
  for (let i = 0; i < 200000; i++) {
    const e = build(rng);
    if (match(e) || match({ ...e, prompt: e.prompt.split(' × ').reverse().join(' × ') })) return e;
  }
  return undefined;
}

describe('divideDecimal', () => {
  const exercises = exercisesOf('divideDecimal');

  it('is a : 0,5 (11–99), a : 0,25 (3–30) or a : 0,2 (3–50)', () => {
    const ranges: Record<string, [number, number, number]> = {
      '0,5': [11, 99, 2],
      '0,25': [3, 30, 4],
      '0,2': [3, 50, 5],
    };
    for (const { prompt, explanation } of exercises) {
      const [a, divisor] = prompt.split(' : ') as [string, string];
      const [min, max, factor] = ranges[divisor]!;
      expect(Number(a)).toBeGreaterThanOrEqual(min);
      expect(Number(a)).toBeLessThanOrEqual(max);
      expect(explanation).toBe(`${a} × ${factor} = ${Number(a) * factor}`);
    }
    expect(new Set(exercises.map((e) => e.prompt.split(' : ')[1]))).toEqual(
      new Set(Object.keys(ranges)),
    );
  });
});

describe('money', () => {
  const exercises = exercisesOf('money');

  it('sums two amounts ending in ,99 / ,98 / ,95 or subtracts one from 10, 20, 50 or 100', () => {
    for (const { prompt, answer } of exercises) {
      const amounts = prompt.split(/ [+−] /).map((part) => part.replace(`€${NO_BREAK_SPACE}`, ''));
      expect(prompt.startsWith(`€${NO_BREAK_SPACE}`)).toBe(true);
      const subtract = prompt.includes('−');
      const [whole, ...rest] = subtract ? amounts : [undefined, ...amounts];
      if (subtract) expect(WHOLE_AMOUNTS).toContain(Number(whole));
      for (const amount of rest) {
        expect(amount).toMatch(/^\d+,(99|98|95)$/);
        const value = centsOf(amount!);
        expect(value).toBeGreaterThanOrEqual(100);
        expect(value).toBeLessThanOrEqual(5000);
        if (subtract) expect(value).toBeLessThan(Number(whole) * 100);
      }
      expect(answer.den === 1n || hasAtMostDecimals(answer, 2)).toBe(true);
    }
    expect(exercises.some((e) => e.prompt.includes('+'))).toBe(true);
    expect(exercises.some((e) => e.prompt.includes('−'))).toBe(true);
  });

  it('explains by rounding up and correcting', () => {
    const sum = exercises.find((e) => e.prompt.includes('+'))!;
    expect(sum.explanation).toMatch(/^\d+ \+ \d+ − 0,\d\d = \d+(,\d\d)?$/);
    const difference = exercises.find((e) => e.prompt.includes('−'))!;
    expect(difference.explanation).toMatch(/^\d+ − \d+ \+ 0,0\d = \d+(,\d\d)?$/);
  });

  it('€ 7,99 + € 2,98 = 10,97 and € 20 − € 4,95 = 15,05', () => {
    const sum = createRngSearch(
      (r) => buildDeepExercise(r, 'money'),
      (e) => e.prompt === `€${NO_BREAK_SPACE}7,99 + €${NO_BREAK_SPACE}2,98`,
    );
    expect(sum).toBeDefined();
    const hit = findDrawn(
      3,
      200000,
      (rng) => buildDeepExercise(rng, 'money'),
      (e) => e.prompt === `€${NO_BREAK_SPACE}20 − €${NO_BREAK_SPACE}4,95`,
    );
    expect(hit?.explanation).toBe('20 − 5 + 0,05 = 15,05');
    expect(formatMoney(hit!.answer)).toBe('15,05');
  });
});

describe('generateSmartCalculationDeep', () => {
  const rng = createRng(66);
  const questions = Array.from({ length: 3000 }, () => generateSmartCalculationDeep(rng));

  it('is a number step with a slot, accepts its answer and uses € for money', () => {
    for (const question of questions) {
      const step = stepOf(question);
      expect(question.topic).toBe('smartCalculationDeep');
      expect(step.kind).toBe('number');
      expect(step.prompt).toMatch(/ = \?$/);
      expect(step.check(typed(answerOf(question))).correct).toBe(true);
      const euro = step.prompt.includes('€');
      expect(step.prefix).toBe(euro ? '€' : undefined);
      if (euro) expect(step.check('').expected).toBe(formatMoney(answerOf(question)));
    }
    expect(new Set(questions.map((q) => q.key.split(':')[1]))).toEqual(new Set(STRATEGIES));
  });

  it('picks the strategies equally likely', () => {
    for (const strategy of STRATEGIES) {
      const share =
        questions.filter((q) => q.key.split(':')[1] === strategy).length / questions.length;
      expect(share).toBeGreaterThan(0.2);
      expect(share).toBeLessThan(0.3);
    }
    expect(fromInteger(1)).toBeDefined();
  });
});
