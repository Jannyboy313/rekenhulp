import { describe, expect, it } from 'vitest';
import { formatRational, GROUP_SEPARATOR } from '../format';
import { gcd } from '../primes';
import { createRng, range } from '../random';
import {
  decimalPlaces,
  divide,
  equals,
  fromInteger,
  multiply,
  parseDutchNumber,
  rational,
  type Rational,
} from '../rational';
import { parseAnswer } from '../steps';
import type { Question, Step } from '../types';
import {
  formatAmount,
  generateRatioProblems,
  GROUP_CONTEXTS,
  inverseTip,
  MIX_CONTEXTS,
  mixFromPartQuestion,
  mixFromTotalQuestion,
  mixPairsFor,
  mixPartsFor,
  partPairsFor,
  partQuestion,
  stepAmount,
  unitExplanation,
  unitQuestion,
  type GivenAmount,
  type GroupContext,
  type MixContext,
  type UnitContextId,
} from './ratioProblems';

type Index = 0 | 1;
const INDEXES: readonly Index[] = [0, 1];

/** The amount a mixing prompt gives: the total, or the amount of ingredient 0 or 1. */
const GIVEN_AMOUNTS: readonly GivenAmount[] = ['total', 0, 1];

function stepOf(question: Question): Step {
  return question.steps[0]!;
}

function groupContext(id: GroupContext['id']): GroupContext {
  const found = GROUP_CONTEXTS.find((context) => context.id === id);
  if (found === undefined) throw new Error(`No group context ${id}`);
  return found;
}

function mixContext(id: MixContext['id']): MixContext {
  const found = MIX_CONTEXTS.find((context) => context.id === id);
  if (found === undefined) throw new Error(`No mix context ${id}`);
  return found;
}

/** The term of the ratio a : b at `index`. */
function termAt(a: number, b: number, index: Index): number {
  return index === 0 ? a : b;
}

/** The digits of a number without trailing zeros: 350 has 2 significant digits. */
function significantDigits(value: number): number {
  return String(value).replace(/0+$/, '').length;
}

/** What the user types for a value: the digits and the comma, without grouping. */
function typed(value: Rational): string {
  return formatRational(value).replaceAll(GROUP_SEPARATOR, '');
}

/** The result of typing `input` on a part-of-the-whole question. */
function askPart(
  id: GroupContext['id'],
  a: number,
  b: number,
  index: Index,
  asPercentage: boolean,
  input: string,
) {
  return stepOf(partQuestion(groupContext(id), a, b, index, asPercentage)).check(input);
}

/** The result of typing `input` on a mixing question from the total. */
function askTotal(
  id: MixContext['id'],
  a: number,
  b: number,
  part: number,
  asked: Index,
  input: string,
) {
  return stepOf(mixFromTotalQuestion(mixContext(id), a, b, part, asked)).check(input);
}

/** The result of typing `input` on a mixing question from one part. */
function askGiven(
  id: MixContext['id'],
  a: number,
  b: number,
  part: number,
  given: Index,
  input: string,
) {
  return stepOf(mixFromPartQuestion(mixContext(id), a, b, part, given)).check(input);
}

/** A value in Dutch notation: dutch('2,5') is 5/2. */
function dutch(text: string): Rational {
  const value = parseDutchNumber(text);
  if (value === null) throw new Error(`Not a number: ${text}`);
  return value;
}

/** '€' and a no-break space, in front of a price as the prompts write it. */
const EURO = '€\u{a0}';

/** A per-unit question; amounts in counting units (cheese in 100 g, petrol in L, wage in uur). */
function unit(context: UnitContextId, first: string, firstPrice: string, second: string): Question {
  return unitQuestion(context, dutch(first), dutch(firstPrice), dutch(second));
}

/** The result of typing `input` on a per-unit question. */
function askUnit(
  context: UnitContextId,
  first: string,
  firstPrice: string,
  second: string,
  input: string,
) {
  return stepOf(unit(context, first, firstPrice, second)).check(input);
}

const TIMES_TEN_TOO_SMALL =
  'Je antwoord is 10 keer te klein. Let op de komma en het aantal nullen.';
const TIMES_TEN_TOO_LARGE =
  'Je antwoord is 10 keer te groot. Let op de komma en het aantal nullen.';
const TIMES_THOUSAND_TOO_LARGE =
  'Je antwoord is 1000 keer te groot. Let op de komma en het aantal nullen.';

describe('GROUP_CONTEXTS', () => {
  it('has the classroom, the bag of marbles and the audience', () => {
    expect(GROUP_CONTEXTS.map(({ id }) => id)).toEqual(['class', 'marbles', 'audience']);
  });

  it('names the groups for tips and explanations', () => {
    expect(groupContext('class').groups).toEqual(['jongens', 'meisjes']);
    expect(groupContext('marbles').groups).toEqual(['rode knikkers', 'blauwe knikkers']);
    expect(groupContext('audience').groups).toEqual(['volwassenen', 'kinderen']);
  });

  it('words the introduction in the order of the groups', () => {
    expect(groupContext('class').intro(2, 3)).toBe('In een klas is jongens : meisjes = 2 : 3.');
    expect(groupContext('marbles').intro(1, 4)).toBe('In een zak is rood : blauw = 1 : 4.');
    expect(groupContext('audience').intro(3, 5)).toBe(
      'Bij een voorstelling is volwassenen : kinderen = 3 : 5.',
    );
  });

  it('words the question per group, as a fraction and as a percentage', () => {
    const asked = (id: GroupContext['id']) =>
      INDEXES.flatMap((index) =>
        [false, true].map((percentage) => groupContext(id).question(index, percentage)),
      );
    expect(asked('class')).toEqual([
      'Welk deel van de klas is jongen?',
      'Hoeveel procent van de klas is jongen?',
      'Welk deel van de klas is meisje?',
      'Hoeveel procent van de klas is meisje?',
    ]);
    expect(asked('marbles')).toEqual([
      'Welk deel van de knikkers is rood?',
      'Hoeveel procent van de knikkers is rood?',
      'Welk deel van de knikkers is blauw?',
      'Hoeveel procent van de knikkers is blauw?',
    ]);
    expect(asked('audience')).toEqual([
      'Welk deel van het publiek is volwassen?',
      'Hoeveel procent van het publiek is volwassen?',
      'Welk deel van het publiek is kind?',
      'Hoeveel procent van het publiek is kind?',
    ]);
  });
});

describe('partPairsFor', () => {
  it('lists the simplified ratios with a sum of at most 12 for a fraction', () => {
    const pairs = partPairsFor(false);
    expect(pairs).toHaveLength(44);
    for (const [a, b] of pairs) {
      expect(a, `${a} : ${b}`).not.toBe(b);
      expect(gcd(a, b), `${a} : ${b}`).toBe(1);
      expect(a + b, `${a} : ${b}`).toBeLessThanOrEqual(12);
      expect(Math.min(a, b), `${a} : ${b}`).toBeGreaterThanOrEqual(1);
    }
    expect(pairs).toContainEqual([1, 11]);
    expect(pairs).toContainEqual([11, 1]);
    expect(pairs).toContainEqual([5, 7]);
    expect(pairs).toContainEqual([2, 3]);
  });

  it('lists the simplified ratios whose sum gives a friendly percentage', () => {
    const pairs = partPairsFor(true);
    expect(pairs).toHaveLength(18);
    for (const [a, b] of pairs) {
      expect(a, `${a} : ${b}`).not.toBe(b);
      expect(gcd(a, b), `${a} : ${b}`).toBe(1);
      expect([3, 4, 5, 6, 8, 10], `${a} : ${b}`).toContain(a + b);
    }
    expect(pairs).toContainEqual([1, 2]);
    expect(pairs).toContainEqual([3, 7]);
    expect(pairs).not.toContainEqual([2, 7]);
    expect(pairs).not.toContainEqual([4, 7]);
  });
});

describe('partQuestion', () => {
  it.each<[GroupContext['id'], number, number, Index, boolean, string]>([
    [
      'class',
      2,
      3,
      0,
      false,
      'In een klas is jongens : meisjes = 2 : 3. Welk deel van de klas is jongen?',
    ],
    [
      'class',
      2,
      3,
      1,
      false,
      'In een klas is jongens : meisjes = 2 : 3. Welk deel van de klas is meisje?',
    ],
    [
      'class',
      2,
      3,
      0,
      true,
      'In een klas is jongens : meisjes = 2 : 3. Hoeveel procent van de klas is jongen?',
    ],
    [
      'class',
      2,
      3,
      1,
      true,
      'In een klas is jongens : meisjes = 2 : 3. Hoeveel procent van de klas is meisje?',
    ],
    [
      'marbles',
      2,
      3,
      0,
      false,
      'In een zak is rood : blauw = 2 : 3. Welk deel van de knikkers is rood?',
    ],
    [
      'marbles',
      2,
      3,
      1,
      true,
      'In een zak is rood : blauw = 2 : 3. Hoeveel procent van de knikkers is blauw?',
    ],
    [
      'audience',
      2,
      3,
      0,
      false,
      'Bij een voorstelling is volwassenen : kinderen = 2 : 3. Welk deel van het publiek is volwassen?',
    ],
    [
      'audience',
      2,
      3,
      1,
      false,
      'Bij een voorstelling is volwassenen : kinderen = 2 : 3. Welk deel van het publiek is kind?',
    ],
    [
      'audience',
      1,
      2,
      0,
      true,
      'Bij een voorstelling is volwassenen : kinderen = 1 : 2. Hoeveel procent van het publiek is volwassen?',
    ],
    [
      'audience',
      1,
      2,
      1,
      true,
      'Bij een voorstelling is volwassenen : kinderen = 1 : 2. Hoeveel procent van het publiek is kind?',
    ],
  ])('words %s %i : %i, group %i, percentage %s', (id, a, b, index, pct, prompt) => {
    expect(stepOf(partQuestion(groupContext(id), a, b, index, pct)).prompt).toBe(prompt);
  });

  it('is a single fraction step with a key of the context, ratio, group and form', () => {
    const fraction = partQuestion(groupContext('class'), 2, 3, 0, false);
    expect(fraction.topic).toBe('ratioProblems');
    expect(fraction.key).toBe('ratioProblems:part:class:2:3:0:fraction');
    expect(fraction.steps).toHaveLength(1);
    expect(stepOf(fraction).kind).toBe('fraction');
    expect(stepOf(fraction).suffix).toBeUndefined();
    expect(stepOf(fraction).prefix).toBeUndefined();
    const percentage = partQuestion(groupContext('audience'), 1, 2, 1, true);
    expect(percentage.key).toBe('ratioProblems:part:audience:1:2:1:percent');
    expect(stepOf(percentage).kind).toBe('fraction');
    expect(stepOf(percentage).suffix).toBe('%');
    expect(stepOf(percentage).prefix).toBeUndefined();
  });

  it('rejects a ratio that is not simplified or has equal terms', () => {
    const context = groupContext('class');
    expect(() => partQuestion(context, 2, 2, 0, false)).toThrow(RangeError);
    expect(() => partQuestion(context, 1, 1, 0, false)).toThrow(RangeError);
    expect(() => partQuestion(context, 2, 4, 0, false)).toThrow(RangeError);
    expect(() => partQuestion(context, 3, 6, 0, true)).toThrow(RangeError);
  });

  it('rejects a ratio with a sum beyond the form, or a term that is no positive integer', () => {
    const context = groupContext('class');
    // 5 + 8 = 13 is above 12, 4 + 7 = 11 and 2 + 7 = 9 are no friendly percentage sums.
    expect(() => partQuestion(context, 5, 8, 0, false)).toThrow(RangeError);
    expect(() => partQuestion(context, 4, 7, 0, true)).toThrow(RangeError);
    expect(() => partQuestion(context, 2, 7, 1, true)).toThrow(RangeError);
    expect(() => partQuestion(context, 0, 3, 0, false)).toThrow(RangeError);
    expect(() => partQuestion(context, -1, 3, 0, false)).toThrow(RangeError);
    expect(() => partQuestion(context, 1.5, 2.5, 0, false)).toThrow(RangeError);
    expect(() => partQuestion(context, 5, 7, 0, false)).not.toThrow();
    expect(() => partQuestion(context, 1, 11, 1, false)).not.toThrow();
    expect(() => partQuestion(context, 3, 7, 0, true)).not.toThrow();
  });
});

describe('part of the whole answers', () => {
  // The ratio tips end in the fraction asked, which the cases append.
  const RATIO_CLASS_2_3 = '2 : 3 is jongens tegenover meisjes. Het geheel is 2 + 3 = 5 delen, dus ';
  const RATIO_CLASS_3_5 = '3 : 5 is jongens tegenover meisjes. Het geheel is 3 + 5 = 8 delen, dus ';
  const RATIO_MARBLES_2_3 =
    '2 : 3 is rode knikkers tegenover blauwe knikkers. Het geheel is 2 + 3 = 5 delen, dus ';
  const RATIO_AUDIENCE_1_2 =
    '1 : 2 is volwassenen tegenover kinderen. Het geheel is 1 + 2 = 3 delen, dus ';
  const OTHER_JONGENS = 'Dat is het deel meisjes; gevraagd is het deel jongens.';
  const OTHER_MEISJES = 'Dat is het deel jongens; gevraagd is het deel meisjes.';
  const OTHER_ROOD = 'Dat is het deel blauwe knikkers; gevraagd is het deel rode knikkers.';
  const OTHER_KINDEREN = 'Dat is het deel volwassenen; gevraagd is het deel kinderen.';
  const SIMPLIFY = 'De waarde klopt, maar vereenvoudig nog: 4/10 = 2/5.';

  type AnswerCase = [
    GroupContext['id'],
    number,
    number,
    Index,
    boolean,
    string,
    boolean,
    string | undefined,
  ];

  it.each<AnswerCase>([
    ['class', 2, 3, 0, false, '2/5', true, undefined],
    ['class', 2, 3, 0, false, '0,4', true, undefined],
    ['class', 2, 3, 0, false, '4/10', false, SIMPLIFY],
    ['class', 2, 3, 0, false, '2/3', false, `${RATIO_CLASS_2_3}2/5.`],
    ['class', 2, 3, 0, false, '3/5', false, OTHER_JONGENS],
    ['class', 2, 3, 0, false, '0,6', false, OTHER_JONGENS],
    ['class', 2, 3, 0, false, '1/2', false, undefined],
    ['class', 2, 3, 0, false, '4', false, TIMES_TEN_TOO_LARGE],
    ['class', 2, 3, 1, false, '3/5', true, undefined],
    ['class', 2, 3, 1, false, '3/2', false, `${RATIO_CLASS_2_3}3/5.`],
    ['class', 2, 3, 1, false, '2/5', false, OTHER_MEISJES],
    ['marbles', 2, 3, 0, false, '2/3', false, `${RATIO_MARBLES_2_3}2/5.`],
    ['marbles', 2, 3, 0, false, '3/5', false, OTHER_ROOD],
    ['audience', 1, 2, 1, true, '66 2/3', true, undefined],
    ['audience', 1, 2, 1, true, '200/3', true, undefined],
    ['audience', 1, 2, 1, true, '200', false, `${RATIO_AUDIENCE_1_2}2/3.`],
    ['audience', 1, 2, 1, true, '33 1/3', false, OTHER_KINDEREN],
    ['audience', 1, 2, 1, true, '100/3', false, OTHER_KINDEREN],
    ['audience', 1, 2, 1, true, '66,7', false, undefined],
    ['class', 3, 5, 0, true, '37,5', true, undefined],
    ['class', 3, 5, 0, true, '37 1/2', true, undefined],
    ['class', 3, 5, 0, true, '75/2', true, undefined],
    ['class', 3, 5, 0, true, '60', false, `${RATIO_CLASS_3_5}3/8.`],
    ['class', 3, 5, 0, true, '62,5', false, OTHER_JONGENS],
    ['class', 3, 5, 0, true, '3,75', false, TIMES_TEN_TOO_SMALL],
  ])('%s %i : %i, group %i, percentage %s: typing %s', (id, a, b, index, pct, input, ok, tip) => {
    const result = askPart(id, a, b, index, pct, input);
    expect(result.correct).toBe(ok);
    expect(result.tip).toBe(tip);
  });

  it.each<[GroupContext['id'], number, number, Index, boolean, string]>([
    ['class', 2, 3, 0, false, '2/5'],
    ['class', 1, 11, 0, false, '1/12'],
    ['audience', 1, 2, 1, true, '66 2/3'],
    ['audience', 1, 2, 0, true, '33 1/3'],
    ['marbles', 1, 5, 0, true, '16 2/3'],
    ['marbles', 1, 5, 1, true, '83 1/3'],
    ['class', 3, 5, 0, true, '37,5'],
    ['class', 1, 3, 0, true, '25'],
    ['class', 1, 9, 1, true, '90'],
  ])('shows %s %i : %i, group %i, percentage %s as %s', (id, a, b, index, pct, expected) => {
    expect(askPart(id, a, b, index, pct, '').expected).toBe(expected);
  });

  it.each<[GroupContext['id'], number, number, Index, boolean, string]>([
    ['class', 2, 3, 0, false, '2 + 3 = 5 delen → jongens = 2/5'],
    ['class', 2, 3, 1, false, '2 + 3 = 5 delen → meisjes = 3/5'],
    ['marbles', 2, 3, 1, false, '2 + 3 = 5 delen → blauwe knikkers = 3/5'],
    ['audience', 1, 2, 1, true, '1 + 2 = 3 delen → 2/3 = 66 2/3%'],
    ['audience', 1, 2, 0, true, '1 + 2 = 3 delen → 1/3 = 33 1/3%'],
    ['class', 3, 5, 0, true, '3 + 5 = 8 delen → 3/8 = 37,5%'],
    ['class', 1, 3, 1, true, '1 + 3 = 4 delen → 3/4 = 75%'],
  ])('explains %s %i : %i, group %i, percentage %s', (id, a, b, index, pct, explanation) => {
    expect(askPart(id, a, b, index, pct, '').explanation).toBe(explanation);
  });

  it('shows the explanation for a correct and for a wrong answer', () => {
    const explanation = '2 + 3 = 5 delen → jongens = 2/5';
    expect(askPart('class', 2, 3, 0, false, '2/5').explanation).toBe(explanation);
    expect(askPart('class', 2, 3, 0, false, '1/2').explanation).toBe(explanation);
  });
});

describe('every supported part-of-the-whole question', () => {
  it('accepts its own answer, explains it and recognises both mistakes', () => {
    for (const context of GROUP_CONTEXTS) {
      for (const asPercentage of [false, true]) {
        const scale = asPercentage ? 100 : 1;
        for (const [a, b] of partPairsFor(asPercentage)) {
          for (const index of INDEXES) {
            const asked = termAt(a, b, index);
            const other = a + b - asked;
            const form = asPercentage ? '%' : 'fraction';
            const label = `${context.id} ${a} : ${b}, group ${index}, ${form}`;
            const step = stepOf(partQuestion(context, a, b, index, asPercentage));

            const correct = step.check(`${asked * scale}/${a + b}`);
            expect(correct.correct, label).toBe(true);
            expect(correct.tip, label).toBeUndefined();
            expect(correct.explanation, label).toBeTruthy();

            const ratio = step.check(`${asked * scale}/${other}`);
            expect(ratio.correct, label).toBe(false);
            expect(ratio.tip, label).toBe(
              `${a} : ${b} is ${context.groups[0]} tegenover ${context.groups[1]}. ` +
                `Het geheel is ${a} + ${b} = ${a + b} delen, dus ${asked}/${a + b}.`,
            );

            const otherPart = step.check(`${other * scale}/${a + b}`);
            const askedGroup = context.groups[index];
            const otherGroup = context.groups[index === 0 ? 1 : 0];
            expect(otherPart.correct, label).toBe(false);
            expect(otherPart.tip, label).toBe(
              `Dat is het deel ${otherGroup}; gevraagd is het deel ${askedGroup}.`,
            );

            const wrong = step.check(`${asked * scale}/${a + b + 1}`);
            expect(wrong.correct, label).toBe(false);
            expect(wrong.tip, label).toBeUndefined();
          }
        }
      }
    }
  });
});

describe('MIX_CONTEXTS', () => {
  it('has syrup, mortar and paint with their units, order and largest part', () => {
    expect(
      MIX_CONTEXTS.map(({ id, unit, smallerFirst, maxPart }) => [id, unit, smallerFirst, maxPart]),
    ).toEqual([
      ['syrup', 'ml', true, 200],
      ['mortar', 'kg', true, 200],
      ['paint', 'L', false, 20],
    ]);
  });

  it('names the ingredients with their article, and the mixture', () => {
    expect(mixContext('syrup').ingredients).toEqual([
      { name: 'siroop', withArticle: 'de siroop' },
      { name: 'water', withArticle: 'het water' },
    ]);
    expect(mixContext('mortar').ingredients).toEqual([
      { name: 'cement', withArticle: 'het cement' },
      { name: 'zand', withArticle: 'het zand' },
    ]);
    expect(mixContext('paint').ingredients).toEqual([
      { name: 'witte verf', withArticle: 'de witte verf' },
      { name: 'blauwe verf', withArticle: 'de blauwe verf' },
    ]);
    expect(MIX_CONTEXTS.map(({ mixture }) => mixture)).toEqual([
      'limonade',
      'mortel',
      'lichtblauwe verf',
    ]);
  });
});

describe('mixPairsFor', () => {
  it('lists the simplified ratios with terms in [1, 9], smaller part first for syrup', () => {
    const syrup = mixPairsFor(mixContext('syrup'));
    expect(syrup).toHaveLength(27);
    for (const [a, b] of syrup) {
      expect(a, `${a} : ${b}`).toBeLessThan(b);
      expect(b, `${a} : ${b}`).toBeLessThanOrEqual(9);
      expect(gcd(a, b), `${a} : ${b}`).toBe(1);
    }
    expect(syrup).toContainEqual([1, 6]);
    expect(syrup).not.toContainEqual([6, 1]);
    expect(mixPairsFor(mixContext('mortar'))).toEqual(syrup);
  });

  it('lists both orders for paint', () => {
    const paint = mixPairsFor(mixContext('paint'));
    expect(paint).toHaveLength(54);
    expect(paint).toContainEqual([3, 2]);
    expect(paint).toContainEqual([2, 3]);
    expect(paint).not.toContainEqual([2, 2]);
    expect(paint).not.toContainEqual([2, 4]);
  });
});

describe('mixPartsFor', () => {
  const syrup = mixContext('syrup');
  const paint = mixContext('paint');

  it('allows a part in [2, 200] whose given amount has at most 2 digits, from one part', () => {
    // The given amount is 1 × part for the syrup: 50 and 140, not 137 or 101.
    const syrupGiven = mixPartsFor(syrup, 1, 6, 0);
    expect(syrupGiven).toEqual([...range(2, 99), ...range(10, 20).map((tens) => tens * 10)]);
    expect(syrupGiven).toContain(50);
    expect(syrupGiven).toContain(140);
    expect(syrupGiven).not.toContain(137);
    expect(syrupGiven).not.toContain(101);
  });

  it('takes the given amount from the ingredient that is given', () => {
    // 6 × part for the water: 6 × 16 = 96 and 6 × 20 = 120, but 6 × 17 = 102 and 6 × 51 = 306.
    const waterGiven = mixPartsFor(syrup, 1, 6, 1);
    expect(waterGiven).toContain(2); // 12
    expect(waterGiven).toContain(16); // 96
    expect(waterGiven).toContain(20); // 120
    expect(waterGiven).toContain(25); // 150
    expect(waterGiven).toContain(200); // 1200
    expect(waterGiven).not.toContain(17); // 102
    expect(waterGiven).not.toContain(51); // 306, while 51 itself is fine for the syrup
    expect(mixPartsFor(syrup, 1, 6, 0)).toContain(51);
    expect(mixPartsFor(syrup, 1, 6, 0)).toContain(17);
  });

  it('keeps the total at most 2000, from one part too', () => {
    // 17 × 117 = 1989 and 17 × 118 = 2006; 8 × 120 = 960 and 8 × 125 = 1000 are fine amounts.
    const eightGiven = mixPartsFor(syrup, 8, 9, 0);
    expect(Math.max(...eightGiven)).toBeLessThanOrEqual(117);
    expect(eightGiven).toContain(115); // 920, total 1955
    expect(eightGiven).not.toContain(120); // 960, total 2040
    expect(eightGiven).not.toContain(125); // 1000, total 2125
  });

  it('allows a part up to 20 for paint', () => {
    // 8 × part: 16 … 96 for 2 … 12, then 120 and 160; 9 × part: 18 … 99 for 2 … 11, then 180.
    expect(mixPartsFor(paint, 8, 9, 0)).toEqual([...range(2, 12), 15, 20]);
    expect(mixPartsFor(paint, 8, 9, 1)).toEqual([...range(2, 11), 20]);
  });

  it('keeps a total of at most 2 significant digits from the total', () => {
    const fromTotal = mixPartsFor(syrup, 1, 6, 'total');
    expect(fromTotal).toContain(2); // 14
    expect(fromTotal).toContain(50); // 350
    expect(fromTotal).toContain(100); // 700
    expect(fromTotal).toContain(200); // 1400
    expect(fromTotal).not.toContain(51); // 357
    expect(fromTotal).not.toContain(101); // 707
    expect(fromTotal).not.toContain(150); // 1050
    expect(mixPartsFor(paint, 8, 9, 'total')).toEqual([2, 3, 4, 5, 10, 20]);
  });

  describe('for every context, ratio and given amount', () => {
    const cases = MIX_CONTEXTS.flatMap((context) =>
      mixPairsFor(context).flatMap(([a, b]) =>
        GIVEN_AMOUNTS.map((given) => ({
          context,
          a,
          b,
          given,
          label: `${context.id} ${a} : ${b}, given ${given}`,
        })),
      ),
    );

    it('is every part within the size, the total and the digits the spec allows', () => {
      expect(cases.length).toBeGreaterThan(300);
      for (const { context, a, b, given, label } of cases) {
        // Independent of the module: the given amount is the total or one term, times the part.
        const parts = given === 'total' ? a + b : termAt(a, b, given);
        const expected = range(2, context.maxPart).filter(
          (part) => (a + b) * part <= 2000 && significantDigits(parts * part) <= 2,
        );
        expect(mixPartsFor(context, a, b, given), label).toEqual(expected);
      }
    });

    it('has at least one part, so a question can always be drawn', () => {
      // A part of 2 always fits: the total is at most 2 × 17 = 34 and no given amount is larger,
      // so each has at most 2 digits.
      for (const { context, a, b, given, label } of cases) {
        expect(mixPartsFor(context, a, b, given), label).toContain(2);
      }
    });
  });
});

describe('mixFromTotalQuestion', () => {
  it.each<[MixContext['id'], number, number, number, Index, string]>([
    ['syrup', 1, 6, 50, 0, 'Siroop : water = 1 : 6. Hoeveel ml siroop zit er in 350 ml limonade?'],
    ['syrup', 1, 6, 50, 1, 'Siroop : water = 1 : 6. Hoeveel ml water zit er in 350 ml limonade?'],
    ['mortar', 1, 4, 50, 1, 'Cement : zand = 1 : 4. Hoeveel kg zand zit er in 250 kg mortel?'],
    [
      'paint',
      3,
      2,
      3,
      0,
      'Witte verf : blauwe verf = 3 : 2. Hoeveel L witte verf zit er in 15 L lichtblauwe verf?',
    ],
    [
      'paint',
      2,
      3,
      2,
      1,
      'Witte verf : blauwe verf = 2 : 3. Hoeveel L blauwe verf zit er in 10 L lichtblauwe verf?',
    ],
  ])('words %s %i : %i with part %i, asking %i', (id, a, b, part, asked, prompt) => {
    expect(stepOf(mixFromTotalQuestion(mixContext(id), a, b, part, asked)).prompt).toBe(prompt);
  });

  it('is a single number step with the unit as suffix and a key of the numbers', () => {
    const question = mixFromTotalQuestion(mixContext('syrup'), 1, 6, 50, 0);
    expect(question.topic).toBe('ratioProblems');
    expect(question.key).toBe('ratioProblems:mix:syrup:total:1:6:50:0');
    expect(question.steps).toHaveLength(1);
    expect(stepOf(question).kind).toBe('number');
    expect(stepOf(question).suffix).toBe('ml');
    expect(stepOf(question).prefix).toBeUndefined();
    const paint = mixFromTotalQuestion(mixContext('paint'), 3, 2, 3, 1);
    expect(paint.key).toBe('ratioProblems:mix:paint:total:3:2:3:1');
    expect(stepOf(paint).suffix).toBe('L');
    expect(stepOf(mixFromTotalQuestion(mixContext('mortar'), 1, 4, 50, 1)).suffix).toBe('kg');
  });

  it('rejects a ratio or a part outside the supported ones', () => {
    const syrup = mixContext('syrup');
    // Equal terms, not simplified, a term of 10, the larger part first, a non-integer term.
    expect(() => mixFromTotalQuestion(syrup, 2, 2, 10, 0)).toThrow(RangeError);
    expect(() => mixFromTotalQuestion(syrup, 2, 4, 10, 0)).toThrow(RangeError);
    expect(() => mixFromTotalQuestion(syrup, 1, 10, 10, 0)).toThrow(RangeError);
    expect(() => mixFromTotalQuestion(syrup, 6, 1, 10, 0)).toThrow(RangeError);
    expect(() => mixFromTotalQuestion(syrup, 1.5, 6, 10, 0)).toThrow(RangeError);
    // Part 1 is too small, 201 too large; 357 has 3 significant digits; 8 : 9 with 120 is 2040.
    expect(() => mixFromTotalQuestion(syrup, 1, 6, 1, 0)).toThrow(RangeError);
    expect(() => mixFromTotalQuestion(syrup, 1, 6, 201, 0)).toThrow(RangeError);
    expect(() => mixFromTotalQuestion(syrup, 1, 6, 51, 0)).toThrow(RangeError);
    expect(() => mixFromTotalQuestion(syrup, 8, 9, 120, 0)).toThrow(RangeError);
    expect(() => mixFromTotalQuestion(syrup, 1, 6, 7.5, 0)).toThrow(RangeError);
    expect(() => mixFromTotalQuestion(mixContext('paint'), 3, 2, 21, 0)).toThrow(RangeError);
    expect(() => mixFromTotalQuestion(mixContext('paint'), 2, 3, 20, 0)).not.toThrow();
  });
});

describe('mixFromPartQuestion', () => {
  it.each<[MixContext['id'], number, number, number, Index, string]>([
    [
      'syrup',
      1,
      6,
      50,
      0,
      'Siroop : water = 1 : 6. Je hebt 50 ml siroop. Hoeveel ml water moet erbij?',
    ],
    [
      'syrup',
      1,
      6,
      50,
      1,
      'Siroop : water = 1 : 6. Je hebt 300 ml water. Hoeveel ml siroop moet erbij?',
    ],
    [
      'mortar',
      1,
      4,
      100,
      0,
      'Cement : zand = 1 : 4. Je hebt 100 kg cement. Hoeveel kg zand moet erbij?',
    ],
    [
      'paint',
      3,
      2,
      3,
      1,
      'Witte verf : blauwe verf = 3 : 2. Je hebt 6 L blauwe verf. Hoeveel L witte verf moet erbij?',
    ],
  ])('words %s %i : %i with part %i, given %i', (id, a, b, part, given, prompt) => {
    expect(stepOf(mixFromPartQuestion(mixContext(id), a, b, part, given)).prompt).toBe(prompt);
  });

  it('is a single number step with the unit as suffix and a key of the numbers', () => {
    const question = mixFromPartQuestion(mixContext('mortar'), 2, 5, 50, 1);
    expect(question.topic).toBe('ratioProblems');
    expect(question.key).toBe('ratioProblems:mix:mortar:part:2:5:50:1');
    expect(question.steps).toHaveLength(1);
    expect(stepOf(question).kind).toBe('number');
    expect(stepOf(question).suffix).toBe('kg');
    expect(stepOf(question).prefix).toBeUndefined();
  });

  it('has no limit on the digits of the total, only on the size', () => {
    const syrup = mixContext('syrup');
    // The total 357 has 3 digits; 8 : 9 with 115 is 1955 and with 120 is 2040; 220 has 2 digits.
    expect(() => mixFromPartQuestion(syrup, 1, 6, 51, 0)).not.toThrow();
    expect(() => mixFromPartQuestion(syrup, 8, 9, 115, 0)).not.toThrow();
    expect(() => mixFromPartQuestion(syrup, 8, 9, 120, 0)).toThrow(RangeError);
    expect(() => mixFromPartQuestion(syrup, 1, 6, 1, 0)).toThrow(RangeError);
    expect(() => mixFromPartQuestion(syrup, 1, 6, 220, 0)).toThrow(RangeError);
    expect(() => mixFromPartQuestion(syrup, 6, 1, 10, 0)).toThrow(RangeError);
    expect(() => mixFromPartQuestion(mixContext('paint'), 3, 2, 21, 0)).toThrow(RangeError);
  });

  it('limits the given amount to 2 significant digits', () => {
    const syrup = mixContext('syrup');
    const paint = mixContext('paint');
    // 50 and 140 are fine, 137 is not. The amount that is given counts: 17 is a fine amount of
    // siroop, but 6 × 17 = 102 is no fine amount of water.
    expect(() => mixFromPartQuestion(syrup, 1, 6, 50, 0)).not.toThrow();
    expect(() => mixFromPartQuestion(syrup, 1, 6, 140, 0)).not.toThrow();
    expect(() => mixFromPartQuestion(syrup, 1, 6, 137, 0)).toThrow(RangeError);
    expect(() => mixFromPartQuestion(syrup, 1, 6, 17, 0)).not.toThrow();
    expect(() => mixFromPartQuestion(syrup, 1, 6, 17, 1)).toThrow(RangeError);
    expect(() => mixFromPartQuestion(syrup, 1, 6, 20, 1)).not.toThrow(); // 120
    expect(() => mixFromPartQuestion(syrup, 8, 9, 110, 1)).not.toThrow(); // 990, total 1870
    expect(() => mixFromPartQuestion(syrup, 8, 9, 117, 1)).toThrow(RangeError); // 1053
    expect(() => mixFromPartQuestion(paint, 8, 9, 15, 0)).not.toThrow(); // 120
    expect(() => mixFromPartQuestion(paint, 8, 9, 13, 0)).toThrow(RangeError); // 104
  });
});

describe('mixing answers from the total', () => {
  const DIVIDE_1_6 = 'Deel eerst door het totaal aantal delen: 1 + 6 = 7.';
  const DIVIDE_1_4 = 'Deel eerst door het totaal aantal delen: 1 + 4 = 5.';
  const DIVIDE_3_2 = 'Deel eerst door het totaal aantal delen: 3 + 2 = 5.';
  const OTHER_SIROOP = 'Dat is de hoeveelheid water; gevraagd is de siroop.';
  const OTHER_WATER = 'Dat is de hoeveelheid siroop; gevraagd is het water.';
  const OTHER_ZAND = 'Dat is de hoeveelheid cement; gevraagd is het zand.';
  const OTHER_WIT = 'Dat is de hoeveelheid blauwe verf; gevraagd is de witte verf.';
  const OTHER_BLAUW = 'Dat is de hoeveelheid witte verf; gevraagd is de blauwe verf.';

  type AnswerCase = [
    MixContext['id'],
    number,
    number,
    number,
    Index,
    string,
    boolean,
    string | undefined,
  ];

  it.each<AnswerCase>([
    ['syrup', 1, 6, 50, 0, '50', true, undefined],
    ['syrup', 1, 6, 50, 0, '50,0', true, undefined],
    ['syrup', 1, 6, 50, 0, '300', false, OTHER_SIROOP],
    ['syrup', 1, 6, 50, 0, '350', false, DIVIDE_1_6],
    ['syrup', 1, 6, 50, 0, '5', false, TIMES_TEN_TOO_SMALL],
    ['syrup', 1, 6, 50, 0, '70', false, undefined],
    ['syrup', 1, 6, 50, 1, '300', true, undefined],
    ['syrup', 1, 6, 50, 1, '50', false, OTHER_WATER],
    ['syrup', 1, 6, 50, 1, '350', false, DIVIDE_1_6],
    ['mortar', 1, 4, 50, 1, '200', true, undefined],
    ['mortar', 1, 4, 50, 1, '50', false, OTHER_ZAND],
    ['mortar', 1, 4, 50, 1, '62,5', false, DIVIDE_1_4],
    ['mortar', 1, 4, 50, 1, '', false, undefined],
    ['paint', 3, 2, 3, 0, '9', true, undefined],
    ['paint', 3, 2, 3, 0, '6', false, OTHER_WIT],
    ['paint', 3, 2, 3, 0, '5', false, DIVIDE_3_2],
    ['paint', 3, 2, 3, 0, '7,5', false, DIVIDE_3_2],
    ['paint', 3, 2, 3, 1, '6', true, undefined],
    ['paint', 3, 2, 3, 1, '9', false, OTHER_BLAUW],
  ])('%s %i : %i, part %i, asking %i: typing %s', (id, a, b, part, asked, input, ok, tip) => {
    const result = askTotal(id, a, b, part, asked, input);
    expect(result.correct).toBe(ok);
    expect(result.tip).toBe(tip);
  });

  it('shows the expected answer', () => {
    expect(askTotal('syrup', 1, 6, 50, 0, '').expected).toBe('50');
    expect(askTotal('syrup', 1, 6, 50, 1, '').expected).toBe('300');
    expect(askTotal('mortar', 1, 4, 50, 1, '').expected).toBe('200');
    expect(askTotal('paint', 3, 2, 3, 0, '').expected).toBe('9');
    expect(askTotal('mortar', 8, 9, 10, 1, '').expected).toBe('90');
  });

  it.each<[MixContext['id'], number, number, number, Index, string]>([
    ['syrup', 1, 6, 50, 0, '1 + 6 = 7 delen → 1 deel = 350 : 7 = 50 → siroop = 1 deel = 50'],
    ['syrup', 1, 6, 50, 1, '1 + 6 = 7 delen → 1 deel = 350 : 7 = 50 → water = 6 delen = 300'],
    ['mortar', 1, 4, 50, 1, '1 + 4 = 5 delen → 1 deel = 250 : 5 = 50 → zand = 4 delen = 200'],
    ['paint', 3, 2, 3, 0, '3 + 2 = 5 delen → 1 deel = 15 : 5 = 3 → witte verf = 3 delen = 9'],
    ['paint', 3, 2, 3, 1, '3 + 2 = 5 delen → 1 deel = 15 : 5 = 3 → blauwe verf = 2 delen = 6'],
  ])('explains %s %i : %i, part %i, asking %i', (id, a, b, part, asked, explanation) => {
    expect(askTotal(id, a, b, part, asked, '').explanation).toBe(explanation);
  });

  it('shows the explanation for a correct and for a wrong answer', () => {
    const explanation = '1 + 6 = 7 delen → 1 deel = 350 : 7 = 50 → siroop = 1 deel = 50';
    expect(askTotal('syrup', 1, 6, 50, 0, '50').explanation).toBe(explanation);
    expect(askTotal('syrup', 1, 6, 50, 0, '300').explanation).toBe(explanation);
  });
});

describe('mixing answers from one part', () => {
  const WHOLE_WATER = 'Dat is de hele hoeveelheid limonade; gevraagd is alleen het water.';
  const WHOLE_SIROOP = 'Dat is de hele hoeveelheid limonade; gevraagd is alleen de siroop.';
  const WHOLE_ZAND = 'Dat is de hele hoeveelheid mortel; gevraagd is alleen het zand.';
  const WHOLE_WIT =
    'Dat is de hele hoeveelheid lichtblauwe verf; gevraagd is alleen de witte verf.';

  type AnswerCase = [
    MixContext['id'],
    number,
    number,
    number,
    Index,
    string,
    boolean,
    string | undefined,
  ];

  it.each<AnswerCase>([
    ['syrup', 1, 6, 50, 0, '300', true, undefined],
    ['syrup', 1, 6, 50, 0, '350', false, WHOLE_WATER],
    ['syrup', 1, 6, 50, 0, '50', false, undefined],
    ['syrup', 1, 6, 50, 0, '30', false, TIMES_TEN_TOO_SMALL],
    ['syrup', 1, 6, 50, 1, '50', true, undefined],
    ['syrup', 1, 6, 50, 1, '350', false, WHOLE_SIROOP],
    ['mortar', 2, 5, 50, 0, '250', true, undefined],
    ['mortar', 2, 5, 50, 0, '350', false, WHOLE_ZAND],
    ['paint', 3, 2, 3, 1, '9', true, undefined],
    ['paint', 3, 2, 3, 1, '15', false, WHOLE_WIT],
    ['paint', 3, 2, 3, 1, '90', false, TIMES_TEN_TOO_LARGE],
  ])('%s %i : %i, part %i, given %i: typing %s', (id, a, b, part, given, input, ok, tip) => {
    const result = askGiven(id, a, b, part, given, input);
    expect(result.correct).toBe(ok);
    expect(result.tip).toBe(tip);
  });

  it('shows the expected answer', () => {
    expect(askGiven('syrup', 1, 6, 50, 0, '').expected).toBe('300');
    expect(askGiven('syrup', 1, 6, 50, 1, '').expected).toBe('50');
    expect(askGiven('mortar', 2, 5, 50, 0, '').expected).toBe('250');
  });

  it.each<[MixContext['id'], number, number, number, Index, string]>([
    ['syrup', 1, 6, 50, 0, 'siroop = 1 deel = 50 → water = 6 delen = 300'],
    ['syrup', 1, 6, 50, 1, 'water = 6 delen = 300 → siroop = 1 deel = 50'],
    ['mortar', 2, 5, 50, 0, 'cement = 2 delen = 100 → 1 deel = 50 → zand = 5 delen = 250'],
    ['mortar', 2, 5, 50, 1, 'zand = 5 delen = 250 → 1 deel = 50 → cement = 2 delen = 100'],
    ['paint', 3, 2, 4, 0, 'witte verf = 3 delen = 12 → 1 deel = 4 → blauwe verf = 2 delen = 8'],
  ])('explains %s %i : %i, part %i, given %i', (id, a, b, part, given, explanation) => {
    expect(askGiven(id, a, b, part, given, '').explanation).toBe(explanation);
  });
});

describe('every supported mixing question', () => {
  /** The value as typed: '62,5', or null when it has no finite decimal. */
  function typedOrNull(value: Rational): string | null {
    return decimalPlaces(value) === null ? null : typed(value);
  }

  it('accepts its own answer, explains it and recognises the mistakes', () => {
    for (const context of MIX_CONTEXTS) {
      for (const [a, b] of mixPairsFor(context)) {
        for (const index of INDEXES) {
          for (const fromTotal of [true, false]) {
            // The amount that is given: the total, or the amount of ingredient `index`.
            const parts = mixPartsFor(context, a, b, fromTotal ? 'total' : index);
            for (const part of parts) {
              // Independent of the module: the amounts of the two ingredients and their total.
              const amounts = [a * part, b * part] as const;
              const total = amounts[0] + amounts[1];
              const variant = fromTotal ? 'total' : 'given';
              const label = `${context.id} ${a} : ${b}, part ${part}, ${variant} ${index}`;
              const otherIndex = index === 0 ? 1 : 0;
              // From the total `index` is the asked ingredient, from one part the given one.
              const askedAmount = amounts[fromTotal ? index : otherIndex];
              const question = fromTotal
                ? mixFromTotalQuestion(context, a, b, part, index)
                : mixFromPartQuestion(context, a, b, part, index);
              const step = stepOf(question);

              const correct = step.check(String(askedAmount));
              expect(correct.correct, label).toBe(true);
              expect(correct.tip, label).toBeUndefined();
              expect(correct.explanation, label).toBeTruthy();
              expect(correct.expected, label).toBe(String(askedAmount));

              if (fromTotal) {
                const other = step.check(String(amounts[otherIndex]));
                expect(other.correct, label).toBe(false);
                expect(other.tip, label).toBe(
                  `Dat is de hoeveelheid ${context.ingredients[otherIndex].name}; ` +
                    `gevraagd is ${context.ingredients[index].withArticle}.`,
                );
                for (const term of [a, b]) {
                  const divided = typedOrNull(divide(fromInteger(total), fromInteger(term)));
                  if (divided === null) continue;
                  const result = step.check(divided);
                  expect(result.correct, label).toBe(false);
                  expect(result.tip, label).toBe(
                    `Deel eerst door het totaal aantal delen: ${a} + ${b} = ${a + b}.`,
                  );
                }
              } else {
                const wholeAmount = step.check(String(total));
                expect(wholeAmount.correct, label).toBe(false);
                expect(wholeAmount.tip, label).toBe(
                  `Dat is de hele hoeveelheid ${context.mixture}; ` +
                    `gevraagd is alleen ${context.ingredients[otherIndex].withArticle}.`,
                );
              }
            }
          }
        }
      }
    }
  });
});

describe('formatAmount', () => {
  it.each<[UnitContextId, string, string]>([
    ['cheese', '1', '100 g'],
    ['cheese', '2', '200 g'],
    ['cheese', '4', '400 g'],
    ['cheese', '9', '900 g'],
    ['cheese', '10', '1 kg'],
    ['cheese', '15', '1,5 kg'],
    ['cheese', '21', '2,1 kg'],
    ['cheese', '30', '3 kg'],
    ['petrol', '1', '1 L'],
    ['petrol', '5', '5 L'],
    ['petrol', '25', '25 L'],
    ['petrol', '60', '60 L'],
    ['wage', '1', '1 uur'],
    ['wage', '2,5', '2,5 uur'],
    ['wage', '4', '4 uur'],
    ['wage', '10', '10 uur'],
  ])('writes %s %s (counting units) as %s', (context, amount, text) => {
    expect(formatAmount(context, dutch(amount))).toBe(text);
  });

  it('rejects an amount that is not a positive multiple of the grid of its context', () => {
    // Cheese and petrol count in whole units (100 g, 1 L), the wage in half hours.
    expect(() => formatAmount('cheese', dutch('0,5'))).toThrow(RangeError);
    expect(() => formatAmount('cheese', dutch('12,5'))).toThrow(RangeError);
    expect(() => formatAmount('cheese', dutch('0'))).toThrow(RangeError);
    expect(() => formatAmount('cheese', dutch('-1'))).toThrow(RangeError);
    expect(() => formatAmount('petrol', dutch('2,5'))).toThrow(RangeError);
    expect(() => formatAmount('petrol', dutch('0'))).toThrow(RangeError);
    expect(() => formatAmount('wage', dutch('0,25'))).toThrow(RangeError);
    expect(() => formatAmount('wage', rational(1n, 3n))).toThrow(RangeError);
    expect(() => formatAmount('wage', dutch('0'))).toThrow(RangeError);
    expect(() => formatAmount('wage', dutch('-2'))).toThrow(RangeError);
    expect(() => formatAmount('wage', dutch('0,5'))).not.toThrow();
  });
});

describe('stepAmount', () => {
  it.each<[UnitContextId, string, string, string]>([
    ['cheese', '15', '4', '1'],
    ['cheese', '10', '30', '1'],
    ['petrol', '40', '25', '5'],
    ['petrol', '10', '35', '5'],
    ['petrol', '40', '23', '1'],
    ['petrol', '23', '37', '1'],
    ['petrol', '25', '12', '1'],
    ['wage', '4', '2,5', '1'],
    ['wage', '10', '5', '1'],
  ])('%s %s and %s: step %s', (context, first, second, step) => {
    expect(equals(stepAmount(context, dutch(first), dutch(second)), dutch(step))).toBe(true);
  });
});

describe('unitQuestion', () => {
  it.each<[UnitContextId, string, string, string, string]>([
    ['cheese', '15', '12', '4', `1,5 kg kaas kost ${EURO}12. Wat kost 400 g?`],
    ['cheese', '4', '3,20', '15', `400 g kaas kost ${EURO}3,20. Wat kost 1,5 kg?`],
    ['cheese', '30', '54', '13', `3 kg kaas kost ${EURO}54. Wat kost 1,3 kg?`],
    ['cheese', '20', '16', '3', `2 kg kaas kost ${EURO}16. Wat kost 300 g?`],
    ['petrol', '40', '76', '25', `40 L benzine kost ${EURO}76. Wat kost 25 L?`],
    ['petrol', '23', '43,70', '37', `23 L benzine kost ${EURO}43,70. Wat kost 37 L?`],
    ['wage', '4', '60', '2,5', `Voor 4 uur werk krijg je ${EURO}60. Hoeveel voor 2,5 uur?`],
    ['wage', '2,5', '37,50', '4', `Voor 2,5 uur werk krijg je ${EURO}37,50. Hoeveel voor 4 uur?`],
  ])('words %s %s for %s and %s', (context, first, firstPrice, second, prompt) => {
    expect(stepOf(unit(context, first, firstPrice, second)).prompt).toBe(prompt);
  });

  it('is a single number step in euros with a key of the context, amounts and unit price', () => {
    const cheese = unit('cheese', '15', '12', '4');
    expect(cheese.topic).toBe('ratioProblems');
    expect(cheese.key).toBe('ratioProblems:unit:cheese:15:4:0,8');
    expect(cheese.steps).toHaveLength(1);
    expect(stepOf(cheese).kind).toBe('number');
    expect(stepOf(cheese).prefix).toBe('€');
    expect(stepOf(cheese).suffix).toBeUndefined();
    expect(unit('petrol', '40', '76', '25').key).toBe('ratioProblems:unit:petrol:40:25:1,9');
    expect(unit('petrol', '23', '43,70', '37').key).toBe('ratioProblems:unit:petrol:23:37:1,9');
    expect(unit('wage', '4', '60', '2,5').key).toBe('ratioProblems:unit:wage:4:2,5:15');
    expect(stepOf(unit('wage', '4', '60', '2,5')).prefix).toBe('€');
  });

  it('rejects an amount outside the range or the grid of its context', () => {
    // Cheese 100 g and 3,1 kg are outside [200 g, 3 kg]; 3,5 counting units is 350 g.
    expect(() => unit('cheese', '1', '0,80', '4')).toThrow(RangeError);
    expect(() => unit('cheese', '15', '12', '31')).toThrow(RangeError);
    expect(() => unit('cheese', '15', '12', '3,5')).toThrow(RangeError);
    // Petrol below 5 L, above 60 L, and half a litre.
    expect(() => unit('petrol', '4', '7,60', '23')).toThrow(RangeError);
    expect(() => unit('petrol', '40', '76', '61')).toThrow(RangeError);
    expect(() => unit('petrol', '40', '76', '12,5')).toThrow(RangeError);
    // The wage below 1 uur, above 10 uur, and a quarter of an hour.
    expect(() => unit('wage', '0,5', '7,50', '4')).toThrow(RangeError);
    expect(() => unit('wage', '4', '60', '10,5')).toThrow(RangeError);
    expect(() => unit('wage', '4', '60', '2,25')).toThrow(RangeError);
  });

  it('rejects a price per unit outside the range or the grid of its context', () => {
    // Cheese per 100 g: 0,55 is no multiple of 10 cents, 0,50 is below and 2,60 above the range.
    expect(() => unit('cheese', '15', '8,25', '4')).toThrow(RangeError);
    expect(() => unit('cheese', '15', '7,50', '4')).toThrow(RangeError);
    expect(() => unit('cheese', '15', '39', '4')).toThrow(RangeError);
    // Petrol per litre: 1,85 is no multiple of 10 cents, 1,50 is below and 2,30 above the range.
    expect(() => unit('petrol', '40', '74', '25')).toThrow(RangeError);
    expect(() => unit('petrol', '40', '60', '25')).toThrow(RangeError);
    expect(() => unit('petrol', '40', '92', '25')).toThrow(RangeError);
    // The wage per hour: 12,50 is no whole number of euros, 9 is below and 26 above the range.
    expect(() => unit('wage', '4', '50', '2,5')).toThrow(RangeError);
    expect(() => unit('wage', '4', '36', '2,5')).toThrow(RangeError);
    expect(() => unit('wage', '4', '104', '2,5')).toThrow(RangeError);
    expect(() => unit('wage', '4', '0', '2,5')).toThrow(RangeError);
  });

  it('accepts the edges of the ranges', () => {
    expect(() => unit('cheese', '2', '1,60', '29')).not.toThrow();
    expect(() => unit('cheese', '30', '24', '29')).not.toThrow();
    expect(() => unit('cheese', '15', '9', '4')).not.toThrow();
    expect(() => unit('cheese', '15', '37,50', '4')).not.toThrow();
    expect(() => unit('petrol', '5', '8,50', '59')).not.toThrow();
    expect(() => unit('petrol', '60', '96', '59')).not.toThrow();
    expect(() => unit('petrol', '40', '64', '25')).not.toThrow();
    expect(() => unit('petrol', '40', '88', '25')).not.toThrow();
    expect(() => unit('wage', '1,5', '15', '2,5')).not.toThrow();
    expect(() => unit('wage', '4', '40', '2,5')).not.toThrow();
    expect(() => unit('wage', '4', '100', '2,5')).not.toThrow();
  });

  it('rejects amounts that are a whole multiple of each other', () => {
    expect(() => unit('cheese', '4', '3,20', '12')).toThrow(RangeError);
    expect(() => unit('cheese', '12', '9,60', '4')).toThrow(RangeError);
    expect(() => unit('cheese', '15', '12', '15')).toThrow(RangeError);
    expect(() => unit('petrol', '10', '19', '30')).toThrow(RangeError);
    expect(() => unit('wage', '4', '60', '2')).toThrow(RangeError);
    expect(() => unit('wage', '2,5', '37,50', '5')).toThrow(RangeError);
  });

  it('rejects an amount that is the step of the ratio table', () => {
    // 1 uur is the step for the wage, so there is no step to take.
    expect(() => unit('wage', '1', '15', '2,5')).toThrow(RangeError);
    expect(() => unit('wage', '2,5', '37,50', '1')).toThrow(RangeError);
  });

  it('rejects a price above € 200, but accepts exactly € 200', () => {
    expect(() => unit('wage', '10', '250', '2,5')).toThrow(RangeError);
    expect(() => unit('wage', '2,5', '62,50', '9')).toThrow(RangeError);
    expect(() => unit('wage', '8', '200', '2,5')).not.toThrow();
    expect(() => unit('wage', '2,5', '62,50', '8')).not.toThrow();
  });
});

describe('per-unit answers', () => {
  const INVERSE_CHEESE = `Je hebt omgekeerd gerekend: 400 g is minder dan 1,5 kg, dus het kost minder dan ${EURO}12.`;
  const INVERSE_PETROL_40_25 = `Je hebt omgekeerd gerekend: 25 L is minder dan 40 L, dus het kost minder dan ${EURO}76.`;
  const INVERSE_PETROL_23_37 = `Je hebt omgekeerd gerekend: 37 L is meer dan 23 L, dus het kost meer dan ${EURO}43,70.`;
  const INVERSE_WAGE_4_25 = `Je hebt omgekeerd gerekend: 2,5 uur is minder dan 4 uur, dus je krijgt minder dan ${EURO}60.`;
  const INVERSE_WAGE_25_4 = `Je hebt omgekeerd gerekend: 4 uur is meer dan 2,5 uur, dus je krijgt meer dan ${EURO}37,50.`;

  type AnswerCase = [UnitContextId, string, string, string, string, boolean, string | undefined];

  it.each<AnswerCase>([
    ['cheese', '15', '12', '4', '3,20', true, undefined],
    ['cheese', '15', '12', '4', '3,2', true, undefined],
    ['cheese', '15', '12', '4', '45', false, INVERSE_CHEESE],
    ['cheese', '15', '12', '4', '45,00', false, INVERSE_CHEESE],
    ['cheese', '15', '12', '4', '3200', false, TIMES_THOUSAND_TOO_LARGE],
    ['cheese', '15', '12', '4', '3,5', false, undefined],
    ['cheese', '15', '12', '4', '', false, undefined],
    ['petrol', '40', '76', '25', '47,50', true, undefined],
    ['petrol', '40', '76', '25', '47,5', true, undefined],
    ['petrol', '40', '76', '25', '121,60', false, INVERSE_PETROL_40_25],
    ['petrol', '40', '76', '25', '121,6', false, INVERSE_PETROL_40_25],
    ['petrol', '40', '76', '25', '47', false, undefined],
    ['petrol', '23', '43,70', '37', '70,30', true, undefined],
    // 43,70 × 23 : 37 = 27,1648…, which is typed as 27,16 (rounded half up to cents).
    ['petrol', '23', '43,70', '37', '27,16', false, INVERSE_PETROL_23_37],
    ['petrol', '23', '43,70', '37', '27,1648', false, undefined],
    ['petrol', '23', '43,70', '37', '27,17', false, undefined],
    ['petrol', '23', '43,70', '37', '27,2', false, undefined],
    ['wage', '4', '60', '2,5', '37,50', true, undefined],
    ['wage', '4', '60', '2,5', '37,5', true, undefined],
    ['wage', '4', '60', '2,5', '96', false, INVERSE_WAGE_4_25],
    ['wage', '4', '60', '2,5', '96,00', false, INVERSE_WAGE_4_25],
    ['wage', '4', '60', '2,5', '375', false, TIMES_TEN_TOO_LARGE],
    ['wage', '4', '60', '2,5', '60', false, undefined],
    // 37,50 × 2,5 : 4 = 23,4375 exactly, or 23,44 rounded.
    ['wage', '2,5', '37,50', '4', '60', true, undefined],
    ['wage', '2,5', '37,50', '4', '23,4375', false, INVERSE_WAGE_25_4],
    ['wage', '2,5', '37,50', '4', '23,44', false, INVERSE_WAGE_25_4],
    ['wage', '2,5', '37,50', '4', '23,43', false, undefined],
  ])('%s %s for %s and %s: typing %s', (context, first, firstPrice, second, input, ok, tip) => {
    const result = askUnit(context, first, firstPrice, second, input);
    expect(result.correct).toBe(ok);
    expect(result.tip).toBe(tip);
  });

  it.each<[UnitContextId, string, string, string, string]>([
    ['cheese', '15', '12', '4', '3,20'],
    ['petrol', '40', '76', '25', '47,50'],
    ['petrol', '23', '43,70', '37', '70,30'],
    ['wage', '4', '60', '2,5', '37,50'],
    ['wage', '4', '60', '3', '45'],
    ['wage', '3', '45', '4', '60'],
  ])('shows %s %s for %s and %s as %s', (context, first, firstPrice, second, expected) => {
    expect(askUnit(context, first, firstPrice, second, '').expected).toBe(expected);
  });

  it.each<[UnitContextId, string, string, string, string]>([
    ['cheese', '15', '12', '4', `1,5 kg → ${EURO}12, 100 g → ${EURO}0,80, 400 g → ${EURO}3,20`],
    ['cheese', '4', '3,20', '15', `400 g → ${EURO}3,20, 100 g → ${EURO}0,80, 1,5 kg → ${EURO}12`],
    ['cheese', '20', '16', '3', `2 kg → ${EURO}16, 100 g → ${EURO}0,80, 300 g → ${EURO}2,40`],
    ['petrol', '40', '76', '25', `40 L → ${EURO}76, 5 L → ${EURO}9,50, 25 L → ${EURO}47,50`],
    ['petrol', '25', '47,50', '40', `25 L → ${EURO}47,50, 5 L → ${EURO}9,50, 40 L → ${EURO}76`],
    ['petrol', '23', '43,70', '37', `23 L → ${EURO}43,70, 1 L → ${EURO}1,90, 37 L → ${EURO}70,30`],
    ['wage', '4', '60', '2,5', `4 uur → ${EURO}60, 1 uur → ${EURO}15, 2,5 uur → ${EURO}37,50`],
    ['wage', '2,5', '37,50', '4', `2,5 uur → ${EURO}37,50, 1 uur → ${EURO}15, 4 uur → ${EURO}60`],
  ])('explains %s %s for %s and %s', (context, first, firstPrice, second, explanation) => {
    expect(askUnit(context, first, firstPrice, second, '').explanation).toBe(explanation);
  });

  it('shows the explanation for a correct and for a wrong answer', () => {
    const explanation = `4 uur → ${EURO}60, 1 uur → ${EURO}15, 2,5 uur → ${EURO}37,50`;
    expect(askUnit('wage', '4', '60', '2,5', '37,50').explanation).toBe(explanation);
    expect(askUnit('wage', '4', '60', '2,5', '96').explanation).toBe(explanation);
  });

  it('gives the explanation and the tip directly', () => {
    const [first, price, second] = [dutch('4'), dutch('60'), dutch('2,5')];
    expect(unitExplanation('wage', first, price, second)).toBe(
      `4 uur → ${EURO}60, 1 uur → ${EURO}15, 2,5 uur → ${EURO}37,50`,
    );
    const diagnose = inverseTip('wage', first, price, second);
    expect(diagnose(dutch('96'))).toBe(INVERSE_WAGE_4_25);
    expect(diagnose(dutch('95'))).toBeUndefined();
    expect(diagnose(dutch('37,50'))).toBeUndefined();
  });
});

describe('every supported per-unit question', () => {
  // Independent of the module: the grids of spec §5.25 as [context, amount parts per counting
  // unit, smallest and largest amount in counting units, price per counting unit in cents:
  // smallest, largest and step].
  const GRIDS: readonly [UnitContextId, number, number, number, number, number, number][] = [
    ['cheese', 1, 2, 30, 60, 250, 10],
    ['petrol', 1, 5, 60, 160, 220, 10],
    ['wage', 2, 1, 10, 1000, 2500, 100],
  ];
  const MAX_CENTS = 20000;

  /** An amount of `granules / parts` counting units as the prompt writes it. */
  function amountText(context: UnitContextId, granules: number, parts: number): string {
    switch (context) {
      case 'cheese': {
        const grams = (granules * 100) / parts;
        return grams < 1000 ? `${grams} g` : `${String(grams / 1000).replace('.', ',')} kg`;
      }
      case 'petrol':
        return `${granules / parts} L`;
      case 'wage':
        return `${String(granules / parts).replace('.', ',')} uur`;
    }
  }

  /** Whole euros without decimals, otherwise two decimals: 6000 is '60', 3750 is '37,50'. */
  function centsText(cents: number): string {
    const rest = cents % 100;
    const euros = String(Math.floor(cents / 100));
    return rest === 0 ? euros : `${euros},${String(rest).padStart(2, '0')}`;
  }

  /** One amount `f` (first) and `s` (second) in granules of 1/parts counting units, at `cents`. */
  interface Case {
    label: string;
    context: UnitContextId;
    f: number;
    s: number;
    parts: number;
    firstCents: number;
    secondCents: number;
    supported: boolean;
  }

  /** Every combination of two amounts and a price per counting unit of the grids. */
  function allCases(): Case[] {
    const cases: Case[] = [];
    for (const [context, parts, minAmount, maxAmount, minCents, maxCents, stepCents] of GRIDS) {
      for (let cents = minCents; cents <= maxCents; cents += stepCents) {
        for (let f = minAmount * parts; f <= maxAmount * parts; f++) {
          for (let s = minAmount * parts; s <= maxAmount * parts; s++) {
            // The step is 5 L for petrol when both are multiples of 5, otherwise one unit.
            const fiveLitres = context === 'petrol' && f % 5 === 0 && s % 5 === 0;
            const step = (fiveLitres ? 5 : 1) * parts;
            const firstCents = (f * cents) / parts;
            const secondCents = (s * cents) / parts;
            cases.push({
              label: `${context} ${f}/${parts} → ${s}/${parts} at ${cents} cents`,
              context,
              f,
              s,
              parts,
              firstCents,
              secondCents,
              supported:
                f % s !== 0 &&
                s % f !== 0 &&
                f !== step &&
                s !== step &&
                Math.max(firstCents, secondCents) <= MAX_CENTS,
            });
          }
        }
      }
    }
    return cases;
  }

  function questionOf({ context, f, s, parts, firstCents }: Case): Question {
    const first = rational(BigInt(f), BigInt(parts));
    const second = rational(BigInt(s), BigInt(parts));
    return unitQuestion(context, first, rational(BigInt(firstCents), 100n), second);
  }

  const cases = allCases();

  it('is a question exactly for the amounts and prices the spec allows', () => {
    expect(cases.filter(({ supported }) => supported).length).toBeGreaterThan(10000);
    expect(cases.filter(({ supported }) => !supported).length).toBeGreaterThan(1000);
    for (const found of cases) {
      if (found.supported) expect(() => questionOf(found), found.label).not.toThrow();
      else expect(() => questionOf(found), found.label).toThrow(RangeError);
    }
  });

  it('accepts its own answer, explains it and recognises the inverse mistake', () => {
    for (const found of cases.filter(({ supported }) => supported)) {
      const { label, context, f, s, parts, firstCents, secondCents } = found;
      const step = stepOf(questionOf(found));
      const answer = centsText(secondCents);
      const correct = step.check(answer);
      expect(correct.correct, label).toBe(true);
      expect(correct.tip, label).toBeUndefined();
      expect(correct.expected, label).toBe(answer);
      expect(correct.explanation, label).toBeTruthy();

      // The inverse mistake is the first price × f : s, typed exactly or rounded half up to cents.
      const roundedCents = Math.floor((2 * firstCents * f + s) / (2 * s));
      expect(roundedCents, label).not.toBe(secondCents);
      const comparison = s < f ? 'minder' : 'meer';
      const verb = context === 'wage' ? 'je krijgt' : 'het kost';
      const tip =
        `Je hebt omgekeerd gerekend: ${amountText(context, s, parts)} is ${comparison} dan ` +
        `${amountText(context, f, parts)}, dus ${verb} ${comparison} dan ` +
        `${EURO}${centsText(firstCents)}.`;
      const rounded = step.check(centsText(roundedCents));
      expect(rounded.correct, label).toBe(false);
      expect(rounded.tip, label).toBe(tip);
      const exact = rational(BigInt(firstCents * f), BigInt(s * 100));
      if (decimalPlaces(exact) !== null) {
        const typedExactly = step.check(typed(exact));
        expect(typedExactly.correct, label).toBe(false);
        expect(typedExactly.tip, label).toBe(tip);
      }
      // A cent more than the answer is a plain mistake, unless it is the rounded inverse.
      if (secondCents + 1 !== roundedCents) {
        expect(step.check(centsText(secondCents + 1)).tip, label).toBeUndefined();
      }
    }
  });
});

describe('generateRatioProblems', () => {
  const COUNT = 1000;
  const rng = createRng(61);
  const questions = Array.from({ length: COUNT }, () => generateRatioProblems(rng));
  const partQuestions = questions.filter(({ key }) => key.startsWith('ratioProblems:part:'));
  const mixQuestions = questions.filter(({ key }) => key.startsWith('ratioProblems:mix:'));
  const unitQuestions = questions.filter(({ key }) => key.startsWith('ratioProblems:unit:'));

  const PART_PROMPT =
    /^(In een klas|In een zak|Bij een voorstelling) is (.+) : (.+) = (\d+) : (\d+)\. (Welk deel van|Hoeveel procent van) (.+) is (.+)\?$/u;
  const FROM_TOTAL =
    /^(.+) : (.+) = (\d+) : (\d+)\. Hoeveel (ml|kg|L) (.+) zit er in (\d+) (ml|kg|L) (.+)\?$/u;
  const FROM_PART =
    /^(.+) : (.+) = (\d+) : (\d+)\. Je hebt (\d+) (ml|kg|L) (.+)\. Hoeveel (ml|kg|L) (.+) moet erbij\?$/u;

  function matchOf(pattern: RegExp, prompt: string): string[] {
    const match = pattern.exec(prompt);
    if (match === null) throw new Error(`Unexpected prompt: ${prompt}`);
    return match;
  }

  function capitalised(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  it('creates single-step questions of this topic that accept their own answer', () => {
    for (const question of questions) {
      expect(question.topic).toBe('ratioProblems');
      expect(question.steps).toHaveLength(1);
      const step = stepOf(question);
      const expected = step.check('').expected.replaceAll(GROUP_SEPARATOR, '');
      const result = step.check(expected);
      expect(result.correct, question.key).toBe(true);
      expect(result.explanation, question.key).toBeTruthy();
    }
  });

  it('uses the three forms about equally often', () => {
    expect(partQuestions.length + mixQuestions.length + unitQuestions.length).toBe(COUNT);
    for (const form of [partQuestions, mixQuestions, unitQuestions]) {
      expect(form.length / COUNT).toBeGreaterThan(0.25);
      expect(form.length / COUNT).toBeLessThan(0.42);
    }
  });

  describe('part of the whole', () => {
    const draws = partQuestions.map((question) => {
      const [, , id, a, b, index, form] = question.key.split(':');
      return {
        question,
        context: groupContext(id as GroupContext['id']),
        a: Number(a),
        b: Number(b),
        index: Number(index) as Index,
        asPercentage: form === 'percent',
      };
    });

    // A third of the draws of this form is expected per context and half per group and form:
    // each must come up in more than 20% and 30% of them.
    it('uses every context, both groups and both forms', () => {
      for (const { id } of GROUP_CONTEXTS) {
        const used = draws.filter(({ context }) => context.id === id).length;
        expect(used / draws.length, id).toBeGreaterThan(0.2);
      }
      for (const index of INDEXES) {
        const used = draws.filter((draw) => draw.index === index).length;
        expect(used / draws.length, String(index)).toBeGreaterThan(0.3);
      }
      for (const asPercentage of [false, true]) {
        const used = draws.filter((draw) => draw.asPercentage === asPercentage).length;
        expect(used / draws.length, String(asPercentage)).toBeGreaterThan(0.3);
      }
    });

    it('draws a simplified ratio with the sum of its form', () => {
      for (const { a, b, asPercentage, question } of draws) {
        expect(a, question.key).not.toBe(b);
        expect(gcd(a, b), question.key).toBe(1);
        if (asPercentage) expect([3, 4, 5, 6, 8, 10], question.key).toContain(a + b);
        else expect(a + b, question.key).toBeLessThanOrEqual(12);
      }
    });

    it('words the prompt with the ratio and the form of its key', () => {
      for (const { a, b, asPercentage, question } of draws) {
        const { prompt } = stepOf(question);
        const match = matchOf(PART_PROMPT, prompt);
        expect(Number(match[4]), prompt).toBe(a);
        expect(Number(match[5]), prompt).toBe(b);
        expect(match[6], prompt).toBe(asPercentage ? 'Hoeveel procent van' : 'Welk deel van');
        expect(stepOf(question).suffix, prompt).toBe(asPercentage ? '%' : undefined);
      }
    });

    it('asks for the part of the chosen group: asked / (a + b), times 100 for a percentage', () => {
      for (const { a, b, index, asPercentage, question } of draws) {
        const asked = termAt(a, b, index);
        const scale = asPercentage ? 100 : 1;
        const expected = stepOf(question).check('').expected;
        const answer = parseAnswer('fraction', expected);
        const independent = divide(fromInteger(asked * scale), fromInteger(a + b));
        expect(answer !== null && equals(answer, independent), question.key).toBe(true);
      }
    });
  });

  describe('mixing', () => {
    const draws = mixQuestions.map((question) => {
      const [, , id, mode, a, b, part, index] = question.key.split(':');
      return {
        question,
        context: mixContext(id as MixContext['id']),
        fromTotal: mode === 'total',
        a: Number(a),
        b: Number(b),
        part: Number(part),
        index: Number(index) as Index,
      };
    });

    // A third of the draws of this form is expected per context and half per variant and
    // ingredient: each must come up in more than 20% and 30% of them.
    it('uses every context, both variants and both ingredients', () => {
      for (const { id } of MIX_CONTEXTS) {
        const used = draws.filter(({ context }) => context.id === id).length;
        expect(used / draws.length, id).toBeGreaterThan(0.2);
      }
      for (const fromTotal of [true, false]) {
        const used = draws.filter((draw) => draw.fromTotal === fromTotal).length;
        expect(used / draws.length, String(fromTotal)).toBeGreaterThan(0.3);
      }
      for (const index of INDEXES) {
        const used = draws.filter((draw) => draw.index === index).length;
        expect(used / draws.length, String(index)).toBeGreaterThan(0.3);
      }
    });

    it('draws a simplified ratio with terms in [1, 9], smaller part first for syrup', () => {
      for (const { a, b, context, question } of draws) {
        expect(a, question.key).not.toBe(b);
        expect(gcd(a, b), question.key).toBe(1);
        expect(Math.max(a, b), question.key).toBeLessThanOrEqual(9);
        if (context.id !== 'paint') expect(a, question.key).toBeLessThan(b);
      }
    });

    it('limits the part, the total to 2000 and the given amount to 2 digits', () => {
      for (const { a, b, part, index, context, fromTotal, question } of draws) {
        const total = (a + b) * part;
        expect(part, question.key).toBeGreaterThanOrEqual(2);
        expect(part, question.key).toBeLessThanOrEqual(context.id === 'paint' ? 20 : 200);
        expect(total, question.key).toBeLessThanOrEqual(2000);
        // The amount that is given: the total, or the amount of ingredient `index` from one part.
        const given = fromTotal ? total : termAt(a, b, index) * part;
        expect(significantDigits(given), question.key).toBeLessThanOrEqual(2);
      }
    });

    it('writes a given amount of at most 2 significant digits in the prompt', () => {
      const fromPart = draws.filter(({ fromTotal }) => !fromTotal);
      expect(fromPart.length).toBeGreaterThan(100);
      for (const { fromTotal, question } of draws) {
        const { prompt } = stepOf(question);
        const written = fromTotal ? matchOf(FROM_TOTAL, prompt)[7] : matchOf(FROM_PART, prompt)[5];
        expect(significantDigits(Number(written)), prompt).toBeLessThanOrEqual(2);
      }
    });

    it('writes the amounts of its key in the prompt and asks for the other ingredient', () => {
      for (const { a, b, part, index, context, fromTotal, question } of draws) {
        const { prompt } = stepOf(question);
        const amount = termAt(a, b, index) * part;
        const answer = Number(stepOf(question).check('').expected);
        if (fromTotal) {
          const match = matchOf(FROM_TOTAL, prompt);
          expect(match[1], prompt).toBe(capitalised(context.ingredients[0].name));
          expect(match[2], prompt).toBe(context.ingredients[1].name);
          expect(Number(match[3]), prompt).toBe(a);
          expect(Number(match[4]), prompt).toBe(b);
          expect(match[5], prompt).toBe(context.unit);
          expect(match[6], prompt).toBe(context.ingredients[index].name);
          expect(Number(match[7]), prompt).toBe((a + b) * part);
          expect(match[9], prompt).toBe(context.mixture);
          expect(answer, prompt).toBe(amount);
        } else {
          const match = matchOf(FROM_PART, prompt);
          expect(match[1], prompt).toBe(capitalised(context.ingredients[0].name));
          expect(match[2], prompt).toBe(context.ingredients[1].name);
          expect(Number(match[3]), prompt).toBe(a);
          expect(Number(match[4]), prompt).toBe(b);
          expect(Number(match[5]), prompt).toBe(amount);
          expect(match[6], prompt).toBe(context.unit);
          expect(match[7], prompt).toBe(context.ingredients[index].name);
          expect(match[9], prompt).toBe(context.ingredients[index === 0 ? 1 : 0].name);
          expect(answer, prompt).toBe(termAt(a, b, index === 0 ? 1 : 0) * part);
        }
      }
    });
  });

  describe('per unit', () => {
    const CONTEXT_IDS: readonly UnitContextId[] = ['cheese', 'petrol', 'wage'];
    // Independent of the module (spec §5.25): amounts in half counting units (100 g, 1 L, 1 uur),
    // the price per counting unit in cents: smallest, largest and step.
    interface Table {
      halves: readonly [number, number];
      whole: boolean;
      cents: readonly [number, number];
      step: number;
    }
    const TABLES: Record<UnitContextId, Table> = {
      cheese: { halves: [4, 60], whole: true, cents: [60, 250], step: 10 },
      petrol: { halves: [10, 120], whole: true, cents: [160, 220], step: 10 },
      wage: { halves: [2, 20], whole: false, cents: [1000, 2500], step: 100 },
    };
    const PROMPTS: Record<UnitContextId, RegExp> = {
      cheese: /^(.+) kaas kost €\u{a0}(.+)\. Wat kost (.+)\?$/u,
      petrol: /^(.+) benzine kost €\u{a0}(.+)\. Wat kost (.+)\?$/u,
      wage: /^Voor (.+) werk krijg je €\u{a0}(.+)\. Hoeveel voor (.+)\?$/u,
    };
    const UNITS: Record<UnitContextId, readonly string[]> = {
      cheese: ['g', 'kg'],
      petrol: ['L'],
      wage: ['uur'],
    };
    const STEPS: Record<UnitContextId, string> = { cheese: '100 g', petrol: '1 L', wage: '1 uur' };

    const draws = unitQuestions.map((question) => {
      const [, , context, first, second, price] = question.key.split(':');
      return {
        question,
        context: context as UnitContextId,
        first: dutch(first ?? ''),
        second: dutch(second ?? ''),
        unitPrice: dutch(price ?? ''),
      };
    });

    /** value × factor as a number; throws unless that is a whole number. */
    function times(value: Rational, factor: bigint): number {
      const product = value.num * factor;
      if (product % value.den !== 0n) throw new Error(`${value.num}/${value.den} × ${factor}`);
      return Number(product / value.den);
    }

    /** An amount of the prompt in counting units, with its number and unit: '1,5 kg' is 15. */
    function parseAmount(context: UnitContextId, text: string) {
      const [number = '', unit = ''] = text.split(' ');
      const written = dutch(number);
      let value = written;
      if (context === 'cheese') {
        value =
          unit === 'kg' ? multiply(written, fromInteger(10)) : divide(written, fromInteger(100));
      }
      return { value, number, unit };
    }

    /** The rows of an explanation: '4 uur → € 60, 1 uur → € 15' is two [amount, price] rows. */
    function tableRows(explanation: string): (readonly [string, string])[] {
      return explanation.split(', ').map((row) => {
        const [amount = '', price = ''] = row.split(' → ');
        return [amount, price] as const;
      });
    }

    it('uses every context', () => {
      for (const context of CONTEXT_IDS) {
        const used = draws.filter((draw) => draw.context === context).length;
        expect(used / draws.length, context).toBeGreaterThan(0.2);
      }
    });

    it('draws amounts and a price per unit within the table of its context', () => {
      for (const { context, first, second, unitPrice, question } of draws) {
        const table = TABLES[context];
        for (const amount of [first, second]) {
          const halves = times(amount, 2n);
          expect(halves, question.key).toBeGreaterThanOrEqual(table.halves[0]);
          expect(halves, question.key).toBeLessThanOrEqual(table.halves[1]);
          if (table.whole) expect(halves % 2, question.key).toBe(0);
        }
        const cents = times(unitPrice, 100n);
        expect(cents, question.key).toBeGreaterThanOrEqual(table.cents[0]);
        expect(cents, question.key).toBeLessThanOrEqual(table.cents[1]);
        expect(cents % table.step, question.key).toBe(0);
      }
    });

    it('draws amounts that are no multiple of each other, with the step of the table', () => {
      for (const { context, first, second, question } of draws) {
        const [a, b] = [times(first, 2n), times(second, 2n)];
        expect(a % b, question.key).not.toBe(0);
        expect(b % a, question.key).not.toBe(0);
        const rows = tableRows(stepOf(question).check('').explanation ?? '');
        expect(rows, question.key).toHaveLength(3);
        // 5 L is 10 halves: the petrol step is 5 L exactly when both amounts are multiples of it.
        const fiveLitres = context === 'petrol' && a % 10 === 0 && b % 10 === 0;
        const stepText = rows[1]?.[0];
        expect(stepText, question.key).toBe(fiveLitres ? '5 L' : STEPS[context]);
        expect(rows[0]?.[0], question.key).not.toBe(stepText);
        expect(rows[2]?.[0], question.key).not.toBe(stepText);
      }
    });

    it('keeps both prices in whole cents and at most € 200', () => {
      for (const { first, second, unitPrice, question } of draws) {
        const firstCents = times(multiply(first, unitPrice), 100n);
        const secondCents = times(multiply(second, unitPrice), 100n);
        expect(Math.max(firstCents, secondCents), question.key).toBeLessThanOrEqual(20000);
      }
    });

    it('writes the amounts and the price of its key in the prompt and asks the other price', () => {
      for (const { context, first, second, unitPrice, question } of draws) {
        const { prompt, prefix } = stepOf(question);
        const match = matchOf(PROMPTS[context], prompt);
        const asked = parseAmount(context, match[3] ?? '');
        const given = parseAmount(context, match[1] ?? '');
        expect(equals(given.value, first), prompt).toBe(true);
        expect(equals(asked.value, second), prompt).toBe(true);
        expect(UNITS[context], prompt).toContain(given.unit);
        expect(UNITS[context], prompt).toContain(asked.unit);
        expect(equals(dutch(match[2] ?? ''), multiply(first, unitPrice)), prompt).toBe(true);
        const answer = parseDutchNumber(stepOf(question).check('').expected);
        expect(answer !== null && equals(answer, multiply(second, unitPrice)), prompt).toBe(true);
        expect(prefix, prompt).toBe('€');
      }
    });

    it('writes cheese in g below 1 kg and in kg with at most 1 decimal from 1 kg', () => {
      for (const { context, question } of draws) {
        if (context !== 'cheese') continue;
        const match = matchOf(PROMPTS.cheese, stepOf(question).prompt);
        for (const text of [match[1] ?? '', match[3] ?? '']) {
          const { value, number, unit } = parseAmount('cheese', text);
          if (unit === 'g') expect(value.num < 10n * value.den, text).toBe(true);
          else expect(value.num >= 10n * value.den && /^\d+(,\d)?$/.test(number), text).toBe(true);
        }
      }
    });
  });

  it('is deterministic for a fixed seed', () => {
    const keys = (seed: number) => {
      const seeded = createRng(seed);
      return Array.from({ length: 50 }, () => generateRatioProblems(seeded).key);
    };
    expect(keys(5)).toEqual(keys(5));
  });
});
