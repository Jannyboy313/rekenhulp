import { describe, expect, it } from 'vitest';
import { createRng } from '../random';
import {
  add,
  decimalPlaces,
  divide,
  equals,
  fromInteger,
  HUNDRED,
  isInteger,
  multiply,
  parseDutchNumber,
  rational,
  roundHalfUpToCents,
  subtract,
  type Rational,
} from '../rational';
import { parseAnswer } from '../steps';
import type { Question } from '../types';
import {
  DISCOUNT_PERCENTAGES,
  formatPercentage,
  INCREASE_PERCENTAGES,
  NICE_WHOLES,
  percentOf,
  PERCENTAGES,
  type Percentage,
} from './percentages';
import {
  changeQuestion,
  generatePercentChange,
  originalExplanation,
  originalQuestion,
  originalTip,
  percentageChangeExplanation,
  percentageChangeTip,
  vatAddedTip,
  vatExplanation,
  vatQuestion,
  vatRemovedTip,
  type ChangeContext,
  type VatRate,
} from './percentChange';
import { stepOf } from './testHelpers';

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

  it('rejects a village of fewer than 100 inhabitants, but not a price or museum of 10', () => {
    // 90 to 99 and 10 to 11 are +10%, a supported percentage, so only the village is the problem.
    expect(() => changeQuestion('inhabitants', 90, 99)).toThrow(RangeError);
    expect(() => changeQuestion('inhabitants', 10, 11)).toThrow(RangeError);
    expect(() => changeQuestion('inhabitants', 100, 110)).not.toThrow();
    expect(() => changeQuestion('price', 10, 11)).not.toThrow();
    expect(() => changeQuestion('visitors', 90, 99)).not.toThrow();
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

  it('shows 12 1/2 as a mixed number', () => {
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
      'Dat is 90 als percentage van 80; de stijging is 112 1/2% \u{2212} 100% = 12 1/2%.',
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
    [80, 90, '90 \u{2212} 80 = 10 → 12 1/2% = 80 : 8 = 10'],
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

  it('has an old value of at least 100 for every percentage, so a village can use each', () => {
    for (const increase of [false, true]) {
      for (const p of increase ? PERCENTAGES : DISCOUNT_PERCENTAGES) {
        const found = changes.some(
          (change) => change.p === p && change.increase === increase && change.oldValue >= 100,
        );
        expect(found, `${formatPercentage(p.value)}%, increase ${increase}`).toBe(true);
      }
    }
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

/** The entry of the list of §5.12 with this value: `percentage(25)`, `percentage(12.5)`. */
function percentage(percent: number): Percentage {
  const value = rational(BigInt(Math.round(percent * 2)), 2n);
  return PERCENTAGES.find((candidate) => equals(candidate.value, value))!;
}

/** The result of typing `input` on a VAT question with this price without VAT. */
function checkVat(rate: VatRate, adding: boolean, withoutVat: number, input: string) {
  return stepOf(vatQuestion(rate, adding, withoutVat)).check(input);
}

describe('vatQuestion', () => {
  it.each<[VatRate, boolean, number, string]>([
    [21, true, 80, '€\u{a0}80 zonder btw. Met 21% btw = ?'],
    [9, true, 85, '€\u{a0}85 zonder btw. Met 9% btw = ?'],
    [21, false, 80, '€\u{a0}96,80 met 21% btw. Zonder btw = ?'],
    [9, false, 300, '€\u{a0}327 met 9% btw. Zonder btw = ?'],
  ])('words %i%% VAT, adding %s, on %i', (rate, adding, price, prompt) => {
    expect(stepOf(vatQuestion(rate, adding, price)).prompt).toBe(prompt);
  });

  it('is a single money step with a key of the direction, the rate and the price', () => {
    const question = vatQuestion(21, true, 80);
    expect(question.topic).toBe('percentChange');
    expect(question.key).toBe('percentChange:vat:add:21:80');
    expect(question.steps).toHaveLength(1);
    expect(stepOf(question).kind).toBe('number');
    expect(stepOf(question).prefix).toBe('€');
    expect(stepOf(question).suffix).toBeUndefined();
    expect(vatQuestion(9, false, 300).key).toBe('percentChange:vat:remove:9:300');
  });

  it('rejects a price without VAT that is no positive whole number', () => {
    for (const price of [0, -10, 12.5, Number.NaN]) {
      expect(() => vatQuestion(21, true, price), String(price)).toThrow(RangeError);
    }
  });
});

describe('VAT answers', () => {
  it.each<[VatRate, boolean, number, string]>([
    [21, true, 80, '96,80'],
    [21, true, 80, '96,8'],
    [9, true, 85, '92,65'],
    [21, false, 80, '80'],
    [9, false, 300, '300'],
  ])('accepts %i%% VAT, adding %s, on %i, answered with %s', (rate, adding, price, input) => {
    const result = checkVat(rate, adding, price, input);
    expect(result.correct).toBe(true);
    expect(result.tip).toBeUndefined();
  });

  it('shows the expected answer with 2 decimals, or whole', () => {
    expect(checkVat(21, true, 80, '').expected).toBe('96,80');
    expect(checkVat(21, true, 85, '').expected).toBe('102,85');
    expect(checkVat(21, false, 80, '').expected).toBe('80');
  });

  it('names the VAT itself, when adding', () => {
    const tip = 'Dat is de btw zelf; tel die nog op bij de prijs.';
    expect(checkVat(21, true, 80, '16,80').correct).toBe(false);
    expect(checkVat(21, true, 80, '16,80').tip).toBe(tip);
    expect(checkVat(9, true, 85, '7,65').tip).toBe(tip);
  });

  it('names the price minus the VAT rate of it, when removing', () => {
    const tip21 =
      'De btw is 21% van de prijs zonder btw. €\u{a0}96,80 is 121%: reken terug naar 1%.';
    expect(checkVat(21, false, 80, '76,47').tip).toBe(tip21);
    expect(checkVat(21, false, 80, '76,472').tip).toBe(tip21);
    expect(checkVat(9, false, 300, '297,57').tip).toBe(
      'De btw is 9% van de prijs zonder btw. €\u{a0}327 is 109%: reken terug naar 1%.',
    );
  });

  it('does not name a price that is neither exact nor rounded half up to cents', () => {
    // 96,80 minus 21% of 96,80 is 76,472.
    expect(checkVat(21, false, 80, '76,48').tip).toBeUndefined();
    expect(checkVat(21, false, 80, '76,4').tip).toBeUndefined();
  });

  it('names the VAT itself, when removing', () => {
    const tip = 'Dat is de btw; gevraagd is de prijs zonder btw.';
    expect(checkVat(21, false, 80, '16,80').tip).toBe(tip);
    expect(checkVat(9, false, 300, '27').tip).toBe(tip);
  });

  it('falls back to the factor-of-ten tip', () => {
    expect(checkVat(21, true, 80, '968').tip).toBe(
      'Je antwoord is 10 keer te groot. Let op de komma en het aantal nullen.',
    );
    expect(checkVat(21, true, 80, '9,68').tip).toBe(
      'Je antwoord is 10 keer te klein. Let op de komma en het aantal nullen.',
    );
  });

  it('gives no tip for an unrelated or unparsable answer', () => {
    expect(checkVat(21, true, 80, '7').correct).toBe(false);
    expect(checkVat(21, true, 80, '7').tip).toBeUndefined();
    expect(checkVat(21, false, 80, '').correct).toBe(false);
    expect(checkVat(21, false, 80, '').tip).toBeUndefined();
  });

  it('carries the explanation for a correct and a wrong answer', () => {
    const explanation = '121% = 96,80 → 1% = 96,80 : 121 = 0,80 → 100% = 80';
    expect(checkVat(21, false, 80, '80').explanation).toBe(explanation);
    expect(checkVat(21, false, 80, '1').explanation).toBe(explanation);
  });
});

describe('vatAddedTip and vatRemovedTip', () => {
  it('recognise an answer by its value, however it was typed', () => {
    // 16,80 = 84/5 and 76,472 = 9559/125.
    expect(vatAddedTip(21, 80)(rational(84n, 5n))).toContain('btw zelf');
    expect(vatRemovedTip(21, 80)(rational(9559n, 125n))).toContain('reken terug naar 1%');
    expect(vatRemovedTip(21, 80)(rational(84n, 5n))).toContain('gevraagd is de prijs zonder btw');
  });

  it('give no tip for an unrelated answer', () => {
    for (const tip of [vatAddedTip(21, 80), vatRemovedTip(21, 80)]) {
      expect(tip(fromInteger(7))).toBeUndefined();
      expect(tip(fromInteger(0))).toBeUndefined();
    }
  });
});

describe('vatExplanation', () => {
  it.each<[VatRate, boolean, number, string]>([
    [21, true, 80, '10% = 80 : 10 = 8, 20% = 16, 1% = 0,80 → 21% = 16,80 → 80 + 16,80 = 96,80'],
    [9, true, 80, '10% = 80 : 10 = 8, 1% = 0,80 → 9% = 8 \u{2212} 0,80 = 7,20 → 80 + 7,20 = 87,20'],
    [21, true, 85, '10% = 85 : 10 = 8,50, 20% = 17, 1% = 0,85 → 21% = 17,85 → 85 + 17,85 = 102,85'],
    [21, false, 80, '121% = 96,80 → 1% = 96,80 : 121 = 0,80 → 100% = 80'],
    [9, false, 300, '109% = 327 → 1% = 327 : 109 = 3 → 100% = 300'],
  ])('explains %i%% VAT, adding %s, without VAT %i', (rate, adding, price, expected) => {
    expect(vatExplanation(rate, adding, price)).toBe(expected);
  });
});

describe('every supported VAT price', () => {
  const ONE_DIGIT_PRICES = [10, 100].flatMap((unit) =>
    [1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => digit * unit),
  );
  const prices = ([21, 9] as const).flatMap((rate) => [
    ...NICE_WHOLES.map((without) => ({ rate, adding: true, without })),
    ...ONE_DIGIT_PRICES.map((without) => ({ rate, adding: false, without })),
  ]);

  it('has prices for both rates in both directions', () => {
    expect(prices.length).toBeGreaterThan(300);
  });

  it('builds a question with an explanation and tips that name each mistake', () => {
    for (const { rate, adding, without } of prices) {
      const name = `${adding ? 'add' : 'remove'} ${rate}% ${without}`;
      const base = fromInteger(without);
      const withVat = percentOf(fromInteger(100 + rate), base);
      const step = stepOf(vatQuestion(rate, adding, without));
      expect(step.check(step.check('').expected).correct, name).toBe(true);
      expect(step.check('').explanation, name).toBe(vatExplanation(rate, adding, without));
      const tip = adding ? vatAddedTip(rate, without) : vatRemovedTip(rate, without);
      const mistakes: [Rational, string][] = adding
        ? [[percentOf(fromInteger(rate), base), 'btw zelf']]
        : [
            [subtract(withVat, percentOf(fromInteger(rate), withVat)), 'reken terug naar 1%'],
            [subtract(withVat, base), 'gevraagd is de prijs zonder btw'],
          ];
      for (const [mistake, fragment] of mistakes) {
        for (const typed of [mistake, roundHalfUpToCents(mistake)]) {
          expect(tip(typed), name).toContain(fragment);
        }
      }
    }
  });
});

/** The result of typing `input` on an original-price question (default item). */
function checkOriginal(p: Percentage, increase: boolean, oldPrice: number, input: string) {
  return stepOf(originalQuestion(p, increase, oldPrice)).check(input);
}

describe('originalQuestion', () => {
  it.each<[number, boolean, number, string, string]>([
    [25, false, 80, 'een jas', 'Na 25% korting kost een jas €\u{a0}60. Wat was de oude prijs?'],
    [
      15,
      true,
      40,
      'een abonnement',
      'Na 15% verhoging kost een abonnement €\u{a0}46. Wat was de oude prijs?',
    ],
    [
      15,
      false,
      90,
      'een tent',
      'Na 15% korting kost een tent €\u{a0}76,50. Wat was de oude prijs?',
    ],
    [
      12.5,
      false,
      80,
      'een fiets',
      'Na 12 1/2% korting kost een fiets €\u{a0}70. Wat was de oude prijs?',
    ],
  ])('words %s%%, increase %s, old price %i, %s', (percent, increase, oldPrice, item, prompt) => {
    const question = originalQuestion(percentage(percent), increase, oldPrice, item);
    expect(stepOf(question).prompt).toBe(prompt);
  });

  it('names a jas after a discount and an abonnement after an increase by default', () => {
    expect(stepOf(originalQuestion(percentage(25), false, 80)).prompt).toContain('een jas');
    expect(stepOf(originalQuestion(percentage(25), true, 80)).prompt).toContain('een abonnement');
  });

  it('is a single money step with a key of the direction, the percentage and the old price', () => {
    const question = originalQuestion(percentage(25), false, 80);
    expect(question.topic).toBe('percentChange');
    expect(question.key).toBe('percentChange:original:discount:25:80');
    expect(question.steps).toHaveLength(1);
    expect(stepOf(question).kind).toBe('number');
    expect(stepOf(question).prefix).toBe('€');
    expect(stepOf(question).suffix).toBeUndefined();
    expect(originalQuestion(percentage(15), true, 40).key).toBe(
      'percentChange:original:increase:15:40',
    );
    expect(originalQuestion(percentage(12.5), false, 80).key).toBe(
      'percentChange:original:discount:12 1/2:80',
    );
  });

  it('leaves the item out of the key', () => {
    const jas = originalQuestion(percentage(25), false, 80, 'een jas');
    const tent = originalQuestion(percentage(25), false, 80, 'een tent');
    expect(jas.key).toBe(tent.key);
    expect(stepOf(jas).prompt).not.toBe(stepOf(tent).prompt);
  });

  it('rejects what the list does not allow or what is no whole number of cents', () => {
    // 120% is no discount and 75% no increase, 12 1/2% off 85 is 74,375, and 0 is no price.
    expect(() => originalQuestion(percentage(120), false, 80)).toThrow(RangeError);
    expect(() => originalQuestion(percentage(75), true, 80)).toThrow(RangeError);
    expect(() => originalQuestion(percentage(12.5), false, 85)).toThrow(RangeError);
    expect(() => originalQuestion(percentage(25), false, 0)).toThrow(RangeError);
    expect(() => originalQuestion(percentage(25), false, 12.5)).toThrow(RangeError);
  });
});

describe('original price answers', () => {
  it.each<[number, boolean, number, string]>([
    [25, false, 80, '80'],
    [15, true, 40, '40'],
    [15, false, 90, '90'],
    [15, false, 90, '90,00'],
  ])('accepts %s%%, increase %s, old %i, answered %s', (percent, increase, old, input) => {
    const result = checkOriginal(percentage(percent), increase, old, input);
    expect(result.correct).toBe(true);
    expect(result.tip).toBeUndefined();
  });

  it('shows the expected answer as money', () => {
    expect(checkOriginal(percentage(25), false, 80, '').expected).toBe('80');
    expect(checkOriginal(percentage(15), true, 40, '').expected).toBe('40');
  });

  it('names the percentage taken of the new price, after a discount', () => {
    const result = checkOriginal(percentage(25), false, 80, '75');
    expect(result.correct).toBe(false);
    expect(result.tip).toBe(
      'De korting is 25% van de oude prijs, niet van €\u{a0}60. €\u{a0}60 is 75% van de oude prijs.',
    );
  });

  it('names the percentage taken of the new price, after an increase', () => {
    expect(checkOriginal(percentage(15), true, 40, '39,10').tip).toBe(
      'De verhoging is 15% van de oude prijs, niet van €\u{a0}46. €\u{a0}46 is 115% van de oude prijs.',
    );
    expect(checkOriginal(percentage(15), true, 40, '39,1').tip).toBe(
      checkOriginal(percentage(15), true, 40, '39,10').tip,
    );
  });

  it('names the percentage taken of the new price when it has to be rounded to cents', () => {
    // 76,50 + 15% of 76,50 = 87,975.
    const tip =
      'De korting is 15% van de oude prijs, niet van €\u{a0}76,50. €\u{a0}76,50 is 85% van de oude prijs.';
    expect(checkOriginal(percentage(15), false, 90, '87,98').tip).toBe(tip);
    expect(checkOriginal(percentage(15), false, 90, '87,975').tip).toBe(tip);
    expect(checkOriginal(percentage(15), false, 90, '87,97').tip).toBeUndefined();
  });

  it('writes 12 1/2 in the tip', () => {
    // 70 + 12 1/2% of 70 = 78,75.
    expect(checkOriginal(percentage(12.5), false, 80, '78,75').tip).toBe(
      'De korting is 12 1/2% van de oude prijs, niet van €\u{a0}70. €\u{a0}70 is 87 1/2% van de oude prijs.',
    );
  });

  it('names the change in the wrong direction', () => {
    expect(checkOriginal(percentage(25), false, 80, '45').tip).toBe(
      'Na korting is de prijs lager, dus de oude prijs is hoger dan €\u{a0}60.',
    );
    expect(checkOriginal(percentage(15), true, 40, '52,90').tip).toBe(
      'Na een verhoging is de prijs hoger, dus de oude prijs is lager dan €\u{a0}46.',
    );
    expect(checkOriginal(percentage(15), true, 40, '52,9').tip).toBe(
      checkOriginal(percentage(15), true, 40, '52,90').tip,
    );
  });

  it('falls back to the factor-of-ten tip', () => {
    expect(checkOriginal(percentage(25), false, 80, '800').tip).toBe(
      'Je antwoord is 10 keer te groot. Let op de komma en het aantal nullen.',
    );
    expect(checkOriginal(percentage(25), false, 80, '8').tip).toBe(
      'Je antwoord is 10 keer te klein. Let op de komma en het aantal nullen.',
    );
  });

  it('gives no tip for an unrelated or unparsable answer', () => {
    expect(checkOriginal(percentage(25), false, 80, '7').correct).toBe(false);
    expect(checkOriginal(percentage(25), false, 80, '7').tip).toBeUndefined();
    expect(checkOriginal(percentage(25), false, 80, '').correct).toBe(false);
    expect(checkOriginal(percentage(25), false, 80, '').tip).toBeUndefined();
  });

  it('carries the explanation for a correct and a wrong answer', () => {
    const explanation = '75% = 60 → 25% = 20 → 100% = 80';
    expect(checkOriginal(percentage(25), false, 80, '80').explanation).toBe(explanation);
    expect(checkOriginal(percentage(25), false, 80, '1').explanation).toBe(explanation);
  });
});

describe('originalTip', () => {
  const tip = originalTip(percentage(25), false, fromInteger(60));

  it('recognises an answer by its value, however it was typed', () => {
    expect(tip(rational(150n, 2n))).toContain('75% van de oude prijs');
    expect(tip(rational(90n, 2n))).toContain('hoger dan');
  });

  it('gives no tip for an unrelated answer', () => {
    expect(tip(fromInteger(7))).toBeUndefined();
    expect(tip(fromInteger(0))).toBeUndefined();
  });
});

describe('originalExplanation', () => {
  it.each<[number, boolean, number, string]>([
    [25, false, 80, '75% = 60 → 25% = 20 → 100% = 80'],
    [15, true, 40, '115% = 46 → 5% = 2 → 100% = 40'],
    [50, false, 60, '50% = 30 → 100% = 60'],
    [12.5, false, 80, '87 1/2% = 70 → 12 1/2% = 10 → 100% = 80'],
    [12.5, true, 80, '112 1/2% = 90 → 12 1/2% = 10 → 100% = 80'],
    [15, false, 90, '85% = 76,50 → 5% = 4,50 → 100% = 90'],
    [20, false, 60, '80% = 48 → 20% = 12 → 100% = 60'],
    [40, false, 50, '60% = 30 → 20% = 10 → 100% = 50'],
    [80, false, 50, '20% = 10 → 100% = 50'],
    [1, true, 100, '101% = 101 → 1% = 1 → 100% = 100'],
    [50, true, 60, '150% = 90 → 50% = 30 → 100% = 60'],
  ])('explains %s%%, increase %s, old price %i', (percent, increase, oldPrice, expected) => {
    expect(originalExplanation(percentage(percent), increase, oldPrice)).toBe(expected);
  });
});

describe('every supported original price', () => {
  const originals = [false, true].flatMap((increase) =>
    (increase ? INCREASE_PERCENTAGES : DISCOUNT_PERCENTAGES).flatMap((p) =>
      NICE_WHOLES.flatMap((oldPrice) => {
        const factor = increase ? add(HUNDRED, p.value) : subtract(HUNDRED, p.value);
        const newPrice = percentOf(factor, fromInteger(oldPrice));
        const decimals = decimalPlaces(newPrice);
        // Only 12 1/2% can leave a new price that is no whole number of cents.
        return decimals !== null && decimals <= 2 ? [{ p, increase, oldPrice, newPrice }] : [];
      }),
    ),
  );

  it('has prices for every percentage in both directions', () => {
    expect(originals.length).toBeGreaterThan(2000);
    const used = (increase: boolean) =>
      new Set(originals.filter((original) => original.increase === increase).map(({ p }) => p));
    expect(used(true).size).toBe(INCREASE_PERCENTAGES.length);
    expect(used(false).size).toBe(DISCOUNT_PERCENTAGES.length);
  });

  it('builds a question with an explanation and tips that name each mistake', () => {
    for (const { p, increase, oldPrice, newPrice } of originals) {
      const direction = increase ? 'increase' : 'discount';
      const name = `${formatPercentage(p.value)}% ${direction} ${oldPrice}`;
      const step = stepOf(originalQuestion(p, increase, oldPrice));
      expect(step.check(String(oldPrice)).correct, name).toBe(true);
      expect(step.check('').explanation, name).toBe(originalExplanation(p, increase, oldPrice));
      const change = percentOf(p.value, newPrice);
      const plus = add(newPrice, change);
      const minus = subtract(newPrice, change);
      const mistakes: [Rational, string][] = [
        [increase ? minus : plus, 'van de oude prijs'],
        [increase ? plus : minus, 'dus de oude prijs'],
      ];
      const tip = originalTip(p, increase, newPrice);
      for (const [mistake, fragment] of mistakes) {
        // A mistake rounded to cents can equal the correct answer (1% off 10: 9,90 + 1% = 10,00);
        // the correct answer never reaches a tip.
        if (equals(roundHalfUpToCents(mistake), fromInteger(oldPrice))) continue;
        for (const typed of [mistake, roundHalfUpToCents(mistake)]) {
          expect(tip(typed), name).toContain(fragment);
        }
      }
    }
  });
});

describe('generatePercentChange', () => {
  const COUNT = 1000;
  const rng = createRng(31);
  const questions = Array.from({ length: COUNT }, () => generatePercentChange(rng));

  function ofForm(form: string): Question[] {
    return questions.filter((question) => question.key.split(':')[1] === form);
  }

  const changes = ofForm('change');
  const vats = ofForm('vat');
  const originals = ofForm('original');

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
      expect(question.steps).toHaveLength(1);
      expect(stepOf(question).prompt).not.toBe('');
      const result = stepOf(question).check(stepOf(question).check('').expected);
      expect(result.correct).toBe(true);
      expect(result.explanation).toBeTruthy();
    }
  });

  it('uses the three forms about equally often', () => {
    for (const form of [changes, vats, originals]) {
      expect(form.length / COUNT).toBeGreaterThan(0.26);
      expect(form.length / COUNT).toBeLessThan(0.41);
    }
    expect(changes.length + vats.length + originals.length).toBe(COUNT);
  });

  it('makes the percentage change a percentage fraction step', () => {
    for (const question of changes) {
      expect(question.key.startsWith('percentChange:change:')).toBe(true);
      expect(stepOf(question).kind).toBe('fraction');
      expect(stepOf(question).suffix).toBe('%');
      expect(stepOf(question).prefix).toBeUndefined();
    }
  });

  it('makes VAT and the original price money steps', () => {
    for (const question of [...vats, ...originals]) {
      expect(stepOf(question).kind).toBe('number');
      expect(stepOf(question).prefix).toBe('€');
      expect(stepOf(question).suffix).toBeUndefined();
      expect(stepOf(question).prompt).toContain('€\u{a0}');
    }
  });

  it('changes a nice whole into a positive whole number by a listed percentage', () => {
    for (const question of changes) {
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

  it('starts a village at 100 inhabitants, while a price or museum may start at 10', () => {
    const ofContext = (context: string) =>
      changes.filter((question) => numbersOf(question).context === context);
    const villages = ofContext('inhabitants');
    expect(villages.length).toBeGreaterThan(50);
    for (const question of villages) {
      expect(numbersOf(question).oldValue, question.key).toBeGreaterThanOrEqual(100);
    }
    const others = [...ofContext('price'), ...ofContext('visitors')];
    expect(others.some((question) => numbersOf(question).oldValue < 100)).toBe(true);
  });

  it('words the direction to match the numbers', () => {
    for (const question of changes) {
      const prompt = stepOf(question).prompt;
      expect(prompt.endsWith(isIncrease(question) ? 'stijging?' : 'daling?')).toBe(true);
    }
  });

  it('uses all three contexts and both directions about equally often', () => {
    const share = (matches: (question: Question) => boolean) =>
      changes.filter(matches).length / changes.length;
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
    for (const question of changes) {
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
        changes.some(
          (question) => isIncrease(question) === increase && equals(answerOf(question), value),
        ),
      );
    expect(used(true)).toHaveLength(PERCENTAGES.length);
    expect(used(false)).toHaveLength(DISCOUNT_PERCENTAGES.length);
  });

  describe('VAT', () => {
    const ADDING = /^€\u{a0}(\d+(?:,\d\d)?) zonder btw\. Met (\d+)% btw = \?$/u;
    const REMOVING = /^€\u{a0}(\d+(?:,\d\d)?) met (\d+)% btw\. Zonder btw = \?$/u;

    function vatOf(question: Question) {
      const [, , direction, rate, without] = question.key.split(':');
      return { adding: direction === 'add', rate: Number(rate), without: Number(without) };
    }

    it('uses both rates and both directions about equally often', () => {
      const share = (matches: (question: Question) => boolean) =>
        vats.filter(matches).length / vats.length;
      for (const rate of [21, 9]) {
        const rateShare = share((question) => vatOf(question).rate === rate);
        expect(rateShare, String(rate)).toBeGreaterThan(0.35);
        expect(rateShare, String(rate)).toBeLessThan(0.65);
      }
      const adding = share((question) => vatOf(question).adding);
      expect(adding).toBeGreaterThan(0.35);
      expect(adding).toBeLessThan(0.65);
    });

    it('adds VAT to a nice whole and removes it from a price of one significant digit', () => {
      for (const question of vats) {
        const { adding, without } = vatOf(question);
        if (adding) {
          expect(NICE_WHOLES).toContain(without);
        } else {
          expect(without).toBeGreaterThanOrEqual(10);
          expect(without).toBeLessThanOrEqual(900);
          expect(String(without).replace(/0+$/, '')).toHaveLength(1);
        }
      }
    });

    it('shows the price to the cent and answers the other one', () => {
      for (const question of vats) {
        const { adding, rate, without } = vatOf(question);
        const step = stepOf(question);
        const match = (adding ? ADDING : REMOVING).exec(step.prompt);
        expect(match, step.prompt).not.toBeNull();
        expect(Number(match![2])).toBe(rate);
        const shown = parseDutchNumber(match![1]!)!;
        const answer = parseDutchNumber(step.check('').expected)!;
        const factor = fromInteger(100 + rate);
        if (adding) {
          // Independent check: the price shown is the one without VAT, and
          // with × 100 = without × (100 + rate).
          expect(equals(shown, fromInteger(without))).toBe(true);
          expect(equals(multiply(answer, HUNDRED), multiply(shown, factor))).toBe(true);
        } else {
          expect(equals(answer, fromInteger(without))).toBe(true);
          expect(equals(multiply(shown, HUNDRED), multiply(answer, factor))).toBe(true);
        }
      }
    });
  });

  describe('original price', () => {
    const PROMPT =
      /^Na (\d+(?: 1\/2)?)% (korting|verhoging) kost (een \w+) €\u{a0}(\d+(?:,\d\d)?)\. Wat was de oude prijs\?$/u;
    const DISCOUNT_ITEMS = ['een jas', 'een fiets', 'een tent'];
    const INCREASE_ITEMS = ['een abonnement', 'een kaartje', 'een les'];

    function originalOf(question: Question) {
      const [, , direction, percent, old] = question.key.split(':');
      const match = PROMPT.exec(stepOf(question).prompt);
      if (match === null) throw new Error(`Unexpected prompt: ${stepOf(question).prompt}`);
      return {
        increase: direction === 'increase',
        direction,
        percent,
        old: Number(old),
        shownPercent: match[1],
        shownDirection: match[2],
        item: match[3]!,
        newPrice: parseDutchNumber(match[4]!)!,
      };
    }

    const parsed = originals.map(originalOf);

    it('uses both directions about equally often', () => {
      const increases = parsed.filter(({ increase }) => increase).length / parsed.length;
      expect(increases).toBeGreaterThan(0.35);
      expect(increases).toBeLessThan(0.65);
    });

    it('takes a listed percentage and the matching word', () => {
      for (const { increase, direction, percent, shownPercent, shownDirection } of parsed) {
        const allowed = increase ? INCREASE_PERCENTAGES : DISCOUNT_PERCENTAGES;
        expect(allowed.map(({ value }) => formatPercentage(value))).toContain(percent);
        expect(shownPercent).toBe(percent);
        expect(shownDirection).toBe(increase ? 'verhoging' : 'korting');
        expect(direction).toBe(increase ? 'increase' : 'discount');
      }
    });

    it('uses every percentage of both lists', () => {
      for (const increase of [false, true]) {
        const used = new Set(
          parsed.filter((original) => original.increase === increase).map(({ percent }) => percent),
        );
        const allowed = increase ? INCREASE_PERCENTAGES : DISCOUNT_PERCENTAGES;
        expect(used.size).toBe(allowed.length);
      }
    });

    it('names an item that matches the direction, and every item occurs', () => {
      for (const { increase, item } of parsed) {
        expect(increase ? INCREASE_ITEMS : DISCOUNT_ITEMS).toContain(item);
      }
      for (const item of [...DISCOUNT_ITEMS, ...INCREASE_ITEMS]) {
        expect(
          parsed.some((original) => original.item === item),
          item,
        ).toBe(true);
      }
    });

    it('asks for a nice whole as the old price, from a new price of at most 2 decimals', () => {
      for (const question of originals) {
        const { increase, percent, old, newPrice } = originalOf(question);
        expect(NICE_WHOLES).toContain(old);
        expect(stepOf(question).check('').expected).toBe(String(old));
        const p = PERCENTAGES.find(({ value }) => formatPercentage(value) === percent)!;
        const factor = increase ? add(HUNDRED, p.value) : subtract(HUNDRED, p.value);
        // Independent check: new × 100 = old × (100 ∓ p).
        expect(equals(multiply(newPrice, HUNDRED), multiply(fromInteger(old), factor))).toBe(true);
        expect(decimalPlaces(newPrice)).toBeLessThanOrEqual(2);
      }
    });

    it('makes about 80% of the new prices whole numbers', () => {
      const whole = parsed.filter(({ newPrice }) => isInteger(newPrice)).length / parsed.length;
      expect(whole).toBeGreaterThan(0.68);
      expect(whole).toBeLessThan(0.92);
    });
  });

  it('is deterministic for a fixed seed', () => {
    const keys = (seed: number) => {
      const seeded = createRng(seed);
      return Array.from({ length: 50 }, () => generatePercentChange(seeded).key);
    };
    expect(keys(5)).toEqual(keys(5));
  });
});
