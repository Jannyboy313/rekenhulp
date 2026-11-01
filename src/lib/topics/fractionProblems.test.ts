import { describe, expect, it } from 'vitest';
import { formatEuro } from '../format';
import { gcd } from '../primes';
import { createRng } from '../random';
import { fromInteger, rational, type Rational } from '../rational';
import {
  buildFractionProblem,
  DENOMINATORS,
  FORMS,
  FRACTIONS,
  generateFractionProblems,
  partOfRestQuestion,
  PART_OF_REST_CONTEXTS,
  REST_CONTEXTS,
  restQuestion,
  whichPartQuestion,
  WHICH_PART_CONTEXTS,
  WHOLE_CONTEXTS,
  wholeQuestion,
  type Form,
} from './fractionProblems';
import { stepOf } from './testHelpers';

const PER_FORM = 1000;
const frac = (p: number, q: number) => rational(BigInt(p), BigInt(q));

function questionsOf(form: Form) {
  const rng = createRng(770 + FORMS.indexOf(form));
  return Array.from({ length: PER_FORM }, () => buildFractionProblem(rng, form));
}

const isWhole = (value: Rational) => value.den === 1n;
const times = (fraction: Rational, n: number) => {
  const value = rational(fraction.num * BigInt(n), fraction.den);
  return value;
};
const fractionsIn = (prompt: string) =>
  [...prompt.matchAll(/(\d+)\/(\d+)/g)].map((m) => frac(Number(m[1]), Number(m[2])));

describe('FRACTIONS', () => {
  it('are the proper fractions in lowest terms with the spec denominators', () => {
    for (const fraction of FRACTIONS) {
      expect(DENOMINATORS as readonly number[]).toContain(Number(fraction.den));
      expect(fraction.num < fraction.den).toBe(true);
    }
    expect(FRACTIONS).toHaveLength(23);
  });
});

describe('spec examples', () => {
  it('rest: 32 leerlingen, 3/8 fiets, 1/4 bus → 12', () => {
    const step = stepOf(restQuestion('leerlingen', 32, frac(3, 8), frac(1, 4)));
    expect(step.kind).toBe('number');
    expect(step.prompt).toBe(
      'Van de 32 leerlingen komt 3/8 op de fiets en 1/4 met de bus. De rest loopt. Hoeveel leerlingen lopen?',
    );
    expect(step.suffix).toBe('leerlingen');
    expect(step.check('12')).toMatchObject({
      correct: true,
      expected: '12',
      explanation: '3/8 van 32 = 12, 1/4 van 32 = 8 → 32 − 12 − 8 = 12',
    });
    expect(step.check('20').correct).toBe(false);
  });

  it('part of rest: € 60, 1/3 and then 1/4 of the rest → 30, or 10 for the second part', () => {
    const left = stepOf(partOfRestQuestion('geld', 60, frac(1, 3), frac(1, 4), false));
    expect(left.prefix).toBe('€');
    expect(left.prompt).toBe(
      `Je hebt ${formatEuro(fromInteger(60))}. Je geeft 1/3 uit aan een boek en van wat over is 1/4 aan eten. Hoeveel houd je over?`,
    );
    expect(left.check('30')).toMatchObject({
      correct: true,
      expected: '30',
      explanation: '1/3 van 60 = 20 → 40 over → 1/4 van 40 = 10 → 40 − 10 = 30',
    });
    const second = stepOf(partOfRestQuestion('geld', 60, frac(1, 3), frac(1, 4), true));
    expect(second.prompt).toContain('Hoeveel geef je uit aan eten?');
    expect(second.check('10')).toMatchObject({
      correct: true,
      explanation: '1/3 van 60 = 20 → 40 over → 1/4 van 40 = 10',
    });
  });

  it('whole: 2/5 = 12 kinderen → 30', () => {
    const step = stepOf(wholeQuestion('klas', frac(2, 5), 6));
    expect(step.prompt).toBe(
      '2/5 van de klas is jongen. Dat zijn 12 kinderen. Hoeveel kinderen zitten er in de klas?',
    );
    expect(step.check('30')).toMatchObject({
      correct: true,
      explanation: '2/5 = 12 → 1/5 = 6 → 5/5 = 30',
    });
    expect(stepOf(wholeQuestion('tank', frac(1, 4), 3)).check('12').explanation).toBe(
      '1/4 = 3 → 4/4 = 12',
    );
    expect(stepOf(wholeQuestion('tank', frac(1, 4), 3)).prompt).toMatch(/^De tank is 1\/4 vol\. /);
  });

  it('which part: 12 jongens of 30 → 3/5, and 18/30 is not simplest', () => {
    const step = stepOf(whichPartQuestion('klas', 30, 12));
    expect(step.kind).toBe('fraction');
    expect(step.prompt).toBe(
      'In een klas van 30 kinderen zitten 12 jongens. Welk deel van de klas is meisje?',
    );
    expect(step.check('3/5')).toMatchObject({
      correct: true,
      expected: '3/5',
      explanation: '30 − 12 = 18 meisjes → 18/30 = 3/5',
    });
    expect(step.check('18/30').correct).toBe(false);
    expect(step.check('0,6').correct).toBe(false);
  });
});

describe('generateFractionProblems', () => {
  it('produces all four forms, each accepting its expected answer', () => {
    const rng = createRng(2);
    const seen = new Set<string>();
    for (let i = 0; i < 1500; i++) {
      const question = generateFractionProblems(rng);
      expect(question.topic).toBe('fractionProblems');
      seen.add(question.key.split(':')[1]!);
      const step = stepOf(question);
      expect(step.check(step.check('').expected).correct).toBe(true);
    }
    expect([...seen].sort()).toEqual([...FORMS].sort());
  });

  it('never puts a number and a fraction side by side', () => {
    for (const form of FORMS) {
      for (const question of questionsOf(form)) {
        const { prompt, explanation } = {
          prompt: stepOf(question).prompt,
          explanation: stepOf(question).check('').explanation ?? '',
        };
        expect(prompt).not.toMatch(/\d[  ]\d+\/\d+/);
        expect(explanation).not.toMatch(/\d \d+\/\d+/);
        expect(`${prompt} ${explanation}`).not.toMatch(/\d,\d+\/|\/\d+,\d/);
      }
    }
  });

  describe('rest', () => {
    const questions = questionsOf('rest');

    it('takes two fractions with different denominators below 1, all parts whole, rest at least 1', () => {
      const contexts = new Set<string>();
      for (const question of questions) {
        const step = stepOf(question);
        const [, , context, total] = question.key.split(':');
        contexts.add(context!);
        const n = Number(total);
        expect(n).toBeGreaterThanOrEqual(12);
        expect(n).toBeLessThanOrEqual(60);
        const [a, b] = fractionsIn(step.prompt);
        expect(a!.den).not.toBe(b!.den);
        expect(DENOMINATORS as readonly number[]).toContain(Number(a!.den));
        expect(DENOMINATORS as readonly number[]).toContain(Number(b!.den));
        expect(isWhole(times(a!, n))).toBe(true);
        expect(isWhole(times(b!, n))).toBe(true);
        const rest = n - Number(times(a!, n).num) - Number(times(b!, n).num);
        expect(rest).toBeGreaterThanOrEqual(1);
        expect(step.check(String(rest)).correct).toBe(true);
        expect(step.suffix).toBe(REST_CONTEXTS[context!]!.suffix);
      }
      expect([...contexts].sort()).toEqual(['bezoekers', 'boeken', 'leerlingen']);
    });
  });

  describe('partOfRest', () => {
    const questions = questionsOf('partOfRest');

    it('keeps every intermediate result whole and money a multiple of 5', () => {
      const contexts = new Set<string>();
      const asked = new Set<string>();
      for (const question of questions) {
        const step = stepOf(question);
        const [, , context, ask, total] = question.key.split(':');
        contexts.add(context!);
        asked.add(ask!);
        const n = Number(total);
        const { maxTotal, multipleOf } = PART_OF_REST_CONTEXTS[context!]!;
        expect(n).toBeGreaterThanOrEqual(12);
        expect(n).toBeLessThanOrEqual(maxTotal);
        expect(n % multipleOf).toBe(0);
        const [first, second] = fractionsIn(step.prompt);
        const firstPart = times(first!, n);
        expect(isWhole(firstPart)).toBe(true);
        const left = n - Number(firstPart.num);
        const secondPart = times(second!, left);
        expect(isWhole(secondPart)).toBe(true);
        const answer = ask === 'second' ? Number(secondPart.num) : left - Number(secondPart.num);
        expect(answer).toBeGreaterThanOrEqual(1);
        expect(step.check(String(answer)).correct).toBe(true);
        expect(step.prefix).toBe(context === 'geld' ? '€' : undefined);
      }
      expect([...contexts].sort()).toEqual(['geld', 'snoepjes', 'taart']);
      expect([...asked].sort()).toEqual(['left', 'second']);
    });
  });

  describe('whole', () => {
    const questions = questionsOf('whole');

    it('gives the part p × m with m in 2 to 12 and the whole q × m', () => {
      const contexts = new Set<string>();
      const factors = new Set<number>();
      for (const question of questions) {
        const step = stepOf(question);
        const [, , context, fraction, m] = question.key.split(':');
        contexts.add(context!);
        factors.add(Number(m));
        const [p, q] = fraction!.split('/').map(Number) as [number, number];
        expect(gcd(p, q)).toBe(1);
        expect(p).toBeLessThan(q);
        expect(step.prompt).toContain(`${p}/${q}`);
        expect(step.prompt).toContain(` ${p * Number(m)} `);
        expect(step.check(String(q * Number(m))).correct).toBe(true);
        const { minWhole, maxWhole } = WHOLE_CONTEXTS[context!]!;
        expect(q * Number(m)).toBeGreaterThanOrEqual(minWhole);
        expect(q * Number(m)).toBeLessThanOrEqual(maxWhole);
      }
      expect([...contexts].sort()).toEqual(['boek', 'klas', 'tank']);
      expect([...factors].sort((a, b) => a - b)).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    });
  });

  describe('whichPart', () => {
    const questions = questionsOf('whichPart');

    it('asks for the other part as a fraction in lowest terms with a denominator of at most 12', () => {
      const contexts = new Set<string>();
      for (const question of questions) {
        const step = stepOf(question);
        expect(step.kind).toBe('fraction');
        const [, , context, total, given] = question.key.split(':');
        contexts.add(context!);
        const [n, a] = [Number(total), Number(given)];
        expect(n).toBeGreaterThanOrEqual(12);
        expect(n).toBeLessThanOrEqual(WHICH_PART_CONTEXTS[context!]!.maxTotal);
        const answer = rational(BigInt(n - a), BigInt(n));
        expect(answer.den).toBeLessThanOrEqual(12n);
        const typed = `${answer.num}/${answer.den}`;
        expect(step.check(typed).correct).toBe(true);
        expect(step.check(String(Number(answer.num) / Number(answer.den)).replace('.', ',')).correct).toBe(false);
        if (n - a !== Number(answer.num)) {
          expect(step.check(`${n - a}/${n}`).correct).toBe(false);
        }
        expect(step.check('').expected).toBe(answer.den === 1n ? String(answer.num) : typed);
      }
      expect([...contexts].sort()).toEqual(['boek', 'klas', 'tank']);
    });
  });
});
