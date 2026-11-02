import { describe, expect, it } from 'vitest';
import { formatRational, MINUS } from '../format';
import { createRng } from '../random';
import { add, compare, fromInteger, multiply, ONE, subtract } from '../rational';
import type { Question } from '../types';
import { WORD_FORMULAS, type WordContext } from './formulas';
import {
  breakEvenQuestion,
  generateFormulaProblems,
  positionQuestion,
  reverseQuestion,
} from './formulaProblems';
import { answerOf, decimal, stepOf, typed } from './testHelpers';

const SAMPLES = 6000;
const NBSP = '\u{a0}';

const rng = createRng(89);
const questions: Question[] = Array.from({ length: SAMPLES }, () => generateFormulaProblems(rng));

function withForm(form: string): Question[] {
  return questions.filter((question) => question.key.split(':')[1] === form);
}

function answer(question: Question): number {
  return Number(typed(answerOf(question)));
}

const REVERSE_SUFFIX: Record<WordContext, string> = {
  taxi: 'km',
  fietsverhuur: 'dagen',
  kaars: 'uur',
};

describe('formulaProblems: spec examples', () => {
  it('reverse: a taxi ride of € 29 is 10 km', () => {
    const step = stepOf(reverseQuestion('taxi', fromInteger(4), decimal('2,50'), 10));
    expect(step.prompt).toBe(
      `Taxi: kosten in euro = 4 + 2,50 × aantal km. Een rit kost €${NBSP}29. Hoeveel km is dat?`,
    );
    expect(step.suffix).toBe('km');
    expect(step.check('10').correct).toBe(true);
    expect(step.check('10').explanation).toBe(
      `4 + 2,50 × aantal km = 29 → 2,50 × aantal km = 29 ${MINUS} 4 = 25 → 25 : 2,50 = 10`,
    );
  });

  it('reverse: a candle at 14 cm (15 cm, 1,5 cm per hour) has burned 2 hours', () => {
    const step = stepOf(reverseQuestion('kaars', fromInteger(15), decimal('1,5'), 2));
    expect(step.prompt).toBe(
      `Kaars: lengte in cm = 15 ${MINUS} 1,5 × aantal uren. De kaars is nog 12 cm lang. Hoeveel uur brandt hij al?`,
    );
    expect(step.suffix).toBe('uur');
    expect(step.check('2').correct).toBe(true);
    expect(step.check('2').explanation).toBe(
      `15 ${MINUS} 1,5 × aantal uren = 12 → 1,5 × aantal uren = 15 ${MINUS} 12 = 3 → 3 : 1,5 = 2`,
    );
  });

  it('reverse: money with cents keeps two decimals', () => {
    const step = stepOf(reverseQuestion('taxi', fromInteger(3), decimal('2,50'), 3));
    expect(step.prompt).toContain(`Een rit kost €${NBSP}10,50. `);
    expect(step.check('3').correct).toBe(true);
  });

  it('break-even: € 10 + € 2 per film against € 4 + € 3 per film is 6 films', () => {
    const step = stepOf(breakEvenQuestion('abonnement', 10, 2, 4, 3));
    expect(step.prompt).toBe(
      `Abonnement A kost €${NBSP}10 per maand plus €${NBSP}2 per film. Abonnement B kost €${NBSP}4 per maand plus €${NBSP}3 per film. Bij hoeveel films kosten ze evenveel?`,
    );
    expect(step.suffix).toBe('films');
    expect(step.check('6').correct).toBe(true);
    expect(step.check('6').explanation).toBe(
      `A is €${NBSP}6 duurder per maand (10 ${MINUS} 4), B is €${NBSP}1 duurder per film (3 ${MINUS} 2) → 6 : 1 = 6 films`,
    );
  });

  it('position: 4, 7, 10, 13 gives plek 33 for 100', () => {
    const step = stepOf(positionQuestion(4, 3, 33));
    expect(step.prompt).toBe('Patroon: 4, 7, 10, 13, … Op welke plek staat 100?');
    expect(step.suffix).toBeUndefined();
    expect(step.check('33').correct).toBe(true);
    expect(step.check('33').explanation).toBe(
      'van 4 naar 100 is 96 meer → 96 : 3 = 32 stappen → plek 1 + 32 = 33',
    );
  });

  it('position: the largest drawn term (20, step 9, plek 50) is 461', () => {
    const step = stepOf(positionQuestion(20, 9, 50));
    expect(step.prompt).toBe('Patroon: 20, 29, 38, 47, … Op welke plek staat 461?');
    expect(step.check('50').correct).toBe(true);
  });

  it('rejects a wrong answer', () => {
    expect(stepOf(positionQuestion(4, 3, 20)).check('21').correct).toBe(false);
  });
});

describe('formulaProblems: all forms', () => {
  it('uses the three forms equally', () => {
    for (const form of ['reverse', 'breakeven', 'position']) {
      const share = withForm(form).length / SAMPLES;
      expect(share, form).toBeGreaterThan(0.3);
      expect(share, form).toBeLessThan(0.37);
    }
  });

  it('keeps prompts non-empty, at most 170 characters, and explanations present', () => {
    for (const question of questions) {
      const step = stepOf(question);
      expect(step.prompt.length).toBeGreaterThan(0);
      expect(step.prompt.length).toBeLessThanOrEqual(170);
      expect(step.kind).toBe('number');
      expect(question.topic).toBe('formulaProblems');
    }
  });

  it('checks the expected answer as correct and a wrong one as rejected', () => {
    for (const question of questions) {
      const step = stepOf(question);
      const correct = answerOf(question);
      expect(step.check(typed(correct)).correct).toBe(true);
      expect(step.check(typed(add(correct, ONE))).correct).toBe(false);
      expect(step.check(typed(correct)).explanation).toBeTruthy();
    }
  });

  it('maps every key to exactly one prompt', () => {
    const prompts = new Map<string, string>();
    for (const question of questions) {
      const prompt = stepOf(question).prompt;
      const seen = prompts.get(question.key);
      if (seen === undefined) prompts.set(question.key, prompt);
      else expect(prompt).toBe(seen);
    }
    expect(prompts.size).toBeGreaterThan(100);
  });
});

describe('formulaProblems: reverse', () => {
  const rows = withForm('reverse');

  it('asks a whole quantity within the word formula ranges', () => {
    for (const question of rows) {
      const [, , context, startText, rateText, inputText] = question.key.split(':');
      const formula = WORD_FORMULAS[context as WordContext];
      const input = Number(inputText);
      const step = stepOf(question);
      expect(formula.starts.map(formatRational)).toContain(startText);
      expect(formula.rates.map(formatRational)).toContain(rateText);
      expect(input).toBeGreaterThanOrEqual(formula.inputRange[0]);
      expect(input).toBeLessThanOrEqual(formula.inputRange[1]);
      expect(answer(question)).toBe(input);
      expect(step.suffix).toBe(REVERSE_SUFFIX[context as WordContext]);
      expect(step.check(String(input)).explanation ?? '').toMatch(new RegExp(`: \\S+ = ${input}$`));
      if (context === 'kaars') {
        const left = subtract(
          decimal(startText!),
          multiply(decimal(rateText!), fromInteger(input)),
        );
        expect(compare(left, ONE)).toBeGreaterThanOrEqual(0);
      }
    }
    expect(rows.length / SAMPLES).toBeGreaterThan(0.3);
  });
});

describe('formulaProblems: break-even', () => {
  const rows = withForm('breakeven');

  it('uses two offers that meet at a whole number of units', () => {
    const contexts = new Set<string>();
    for (const question of rows) {
      const [, , context, startAText, rateAText, startBText, rateBText] = question.key.split(':');
      const [startA, rateA, startB, rateB] = [startAText, rateAText, startBText, rateBText].map(
        Number,
      ) as [number, number, number, number];
      const extra = startA - startB;
      const gain = rateB - rateA;
      const x = answer(question);
      const step = stepOf(question);
      contexts.add(context!);
      expect(startA).toBeGreaterThan(startB);
      expect(rateA).toBeLessThan(rateB);
      expect(extra).toBeGreaterThanOrEqual(2);
      expect(extra).toBeLessThanOrEqual(12);
      expect(gain).toBeGreaterThanOrEqual(1);
      expect(gain).toBeLessThanOrEqual(3);
      expect(extra % gain).toBe(0);
      expect(x).toBeGreaterThanOrEqual(2);
      expect(x).toBeLessThanOrEqual(10);
      expect(startA + rateA * x).toBe(startB + rateB * x);
      expect(step.suffix).toBe(context === 'abonnement' ? 'films' : 'lessen');
      expect(step.prompt).toContain(`Bij hoeveel ${step.suffix} kosten ze evenveel?`);
    }
    expect([...contexts].sort()).toEqual(['abonnement', 'sportschool']);
    expect(rows.length / SAMPLES).toBeGreaterThan(0.3);
  });
});

describe('formulaProblems: position', () => {
  const rows = withForm('position');

  it('asks the place of a term of an increasing sequence', () => {
    for (const question of rows) {
      const [, , startText, diffText, nText] = question.key.split(':');
      const start = Number(startText);
      const diff = Number(diffText);
      const n = Number(nText);
      const value = start + (n - 1) * diff;
      expect(start).toBeGreaterThanOrEqual(1);
      expect(start).toBeLessThanOrEqual(20);
      expect(diff).toBeGreaterThanOrEqual(2);
      expect(diff).toBeLessThanOrEqual(9);
      expect(n).toBeGreaterThanOrEqual(10);
      expect(n).toBeLessThanOrEqual(60);
      expect(value).toBeLessThanOrEqual(500);
      expect(answer(question)).toBe(n);
      expect(stepOf(question).prompt).toContain(`Op welke plek staat ${value}?`);
    }
    expect(rows.length / SAMPLES).toBeGreaterThan(0.3);
    const places = new Set(rows.map((question) => Number(question.key.split(':')[4])));
    expect(places.has(33) || places.has(37) || places.has(11)).toBe(true);
  });
});
