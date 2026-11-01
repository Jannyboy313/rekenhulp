import { describe, expect, it } from 'vitest';
import { createRng } from '../random';
import {
  generateDecimalNames,
  numberToWordsQuestion,
  PLACES,
  wordsToNumberQuestion,
} from './decimalNames';
import { decimal, stepOf } from './testHelpers';

const SAMPLES = 1500;

function sample() {
  const rng = createRng(73);
  return Array.from({ length: SAMPLES }, () => generateDecimalNames(rng));
}

describe('wordsToNumberQuestion', () => {
  it('writes acht duizendste, drie miljardste and vijfentwintig honderdste as decimals', () => {
    const cases: [number, string, string][] = [
      [8, 'duizendste', '0,008'],
      [3, 'miljardste', '0,000000003'],
      [25, 'honderdste', '0,25'],
    ];
    for (const [k, place, expected] of cases) {
      const step = stepOf(wordsToNumberQuestion(k, PLACES.findIndex((p) => p.name === place)));
      expect(step.kind).toBe('number');
      expect(step.check(expected)).toMatchObject({ correct: true, expected });
      expect(step.check('0,1').correct).toBe(false);
    }
  });

  it('prompts and explains as the spec', () => {
    const question = wordsToNumberQuestion(8, 2);
    const step = stepOf(question);
    expect(step.prompt).toBe('Schrijf als kommagetal: acht duizendste');
    expect(step.check('0,008').explanation).toBe('duizendste = 0,001 → 8 × 0,001 = 0,008');
    expect(question.key).toBe('decimalNames:words:8:duizendste');
  });
});

describe('numberToWordsQuestion', () => {
  it('offers four consecutive places in list order, with the answer', () => {
    const step = stepOf(numberToWordsQuestion(7, 2, 1));
    expect(step.kind).toBe('choice');
    expect(step.prompt).toBe('Hoe spreek je 0,007 uit?');
    expect(step.options).toEqual([
      'zeven honderdste',
      'zeven duizendste',
      'zeven tienduizendste',
      'zeven honderdduizendste',
    ]);
    expect(step.check('zeven duizendste')).toMatchObject({
      correct: true,
      explanation: '0,007: de 7 staat op de plek van de duizendsten → zeven duizendste',
    });
    expect(step.check('zeven honderdste').correct).toBe(false);
  });

  it('explains a multi-digit count by its last digit', () => {
    const step = stepOf(numberToWordsQuestion(25, 1, 0));
    expect(step.check('x').explanation).toBe(
      '0,25: het laatste cijfer staat op de plek van de honderdsten → vijfentwintig honderdste',
    );
  });
});

describe('generateDecimalNames', () => {
  const questions = sample();

  it('produces both directions with every place and count, 50/50', () => {
    const words = questions.filter((q) => q.key.startsWith('decimalNames:words:'));
    const names = questions.filter((q) => q.key.startsWith('decimalNames:number:'));
    expect(words.length + names.length).toBe(SAMPLES);
    expect(words.length / SAMPLES).toBeGreaterThan(0.45);
    expect(words.length / SAMPLES).toBeLessThan(0.55);
    for (const place of PLACES) {
      expect(words.some((q) => q.key.endsWith(`:${place.name}`))).toBe(true);
    }
    const counts = new Set(words.map((q) => q.key.split(':')[2]));
    expect([...counts].map(Number).sort((a, b) => a - b)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14, 15, 16, 17, 18, 19, 25, 75,
    ]);
  });

  it('accepts its expected answer and sets the topic', () => {
    for (const question of questions) {
      expect(question.topic).toBe('decimalNames');
      const step = stepOf(question);
      const { expected } = step.check('');
      expect(step.check(expected).correct).toBe(true);
    }
  });

  it('keeps the value of the words question equal to the typed expected answer', () => {
    for (const question of questions) {
      if (!question.key.startsWith('decimalNames:words:')) continue;
      const [, , k, place] = question.key.split(':');
      const exponent = PLACES.find((p) => p.name === place)!.exponent;
      const expected = stepOf(question).check('').expected;
      expect(decimal(expected).num * 10n ** BigInt(exponent)).toBe(
        BigInt(k!) * decimal(expected).den,
      );
    }
  });

  it('gives choice questions four distinct options of consecutive places in list order', () => {
    const order = PLACES.map((p) => p.name);
    for (const question of questions) {
      const step = stepOf(question);
      if (step.kind !== 'choice') continue;
      const options = step.options!;
      expect(new Set(options).size).toBe(4);
      const places = options.map((option) => option.slice(option.indexOf(' ') + 1));
      const indexes = places.map((place) => order.indexOf(place));
      expect(indexes).toEqual([indexes[0]!, indexes[0]! + 1, indexes[0]! + 2, indexes[0]! + 3]);
      expect(options).toContain(step.check('').expected);
    }
  });

  it('puts the answer at every position of the options', () => {
    const positions = new Set<number>();
    for (const question of questions) {
      const step = stepOf(question);
      if (step.kind === 'choice') positions.add(step.options!.indexOf(step.check('').expected));
    }
    expect([...positions].sort()).toEqual([0, 1, 2, 3]);
  });
});
