import { describe, expect, it } from 'vitest';
import { NO_BREAK_SPACE as NB } from '../format';
import { gcd } from '../primes';
import { createRng } from '../random';
import { hasSlot } from '../slot';
import type { Question } from '../types';
import {
  EVEN,
  generateCompareRatios,
  NAME_PAIRS,
  OFFER_COUNTS,
  offerQuestion,
  PRODUCTS,
  recipeQuestion,
  relativeQuestion,
  RELATIVE_CONTEXTS,
  RELATIVE_WHOLES,
  shareOf,
  UNKNOWN,
} from './compareRatios';
import { stepOf } from './testHelpers';

const SAMPLES = 4000;

function sample(): Question[] {
  const rng = createRng(57);
  return Array.from({ length: SAMPLES }, () => generateCompareRatios(rng));
}

const ofForm = (questions: Question[], form: string) =>
  questions.filter(({ key }) => key.startsWith(`compareRatios:${form}:`));

const answerText = (question: Question) => {
  const step = question.steps[0]!;
  return step.options!.find((option) => step.check(option).correct)!;
};

describe('compareRatios fixed cases', () => {
  it('1 : 2 versus 3 : 4 with 3 apples → the first name', () => {
    const step = stepOf(recipeQuestion(['Jack', 'Jasmijn'], [1, 2], [3, 4], 3));
    expect(step.prompt).toBe(
      'Jack bakt met appels : peren = 1 : 2, Jasmijn met 3 : 4. Ze gebruiken allebei 3 appels. Wie gebruikt de meeste peren?',
    );
    expect(step.options).toEqual(['Jack', 'Jasmijn', 'evenveel', 'niet te zeggen']);
    expect(step.check('Jack')).toEqual({
      correct: true,
      expected: 'Jack',
      explanation: 'Jack: 3 appels → 6 peren, Jasmijn: 3 appels → 4 peren → Jack',
    });
  });

  it('1 : 2 versus 3 : 6 → evenveel', () => {
    const step = stepOf(recipeQuestion(['Sam', 'Noor'], [1, 2], [3, 6], 3));
    expect(step.check('evenveel').correct).toBe(true);
    expect(step.check('Sam').correct).toBe(false);
  });

  it('the second name wins when it uses more pears', () => {
    const step = stepOf(recipeQuestion(['Daan', 'Lotte'], [3, 4], [1, 2], 3));
    expect(step.check('Lotte').correct).toBe(true);
  });

  it('offer: the cheapest per item is the answer', () => {
    const question = offerQuestion('pakken sap', [
      { count: 2, cents: 80 },
      { count: 5, cents: 75 },
      { count: 3, cents: 85 },
      { count: 10, cents: 90 },
    ]);
    const step = stepOf(question);
    expect(step.prompt).toBe('Je koopt pakken sap. Welke aanbieding is het voordeligst?');
    expect(step.options).toEqual([
      `2 voor €${NB}1,60`,
      `5 voor €${NB}3,75`,
      `3 voor €${NB}2,55`,
      `10 voor €${NB}9`,
    ]);
    expect(step.check(`5 voor €${NB}3,75`)).toMatchObject({
      correct: true,
      explanation: `€${NB}0,80 – €${NB}0,75 – €${NB}0,85 – €${NB}0,90 → 5 voor €${NB}3,75`,
    });
  });

  it('relative: 6/24 against 8/40 → klas A', () => {
    const step = stepOf(relativeQuestion('klas', { part: 6, whole: 24 }, { part: 8, whole: 40 }));
    expect(step.prompt).toBe(
      'Klas A: 6 van de 24 leerlingen zijn ziek. Klas B: 8 van de 40. Waar is naar verhouding het meest ziek?',
    );
    expect(step.options).toEqual(['klas A', 'klas B', 'evenveel', 'niet te zeggen']);
    expect(step.check('klas A')).toMatchObject({
      correct: true,
      explanation: '6/24 = 25%, 8/40 = 20% → klas A',
    });
  });

  it('relative: equal shares → evenveel', () => {
    const step = stepOf(
      relativeQuestion('vakantiepark', { part: 6, whole: 24 }, { part: 10, whole: 40 }),
    );
    expect(step.options).toEqual(['park A', 'park B', 'evenveel', 'niet te zeggen']);
    expect(step.check('evenveel').correct).toBe(true);
  });
});

describe('generateCompareRatios', () => {
  const questions = sample();

  it('is always a choice step with four distinct options and exactly one correct', () => {
    for (const question of questions) {
      expect(question.topic).toBe('compareRatios');
      expect(question.steps).toHaveLength(1);
      const step = question.steps[0]!;
      expect(step.kind).toBe('choice');
      expect(new Set(step.options).size).toBe(4);
      expect(step.options!.filter((option) => step.check(option).correct)).toHaveLength(1);
    }
  });

  it('uses the three forms with equal probability', () => {
    for (const form of ['recipe', 'offer', 'relative']) {
      const share = ofForm(questions, form).length / SAMPLES;
      expect(share, form).toBeGreaterThan(0.29);
      expect(share, form).toBeLessThan(0.38);
    }
  });

  it('recipe: terms in [1, 6], a ≠ c, common apples at most 12, pears at most 30', () => {
    const recipes = ofForm(questions, 'recipe');
    const names = new Set<string>();
    let simplified = 0;
    let equalPears = 0;
    for (const question of recipes) {
      const [, , name, a, b, c, d, apples] = question.key.split(':') as string[];
      const [na, nb, nc, nd, nApples] = [a, b, c, d, apples].map(Number) as number[];
      names.add(name!);
      for (const term of [na!, nb!, nc!, nd!]) {
        expect(term).toBeGreaterThanOrEqual(1);
        expect(term).toBeLessThanOrEqual(6);
      }
      expect(na).not.toBe(nc);
      expect(nApples! % na!).toBe(0);
      expect(nApples! % nc!).toBe(0);
      expect(nApples).toBeLessThanOrEqual(12);
      const pears = [(nApples! / na!) * nb!, (nApples! / nc!) * nd!];
      expect(Math.max(...pears)).toBeLessThanOrEqual(30);
      const equal = pears[0] === pears[1];
      if (equal) {
        equalPears++;
        expect([2, 3]).toContain(nc! / na!);
        expect(nd! / nb!).toBe(nc! / na!);
        expect(gcd(nc!, nd!)).toBeGreaterThan(1);
        expect(answerText(question)).toBe(EVEN);
      } else {
        simplified++;
        expect(gcd(na!, nb!)).toBe(1);
        expect(gcd(nc!, nd!)).toBe(1);
        expect(answerText(question)).not.toBe(EVEN);
      }
    }
    expect([...names].sort()).toEqual(NAME_PAIRS.map(([first]) => first).sort());
    expect(equalPears / recipes.length).toBeGreaterThan(0.15);
    expect(equalPears / recipes.length).toBeLessThan(0.25);
    expect(simplified).toBeGreaterThan(0);
  });

  it('recipe: options in the fixed order and the right name wins', () => {
    for (const question of ofForm(questions, 'recipe')) {
      const step = question.steps[0]!;
      const [, , first, a, b, c, d, apples] = question.key.split(':') as string[];
      const pair = NAME_PAIRS.find(([name]) => name === first)!;
      expect(step.options).toEqual([pair[0], pair[1], EVEN, UNKNOWN]);
      const [pa, pb] = [
        (Number(apples) / Number(a)) * Number(b),
        (Number(apples) / Number(c)) * Number(d),
      ];
      const expected = pa > pb ? pair[0] : pa < pb ? pair[1] : EVEN;
      expect(answerText(question)).toBe(expected);
    }
  });

  it('offer: four distinct counts, prices on 5 cents in [0,40; 3], one cheapest', () => {
    const products = new Set<string>();
    for (const question of ofForm(questions, 'offer')) {
      const [, , product, ...offers] = question.key.split(':') as string[];
      products.add(product!);
      const parsed = offers.map((offer) => offer.split('x').map(Number) as [number, number]);
      expect(parsed).toHaveLength(4);
      expect(new Set(parsed.map(([count]) => count)).size).toBe(4);
      for (const [count, cents] of parsed) {
        expect(OFFER_COUNTS).toContain(count);
        expect(cents % 5).toBe(0);
        expect(cents).toBeGreaterThanOrEqual(40);
        expect(cents).toBeLessThanOrEqual(300);
      }
      const prices = parsed.map(([, cents]) => cents);
      expect(new Set(prices).size).toBe(4);
      const cheapest = parsed.find(([, cents]) => cents === Math.min(...prices))!;
      const answer = answerText(question);
      expect(answer.startsWith(`${cheapest[0]} voor `)).toBe(true);
    }
    expect([...products].sort()).toEqual([...PRODUCTS].sort());
  });

  it('offer: the options appear in varying order', () => {
    const firsts = new Set(
      ofForm(questions, 'offer').map(({ steps }) => steps[0]!.options![0]!.split(' ')[0]),
    );
    expect(firsts.size).toBeGreaterThan(3);
  });

  it('relative: whole percentages, listed wholes, 70% trap and 15% equal shares', () => {
    const relative = ofForm(questions, 'relative');
    const contexts = new Set<string>();
    let trap = 0;
    let equal = 0;
    for (const question of relative) {
      const [, , context, first, second] = question.key.split(':') as string[];
      contexts.add(context!);
      const [a, b] = [first!, second!].map((text) => {
        const [part, whole] = text.split('/').map(Number) as [number, number];
        return { part, whole };
      }) as [{ part: number; whole: number }, { part: number; whole: number }];
      expect(RELATIVE_WHOLES).toContain(a.whole);
      expect(RELATIVE_WHOLES).toContain(b.whole);
      expect(a.whole).not.toBe(b.whole);
      const [shareA, shareB] = [shareOf(a), shareOf(b)];
      expect(shareA).not.toBeNull();
      expect(shareB).not.toBeNull();
      if (shareA === shareB) {
        equal++;
        expect(answerText(question)).toBe(EVEN);
      } else {
        const larger = shareA! > shareB! ? a : b;
        const smaller = larger === a ? b : a;
        if (larger.part < smaller.part) trap++;
        expect(answerText(question)).toBe(
          `${RELATIVE_CONTEXTS[context!]!.noun} ${shareA! > shareB! ? 'A' : 'B'}`,
        );
      }
    }
    expect([...contexts].sort()).toEqual(['club', 'klas', 'vakantiepark']);
    expect(equal / relative.length).toBeGreaterThan(0.1);
    expect(equal / relative.length).toBeLessThan(0.2);
    expect(trap / relative.length).toBeGreaterThan(0.65);
    expect(trap / relative.length).toBeLessThan(0.78);
  });

  it('has a stable key and no slot', () => {
    expect(generateCompareRatios(createRng(5)).key).toBe(generateCompareRatios(createRng(5)).key);
    for (const { steps } of questions) expect(hasSlot(steps[0]!.prompt)).toBe(false);
  });
});
