import { describe, expect, it } from 'vitest';
import { GROUP_SEPARATOR } from '../format';
import { createRng } from '../random';
import {
  compare,
  divide,
  multiply,
  parseDutchNumber,
  powerOfTen,
  rational,
  type Rational,
} from '../rational';
import type { Question, Step } from '../types';
import {
  buildRounding,
  CARRY_SHARE,
  digitAt,
  FIVE_SHARE,
  generateRounding,
  PLACES,
  roundHalfUp,
  roundingQuestion,
} from './rounding';

const PER_PLACE = 1000;
const PROMPT = /^Rond (.+) af op (.+)$/;

function questionsOf(index: number): Question[] {
  const rng = createRng(400 + index);
  return Array.from({ length: PER_PLACE }, () => buildRounding(rng, PLACES[index]!));
}

function stepOf(question: Question): Step {
  return question.steps[0]!;
}

/** Text as typed on the keypad: no digit grouping. */
function plain(text: string): string {
  return text.replaceAll(GROUP_SEPARATOR, '');
}

function sourceText(question: Question): string {
  return PROMPT.exec(stepOf(question).prompt)![1]!;
}

function expectedText(question: Question): string {
  return stepOf(question).check('').expected;
}

/** Independent half-up rounding with rationals: floor(value / 10^e + 1/2) × 10^e. */
function halfUp(value: Rational, exponent: number): Rational {
  const unit = powerOfTen(exponent);
  const quotient = divide(value, unit);
  // BigInt division truncates, which floors for positive values.
  const floored = (2n * quotient.num + quotient.den) / (2n * quotient.den);
  return multiply(rational(floored), unit);
}

/** The digit of a positive value at 10^position, also for negative positions. */
function digitOf(value: Rational, position: number): bigint {
  const shifted = divide(value, powerOfTen(position));
  return (shifted.num / shifted.den) % 10n;
}

const decimalsOf = (text: string) => (text.split(',')[1] ?? '').length;

describe('PLACES', () => {
  it('lists the seven places of the spec', () => {
    expect(PLACES.map((place) => [place.label, place.exponent])).toEqual([
      ['tientallen', 1],
      ['honderdtallen', 2],
      ['duizendtallen', 3],
      ['miljoenen', 6],
      ['een heel getal', 0],
      ['1 decimaal', -1],
      ['2 decimalen', -2],
    ]);
  });
});

describe('generateRounding', () => {
  it('uses every place and accepts its expected answer', () => {
    const rng = createRng(1);
    const labels = new Set<string>();
    for (let i = 0; i < 2000; i++) {
      const question = generateRounding(rng);
      expect(question.topic).toBe('rounding');
      labels.add(PROMPT.exec(stepOf(question).prompt)![2]!);
      expect(stepOf(question).check(plain(expectedText(question))).correct).toBe(true);
    }
    expect(labels.size).toBe(PLACES.length);
  });
});

describe.each(PLACES.map((place, index) => [place.label, index] as const))(
  'rounding on %s',
  (label, index) => {
    const place = PLACES[index]!;
    const questions = questionsOf(index);

    it('draws a source in range that is not rounded yet', () => {
      for (const question of questions) {
        expect(PROMPT.exec(stepOf(question).prompt)![2]).toBe(label);
        const text = plain(sourceText(question));
        const source = parseDutchNumber(text)!;
        if (place.exponent > 0) {
          expect(decimalsOf(text)).toBe(0);
          expect(compare(source, rational(BigInt(place.min)))).toBeGreaterThanOrEqual(0);
          expect(compare(source, rational(BigInt(place.max)))).toBeLessThanOrEqual(0);
        } else {
          expect(place.decimals).toContain(decimalsOf(text));
          expect(compare(source, rational(0n))).toBe(1);
          expect(compare(source, rational(BigInt(place.max)))).toBe(-1);
        }
        expect(divide(source, powerOfTen(place.exponent)).den, text).not.toBe(1n);
      }
    });

    it('expects half-up rounding with the asked number of decimals', () => {
      for (const question of questions) {
        const source = parseDutchNumber(plain(sourceText(question)))!;
        const expected = expectedText(question);
        const rounded = halfUp(source, place.exponent);
        expect(parseDutchNumber(plain(expected)), sourceText(question)).toEqual(rounded);
        expect(compare(rounded, rational(0n))).toBe(1);
        expect(decimalsOf(expected)).toBe(Math.max(0, -place.exponent));
      }
    });
  },
);

describe('edge cases', () => {
  const all = PLACES.flatMap((_, index) => questionsOf(index));
  const sources = all.map((question) => ({
    question,
    source: parseDutchNumber(plain(sourceText(question)))!,
    place: PLACES.find((place) => stepOf(question).prompt.endsWith(` op ${place.label}`))!,
  }));

  it('has a 5 as the first dropped digit in at least the 5-share', () => {
    const fives = sources.filter(
      ({ source, place }) => digitOf(source, place.exponent - 1) === 5n,
    ).length;
    expect(fives / all.length).toBeGreaterThan(FIVE_SHARE);
    // The other draws also hit a 5 about one time in ten.
    expect(fives / all.length).toBeLessThan(0.4);
  });

  it('carries over a 9 in at least the carry share', () => {
    const carries = sources.filter(
      ({ source, place }) =>
        digitOf(source, place.exponent) === 9n && digitOf(source, place.exponent - 1) >= 5n,
    ).length;
    expect(carries / all.length).toBeGreaterThan(CARRY_SHARE);
  });
});

describe('roundingQuestion', () => {
  const hundreds = PLACES[1]!;
  const millions = PLACES[3]!;
  const whole = PLACES[4]!;
  const oneDecimal = PLACES[5]!;

  it('explains with the neighbours and the decisive digit', () => {
    const step = stepOf(roundingQuestion(hundreds, 0, 4386));
    expect(step.prompt).toBe('Rond 4386 af op honderdtallen');
    expect(step.check('4400')).toEqual({
      correct: true,
      expected: '4400',
      explanation: '4386 ligt tussen 4300 en 4400; het eerste cijfer dat wegvalt is 8 → 4400',
    });
  });

  it('names rounding the wrong way and rounding on a neighbouring place', () => {
    const step = stepOf(roundingQuestion(hundreds, 0, 4386));
    expect(step.check('4300').tip).toBe(
      'Het eerste cijfer dat wegvalt is 8 (5 of meer): rond naar boven af.',
    );
    expect(step.check('4390').tip).toBe(
      'Dat is afgerond op tientallen; gevraagd is honderdtallen.',
    );
    expect(step.check('4000').tip).toBe(
      'Dat is afgerond op duizendtallen; gevraagd is honderdtallen.',
    );
    expect(step.check('44').tip).toBe(
      'Je antwoord is 100 keer te klein. Let op de komma en het aantal nullen.',
    );
  });

  it('rounds to decimals, with tips for the neighbouring places', () => {
    const step = stepOf(roundingQuestion(oneDecimal, 3, 3746));
    expect(step.prompt).toBe('Rond 3,746 af op 1 decimaal');
    expect(step.check('3,7')).toMatchObject({
      correct: true,
      explanation: '3,746 ligt tussen 3,7 en 3,8; het eerste cijfer dat wegvalt is 4 → 3,7',
    });
    expect(step.check('3,8').tip).toBe(
      'Het eerste cijfer dat wegvalt is 4 (minder dan 5): rond naar beneden af.',
    );
    expect(step.check('3,75').tip).toBe('Dat is afgerond op 2 decimalen; gevraagd is 1 decimaal.');
    expect(step.check('4').tip).toBe('Dat is afgerond op een heel getal; gevraagd is 1 decimaal.');
  });

  it('shows the asked decimals but accepts any equal value', () => {
    const step = stepOf(roundingQuestion(oneDecimal, 2, 296));
    expect(step.check('3')).toMatchObject({ correct: true, expected: '3,0' });
    expect(step.check('3,0').correct).toBe(true);
    expect(stepOf(roundingQuestion(whole, 1, 125)).check('13').correct).toBe(true);
  });

  it('never calls the unrounded source a neighbouring place', () => {
    // 12,5 has one decimal: "afgerond op 1 decimaal" would not be true.
    expect(stepOf(roundingQuestion(whole, 1, 125)).check('12,5').tip).toBeUndefined();
  });

  it('writes large numbers in full', () => {
    const step = stepOf(roundingQuestion(millions, 0, 2_456_789));
    expect(step.prompt).toBe('Rond 2\u{202f}456\u{202f}789 af op miljoenen');
    expect(step.check('2000000')).toMatchObject({
      correct: true,
      expected: '2\u{202f}000\u{202f}000',
    });
    // Millions have no neighbouring place in the spec.
    expect(step.check('2500000').tip).toBeUndefined();
  });
});

describe('helpers', () => {
  it('reads digits and rounds half up', () => {
    expect(digitAt(4386, 1)).toBe(8);
    expect(digitAt(4386, 3)).toBe(4);
    expect(roundHalfUp(4386, 2)).toBe(4400);
    expect(roundHalfUp(4349, 2)).toBe(4300);
    expect(roundHalfUp(4350, 2)).toBe(4400);
    expect(roundHalfUp(3970, 2)).toBe(4000);
  });
});
