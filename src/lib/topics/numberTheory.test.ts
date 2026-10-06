import { describe, expect, it } from 'vitest';
import { gcd, isPrime, lcm, primeFactors, smallestPrimeFactor } from '../primes';
import { createRng, type Rng } from '../random';
import { fromInteger, rational } from '../rational';
import { NO, YES } from '../steps';
import type { Generator, Question, Step } from '../types';
import {
  divisionLadder,
  FACTORIZATION_NUMBERS,
  gcdExplanation,
  gcdTip,
  GCD_COPRIME_SHARE,
  generateFactorization,
  generateGcd,
  generateLcm,
  generatePrime,
  HARD_COMPOSITES,
  LCM_SHARED_FACTOR_SHARE,
  lcmExplanation,
  lcmTip,
  MAX_COMMON_FACTOR,
  MAX_FACTORIZATION,
  MAX_GCD_TERM,
  MAX_LCM,
  MAX_LCM_TERM,
  MAX_PRIME_CANDIDATE,
  MIN_COMMON_FACTOR,
  MIN_COPRIME_TERM,
  MIN_FACTORIZATION,
  MIN_LCM_TERM,
  MIN_PRIME_CANDIDATE,
  MULTIPLES_OF_THREE,
  primeExplanation,
  PRIMES,
} from './numberTheory';

const SAMPLES = 3000;

function sample(generator: Generator, seed: number, count = SAMPLES): Question[] {
  const rng: Rng = createRng(seed);
  return Array.from({ length: count }, () => generator(rng));
}

function stepOf(question: Question): Step {
  return question.steps[0]!;
}

function expectedOf(question: Question): string {
  return stepOf(question).check('').expected;
}

/** The two numbers in prompt order, e.g. 'KGV van 12 en 18 = ?' → [12, 18]. */
function termsOf(question: Question, name: 'KGV' | 'GGD'): [number, number] {
  const match = new RegExp(`^${name} van (\\d+) en (\\d+) = \\?$`).exec(stepOf(question).prompt);
  expect(match, stepOf(question).prompt).not.toBeNull();
  return [Number(match![1]), Number(match![2])];
}

function share(questions: Question[], predicate: (question: Question) => boolean): number {
  return questions.filter(predicate).length / questions.length;
}

describe('generateLcm', () => {
  const questions = sample(generateLcm, 7);

  it('asks for the LCM of two different numbers in range', () => {
    for (const question of questions) {
      const [a, b] = termsOf(question, 'KGV');
      expect(question.topic).toBe('lcm');
      expect(question.key).toBe(`lcm:${Math.min(a, b)}:${Math.max(a, b)}`);
      expect(a).not.toBe(b);
      for (const term of [a, b]) {
        expect(term).toBeGreaterThanOrEqual(MIN_LCM_TERM);
        expect(term).toBeLessThanOrEqual(MAX_LCM_TERM);
      }
      expect(lcm(a, b)).toBeLessThanOrEqual(MAX_LCM);
      expect(expectedOf(question)).toBe(String(lcm(a, b)));
      expect(stepOf(question).check(expectedOf(question))).toEqual({
        correct: true,
        expected: String(lcm(a, b)),
        explanation: lcmExplanation(a, b),
      });
    }
  });

  it('makes most pairs share a factor', () => {
    const shared = share(questions, (q) => gcd(...termsOf(q, 'KGV')) > 1);
    expect(shared).toBeGreaterThan(LCM_SHARED_FACTOR_SHARE - 0.04);
    expect(shared).toBeLessThan(LCM_SHARED_FACTOR_SHARE + 0.04);
  });

  it('puts the larger number first about half of the time', () => {
    const largerFirst = share(questions, (q) => {
      const [a, b] = termsOf(q, 'KGV');
      return a > b;
    });
    expect(largerFirst).toBeGreaterThan(0.45);
    expect(largerFirst).toBeLessThan(0.55);
  });

  it('is deterministic for a fixed seed', () => {
    const keys = (seed: number) => sample(generateLcm, seed, 50).map((q) => q.key);
    expect(keys(5)).toEqual(keys(5));
  });
});

describe('lcmExplanation', () => {
  it.each([
    [12, 18, '12 = 2² × 3 en 18 = 2 × 3² → KGV = 2² × 3² = 36'],
    [4, 13, '4 = 2² en 13 is priem → KGV = 2² × 13 = 52'],
    [8, 4, '8 = 2³ en 4 = 2² → KGV = 2³ = 8'],
  ])('explains the LCM of %i and %i', (a, b, expected) => {
    expect(lcmExplanation(a, b)).toBe(expected);
  });
});

describe('generateGcd', () => {
  const questions = sample(generateGcd, 11);
  const coprime = questions.filter((q) => expectedOf(q) === '1');
  const shared = questions.filter((q) => expectedOf(q) !== '1');

  it('asks for the GCD and accepts its own answer', () => {
    for (const question of questions) {
      const [a, b] = termsOf(question, 'GGD');
      expect(question.topic).toBe('gcd');
      expect(question.key).toBe(`gcd:${Math.min(a, b)}:${Math.max(a, b)}`);
      expect(a).not.toBe(b);
      expect(Math.max(a, b)).toBeLessThanOrEqual(MAX_GCD_TERM);
      expect(expectedOf(question)).toBe(String(gcd(a, b)));
      expect(stepOf(question).check(expectedOf(question))).toEqual({
        correct: true,
        expected: String(gcd(a, b)),
        explanation: gcdExplanation(a, b),
      });
    }
  });

  it('makes about 10% of the pairs coprime composites', () => {
    expect(coprime.length / SAMPLES).toBeGreaterThan(GCD_COPRIME_SHARE - 0.025);
    expect(coprime.length / SAMPLES).toBeLessThan(GCD_COPRIME_SHARE + 0.025);
    for (const question of coprime) {
      for (const term of termsOf(question, 'GGD')) {
        expect(term).toBeGreaterThanOrEqual(MIN_COPRIME_TERM);
        expect(isPrime(term)).toBe(false);
      }
    }
  });

  it('uses every common factor from 2 to 30 for the other pairs', () => {
    const factors = new Set(shared.map((q) => Number(expectedOf(q))));
    const expected = Array.from(
      { length: MAX_COMMON_FACTOR - MIN_COMMON_FACTOR + 1 },
      (_, index) => MIN_COMMON_FACTOR + index,
    );
    expect([...factors].sort((x, y) => x - y)).toEqual(expected);
  });

  it('is deterministic for a fixed seed', () => {
    const keys = (seed: number) => sample(generateGcd, seed, 50).map((q) => q.key);
    expect(keys(5)).toEqual(keys(5));
  });
});

describe('gcdExplanation', () => {
  it.each([
    [84, 126, '84 = 2² × 3 × 7 en 126 = 2 × 3² × 7 → GGD = 2 × 3 × 7 = 42'],
    [35, 48, '35 = 5 × 7 en 48 = 2⁴ × 3 → geen gemeenschappelijke priemfactor, GGD = 1'],
    [13, 26, '13 is priem en 26 = 2 × 13 → GGD = 13'],
    [24, 40, '24 = 2³ × 3 en 40 = 2³ × 5 → GGD = 2³ = 8'],
  ])('explains the GCD of %i and %i', (a, b, expected) => {
    expect(gcdExplanation(a, b)).toBe(expected);
  });
});

describe('generatePrime', () => {
  const questions = sample(generatePrime, 13);
  const numberOf = (question: Question) => Number(question.key.split(':')[1]);

  it('asks whether a number in [11, 199] is prime', () => {
    for (const question of questions) {
      const n = numberOf(question);
      const step = stepOf(question);
      expect(question.topic).toBe('prime');
      expect(step.kind).toBe('boolean');
      expect(step.prompt).toBe(`Is ${n} een priemgetal?`);
      expect(n).toBeGreaterThanOrEqual(MIN_PRIME_CANDIDATE);
      expect(n).toBeLessThanOrEqual(MAX_PRIME_CANDIDATE);
      const expected = isPrime(n) ? YES : NO;
      expect(step.check(expected)).toEqual({
        correct: true,
        expected,
        explanation: primeExplanation(n),
      });
    }
  });

  it('makes half of the numbers prime and the composites odd and not divisible by 5', () => {
    const primes = share(questions, (q) => isPrime(numberOf(q)));
    expect(primes).toBeGreaterThan(0.46);
    expect(primes).toBeLessThan(0.54);
    for (const question of questions) {
      const n = numberOf(question);
      if (isPrime(n)) continue;
      expect(n % 2).toBe(1);
      expect(n % 5).not.toBe(0);
    }
  });

  it('takes half of the composites from the hard ones', () => {
    const hard = share(questions, (q) => HARD_COMPOSITES.includes(numberOf(q)));
    expect(hard).toBeGreaterThan(0.21);
    expect(hard).toBeLessThan(0.29);
  });

  it('lists exactly the odd composites not divisible by 3 or 5 as hard', () => {
    const hard: number[] = [];
    for (let n = MIN_PRIME_CANDIDATE; n <= MAX_PRIME_CANDIDATE; n++) {
      if (!isPrime(n) && n % 2 === 1 && n % 3 !== 0 && n % 5 !== 0) hard.push(n);
    }
    expect(HARD_COMPOSITES).toEqual(hard);
    expect(PRIMES).toHaveLength(42);
    expect(MULTIPLES_OF_THREE[0]).toBe(21);
    expect(MULTIPLES_OF_THREE.at(-1)).toBe(189);
    expect(MULTIPLES_OF_THREE.every((n) => n % 6 === 3 && n % 5 !== 0)).toBe(true);
  });
});

describe('primeExplanation', () => {
  it.each([
    [91, '91 = 7 × 13'],
    [27, '27 = 3 × 9'],
    [169, '169 = 13 × 13'],
    [151, 'Geen deler tot en met √151'],
  ])('explains %i', (n, expected) => {
    expect(primeExplanation(n)).toBe(expected);
  });
});

describe('generateFactorization', () => {
  const questions = sample(generateFactorization, 17);
  const numberOf = (question: Question) => Number(question.key.split(':')[1]);

  /** The canonical answer as keypad input: 84 → '2^2×3×7'. */
  function typed(n: number): string {
    return primeFactors(n)
      .map(({ prime, exponent }) => (exponent === 1 ? `${prime}` : `${prime}^${exponent}`))
      .join('×');
  }

  /** Every prime written out: 84 → '2×2×3×7'. */
  function expanded(n: number): string {
    return primeFactors(n)
      .flatMap(({ prime, exponent }) => Array.from({ length: exponent }, () => prime))
      .join('×');
  }

  it('asks to factorize a number with at least 3 prime factors', () => {
    for (const question of questions) {
      const n = numberOf(question);
      const step = stepOf(question);
      expect(question.topic).toBe('factorization');
      expect(step.kind).toBe('factorization');
      expect(step.prompt).toBe(`Ontbind ${n} in priemfactoren`);
      expect(FACTORIZATION_NUMBERS).toContain(n);
      for (const input of [typed(n), expanded(n)]) {
        expect(step.check(input)).toEqual({
          correct: true,
          expected: step.check('').expected,
          explanation: divisionLadder(n),
        });
      }
    }
  });

  it('offers exactly the composites in [12, 200] with at least 3 prime factors', () => {
    expect(FACTORIZATION_NUMBERS[0]).toBe(MIN_FACTORIZATION);
    expect(FACTORIZATION_NUMBERS.at(-1)).toBe(MAX_FACTORIZATION);
    expect(FACTORIZATION_NUMBERS).toContain(84);
    expect(FACTORIZATION_NUMBERS).not.toContain(15);
    expect(FACTORIZATION_NUMBERS).not.toContain(49);
    const expected: number[] = [];
    for (let n = 12; n <= 200; n++) {
      let rest = n;
      let count = 0;
      for (let d = 2; d <= rest; d++) {
        while (rest % d === 0) {
          rest /= d;
          count++;
        }
      }
      if (count >= 3) expected.push(n);
    }
    expect(FACTORIZATION_NUMBERS).toEqual(expected);
  });

  it('shows the canonical form as the expected answer', () => {
    const first = generateFactorization(() => 0);
    expect(numberOf(first)).toBe(12);
    expect(stepOf(first).check('').expected).toBe('2² × 3');
  });
});

describe('divisionLadder', () => {
  it('divides 84 by its smallest primes', () => {
    expect(divisionLadder(84)).toBe('84 : 2 = 42, 42 : 2 = 21, 21 : 3 = 7');
  });

  it('is a consistent ladder for every number on offer', () => {
    for (const n of FACTORIZATION_NUMBERS) {
      const steps = divisionLadder(n)
        .split(', ')
        .map((step) => {
          const match = /^(\d+) : (\d+) = (\d+)$/.exec(step);
          expect(match, `${n}: ${step}`).not.toBeNull();
          return match!.slice(1).map(Number) as [number, number, number];
        });
      expect(steps[0]![0]).toBe(n);
      for (const [index, [dividend, divisor, quotient]] of steps.entries()) {
        expect(divisor).toBe(smallestPrimeFactor(dividend));
        expect(dividend / divisor).toBe(quotient);
        if (index > 0) expect(dividend).toBe(steps[index - 1]![2]);
      }
      expect(isPrime(steps.at(-1)![2])).toBe(true);
    }
  });
});

describe('lcmTip and gcdTip', () => {
  it('names the GCD, a larger common multiple and a non-multiple', () => {
    const tip = lcmTip(12, 18);
    expect(tip(fromInteger(6))).toBe(
      'Dat is de GGD. De KGV is het kleinste getal dat door allebei deelbaar is.',
    );
    expect(tip(fromInteger(72))).toBe('72 is een gemeenschappelijk veelvoud, maar niet het kleinste.');
    expect(tip(fromInteger(50))).toBe('50 is geen veelvoud van 12.');
    expect(tip(fromInteger(48))).toBe('48 is geen veelvoud van 18.');
    expect(tip(rational(7n, 2n))).toBeUndefined();
  });

  it('names the LCM, a smaller common divisor and a non-divisor', () => {
    const tip = gcdTip(84, 126);
    expect(tip(fromInteger(252))).toBe(
      'Dat is de KGV. De GGD is het grootste getal waar allebei door deelbaar zijn.',
    );
    expect(tip(fromInteger(6))).toBe('6 is een gemeenschappelijke deler, maar niet de grootste.');
    expect(tip(fromInteger(8))).toBe('84 is niet deelbaar door 8.');
    expect(tip(fromInteger(4))).toBe('126 is niet deelbaar door 4.');
  });
});
