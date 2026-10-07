import { describe, expect, it } from 'vitest';
import { gcd } from '../primes';
import { createRng } from '../random';
import { rational } from '../rational';
import type { Question, Step } from '../types';
import {
  buildFractionConversion,
  CONVERSION_DIRECTIONS,
  type ConversionDirection,
  conversionQuestion,
  generateFractionConversion,
  PERCENTAGE_DENOMINATORS,
  TERMINATING_DENOMINATORS,
} from './fractionConversion';

const PER_DIRECTION = 600;

const PROMPTS: Record<ConversionDirection, RegExp> = {
  fractionToDecimal: /^Schrijf als kommagetal: \d+\/\d+$/u,
  decimalToFraction: /^Schrijf als breuk: 0,\d+$/u,
  fractionToPercentage: /^\d+\/\d+ = \?%$/u,
  percentageToFraction: /^Schrijf als breuk: \d+(?:,\d+| \d\/\d)?%$/u,
  decimalToPercentage: /^0,\d+ = \?%$/u,
  percentageToDecimal: /^Schrijf als kommagetal: \d+(?:,\d+)?%$/u,
};

function questionsOf(direction: ConversionDirection): Question[] {
  const rng = createRng(800 + CONVERSION_DIRECTIONS.indexOf(direction));
  return Array.from({ length: PER_DIRECTION }, () => buildFractionConversion(rng, direction));
}

function stepOf(question: Question): Step {
  return question.steps[0]!;
}

/** p and q from the key 'fractionConversion:direction:p/q'. */
function fractionOf(question: Question): [number, number] {
  const [p = '', q = ''] = question.key.split(':')[2]!.split('/');
  return [Number(p), Number(q)];
}

describe('generateFractionConversion', () => {
  it('produces all six directions about equally often, each accepting its answer', () => {
    const rng = createRng(1);
    const counts = new Map<string, number>();
    for (let i = 0; i < 1800; i++) {
      const question = generateFractionConversion(rng);
      expect(question.topic).toBe('fractionConversion');
      const step = stepOf(question);
      expect(step.check(step.check('').expected).correct, step.prompt).toBe(true);
      const direction = question.key.split(':')[1]!;
      counts.set(direction, (counts.get(direction) ?? 0) + 1);
    }
    expect([...counts.keys()].sort()).toEqual([...CONVERSION_DIRECTIONS].sort());
    for (const count of counts.values()) {
      expect(count).toBeGreaterThan(200);
      expect(count).toBeLessThan(400);
    }
  });
});

describe.each([...CONVERSION_DIRECTIONS])('%s', (direction) => {
  const questions = questionsOf(direction);
  const percentage = direction === 'fractionToPercentage' || direction === 'percentageToFraction';
  const denominators = percentage ? PERCENTAGE_DENOMINATORS : TERMINATING_DENOMINATORS;

  it('uses a proper fraction in lowest terms from the allowed denominators', () => {
    const seen = new Set<number>();
    for (const question of questions) {
      const [p, q] = fractionOf(question);
      expect(denominators).toContain(q);
      expect(p).toBeGreaterThan(0);
      expect(p).toBeLessThan(q);
      expect(gcd(p, q)).toBe(1);
      seen.add(q);
    }
    expect([...seen].sort((a, b) => a - b)).toEqual([...denominators].sort((a, b) => a - b));
  });

  it('writes the prompt in the expected shape', () => {
    for (const question of questions) {
      expect(stepOf(question).prompt).toMatch(PROMPTS[direction]);
    }
  });
});

describe('fraction → decimal', () => {
  it('explains via a power of ten and names the digits side by side', () => {
    const step = stepOf(conversionQuestion('fractionToDecimal', rational(3n, 8n)));
    expect(step.kind).toBe('number');
    expect(step.prompt).toBe('Schrijf als kommagetal: 3/8');
    expect(step.check('0,375')).toMatchObject({
      correct: true,
      expected: '0,375',
      explanation: '3/8 = 375/1000 = 0,375',
    });
    expect(step.check('3,8').tip).toBe('3/8 betekent 3 : 8, niet 3,8.');
    const tenths = stepOf(conversionQuestion('fractionToDecimal', rational(7n, 10n)));
    expect(tenths.check('0,7').explanation).toBe('7/10 = 0,7');
  });
});

describe('decimal → fraction', () => {
  const step = stepOf(conversionQuestion('decimalToFraction', rational(3n, 8n)));

  it('expects the fraction in simplest form', () => {
    expect(step.kind).toBe('fraction');
    expect(step.prompt).toBe('Schrijf als breuk: 0,375');
    expect(step.check('3/8')).toMatchObject({
      correct: true,
      expected: '3/8',
      explanation: '0,375 = 375/1000 = 3/8',
    });
    expect(step.check('375/1000').tip).toBe(
      'De waarde klopt, maar vereenvoudig nog: 375/1000 = 3/8.',
    );
    expect(step.check('0,375')).toMatchObject({
      correct: false,
      tip: 'Schrijf het antwoord als breuk, niet als kommagetal.',
    });
  });
});

describe('fraction → percentage', () => {
  it('accepts any equal value on the fraction keypad', () => {
    const step = stepOf(conversionQuestion('fractionToPercentage', rational(3n, 8n)));
    expect(step.kind).toBe('fraction');
    expect(step.prompt).toBe('3/8 = ?%');
    expect(step.suffix).toBe('%');
    expect(step.check('37,5')).toMatchObject({
      correct: true,
      expected: '37,5',
      explanation: '3/8 = 0,375 = 37,5%',
    });
    expect(step.check('75/2').correct).toBe(true);
    expect(step.check('0,375').tip).toBe('Procent betekent honderdste: vermenigvuldig met 100.');
  });

  it('writes thirds and sixths as mixed numbers', () => {
    const third = stepOf(conversionQuestion('fractionToPercentage', rational(1n, 3n)));
    expect(third.check('33 1/3')).toMatchObject({
      correct: true,
      expected: '33 1/3',
      explanation: '1/3 = 100% : 3 = 33 1/3%',
    });
    expect(third.check('100/3').correct).toBe(true);
    const sixths = stepOf(conversionQuestion('fractionToPercentage', rational(5n, 6n)));
    expect(sixths.check('83 1/3').explanation).toBe('5/6 = 5 × 16 2/3% = 83 1/3%');
  });
});

describe('percentage → fraction', () => {
  it('goes via the decimal for a terminating fraction', () => {
    const step = stepOf(conversionQuestion('percentageToFraction', rational(3n, 8n)));
    expect(step.kind).toBe('fraction');
    expect(step.prompt).toBe('Schrijf als breuk: 37,5%');
    expect(step.check('3/8')).toMatchObject({
      correct: true,
      explanation: '37,5% = 0,375 = 375/1000 = 3/8',
    });
    expect(step.check('0,375').tip).toBe('Schrijf het antwoord als breuk, niet als kommagetal.');
    const tenths = stepOf(conversionQuestion('percentageToFraction', rational(7n, 10n)));
    expect(tenths.prompt).toBe('Schrijf als breuk: 70%');
    expect(tenths.check('7/10').explanation).toBe('70% = 0,7 = 7/10');
    expect(tenths.check('70/100').tip).toBe(
      'De waarde klopt, maar vereenvoudig nog: 70/100 = 7/10.',
    );
  });

  it('goes via 100% for thirds and sixths', () => {
    const third = stepOf(conversionQuestion('percentageToFraction', rational(1n, 3n)));
    expect(third.prompt).toBe('Schrijf als breuk: 33 1/3%');
    expect(third.check('1/3').explanation).toBe('33 1/3% = 100% : 3 = 1/3');
    const twoThirds = stepOf(conversionQuestion('percentageToFraction', rational(2n, 3n)));
    expect(twoThirds.prompt).toBe('Schrijf als breuk: 66 2/3%');
    expect(twoThirds.check('2/3')).toMatchObject({
      correct: true,
      explanation: '66 2/3% = 2 × 33 1/3% = 2/3',
    });
  });
});

describe('decimal → percentage', () => {
  it('multiplies by 100% and names a forgotten × 100', () => {
    const step = stepOf(conversionQuestion('decimalToPercentage', rational(3n, 8n)));
    expect(step.kind).toBe('number');
    expect(step.prompt).toBe('0,375 = ?%');
    expect(step.suffix).toBe('%');
    expect(step.check('37,5')).toMatchObject({
      correct: true,
      explanation: '0,375 = 0,375 × 100% = 37,5%',
    });
    expect(step.check('0,375').tip).toBe('Procent betekent honderdste: vermenigvuldig met 100.');
  });
});

describe('percentage → decimal', () => {
  it('divides by 100 and names a forgotten : 100', () => {
    const step = stepOf(conversionQuestion('percentageToDecimal', rational(3n, 8n)));
    expect(step.kind).toBe('number');
    expect(step.prompt).toBe('Schrijf als kommagetal: 37,5%');
    expect(step.check('0,375')).toMatchObject({
      correct: true,
      explanation: '37,5% = 37,5 : 100 = 0,375',
    });
    expect(step.check('37,5').tip).toBe('Procent betekent honderdste: deel door 100.');
    expect(step.check('3,75').tip).toBe(
      'Je antwoord is 10 keer te groot. Let op de komma en het aantal nullen.',
    );
  });
});
