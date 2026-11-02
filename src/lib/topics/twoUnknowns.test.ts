import { describe, expect, it } from 'vitest';
import { formatEuro, MINUS, NO_BREAK_SPACE } from '../format';
import { createRng } from '../random';
import { rational } from '../rational';
import type { Question } from '../types';
import { answerOf, stepOf, typed } from './testHelpers';
import {
  agesQuestion,
  coinsQuestion,
  generateTwoUnknowns,
  plusQuestion,
  timesQuestion,
} from './twoUnknowns';

const SAMPLES = 6000;
const N = NO_BREAK_SPACE;

const rng = createRng(96);
const questions: Question[] = Array.from({ length: SAMPLES }, () => generateTwoUnknowns(rng));

function withForm(form: string): Question[] {
  return questions.filter((question) => question.key.split(':')[1] === form);
}

function answer(question: Question): number {
  return Number(typed(answerOf(question)));
}

/** A wrong answer is one more than the right one. */
function explain(question: Question): string | undefined {
  return stepOf(question).check(String(answer(question) + 1)).explanation;
}

function view(question: Question) {
  const step = stepOf(question);
  return {
    prompt: step.prompt,
    suffix: step.suffix,
    answer: answer(question),
    explanation: explain(question),
  };
}

describe('twoUnknowns: spec examples', () => {
  it('ages: the spec example', () => {
    const question = agesQuestion('vader', 4, 10, false);
    expect(view(question)).toEqual({
      prompt: 'Een vader is 4 keer zo oud als zijn zoon. Samen zijn ze 50 jaar. Hoe oud is de zoon?',
      suffix: 'jaar',
      answer: 10,
      explanation: 'Schema maken: zoon 1 deel, vader 4 delen → samen 5 delen = 50 → 1 deel = 10 → de zoon is 10 jaar',
    });
  });

  it('ages: the upper limit (factor 5, sum 90) and asking the older one', () => {
    expect(view(agesQuestion('moeder', 5, 15, true))).toEqual({
      prompt: 'Een moeder is 5 keer zo oud als haar dochter. Samen zijn ze 90 jaar. Hoe oud is de moeder?',
      suffix: 'jaar',
      answer: 75,
      explanation:
        'Schema maken: dochter 1 deel, moeder 5 delen → samen 6 delen = 90 → 1 deel = 15 → de moeder is 5 × 15 = 75 jaar',
    });
  });

  it('coins: the spec example (€ 1 and € 2, asks the € 2 coins)', () => {
    expect(view(coinsQuestion('euro', 12, 8, true))).toEqual({
      prompt: `Je hebt 12 munten van €${N}1 en €${N}2, samen €${N}20. Hoeveel munten van €${N}2 heb je?`,
      suffix: undefined,
      answer: 8,
      explanation: `Slim proberen: stel dat alle 12 munten €${N}1 zijn: 12 × 1 = €${N}12 → 20 ${MINUS} 12 = €${N}8 te weinig → elke munt van €${N}2 is €${N}1 meer: 8`,
    });
  });

  it('coins: 50 cent and € 1 asks the 50 cent coins (division by 0,50, then the rest)', () => {
    expect(view(coinsQuestion('cent', 8, 2, false))).toEqual({
      prompt: `Je hebt 8 munten van 50 cent en €${N}1, samen €${N}5. Hoeveel munten van 50 cent heb je?`,
      suffix: undefined,
      answer: 6,
      explanation: `Slim proberen: stel dat alle 8 munten 50 cent zijn: 8 × 0,50 = €${N}4 → 5 ${MINUS} 4 = €${N}1 te weinig → elke euro is €${N}0,50 meer: 1 : 0,50 = 2 → 8 ${MINUS} 2 = 6`,
    });
  });

  it('rectangle, times: the spec example', () => {
    expect(view(timesQuestion(2, 6))).toEqual({
      prompt: 'Een rechthoek heeft een omtrek van 36 cm. De lengte is 2 keer de breedte. Hoe groot is de oppervlakte?',
      suffix: 'cm²',
      answer: 72,
      explanation:
        'Schema maken: halve omtrek 36 : 2 = 18 = lengte + breedte → 2 + 1 = 3 delen → 18 : 3 = 6 = breedte, lengte 12 → 12 × 6 = 72',
    });
  });

  it('rectangle, plus: the length is d cm longer', () => {
    expect(view(plusQuestion(4, 7))).toEqual({
      prompt: 'Een rechthoek heeft een omtrek van 36 cm. De lengte is 4 cm langer dan de breedte. Hoe groot is de oppervlakte?',
      suffix: 'cm²',
      answer: 77,
      explanation:
        'Schema maken: halve omtrek 36 : 2 = 18 = lengte + breedte → 18 − 4 = 14 = 2 × breedte → 14 : 2 = 7 = breedte, lengte 11 → 11 × 7 = 77',
    });
  });
});

describe('twoUnknowns: generation', () => {
  it('uses the three forms equally', () => {
    for (const form of ['ages', 'coins', 'rect']) {
      const share = withForm(form).length / SAMPLES;
      expect(share, form).toBeGreaterThan(0.3);
      expect(share, form).toBeLessThan(0.37);
    }
  });

  it('ages: factor in {2..5}, younger in [4, 20], sum at most 90, rebuilt from its key', () => {
    for (const question of withForm('ages')) {
      const [, , family, factorText, youngText, ask] = question.key.split(':');
      const factor = Number(factorText);
      const young = Number(youngText);
      expect([2, 3, 4, 5]).toContain(factor);
      expect(young).toBeGreaterThanOrEqual(4);
      expect(young).toBeLessThanOrEqual(20);
      expect((factor + 1) * young).toBeLessThanOrEqual(90);
      expect(['vader', 'moeder']).toContain(family);
      const askOld = ask === 'old';
      expect(answer(question)).toBe(askOld ? factor * young : young);
      expect(view(question)).toEqual(
        view(agesQuestion(family as 'vader' | 'moeder', factor, young, askOld)),
      );
    }
  });

  it('coins: count in [6, 15], each kind at least 1, value and answer exact', () => {
    const valueCents: Record<string, [number, number]> = { euro: [100, 200], cent: [50, 100] };
    for (const question of withForm('coins')) {
      const [, , pair, countText, highText, ask] = question.key.split(':');
      const count = Number(countText);
      const high = Number(highText);
      expect(count).toBeGreaterThanOrEqual(6);
      expect(count).toBeLessThanOrEqual(15);
      expect(high).toBeGreaterThanOrEqual(1);
      expect(high).toBeLessThanOrEqual(count - 1);
      const [lowCents, highCents] = valueCents[pair!]!;
      const totalCents = count * lowCents! + high * (highCents! - lowCents!);
      expect(question.steps.length).toBe(1);
      expect(stepOf(question).prompt).toContain(
        `samen ${formatEuro(rational(BigInt(totalCents), 100n))}.`,
      );
      expect(answer(question)).toBe(ask === 'high' ? high : count - high);
      expect(view(question)).toEqual(
        view(coinsQuestion(pair as 'euro' | 'cent', count, high, ask === 'high')),
      );
    }
  });

  it('rectangle: width and difference in range, area exact, rebuilt from its key', () => {
    for (const question of withForm('rect')) {
      const [, , variant, valueText, widthText] = question.key.split(':');
      const value = Number(valueText);
      const width = Number(widthText);
      expect(stepOf(question).suffix).toBe('cm²');
      if (variant === 'times') {
        expect([2, 3]).toContain(value);
        expect(width).toBeGreaterThanOrEqual(2);
        expect(width).toBeLessThanOrEqual(12);
        expect(answer(question)).toBe(value * width * width);
        expect(view(question)).toEqual(view(timesQuestion(value, width)));
      } else {
        expect(value).toBeGreaterThanOrEqual(2);
        expect(value).toBeLessThanOrEqual(8);
        expect(width).toBeGreaterThanOrEqual(3);
        expect(width).toBeLessThanOrEqual(15);
        expect(answer(question)).toBe(width * (width + value));
        expect(view(question)).toEqual(view(plusQuestion(value, width)));
      }
    }
  });

  it('every question: right answer accepted, wrong answer rejected, explanation, prompt length', () => {
    for (const question of questions) {
      const step = stepOf(question);
      expect(step.kind).toBe('number');
      expect(question.topic).toBe('twoUnknowns');
      expect(step.check(typed(answerOf(question))).correct).toBe(true);
      expect(step.check(String(answer(question) + 1)).correct).toBe(false);
      expect(explain(question)).toMatch(/^(Schema maken|Slim proberen): /);
      expect(step.prompt.length).toBeLessThanOrEqual(170);
    }
  });

  it('each dedup key maps to one prompt, with many distinct keys', () => {
    const promptsByKey = new Map<string, Set<string>>();
    for (const question of questions) {
      const prompts = promptsByKey.get(question.key) ?? new Set<string>();
      prompts.add(stepOf(question).prompt);
      promptsByKey.set(question.key, prompts);
    }
    for (const [key, prompts] of promptsByKey) expect(prompts.size, key).toBe(1);
    expect(promptsByKey.size).toBeGreaterThan(200);
  });
});
