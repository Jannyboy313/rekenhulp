import { describe, expect, it } from 'vitest';
import { formatEuro, formatMoney, formatRational } from '../format';
import { createRng } from '../random';
import {
  add,
  decimalPlaces,
  divide,
  equals,
  fromInteger,
  multiply,
  parseDutchNumber,
  rational,
  subtract,
  type Rational,
} from '../rational';
import { parseAnswer } from '../steps';
import type { Question, Step } from '../types';
import {
  DISCOUNT_PERCENTAGES,
  formatPercentage,
  generatePercentages,
  INCREASE_PERCENTAGES,
  NICE_WHOLES,
  backToWholeTip,
  partExplanation,
  partTip,
  PERCENTAGES,
  percentOf,
  priceChangeExplanation,
  priceChangeTip,
  whatPercentageTip,
  wholeExplanation,
  type Percentage,
} from './percentages';

function percentage(label: string): Percentage {
  const found = PERCENTAGES.find((p) => formatPercentage(p.value) === label);
  if (!found) throw new Error(`Unknown percentage ${label}`);
  return found;
}

function labels(percentages: readonly Percentage[]): string[] {
  return percentages.map((p) => formatPercentage(p.value));
}

const SAMPLES = 4000;

function sample(seed: number, count = SAMPLES): Question[] {
  const rng = createRng(seed);
  return Array.from({ length: count }, () => generatePercentages(rng));
}

function stepOf(question: Question): Step {
  return question.steps[0]!;
}

function expectedOf(question: Question): string {
  // `expected` does not depend on the input.
  return stepOf(question).check('').expected;
}

/** What the user types: a fraction step shows '12,5 of 25/2', the user types one of them. */
function typed(question: Question): string {
  return expectedOf(question).split(' of ')[0]!;
}

function answerOf(question: Question): Rational {
  return parseAnswer(stepOf(question).kind, typed(question))!;
}

function formOf(question: Question): string {
  return question.key.split(':')[1]!;
}

function percentageOf(question: Question): Percentage {
  return percentage(question.key.split(':')[2]!);
}

function wholeOf(question: Question): Rational {
  return fromInteger(Number(question.key.split(':')[3]));
}

function integerShare(values: readonly Rational[]): number {
  return values.filter((value) => value.den === 1n).length / values.length;
}

describe('PERCENTAGES', () => {
  it('lists the percentages from the spec', () => {
    expect(labels(PERCENTAGES)).toEqual([
      '1', '2', '5', '10', '12½', '15', '20', '25', '30', '40', '50', '60', '75', '80', '90',
      '120', '150',
    ]);
  });

  it('has a base that divides both 100 and the percentage', () => {
    for (const { value, base } of PERCENTAGES) {
      expect(divide(fromInteger(100), base).den).toBe(1n);
      expect(divide(value, base).den).toBe(1n);
    }
  });

  it('limits discounts to below 100% and increases to at most 50%', () => {
    expect(labels(DISCOUNT_PERCENTAGES)).toEqual([
      '1', '2', '5', '10', '12½', '15', '20', '25', '30', '40', '50', '60', '75', '80', '90',
    ]);
    expect(labels(INCREASE_PERCENTAGES)).toEqual([
      '1', '2', '5', '10', '12½', '15', '20', '25', '30', '40', '50',
    ]);
  });
});

describe('formatPercentage', () => {
  it('writes whole percentages as integers and halves with ½', () => {
    expect(formatPercentage(fromInteger(15))).toBe('15');
    expect(formatPercentage(rational(25n, 2n))).toBe('12½');
  });

  it('rejects other fractions', () => {
    expect(() => formatPercentage(rational(1n, 3n))).toThrow(RangeError);
  });
});

describe('NICE_WHOLES', () => {
  it('has the integers in [10, 1000] with at most 2 significant digits', () => {
    expect(NICE_WHOLES).toHaveLength(181);
    expect(NICE_WHOLES[0]).toBe(10);
    expect(NICE_WHOLES.at(-1)).toBe(1000);
    for (const whole of [85, 99, 100, 470, 990]) expect(NICE_WHOLES).toContain(whole);
    for (const whole of [9, 105, 487, 999, 1010]) expect(NICE_WHOLES).not.toContain(whole);
  });
});

describe('percentOf', () => {
  it('computes p% of a whole exactly', () => {
    expect(percentOf(rational(25n, 2n), fromInteger(80))).toEqual(rational(10n));
    expect(percentOf(fromInteger(15), fromInteger(30))).toEqual(rational(9n, 2n));
    expect(percentOf(fromInteger(150), fromInteger(80))).toEqual(rational(120n));
  });
});

describe('partExplanation', () => {
  it.each([
    ['15', 80, '10% = 8, 5% = 4 → 15% = 12'],
    ['5', 80, '10% = 8 → 5% = 4'],
    ['10', 80, '10% = 80 : 10 = 8'],
    ['30', 80, '10% = 80 : 10 = 8 → 30% = 3 × 8 = 24'],
    ['25', 80, '25% = 80 : 4 = 20'],
    ['75', 80, '25% = 80 : 4 = 20 → 75% = 3 × 20 = 60'],
    ['12½', 80, '12½% = 80 : 8 = 10'],
    ['1', 500, '1% = 500 : 100 = 5'],
    ['2', 500, '1% = 500 : 100 = 5 → 2% = 2 × 5 = 10'],
    ['120', 80, '10% = 80 : 10 = 8 → 120% = 12 × 8 = 96'],
    ['150', 80, '50% = 80 : 2 = 40 → 150% = 3 × 40 = 120'],
  ])('explains %s percent of %i', (label, whole, expected) => {
    expect(partExplanation(percentage(label), fromInteger(whole))).toBe(expected);
  });

  it('uses the given formatter, e.g. for money', () => {
    expect(partExplanation(percentage('15'), fromInteger(30), formatMoney)).toBe(
      '10% = 3, 5% = 1,50 → 15% = 4,50',
    );
  });
});

describe('wholeExplanation', () => {
  it.each([
    ['20', 70, '20% = 14 → 10% = 7 → 100% = 10 × 7 = 70'],
    ['25', 56, '25% = 14 → 100% = 4 × 14 = 56'],
    ['15', 30, '15% = 4,5 → 5% = 1,5 → 100% = 20 × 1,5 = 30'],
    ['12½', 48, '12½% = 6 → 100% = 8 × 6 = 48'],
    ['1', 500, '1% = 5 → 100% = 100 × 5 = 500'],
    ['150', 80, '150% = 120 → 50% = 40 → 100% = 2 × 40 = 80'],
  ])('explains back to the whole from %s percent of %i', (label, whole, expected) => {
    expect(wholeExplanation(percentage(label), fromInteger(whole))).toBe(expected);
  });
});

describe('generatePercentages', () => {
  const questions = sample(21);

  it('creates single-step questions that accept their own answer', () => {
    for (const question of questions) {
      expect(question.topic).toBe('percentages');
      expect(question.key.startsWith('percentages:')).toBe(true);
      expect(question.steps).toHaveLength(1);
      const result = stepOf(question).check(typed(question));
      expect(result.correct).toBe(true);
      expect(result.explanation).toBeTruthy();
    }
  });

  it('uses the four forms about equally often', () => {
    const count = (...forms: string[]) => questions.filter((q) => forms.includes(formOf(q))).length;
    for (const forms of [['of'], ['what'], ['discount', 'increase'], ['back']]) {
      const share = count(...forms) / SAMPLES;
      expect(share).toBeGreaterThan(0.21);
      expect(share).toBeLessThan(0.29);
    }
  });

  it('uses nice wholes and every percentage', () => {
    for (const question of questions) {
      expect(NICE_WHOLES).toContain(Number(wholeOf(question).num));
    }
    const used = new Set(questions.map((q) => formatPercentage(percentageOf(q).value)));
    expect(used.size).toBe(PERCENTAGES.length);
  });

  it('keeps answers to at most 2 decimals', () => {
    for (const question of questions) {
      expect(decimalPlaces(answerOf(question))).toBeLessThanOrEqual(2);
    }
  });

  it('is deterministic for a fixed seed', () => {
    const keys = (seed: number) => sample(seed, 50).map((question) => question.key);
    expect(keys(5)).toEqual(keys(5));
  });
});

describe('part of a whole', () => {
  const questions = sample(22).filter((q) => formOf(q) === 'of');

  it('asks for p% of the whole', () => {
    for (const question of questions) {
      const [p, whole] = [percentageOf(question), wholeOf(question)];
      expect(stepOf(question).kind).toBe('number');
      expect(stepOf(question).prompt).toBe(
        `${formatPercentage(p.value)}% van ${formatRational(whole)} = ?`,
      );
      expect(equals(answerOf(question), percentOf(p.value, whole))).toBe(true);
      // Independent check: answer / whole = p / 100.
      expect(equals(multiply(answerOf(question), fromInteger(100)), multiply(p.value, whole))).toBe(
        true,
      );
      expect(stepOf(question).check('').explanation).toBe(partExplanation(p, whole));
    }
  });

  it('has an integer answer in about 80% of the cases', () => {
    const share = integerShare(questions.map(answerOf));
    expect(share).toBeGreaterThan(0.72);
    expect(share).toBeLessThan(0.88);
  });
});

describe('what percentage', () => {
  const questions = sample(23).filter((q) => formOf(q) === 'what');

  it('asks which percentage of the whole the part is', () => {
    for (const question of questions) {
      const [p, whole] = [percentageOf(question), wholeOf(question)];
      const part = percentOf(p.value, whole);
      expect(part.den).toBe(1n);
      expect(stepOf(question).kind).toBe('fraction');
      expect(stepOf(question).suffix).toBe('%');
      expect(stepOf(question).prompt).toBe(
        `${formatRational(part)} is ?% van ${formatRational(whole)}`,
      );
      expect(equals(answerOf(question), p.value)).toBe(true);
      // Independent check, parsing the numbers from the prompt: shown part × 100 = answer × shown whole.
      const [shownPart, shownWhole] = stepOf(question)
        .prompt.split(' is ?% van ')
        .map((text) => parseDutchNumber(text)!);
      expect(
        equals(multiply(shownPart!, fromInteger(100)), multiply(answerOf(question), shownWhole!)),
      ).toBe(true);
      expect(stepOf(question).check('').explanation).toBe(partExplanation(p, whole));
    }
  });

  it('accepts 12½ as a fraction or a decimal', () => {
    const half = questions.find((q) => q.key.startsWith('percentages:what:12½:'))!;
    expect(expectedOf(half)).toBe('12,5 of 25/2');
    for (const input of ['25/2', '50/4', '12,5']) {
      expect(stepOf(half).check(input).correct).toBe(true);
    }
  });
});

describe('discount and increase', () => {
  const questions = sample(24).filter((q) => ['discount', 'increase'].includes(formOf(q)));

  it('changes a whole-euro price by p%', () => {
    for (const question of questions) {
      const increase = formOf(question) === 'increase';
      const [p, price] = [percentageOf(question), wholeOf(question)];
      expect(increase ? INCREASE_PERCENTAGES : DISCOUNT_PERCENTAGES).toContain(p);
      const step = stepOf(question);
      expect(step.kind).toBe('number');
      expect(step.prefix).toBe('€');
      expect(step.suffix).toBeUndefined();
      expect(step.prompt).toBe(
        `${formatEuro(price)} na ${formatPercentage(p.value)}% ${increase ? 'verhoging' : 'korting'} = ?`,
      );
      const change = percentOf(p.value, price);
      expect(equals(answerOf(question), increase ? add(price, change) : subtract(price, change))).toBe(
        true,
      );
      // Independent check: answer × 100 = price × (100 ∓ p).
      const factor = increase ? add(fromInteger(100), p.value) : subtract(fromInteger(100), p.value);
      expect(equals(multiply(answerOf(question), fromInteger(100)), multiply(price, factor))).toBe(
        true,
      );
      expect(expectedOf(question)).toBe(formatMoney(answerOf(question)));
      expect(step.check('').explanation).toBe(priceChangeExplanation(p, price, increase));
    }
  });

  it('uses discounts and increases about equally often', () => {
    const share = questions.filter((q) => formOf(q) === 'increase').length / questions.length;
    expect(share).toBeGreaterThan(0.43);
    expect(share).toBeLessThan(0.57);
  });

  it('has an integer answer in about 80% of the cases', () => {
    const share = integerShare(questions.map(answerOf));
    expect(share).toBeGreaterThan(0.72);
    expect(share).toBeLessThan(0.88);
  });

  it.each([
    ['25', 60, false, '25% = 60 : 4 = 15 → 60 − 15 = 45'],
    ['15', 40, true, '10% = 4, 5% = 2 → 15% = 6 → 40 + 6 = 46'],
    ['15', 30, false, '10% = 3, 5% = 1,50 → 15% = 4,50 → 30 − 4,50 = 25,50'],
    ['12½', 20, true, '12½% = 20 : 8 = 2,50 → 20 + 2,50 = 22,50'],
  ])('explains %s percent on € %i (increase: %s)', (label, price, increase, expected) => {
    expect(priceChangeExplanation(percentage(label), fromInteger(price), increase)).toBe(expected);
  });
});

describe('back to 100%', () => {
  const questions = sample(25).filter((q) => formOf(q) === 'back');

  it('asks for the whole from a given part', () => {
    for (const question of questions) {
      const [p, whole] = [percentageOf(question), wholeOf(question)];
      const part = percentOf(p.value, whole);
      expect(decimalPlaces(part)).toBeLessThanOrEqual(2);
      expect(stepOf(question).prompt).toBe(
        `${formatPercentage(p.value)}% is ${formatRational(part)}. Hoeveel is 100%?`,
      );
      expect(equals(answerOf(question), whole)).toBe(true);
      // Independent check, parsing the part from the prompt: part × 100 = p × answer.
      const shownText = stepOf(question).prompt.split('% is ')[1]!.split('. Hoeveel')[0]!;
      const shownPart = parseDutchNumber(shownText)!;
      expect(equals(multiply(shownPart, fromInteger(100)), multiply(p.value, answerOf(question)))).toBe(
        true,
      );
      expect(stepOf(question).check('').explanation).toBe(wholeExplanation(p, whole));
    }
  });

  it('gives an integer part in about 80% of the cases', () => {
    const parts = questions.map((q) => percentOf(percentageOf(q).value, wholeOf(q)));
    const share = integerShare(parts);
    expect(share).toBeGreaterThan(0.72);
    expect(share).toBeLessThan(0.88);
  });
});

describe('every percentage and whole', () => {
  const wholes = NICE_WHOLES.map(fromInteger);
  const atMostTwoDecimals = (value: Rational) => (decimalPlaces(value) ?? Infinity) <= 2;

  it('has explainable parts, both integer and non-integer, for every percentage', () => {
    for (const p of PERCENTAGES) {
      const parts = wholes.filter((whole) => atMostTwoDecimals(percentOf(p.value, whole)));
      expect(parts.length, formatPercentage(p.value)).toBeGreaterThan(0);
      const isInteger = (whole: Rational) => percentOf(p.value, whole).den === 1n;
      expect(parts.some(isInteger), `${formatPercentage(p.value)} integer`).toBe(true);
      expect(parts.some((whole) => !isInteger(whole)), `${formatPercentage(p.value)} other`).toBe(
        true,
      );
      for (const whole of parts) {
        expect(() => partExplanation(p, whole)).not.toThrow();
        expect(() => wholeExplanation(p, whole)).not.toThrow();
      }
    }
  });

  it('has explainable price changes, both integer and non-integer, for every percentage', () => {
    for (const increase of [false, true]) {
      for (const p of increase ? INCREASE_PERCENTAGES : DISCOUNT_PERCENTAGES) {
        const prices = wholes.filter((price) => {
          const change = percentOf(p.value, price);
          return atMostTwoDecimals(increase ? add(price, change) : subtract(price, change));
        });
        const name = `${formatPercentage(p.value)} (increase: ${increase})`;
        expect(prices.length, name).toBeGreaterThan(0);
        const isInteger = (price: Rational) => percentOf(p.value, price).den === 1n;
        expect(prices.some(isInteger), `${name} integer`).toBe(true);
        expect(prices.some((price) => !isInteger(price)), `${name} other`).toBe(true);
        for (const price of prices) {
          expect(() => priceChangeExplanation(p, price, increase)).not.toThrow();
        }
      }
    }
  });
});

describe('percentage tips', () => {
  const p = (value: number) =>
    PERCENTAGES.find((candidate) => equals(candidate.value, fromInteger(value)))!;
  const n = (text: string) => parseDutchNumber(text)!;

  it('names the rest', () => {
    expect(partTip(p(25), fromInteger(80))(fromInteger(60))).toBe(
      'Dat is wat er overblijft; gevraagd is 25% zelf.',
    );
  });

  it('names the ratio as a decimal and the inverse', () => {
    const tip = whatPercentageTip(fromInteger(30), fromInteger(120));
    expect(tip(n('0,25'))).toBe('Dat is het deel als kommagetal; × 100 geeft het percentage.');
    const inverse = 'Je hebt het geheel door het deel gedeeld; reken deel : geheel.';
    expect(tip(fromInteger(4))).toBe(inverse);
    expect(tip(fromInteger(400))).toBe(inverse);
    expect(tip(fromInteger(26))).toBeUndefined();
  });

  it('names the change itself and the wrong direction', () => {
    const discount = priceChangeTip(p(25), fromInteger(60), false);
    expect(discount(fromInteger(15))).toBe('Dat is de korting zelf; trek die nog af van de prijs.');
    expect(discount(fromInteger(75))).toBe('Bij korting wordt de prijs lager: trek de korting af.');
    const increase = priceChangeTip(p(15), fromInteger(40), true);
    expect(increase(fromInteger(6))).toBe('Dat is de verhoging zelf; tel die nog op bij de prijs.');
    expect(increase(fromInteger(34))).toBe(
      'Bij een verhoging wordt de prijs hoger: tel de verhoging op.',
    );
  });

  it('names p% of the part', () => {
    expect(backToWholeTip(p(20), fromInteger(14))(n('2,8'))).toBe(
      'Je hebt 20% van 14 berekend, maar 14 is zelf al 20%. Reken terug naar 100%.',
    );
  });

  it('wires the discount tip into generated questions', () => {
    const rng = createRng(11);
    let seen = 0;
    for (let i = 0; i < 1000; i++) {
      const step = generatePercentages(rng).steps[0]!;
      const match = /^€\u{a0}(\d+) na .* korting/u.exec(step.prompt);
      if (!match) continue;
      const answer = parseDutchNumber(step.check('0').expected)!;
      const change = subtract(fromInteger(Number(match[1])), answer);
      // At 50% the change is the answer itself, so typing it is correct.
      if (equals(change, answer)) continue;
      seen++;
      expect(step.check(formatRational(change)).tip).toBe(
        'Dat is de korting zelf; trek die nog af van de prijs.',
      );
    }
    expect(seen).toBeGreaterThan(50);
  });
});
