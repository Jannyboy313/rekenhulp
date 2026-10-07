import { describe, expect, it } from 'vitest';
import { createRng } from '../random';
import { formatInteger } from '../format';
import { fromInteger, parseDutchNumber } from '../rational';
import { numberStep } from '../steps';
import type { Question } from '../types';
import { generateTables, neighbourRowTip, productCheckTip, TABLE_FACTORS } from './tables';

const SAMPLES = 1000;

function sample(seed = 1): Question[] {
  const rng = createRng(seed);
  return Array.from({ length: SAMPLES }, () => generateTables(rng));
}

function expectedOf(question: Question): string {
  // `expected` does not depend on the input.
  return question.steps[0]!.check('').expected;
}

describe('TABLE_FACTORS', () => {
  it('is 2 to 15 without 10', () => {
    expect(TABLE_FACTORS).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14, 15]);
  });
});

describe('generateTables', () => {
  const questions = sample();

  it('creates single-step numeric questions on the tables topic', () => {
    for (const question of questions) {
      expect(question.topic).toBe('tables');
      expect(question.key.startsWith('tables:')).toBe(true);
      expect(question.steps).toHaveLength(1);
      expect(question.steps[0]!.kind).toBe('number');
      expect(question.steps[0]!.prompt).toMatch(/\?/);
    }
  });

  it('accepts its own expected answer', () => {
    for (const question of questions) {
      expect(question.steps[0]!.check(expectedOf(question)).correct).toBe(true);
    }
  });

  it('only uses table factors and their exact product', () => {
    for (const question of questions) {
      const numbers = [...question.steps[0]!.prompt.matchAll(/\d+/g)].map((m) => Number(m[0]));
      numbers.push(Number(expectedOf(question)));
      const [a, b, product] = numbers.sort((x, y) => x - y) as [number, number, number];
      expect(TABLE_FACTORS).toContain(a);
      expect(TABLE_FACTORS).toContain(b);
      expect(a * b).toBe(product);
    }
  });

  it('covers every factor', () => {
    const seen = new Set<number>();
    for (const question of questions) {
      for (const m of question.steps[0]!.prompt.matchAll(/\d+/g)) {
        const value = Number(m[0]);
        if (TABLE_FACTORS.includes(value)) seen.add(value);
      }
    }
    expect([...seen].sort((x, y) => x - y)).toEqual(TABLE_FACTORS);
  });

  it('uses the three forms roughly equally', () => {
    const counts = { product: 0, division: 0, missing: 0 };
    for (const { key } of questions) {
      if (key.startsWith('tables:product:')) counts.product++;
      else if (key.startsWith('tables:division:')) counts.division++;
      else if (key.startsWith('tables:missing')) counts.missing++;
    }
    for (const count of Object.values(counts)) {
      expect(count / SAMPLES).toBeGreaterThan(0.28);
      expect(count / SAMPLES).toBeLessThan(0.39);
    }
  });

  it('puts the missing factor on both sides', () => {
    const keys = questions.map((q) => q.key);
    expect(keys.some((k) => k.startsWith('tables:missingLeft:'))).toBe(true);
    expect(keys.some((k) => k.startsWith('tables:missingRight:'))).toBe(true);
  });

  it('explains division and missing-factor answers with the multiplication fact', () => {
    for (const question of questions) {
      const { explanation } = question.steps[0]!.check('');
      if (question.key.startsWith('tables:product:')) {
        expect(explanation).toBeUndefined();
      } else {
        expect(explanation).toMatch(/^\d+ × \d+ = \d+$/);
      }
    }
  });

  it('is deterministic for a fixed seed', () => {
    expect(sample(5).map((q) => q.key)).toEqual(sample(5).map((q) => q.key));
  });
});

describe('generateTables with chosen tables', () => {
  function factorsOf(question: Question): [number, number] {
    const numbers = [...question.steps[0]!.prompt.matchAll(/\d+/g)].map((m) => Number(m[0]));
    numbers.push(Number(expectedOf(question)));
    const [a, b] = numbers.sort((x, y) => x - y) as [number, number, number];
    return [a, b];
  }

  it('gives the same questions as without a choice when all tables are chosen', () => {
    const rng = createRng(1);
    const chosen = Array.from({ length: SAMPLES }, () => generateTables(rng, TABLE_FACTORS));
    expect(chosen.map((q) => q.key)).toEqual(sample(1).map((q) => q.key));
  });

  it('always has a chosen table as one of the factors', () => {
    const rng = createRng(2);
    for (let i = 0; i < SAMPLES; i++) {
      const [a, b] = factorsOf(generateTables(rng, [7, 13]));
      expect([a, b].some((factor) => factor === 7 || factor === 13)).toBe(true);
      expect(TABLE_FACTORS).toContain(a);
      expect(TABLE_FACTORS).toContain(b);
    }
  });

  it('pairs a single table with every factor', () => {
    const rng = createRng(3);
    const others = new Set<number>();
    for (let i = 0; i < SAMPLES; i++) {
      const [a, b] = factorsOf(generateTables(rng, [7]));
      others.add(a === 7 ? b : a);
    }
    expect([...others].sort((x, y) => x - y)).toEqual(TABLE_FACTORS);
  });

  it('rejects a choice without any table', () => {
    expect(() => generateTables(createRng(1), [])).toThrow(RangeError);
    expect(() => generateTables(createRng(1), [10])).toThrow(RangeError);
  });
});

describe('table tips', () => {
  it('names a neighbouring row', () => {
    expect(neighbourRowTip(7, 8)(fromInteger(63))).toBe('63 = 7 × 9: je zit één rij ernaast.');
    expect(neighbourRowTip(7, 8)(fromInteger(48))).toBe('48 = 6 × 8: je zit één rij ernaast.');
    expect(neighbourRowTip(7, 8)(fromInteger(50))).toBeUndefined();
  });

  it('shows the product a division or missing-factor answer gives', () => {
    expect(productCheckTip(7, 56, 8, true)(fromInteger(9))).toBe('9 × 7 = 63, niet 56.');
    expect(productCheckTip(7, 56, 8, false)(fromInteger(9))).toBe('7 × 9 = 63, niet 56.');
    expect(productCheckTip(7, 56, 8, true)(parseDutchNumber('2,5')!)).toBeUndefined();
  });

  it('has no cap on the size of the answer', () => {
    expect(productCheckTip(7, 56, 8, true)(fromInteger(2000))).toBe(
      '2000 × 7 = 14\u{202f}000, niet 56.',
    );
  });

  it('leaves an answer 10ᵏ times the correct one to the factor-of-ten tip', () => {
    for (const given of [80, 800]) {
      expect(productCheckTip(7, 56, 8, true)(fromInteger(given))).toBeUndefined();
    }
    expect(productCheckTip(7, 56, 8, true)(parseDutchNumber('0,8')!)).toBeUndefined();
    const step = numberStep({
      prompt: '56 : 7 = ?',
      answer: fromInteger(8),
      diagnose: productCheckTip(7, 56, 8, true),
    });
    expect(step.check('80').tip).toContain('10 keer te groot');
  });
});

describe('table tips end to end', () => {
  const f = formatInteger;
  const NINE = 9;

  it('wires the right tip into every form', () => {
    const rng = createRng(31);
    const seen = { product: 0, division: 0, missingLeft: 0, missingRight: 0, tenfold: 0 };
    for (let i = 0; i < 1000; i++) {
      const question = generateTables(rng);
      const step = question.steps[0]!;
      const [, form, first, second] = question.key.split(/[:x]/) as [
        string,
        string,
        string,
        string,
      ];
      if (form === 'product') {
        const a = Number(first);
        const b = Number(second);
        const typed = a * (b + 1);
        const neighbours = [
          [a, b - 1],
          [a, b + 1],
          [a - 1, b],
          [a + 1, b],
        ] as const;
        const [x, y] = neighbours.find(([nx, ny]) => nx * ny === typed)!;
        expect(step.check(String(typed)).tip).toBe(
          `${f(x * y)} = ${f(x)} × ${f(y)}: je zit één rij ernaast.`,
        );
        seen.product++;
        continue;
      }
      const answer = Number(expectedOf(question));
      if (answer !== NINE) {
        // Keys: division:<product>:<b>, missingLeft:<b>:<product>, missingRight:<a>:<product>.
        const product = Number(form === 'division' ? first : second);
        const known = Number(form === 'division' ? second : first);
        const [x, y] = form === 'missingRight' ? [known, NINE] : [NINE, known];
        expect(step.check(String(NINE)).tip).toBe(
          `${f(x)} × ${f(y)} = ${f(x * y)}, niet ${f(product)}.`,
        );
        seen[form as 'division' | 'missingLeft' | 'missingRight']++;
      }
      expect(step.check(String(answer * 10)).tip).toContain('10 keer te groot');
      seen.tenfold++;
    }
    for (const count of Object.values(seen)) expect(count).toBeGreaterThan(50);
  });
});
