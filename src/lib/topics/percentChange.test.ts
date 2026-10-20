import { describe, expect, it } from 'vitest';
import { createRng } from '../random';
import {
  divide,
  equals,
  fromInteger,
  HUNDRED,
  multiply,
  rational,
  type Rational,
} from '../rational';
import { parseAnswer } from '../steps';
import type { Question, Step } from '../types';
import { DISCOUNT_PERCENTAGES, NICE_WHOLES, percentOf, PERCENTAGES } from './percentages';
import {
  changeQuestion,
  generatePercentChange,
  percentageChangeExplanation,
  percentageChangeTip,
  type ChangeContext,
} from './percentChange';

function stepOf(question: Question): Step {
  return question.steps[0]!;
}

/** The result of typing `input` on a price question from `oldValue` to `newValue`. */
function check(oldValue: number, newValue: number, input: string) {
  return stepOf(changeQuestion('price', oldValue, newValue)).check(input);
}

describe('changeQuestion', () => {
  it.each<[ChangeContext, number, number, string]>([
    ['price', 80, 92, 'Een prijs gaat van €\u{a0}80 naar €\u{a0}92. Hoeveel procent stijging?'],
    ['price', 250, 200, 'Een prijs gaat van €\u{a0}250 naar €\u{a0}200. Hoeveel procent daling?'],
    ['inhabitants', 800, 920, 'Een dorp gaat van 800 naar 920 inwoners. Hoeveel procent stijging?'],
    [
      'visitors',
      400,
      340,
      'Een museum gaat van 400 naar 340 bezoekers per dag. Hoeveel procent daling?',
    ],
    [
      'visitors',
      1000,
      2500,
      'Een museum gaat van 1000 naar 2500 bezoekers per dag. Hoeveel procent stijging?',
    ],
  ])('words the %s question from %i to %i', (context, oldValue, newValue, prompt) => {
    expect(stepOf(changeQuestion(context, oldValue, newValue)).prompt).toBe(prompt);
  });

  it('is a single percentage fraction step with a key of the form and its numbers', () => {
    const question = changeQuestion('inhabitants', 800, 920);
    expect(question.topic).toBe('percentChange');
    expect(question.key).toBe('percentChange:change:inhabitants:800:920');
    expect(question.steps).toHaveLength(1);
    expect(stepOf(question).kind).toBe('fraction');
    expect(stepOf(question).suffix).toBe('%');
    expect(stepOf(question).prefix).toBeUndefined();
  });

  it('rejects a change that is not a supported percentage of the old value', () => {
    // +100% is no increase of the list, 87/80 is 8,75%, and 0 is no value.
    expect(() => changeQuestion('price', 80, 160)).toThrow(RangeError);
    expect(() => changeQuestion('price', 80, 87)).toThrow(RangeError);
    expect(() => changeQuestion('price', 80, 80)).toThrow(RangeError);
    expect(() => changeQuestion('price', 80, 0)).toThrow(RangeError);
  });
});

describe('percentage change answers', () => {
  it.each([
    [80, 92, '15'],
    [80, 92, '30/2'],
    [400, 340, '15'],
    [80, 100, '25'],
    [80, 90, '12,5'],
    [80, 90, '25/2'],
    [80, 90, '12 1/2'],
  ])('accepts %i to %i answered with %s', (oldValue, newValue, input) => {
    const result = check(oldValue, newValue, input);
    expect(result.correct).toBe(true);
    expect(result.tip).toBeUndefined();
  });

  it('shows 12½ as a mixed number', () => {
    expect(check(80, 90, '').expected).toBe('12 1/2');
    expect(check(80, 92, '').expected).toBe('15');
  });

  it('names the increase itself', () => {
    const result = check(80, 92, '12');
    expect(result.correct).toBe(false);
    expect(result.tip).toBe('Dat is de stijging zelf; reken uit hoeveel procent van 80 dat is.');
  });

  it('names the new value as a percentage of the old, for an increase', () => {
    expect(check(80, 92, '115').tip).toBe(
      'Dat is 92 als percentage van 80; de stijging is 115% \u{2212} 100% = 15%.',
    );
    expect(check(80, 90, '112 1/2').tip).toBe(
      'Dat is 90 als percentage van 80; de stijging is 112½% \u{2212} 100% = 12½%.',
    );
  });

  it('names the change relative to the new value, for an increase', () => {
    expect(check(200, 250, '20').tip).toBe(
      'Reken met de oude waarde: de stijging is een percentage van 200, niet van 250.',
    );
  });

  it('names the decrease itself', () => {
    expect(check(400, 340, '60').tip).toBe(
      'Dat is de daling zelf; reken uit hoeveel procent van 400 dat is.',
    );
  });

  it('names the new value as a percentage of the old, for a decrease', () => {
    expect(check(400, 340, '85').tip).toBe(
      'Dat is 340 als percentage van 400; de daling is 100% \u{2212} 85% = 15%.',
    );
  });

  it('names the change relative to the new value, for a decrease', () => {
    expect(check(250, 200, '25').tip).toBe(
      'Reken met de oude waarde: de daling is een percentage van 250, niet van 200.',
    );
  });

  it('names the change before the other mistakes it equals', () => {
    // 80 to 100: the change 20 is also 20/100 × 100, the change relative to the new value.
    expect(check(80, 100, '20').tip).toBe(
      'Dat is de stijging zelf; reken uit hoeveel procent van 80 dat is.',
    );
  });

  it('falls back to the factor-of-ten tip', () => {
    expect(check(80, 92, '150').tip).toBe(
      'Je antwoord is 10 keer te groot. Let op de komma en het aantal nullen.',
    );
    expect(check(80, 92, '1,5').tip).toBe(
      'Je antwoord is 10 keer te klein. Let op de komma en het aantal nullen.',
    );
  });

  it('gives no tip for an unrelated or unparsable answer', () => {
    expect(check(80, 92, '7').correct).toBe(false);
    expect(check(80, 92, '7').tip).toBeUndefined();
    expect(check(80, 92, '').correct).toBe(false);
    expect(check(80, 92, '').tip).toBeUndefined();
  });

  it('carries the explanation for a correct and a wrong answer', () => {
    const explanation = '92 \u{2212} 80 = 12 → 10% = 8, 5% = 4 → 15% = 12';
    expect(check(80, 92, '15').explanation).toBe(explanation);
    expect(check(80, 92, '1').explanation).toBe(explanation);
  });
});

describe('percentageChangeTip', () => {
  const tip = percentageChangeTip(80, 92);

  it('recognises an answer by its value, however it was typed', () => {
    expect(tip(rational(230n, 2n))).toContain('115%');
    expect(tip(rational(24n, 2n))).toContain('stijging zelf');
  });

  it('names a change relative to the new value that is no terminating decimal', () => {
    // 12 / 92 × 100 = 300/23
    expect(tip(rational(300n, 23n))).toBe(
      'Reken met de oude waarde: de stijging is een percentage van 80, niet van 92.',
    );
    expect(check(80, 92, '300/23').tip).toBe(tip(rational(300n, 23n)));
  });

  it('gives no tip for an unrelated answer', () => {
    expect(tip(fromInteger(7))).toBeUndefined();
    expect(tip(fromInteger(0))).toBeUndefined();
  });
});

describe('percentageChangeExplanation', () => {
  it.each([
    [80, 92, '92 \u{2212} 80 = 12 → 10% = 8, 5% = 4 → 15% = 12'],
    [400, 340, '400 \u{2212} 340 = 60 → 10% = 40, 5% = 20 → 15% = 60'],
    [80, 100, '100 \u{2212} 80 = 20 → 25% = 80 : 4 = 20'],
    [80, 90, '90 \u{2212} 80 = 10 → 12½% = 80 : 8 = 10'],
    [80, 176, '176 \u{2212} 80 = 96 → 10% = 80 : 10 = 8 → 120% = 12 × 8 = 96'],
    [500, 495, '500 \u{2212} 495 = 5 → 1% = 500 : 100 = 5'],
    [1000, 2500, '2500 \u{2212} 1000 = 1500 → 50% = 1000 : 2 = 500 → 150% = 3 × 500 = 1500'],
  ])('explains %i to %i', (oldValue, newValue, expected) => {
    expect(percentageChangeExplanation(oldValue, newValue)).toBe(expected);
  });
});

describe('every supported change', () => {
  const changes = [false, true].flatMap((increase) =>
    (increase ? PERCENTAGES : DISCOUNT_PERCENTAGES).flatMap((p) =>
      NICE_WHOLES.flatMap((oldValue) => {
        const change = percentOf(p.value, fromInteger(oldValue));
        if (change.den !== 1n) return [];
        const newValue = oldValue + (increase ? 1 : -1) * Number(change.num);
        return [{ p, increase, oldValue, newValue }];
      }),
    ),
  );

  it('has changes for every percentage in both directions', () => {
    expect(changes.length).toBeGreaterThan(500);
    const used = (increase: boolean) =>
      new Set(changes.filter((change) => change.increase === increase).map(({ p }) => p));
    expect(used(true).size).toBe(PERCENTAGES.length);
    expect(used(false).size).toBe(DISCOUNT_PERCENTAGES.length);
  });

  it('builds a question with an explanation and tips that name each mistake', () => {
    for (const { p, oldValue, newValue } of changes) {
      const name = `${oldValue} to ${newValue}`;
      const old = fromInteger(oldValue);
      const now = fromInteger(newValue);
      const change = fromInteger(Math.abs(newValue - oldValue));
      const step = stepOf(changeQuestion('price', oldValue, newValue));
      expect(step.check(step.check('').expected).correct, name).toBe(true);
      expect(step.check('').explanation, name).toBe(
        percentageChangeExplanation(oldValue, newValue),
      );
      const tip = percentageChangeTip(oldValue, newValue);
      const mistakes: Rational[] = [
        change,
        divide(multiply(now, HUNDRED), old),
        divide(multiply(change, HUNDRED), now),
      ];
      for (const mistake of mistakes) {
        // The correct answer never reaches a tip; the mistakes can coincide with it (50% less).
        if (equals(mistake, p.value)) continue;
        expect(tip(mistake), name).toEqual(expect.any(String));
      }
    }
  });
});

describe('generatePercentChange', () => {
  const COUNT = 1000;
  const rng = createRng(31);
  const questions = Array.from({ length: COUNT }, () => generatePercentChange(rng));

  function numbersOf(question: Question) {
    const [, form, context, oldValue, newValue] = question.key.split(':');
    return { form, context, oldValue: Number(oldValue), newValue: Number(newValue) };
  }

  function answerOf(question: Question): Rational {
    return parseAnswer('fraction', stepOf(question).check('').expected)!;
  }

  function isIncrease(question: Question): boolean {
    const { oldValue, newValue } = numbersOf(question);
    return newValue > oldValue;
  }

  it('creates single-step questions that accept their own answer', () => {
    for (const question of questions) {
      expect(question.topic).toBe('percentChange');
      expect(question.key.startsWith('percentChange:change:')).toBe(true);
      expect(question.steps).toHaveLength(1);
      expect(stepOf(question).kind).toBe('fraction');
      expect(stepOf(question).suffix).toBe('%');
      expect(stepOf(question).prompt).not.toBe('');
      const result = stepOf(question).check(stepOf(question).check('').expected);
      expect(result.correct).toBe(true);
      expect(result.explanation).toBeTruthy();
    }
  });

  it('changes a nice whole into a positive whole number by a listed percentage', () => {
    for (const question of questions) {
      const { oldValue, newValue } = numbersOf(question);
      expect(NICE_WHOLES).toContain(oldValue);
      expect(Number.isInteger(newValue)).toBe(true);
      expect(newValue).toBeGreaterThan(0);
      expect(newValue).not.toBe(oldValue);
      const answer = answerOf(question);
      // Independent check: answer × old = |new − old| × 100.
      expect(
        equals(
          multiply(answer, fromInteger(oldValue)),
          multiply(fromInteger(Math.abs(newValue - oldValue)), HUNDRED),
        ),
      ).toBe(true);
      const allowed = isIncrease(question) ? PERCENTAGES : DISCOUNT_PERCENTAGES;
      expect(allowed.some(({ value }) => equals(value, answer))).toBe(true);
    }
  });

  it('words the direction to match the numbers', () => {
    for (const question of questions) {
      const prompt = stepOf(question).prompt;
      expect(prompt.endsWith(isIncrease(question) ? 'stijging?' : 'daling?')).toBe(true);
    }
  });

  it('uses all three contexts and both directions about equally often', () => {
    const share = (matches: (question: Question) => boolean) =>
      questions.filter(matches).length / COUNT;
    for (const context of ['price', 'inhabitants', 'visitors']) {
      const contextShare = share((question) => numbersOf(question).context === context);
      expect(contextShare, context).toBeGreaterThan(0.26);
      expect(contextShare, context).toBeLessThan(0.41);
    }
    const increases = share(isIncrease);
    expect(increases).toBeGreaterThan(0.43);
    expect(increases).toBeLessThan(0.57);
  });

  it('writes the euro sign with a no-break space in the price prompts only', () => {
    for (const question of questions) {
      const prompt = stepOf(question).prompt;
      if (numbersOf(question).context === 'price') {
        expect(prompt).toContain('€\u{a0}');
      } else {
        expect(prompt).not.toContain('€');
      }
    }
  });

  it('uses every percentage of both lists', () => {
    const used = (increase: boolean) =>
      PERCENTAGES.filter(({ value }) =>
        questions.some(
          (question) => isIncrease(question) === increase && equals(answerOf(question), value),
        ),
      );
    expect(used(true)).toHaveLength(PERCENTAGES.length);
    expect(used(false)).toHaveLength(DISCOUNT_PERCENTAGES.length);
  });

  it('is deterministic for a fixed seed', () => {
    const keys = (seed: number) => {
      const seeded = createRng(seed);
      return Array.from({ length: 50 }, () => generatePercentChange(seeded).key);
    };
    expect(keys(5)).toEqual(keys(5));
  });
});
