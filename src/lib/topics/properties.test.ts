import { describe, expect, it } from 'vitest';
import { evaluate } from '../expr/evaluate';
import { parse } from '../expr/parser';
import { checkRewrite, type Property } from '../expr/rewriteCheck';
import { formatInteger } from '../format';
import { createRng } from '../random';
import {
  applicableProperties,
  drawPropertyExercise,
  generateProperties,
  propertyQuestion,
  ROUND_NUMBERS,
  ROUND_PAIRS,
  type PropertyExercise,
} from './properties';

const SAMPLES = 3000;
const rng = createRng(41);
const exercises = Array.from({ length: SAMPLES }, () => drawPropertyExercise(rng));

function expectFactor(a: number) {
  expect(a).toBeGreaterThanOrEqual(3);
  expect(a).toBeLessThanOrEqual(19);
  expect(a).not.toBe(10);
}

function expectFree(value: number, min: number, max: number) {
  expect(value).toBeGreaterThanOrEqual(min);
  expect(value).toBeLessThanOrEqual(max);
  expect(value % 10).not.toBe(0);
}

function expectHundredPair(x: number, y: number) {
  expect(x + y).toBe(100);
  expectFree(x, 11, 89);
}

function expectRoundPair(x: number, y: number) {
  expect(ROUND_PAIRS.some(([p, q]) => p === x && q === y)).toBe(true);
}

/** The useful step is unique (spec §5.11): `free` adds up to no multiple of 10 with x or y. */
function expectOnlyRoundSum(free: number, x: number, y: number) {
  expect([x % 10, y % 10]).not.toContain(free % 10);
}

/** The useful step is unique (spec §5.11): `free` times x or y is no multiple of 100. */
function expectOnlyRoundProduct(free: number, x: number, y: number) {
  expect((free * x) % 100).not.toBe(0);
  expect((free * y) % 100).not.toBe(0);
}

/** The seven templates of spec §5.11, recognised by the shape of the text. */
const SHAPES: { pattern: RegExp; check: (numbers: number[]) => void }[] = [
  {
    pattern: /^(\d+) × (\d+)$/,
    check: ([a = NaN, n = NaN]) => {
      expectFactor(a);
      expect(ROUND_NUMBERS.some((round) => [1, 2, 3].includes(Math.abs(n - round)))).toBe(true);
      expect(a).not.toBe(n);
    },
  },
  {
    pattern: /^(\d+) × \((\d+) \+ (\d+)\)$/,
    check: ([a = NaN, b = NaN, c = NaN]) => {
      expectFactor(a);
      expect([20, 30, 40, 50, 60, 70, 80, 90]).toContain(b);
      expect(c).toBeGreaterThanOrEqual(1);
      expect(c).toBeLessThanOrEqual(9);
    },
  },
  {
    pattern: /^(\d+) × (\d+) \+ (\d+) × (\d+)$/,
    check: ([a = NaN, b = NaN, a2 = NaN, c = NaN]) => {
      expectFactor(a);
      expect(a2).toBe(a);
      expectHundredPair(b, c);
    },
  },
  {
    pattern: /^\((\d+) \+ (\d+)\) \+ (\d+)$/,
    check: ([a = NaN, b = NaN, c = NaN]) => {
      expectFree(a, 11, 99);
      expectHundredPair(b, c);
      expectOnlyRoundSum(a, b, c);
    },
  },
  {
    pattern: /^\((\d+) × (\d+)\) × (\d+)$/,
    check: ([a = NaN, b = NaN, c = NaN]) => {
      expectFree(a, 11, 49);
      expectRoundPair(b, c);
      expectOnlyRoundProduct(a, b, c);
    },
  },
  {
    pattern: /^(\d+) \+ (\d+) \+ (\d+)$/,
    check: ([a = NaN, b = NaN, c = NaN]) => {
      expectHundredPair(a, c);
      expectFree(b, 11, 99);
      expect(b).not.toBe(c);
      expectOnlyRoundSum(b, a, c);
    },
  },
  {
    pattern: /^(\d+) × (\d+) × (\d+)$/,
    check: ([a = NaN, b = NaN, c = NaN]) => {
      expectRoundPair(a, c);
      expectFree(b, 11, 49);
      expect(b).not.toBe(c);
      expectOnlyRoundProduct(b, a, c);
    },
  },
];

describe('drawPropertyExercise', () => {
  it('uses the seven templates of spec §5.11 with their numbers, about equally often', () => {
    const counts = SHAPES.map(() => 0);
    for (const { text } of exercises) {
      const matches = SHAPES.map(({ pattern }) => pattern.exec(text));
      expect(
        matches.filter((match) => match !== null),
        text,
      ).toHaveLength(1);
      const index = matches.findIndex((match) => match !== null);
      counts[index]!++;
      SHAPES[index]!.check(matches[index]!.slice(1).map(Number));
    }
    for (const count of counts) {
      expect(count / SAMPLES).toBeGreaterThan(1 / 7 - 0.03);
      expect(count / SAMPLES).toBeLessThan(1 / 7 + 0.03);
    }
  });

  it('gives a valid example rewrite for every applicable property', () => {
    for (const exercise of exercises) {
      const original = parse(exercise.text)!;
      const applicable = applicableProperties(exercise);
      expect(applicable).toHaveLength(2);
      expect(applicable).toContain('commutative');
      expect(applicable).toContain(exercise.intended);
      for (const property of applicable) {
        const rewrite = exercise.rewrites[property]!;
        expect(checkRewrite(original, parse(rewrite)!, property).valid, rewrite).toBe(true);
      }
    }
  });

  it('recognises the other example rewrite as another property in Basis', () => {
    for (const exercise of exercises) {
      const original = parse(exercise.text)!;
      for (const property of applicableProperties(exercise)) {
        if (property === exercise.intended) continue;
        const rewrite = parse(exercise.rewrites[property]!)!;
        expect(checkRewrite(original, rewrite, exercise.intended)).toEqual({
          valid: false,
          detected: [property],
          reason: 'otherProperty',
        });
      }
    }
  });
});

describe('propertyQuestion', () => {
  const timesNinetyEight: PropertyExercise = {
    text: '7 × 98',
    intended: 'distributive',
    rewrites: { commutative: '98 × 7', distributive: '7 × 100 − 7 × 2' },
  };
  const explanation = '7 × 100 − 7 × 2 = 700 − 7 × 2 = 700 − 14 = 686';

  it('asks Basis to simplify and hints at the useful property', () => {
    const question = propertyQuestion(timesNinetyEight, 'basis', 'distributive');
    expect(question.key).toBe('properties:7 × 98');
    expect(question.topic).toBe('properties');
    const [rewrite, value] = question.steps;
    expect(rewrite!.prompt).toBe('Vereenvoudig in één stap: 7 × 98');
    expect(rewrite!.check('7×100-7×2')).toEqual({ correct: true, expected: '7 × 100 − 7 × 2' });
    expect(rewrite!.check('98×7')).toEqual({
      correct: false,
      expected: '7 × 100 − 7 × 2',
      explanation: 'Geldige stap (commutatief), maar niet handig. Probeer distributief.',
    });
    expect(value!.prompt).toBe('7 × 98 = ?');
    expect(value!.check('686')).toEqual({ correct: true, expected: '686', explanation });
  });

  it('names the asked property in Gevorderd and still explains with the useful rewrite', () => {
    const question = propertyQuestion(timesNinetyEight, 'gevorderd', 'commutative');
    expect(question.key).toBe('properties:7 × 98');
    const [rewrite, value] = question.steps;
    expect(rewrite!.prompt).toBe('Pas de commutatieve eigenschap toe: 7 × 98');
    expect(rewrite!.check('98×7')).toEqual({ correct: true, expected: '98 × 7' });
    expect(rewrite!.check('7×100-7×2').explanation).toBe(
      'Geldige stap (distributief), maar gevraagd is commutatief.',
    );
    expect(value!.check('686').explanation).toBe(explanation);
  });

  it('rejects a Basis question that does not ask the useful property', () => {
    expect(() => propertyQuestion(timesNinetyEight, 'basis', 'commutative')).toThrow(RangeError);
  });

  it('rejects an example rewrite that does not parse', () => {
    const broken: PropertyExercise = {
      ...timesNinetyEight,
      rewrites: { ...timesNinetyEight.rewrites, commutative: '98 ×' },
    };
    expect(() => propertyQuestion(broken, 'gevorderd', 'commutative')).toThrow(RangeError);
  });
});

describe('generateProperties', () => {
  const questions = Array.from({ length: SAMPLES }, () => generateProperties(rng));

  it('asks a rewrite step and then the value', () => {
    const prompt =
      /^(?:Vereenvoudig in één stap|Pas de (?:commutatieve|associatieve|distributieve) eigenschap toe): (.+)$/;
    for (const question of questions) {
      const [rewrite, value] = question.steps;
      expect(question.topic).toBe('properties');
      expect(question.steps.map((step) => step.kind)).toEqual(['expression', 'number']);
      const text = prompt.exec(rewrite!.prompt)?.[1] ?? '';
      expect(value!.prompt).toBe(`${text} = ?`);
      expect(question.key).toBe(`properties:${text}`);

      // Unparsable input returns the expected answer (the example) without judging it.
      const example = rewrite!.check('').expected;
      expect(rewrite!.check(example).correct, example).toBe(true);
      const answer = evaluate(parse(text)!)!;
      expect(answer.den).toBe(1n);
      const result = value!.check(String(answer.num));
      expect(result.correct).toBe(true);
      expect(result.explanation?.endsWith(` = ${formatInteger(answer.num)}`)).toBe(true);
    }
  });

  it('splits Basis and Gevorderd evenly and asks every property in Gevorderd', () => {
    const asked: Record<string, Property> = {
      commutatieve: 'commutative',
      associatieve: 'associative',
      distributieve: 'distributive',
    };
    const prompts = questions.map((question) => question.steps[0]!.prompt);
    const basis = prompts.filter((prompt) => prompt.startsWith('Vereenvoudig in één stap: '));
    expect(basis.length / SAMPLES).toBeGreaterThan(0.47);
    expect(basis.length / SAMPLES).toBeLessThan(0.53);
    const gevorderd = prompts.flatMap((prompt) => {
      const adjective = /^Pas de (\w+) eigenschap toe: /.exec(prompt)?.[1];
      return adjective === undefined ? [] : [asked[adjective]];
    });
    expect(basis.length + gevorderd.length).toBe(SAMPLES);
    expect([...new Set(gevorderd)].sort()).toEqual(['associative', 'commutative', 'distributive']);
  });
});
