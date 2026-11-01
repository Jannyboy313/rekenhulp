import { describe, expect, it } from 'vitest';
import { gcd } from '../primes';
import { createRng } from '../random';
import {
  CONCEPTS,
  conceptQuestion,
  equivalentQuestion,
  generateFractionConcepts,
} from './fractionConcepts';
import { stepOf } from './testHelpers';

const SAMPLES = 2000;

const termIndex = (term: string) => CONCEPTS.findIndex((concept) => concept.term === term);

function sample() {
  const rng = createRng(75);
  return Array.from({ length: SAMPLES }, () => generateFractionConcepts(rng));
}

describe('conceptQuestion', () => {
  it('asks Wat is een stambreuk? with definitions as options', () => {
    const step = stepOf(conceptQuestion(termIndex('stambreuk'), 'definition', createRng(1)));
    expect(step.kind).toBe('choice');
    expect(step.prompt).toBe('Wat is een stambreuk?');
    expect(step.options).toContain('een breuk met teller 1');
    expect(step.check('een breuk met teller 1')).toMatchObject({
      correct: true,
      expected: 'een breuk met teller 1',
      explanation: 'Een stambreuk is een breuk met teller 1, zoals 1/5.',
    });
    expect(step.check('het getal boven de breukstreep').correct).toBe(false);
  });

  it('asks Hoe heet een breuk met teller 1? with terms as options', () => {
    const step = stepOf(conceptQuestion(termIndex('stambreuk'), 'term', createRng(2)));
    expect(step.prompt).toBe('Hoe heet een breuk met teller 1?');
    expect(step.check('stambreuk').correct).toBe(true);
    expect(step.options).toContain('teller');
  });

  it('uses the plural forms for plural terms', () => {
    const term = termIndex('gelijknamige breuken');
    expect(stepOf(conceptQuestion(term, 'definition', createRng(3))).prompt).toBe(
      'Wat zijn gelijknamige breuken?',
    );
    const step = stepOf(conceptQuestion(term, 'term', createRng(3)));
    expect(step.prompt).toBe('Hoe heten breuken met dezelfde noemer?');
    expect(step.check('gelijknamige breuken').correct).toBe(true);
  });

  it('has every term in the spec list with a distinct definition', () => {
    expect(CONCEPTS.map(({ term }) => term)).toEqual([
      'teller',
      'noemer',
      'stambreuk',
      'onechte breuk',
      'gemengd getal',
      'samengestelde breuk',
      'gelijknamige breuken',
      'gelijkwaardige breuken',
    ]);
    expect(new Set(CONCEPTS.map(({ definition }) => definition)).size).toBe(CONCEPTS.length);
  });
});

describe('equivalentQuestion', () => {
  it('offers kp/kq, p+k over q+k, q/p and p over q+1 for 3/4 with k = 3', () => {
    const step = stepOf(equivalentQuestion(3, 4, 3, createRng(1)));
    expect(step.prompt).toBe('Welke breuk is gelijkwaardig aan 3/4?');
    expect([...step.options!].sort()).toEqual(['4/3', '3/5', '6/7', '9/12'].sort());
    expect(step.check('9/12')).toMatchObject({
      correct: true,
      explanation: '3/4 = 9/12 (teller en noemer × 3)',
    });
    expect(step.check('6/7').correct).toBe(false);
  });
});

describe('generateFractionConcepts', () => {
  const questions = sample();

  it('sets the topic, accepts the expected answer and keeps four distinct options', () => {
    for (const question of questions) {
      expect(question.topic).toBe('fractionConcepts');
      const step = stepOf(question);
      expect(step.kind).toBe('choice');
      expect(new Set(step.options).size).toBe(4);
      const { expected } = step.check('');
      expect(step.options).toContain(expected);
      expect(step.check(expected).correct).toBe(true);
      expect(step.check('').correct).toBe(false);
    }
  });

  it('splits 50/50 between concepts and equivalents, using every term in both directions', () => {
    const concepts = questions.filter((q) => q.key.startsWith('fractionConcepts:concept:'));
    expect(concepts.length / SAMPLES).toBeGreaterThan(0.45);
    expect(concepts.length / SAMPLES).toBeLessThan(0.55);
    const seen = new Set(concepts.map((q) => q.key.split(':').slice(2).join(':')));
    for (const { term } of CONCEPTS) {
      expect(seen.has(`definition:${term}`), term).toBe(true);
      expect(seen.has(`term:${term}`), term).toBe(true);
    }
  });

  it('draws proper fractions in lowest terms with q in 3 to 10 and k in 2 to 5', () => {
    const factors = new Set<number>();
    const denominators = new Set<number>();
    for (const question of questions) {
      if (!question.key.startsWith('fractionConcepts:equivalent:')) continue;
      const [, , fraction, k] = question.key.split(':');
      const [p, q] = fraction!.split('/').map(Number) as [number, number];
      expect(q).toBeGreaterThanOrEqual(3);
      expect(q).toBeLessThanOrEqual(10);
      expect(p).toBeGreaterThanOrEqual(1);
      expect(p).toBeLessThan(q);
      expect(gcd(p, q)).toBe(1);
      factors.add(Number(k));
      denominators.add(q);
      const step = stepOf(question);
      expect(step.prompt).toBe(`Welke breuk is gelijkwaardig aan ${p}/${q}?`);
      expect(step.check('').expected).toBe(`${Number(k) * p}/${Number(k) * q}`);
    }
    expect([...factors].sort()).toEqual([2, 3, 4, 5]);
    expect([...denominators].sort((a, b) => a - b)).toEqual([3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('puts the answer at every position', () => {
    const positions = new Set(
      questions.map((q) => stepOf(q).options!.indexOf(stepOf(q).check('').expected)),
    );
    expect([...positions].sort()).toEqual([0, 1, 2, 3]);
  });
});
