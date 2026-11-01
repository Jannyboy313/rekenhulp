import { describe, expect, it } from 'vitest';
import { NO_BREAK_SPACE as NB } from '../format';
import { gcd } from '../primes';
import { createRng, range } from '../random';
import { hasAtMostDecimals, rational } from '../rational';
import { hasSlot } from '../slot';
import type { Question } from '../types';
import { hasAtMostTwoSignificantDigits } from './percentages';
import {
  DIFFERENCE_ASKED,
  DIFFERENCE_CONTEXTS,
  differenceQuestion,
  generateRatioReasoning,
  NAME_PAIRS,
  rescaleQuestion,
  RESCALE_CONTEXTS,
  TARGET_RATIOS,
  topUpCount,
  topUpQuestion,
} from './ratioReasoning';
import { answerOf, decimal, stepOf, typed } from './testHelpers';

const SAMPLES = 4000;

function sample(): Question[] {
  const rng = createRng(58);
  return Array.from({ length: SAMPLES }, () => generateRatioReasoning(rng));
}

const ofForm = (questions: Question[], form: string) =>
  questions.filter(({ key }) => key.startsWith(`ratioReasoning:${form}:`));

describe('ratioReasoning fixed cases', () => {
  it('3 : 5 with a difference of € 12 → Anna 18', () => {
    const step = stepOf(differenceQuestion(['Anna', 'Bas'], 'geld', [3, 5], 6, 'smaller'));
    expect(step.prompt).toBe(
      `Anna en Bas verdelen geld in de verhouding 3 : 5. Bas krijgt €${NB}12 meer dan Anna. Hoeveel krijgt Anna?`,
    );
    expect(step.prefix).toBe('€');
    expect(step.check('18')).toEqual({
      correct: true,
      expected: '18',
      explanation: '5 − 3 = 2 delen = €\u{a0}12 → 1 deel = €\u{a0}6 → Anna = 3 × 6 = 18',
    });
  });

  it('asks the larger share or the total, in marbles', () => {
    const larger = stepOf(differenceQuestion(['Anna', 'Bas'], 'knikkers', [3, 5], 6, 'larger'));
    expect(larger.prompt).toContain(
      'Bas krijgt 12 knikkers meer dan Anna. Hoeveel knikkers krijgt Bas?',
    );
    expect(larger.suffix).toBe('knikkers');
    expect(larger.check('30').correct).toBe(true);
    const total = stepOf(differenceQuestion(['Anna', 'Bas'], 'stickers', [3, 5], 6, 'total'));
    expect(total.prompt).toContain('Hoeveel stickers zijn het samen?');
    expect(total.check('48').correct).toBe(true);
  });

  it('4 persons 300 g → 30 persons 2,25 kg', () => {
    const step = stepOf(rescaleQuestion('pasta', 4, 300, 30));
    expect(step.prompt).toBe(
      'Voor 4 personen heb je 300 g pasta nodig. Hoeveel kg is dat voor 30 personen?',
    );
    expect(step.suffix).toBe('kg');
    expect(step.check('2,25')).toEqual({
      correct: true,
      expected: '2,25',
      explanation: '4 → 300 g, 2 → 150 g, 30 → 2250 g = 2,25 kg',
    });
  });

  it('milk is in ml and L', () => {
    const step = stepOf(rescaleQuestion('melk', 5, 750, 10));
    expect(step.prompt).toBe(
      'Voor 5 personen heb je 750 ml melk nodig. Hoeveel L is dat voor 10 personen?',
    );
    expect(step.check('1,5').correct).toBe(true);
    expect(step.check('1,5').explanation).toBe('5 → 750 ml, 10 → 1500 ml = 1,5 L');
  });

  it('30 marbles 2 : 3 → 1 : 1 needs 6 red', () => {
    const step = stepOf(topUpQuestion('knikkers', [2, 3], 6, [1, 1], 0));
    expect(step.prompt).toBe(
      'In een zak zitten 30 knikkers, rood : blauw = 2 : 3. Hoeveel rode knikkers moet je erbij doen om 1 : 1 te krijgen?',
    );
    expect(step.suffix).toBe('knikkers');
    expect(step.check('6')).toEqual({
      correct: true,
      expected: '6',
      explanation: 'rood 12, blauw 18 → 1 : 1 → rood 18 → 18 − 12 = 6 erbij',
    });
  });

  it('adds the second colour when asked', () => {
    const step = stepOf(topUpQuestion('kralen', [2, 1], 4, [1, 1], 1));
    expect(step.prompt).toBe(
      'In een doos zitten 12 kralen, wit : zwart = 2 : 1. Hoeveel zwarte kralen moet je erbij doen om 1 : 1 te krijgen?',
    );
    expect(step.suffix).toBe('kralen');
    expect(step.check('4')).toMatchObject({
      correct: true,
      explanation: 'wit 8, zwart 4 → 1 : 1 → zwart 8 → 8 − 4 = 4 erbij',
    });
  });

  it('topUpCount is null unless a whole number of at least 1', () => {
    expect(topUpCount([12, 18], [1, 1], 0)).toBe(6);
    expect(topUpCount([12, 18], [1, 1], 1)).toBeNull();
    expect(topUpCount([5, 5], [1, 1], 0)).toBeNull();
    expect(topUpCount([4, 8], [3, 2], 0)).toBe(8);
    expect(topUpCount([5, 7], [3, 2], 0)).toBeNull();
  });
});

describe('generateRatioReasoning', () => {
  const questions = sample();

  it('is a single number step that accepts its expected answer', () => {
    for (const question of questions) {
      expect(question.topic).toBe('ratioReasoning');
      expect(question.steps).toHaveLength(1);
      const step = question.steps[0]!;
      expect(step.kind).toBe('number');
      expect(step.check(typed(answerOf(question))).correct, step.prompt).toBe(true);
      expect(step.check('987654').correct).toBe(false);
    }
  });

  it('uses the three forms with equal probability', () => {
    for (const form of ['difference', 'rescale', 'topUp']) {
      const share = ofForm(questions, form).length / SAMPLES;
      expect(share, form).toBeGreaterThan(0.29);
      expect(share, form).toBeLessThan(0.38);
    }
  });

  it('difference: simplified a : b with a < b, parts in [2, 50], every context and asked kind', () => {
    const contexts = new Set<string>();
    const asked = new Set<string>();
    const names = new Set<string>();
    for (const question of ofForm(questions, 'difference')) {
      const [, , name, context, a, b, unit, kind] = question.key.split(':') as string[];
      const [na, nb, nu] = [a, b, unit].map(Number) as number[];
      contexts.add(context!);
      asked.add(kind!);
      names.add(name!);
      expect(na).toBeLessThan(nb!);
      expect(na).toBeGreaterThanOrEqual(1);
      expect(nb).toBeLessThanOrEqual(9);
      expect(gcd(na!, nb!)).toBe(1);
      expect(nu).toBeGreaterThanOrEqual(2);
      expect(nu).toBeLessThanOrEqual(50);
      const expected = { smaller: na! * nu!, larger: nb! * nu!, total: (na! + nb!) * nu! }[
        kind as 'smaller'
      ];
      expect(answerOf(question)).toEqual(rational(BigInt(expected), 1n));
      const step = stepOf(question);
      expect(step.prompt).toContain(`${(nb! - na!) * nu!}`);
      if (context === 'geld') expect(step.prefix).toBe('€');
      else expect(step.suffix).toBe(context);
    }
    expect([...contexts].sort()).toEqual([...DIFFERENCE_CONTEXTS].sort());
    expect([...asked].sort()).toEqual([...DIFFERENCE_ASKED].sort());
    expect([...names].sort()).toEqual(NAME_PAIRS.map(([name]) => name).sort());
  });

  it('rescale: counts, nice amounts, realistic per person and at most 2 decimals', () => {
    const amounts = new Set(range(10, 1000).filter(hasAtMostTwoSignificantDigits));
    const contexts = new Set<string>();
    for (const question of ofForm(questions, 'rescale')) {
      const [, , context, first, amount, second] = question.key.split(':') as string[];
      const [f, am, s] = [first, amount, second].map(Number) as number[];
      contexts.add(context!);
      expect(f).toBeGreaterThanOrEqual(2);
      expect(f).toBeLessThanOrEqual(8);
      expect(s! % 5).toBe(0);
      expect(s).toBeGreaterThanOrEqual(10);
      expect(s).toBeLessThanOrEqual(60);
      expect(amounts.has(am!)).toBe(true);
      expect(am! % (f! / gcd(f!, s!))).toBe(0);
      const { minPerPerson, maxPerPerson } = RESCALE_CONTEXTS[context!]!;
      expect(am! / f!).toBeGreaterThanOrEqual(minPerPerson);
      expect(am! / f!).toBeLessThanOrEqual(maxPerPerson);
      const answer = answerOf(question);
      expect(hasAtMostDecimals(answer, 2)).toBe(true);
      expect(answer).toEqual(rational(BigInt((am! * s!) / f!), 1000n));
      expect(decimal(typed(answer))).toEqual(answer);
    }
    expect([...contexts].sort()).toEqual(['melk', 'pasta']);
  });

  it('top up: simplified start ratio, total at most 60, listed target, whole count ≥ 1', () => {
    const contexts = new Set<string>();
    const colours = new Set<string>();
    const targets = new Set<string>();
    for (const question of ofForm(questions, 'topUp')) {
      const [, , context, a, b, unit, c, d, added] = question.key.split(':') as string[];
      const [na, nb, nu, nc, nd] = [a, b, unit, c, d].map(Number) as number[];
      contexts.add(context!);
      colours.add(added!);
      targets.add(`${nc}:${nd}`);
      expect(na).toBeGreaterThanOrEqual(1);
      expect(na).toBeLessThanOrEqual(5);
      expect(nb).toBeGreaterThanOrEqual(1);
      expect(nb).toBeLessThanOrEqual(5);
      expect(gcd(na!, nb!)).toBe(1);
      expect((na! + nb!) * nu!).toBeLessThanOrEqual(60);
      expect(TARGET_RATIOS.some(([x, y]) => x === nc && y === nd)).toBe(true);
      const count = topUpCount([na! * nu!, nb! * nu!], [nc!, nd!], Number(added) as 0 | 1);
      expect(count).not.toBeNull();
      expect(answerOf(question)).toEqual(rational(BigInt(count!), 1n));
    }
    expect([...contexts].sort()).toEqual(['kralen', 'knikkers'].sort());
    expect([...colours].sort()).toEqual(['0', '1']);
    expect(targets.size).toBe(TARGET_RATIOS.length);
  });

  it('has a stable key and no slot', () => {
    expect(generateRatioReasoning(createRng(5)).key).toBe(generateRatioReasoning(createRng(5)).key);
    for (const { steps } of questions) expect(hasSlot(steps[0]!.prompt)).toBe(false);
  });
});
