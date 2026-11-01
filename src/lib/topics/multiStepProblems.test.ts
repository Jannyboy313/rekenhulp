import { describe, expect, it } from 'vitest';
import { formatMoney, formatRational } from '../format';
import { createRng } from '../random';
import { fromInteger, rational } from '../rational';
import {
  BUS_COSTS,
  buildProblem,
  drawMultiStepProblem,
  EGGS_PER_BOX,
  FORMS,
  generateMultiStepProblems,
  OPERATIONS_CONTEXTS,
  PAYMENTS,
  ROUND_DOWN_CONTEXTS,
  ROUND_UP_CONTEXTS,
  SCHRIFTEN_PER_DOOS,
  type Context,
  type Form,
} from './multiStepProblems';
import { answerOf, findDrawn, stepOf, typed } from './testHelpers';

const PER_CONTEXT = 1000;

function problems(form: Form, context: Context, seed: number) {
  const rng = createRng(seed);
  return Array.from({ length: PER_CONTEXT }, () => buildProblem(rng, form, context));
}

const inRange = (value: number, min: number, max: number) => {
  expect(value).toBeGreaterThanOrEqual(min);
  expect(value).toBeLessThanOrEqual(max);
};

describe('operations (spec §5.65)', () => {
  it('schriften: d × s : k with an integer answer of at least 5', () => {
    for (const { numbers, answer } of problems('operations', 'schriften', 1)) {
      const [d, s, k] = numbers as [number, number, number];
      inRange(d, 5, 40);
      expect(SCHRIFTEN_PER_DOOS).toContain(s);
      inRange(k, 4, 30);
      expect((d * s) % k).toBe(0);
      expect(answer).toEqual(fromInteger((d * s) / k));
      expect(Number(answer.num)).toBeGreaterThanOrEqual(5);
    }
  });

  it('schriften: 28 × 24 : 16 = 42', () => {
    const match = findDrawn(
      2,
      200000,
      (rng) => buildProblem(rng, 'operations', 'schriften'),
      (p) => p.numbers.join() === '28,24,16',
    );
    expect(match).toBeDefined();
    expect(formatRational(match!.answer)).toBe('42');
    expect(stepOf(match!.question).check('').explanation).toBe('28 × 24 = 672 → 672 : 16 = 42');
  });

  it('wisselgeld: prices whole or half euros, payment above the total, change in cents', () => {
    for (const { numbers, answer, question } of problems('operations', 'wisselgeld', 3)) {
      const [a, p, b, q, pay] = numbers as [number, number, number, number, number];
      inRange(a, 2, 6);
      inRange(b, 2, 6);
      inRange(p, 6, 50);
      inRange(q, 6, 50);
      expect(PAYMENTS).toContain(pay);
      const total = (a * p + b * q) / 2;
      expect(pay).toBeGreaterThan(total);
      expect(answer).toEqual(rational(BigInt(2 * pay - a * p - b * q), 2n));
      const step = question.steps[0]!;
      expect(step.prefix).toBe('€');
      expect(step.check('').expected).toBe(formatMoney(answer));
      expect(step.check(typed(answer)).correct).toBe(true);
    }
  });

  it('schoolreis: B : n + e per child with B : n whole', () => {
    for (const { numbers, answer, question } of problems('operations', 'schoolreis', 4)) {
      const [bus, n, e] = numbers as [number, number, number];
      expect(BUS_COSTS).toContain(bus);
      inRange(n, 20, 60);
      expect(bus % n).toBe(0);
      inRange(e, 3, 15);
      expect(answer).toEqual(fromInteger(bus / n + e));
      expect(question.steps[0]!.prefix).toBe('€');
      expect(question.steps[0]!.check('').expected).toBe(String(bus / n + e));
    }
  });
});

describe('round up and round down', () => {
  it.each([...ROUND_UP_CONTEXTS])('%s rounds the quotient up, remainder not 0', (context) => {
    for (const { numbers, answer, question } of problems('roundUp', context, 5)) {
      const [n, m] = numbers as [number, number];
      inRange(n, 20, 500);
      inRange(m, 3, 15);
      if (context === 'dozen') expect(EGGS_PER_BOX).toContain(m);
      expect(n % m).not.toBe(0);
      expect(answer).toEqual(fromInteger(Math.ceil(n / m)));
      expect(question.steps[0]!.suffix).toBe(context);
    }
  });

  it.each([...ROUND_DOWN_CONTEXTS])('%s rounds the quotient down, remainder not 0', (context) => {
    for (const { numbers, answer, question } of problems('roundDown', context, 6)) {
      const [n, m] = numbers as [number, number];
      inRange(n, 20, 500);
      inRange(m, 3, 15);
      expect(n % m).not.toBe(0);
      expect(answer).toEqual(fromInteger(Math.floor(n / m)));
      expect(question.steps[0]!.suffix).toBe(context);
    }
  });

  it('explains the remainder: 59 : 8 and 50 : 7', () => {
    const up = buildProblem(createRng(1), 'roundUp', 'busjes');
    const [n, m] = up.numbers as [number, number];
    expect(stepOf(up.question).check('').explanation).toBe(
      `${n} : ${m} = ${Math.floor(n / m)} rest ${n % m} → ${Math.ceil(n / m)} busjes`,
    );
    const down = buildProblem(createRng(1), 'roundDown', 'kaartjes');
    const [dn, dm] = down.numbers as [number, number];
    expect(stepOf(down.question).check('').explanation).toBe(
      `${dn} : ${dm} = ${Math.floor(dn / dm)} rest ${dn % dm} → ${Math.floor(dn / dm)} kaartjes`,
    );
  });

  it('writes kaartjes with the euro sign and a no-break space', () => {
    const { question } = buildProblem(createRng(7), 'roundDown', 'kaartjes');
    expect(question.steps[0]!.prompt).toMatch(/^Je hebt € \d+ en een kaartje kost € \d+\./);
  });
});

describe('generateMultiStepProblems', () => {
  const rng = createRng(65);
  const drawn = Array.from({ length: 3000 }, () => drawMultiStepProblem(rng));

  it('picks the forms and contexts equally likely', () => {
    for (const form of FORMS) {
      const share = drawn.filter((p) => p.form === form).length / drawn.length;
      expect(share).toBeGreaterThan(0.28);
      expect(share).toBeLessThan(0.39);
    }
    for (const context of [...OPERATIONS_CONTEXTS, ...ROUND_UP_CONTEXTS, ...ROUND_DOWN_CONTEXTS]) {
      expect(
        drawn.some((p) => p.context === context),
        context,
      ).toBe(true);
    }
  });

  it('is a single number step, accepts its answer and has a form-based key', () => {
    for (const problem of drawn) {
      const { question } = problem;
      expect(question.topic).toBe('multiStepProblems');
      expect(question.steps).toHaveLength(1);
      expect(question.steps[0]!.kind).toBe('number');
      expect(question.steps[0]!.check(typed(problem.answer)).correct).toBe(true);
      expect(question.key).toBe(
        `multiStepProblems:${problem.form}:${problem.context}:${problem.numbers.join(',')}`,
      );
    }
    expect(generateMultiStepProblems(createRng(1)).topic).toBe('multiStepProblems');
    expect(answerOf(drawn[0]!.question)).toEqual(drawn[0]!.answer);
  });
});
