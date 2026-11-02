import { describe, expect, it } from 'vitest';
import { createRng } from '../random';
import { SLOT } from '../slot';
import type { Question } from '../types';
import {
  codesOnceQuestion,
  codesRepeatQuestion,
  generateCountingCases,
  togetherQuestion,
} from './countingCases';
import { answerOf, stepOf, typed } from './testHelpers';

const SAMPLES = 6000;

const rng = createRng(94);
const questions: Question[] = Array.from({ length: SAMPLES }, () => generateCountingCases(rng));

function withForm(form: string): Question[] {
  return questions.filter((question) => question.key.split(':')[1] === form);
}

function answer(question: Question): number {
  return Number(typed(answerOf(question)));
}

const factorial = (n: number): number => (n <= 1 ? 1 : n * factorial(n - 1));

describe('countingCases: spec examples', () => {
  it.each([
    [4, 3, 24, 'Hoeveel getallen van 3 cijfers kun je maken met de cijfers 1, 2, 3 en 4, als elk cijfer hoogstens één keer voorkomt?'],
    [4, 2, 12, 'Hoeveel getallen van 2 cijfers kun je maken met de cijfers 1, 2, 3 en 4, als elk cijfer hoogstens één keer voorkomt?'],
    [6, 3, 120, 'Hoeveel getallen van 3 cijfers kun je maken met de cijfers 1, 2, 3, 4, 5 en 6, als elk cijfer hoogstens één keer voorkomt?'],
  ])('codes once s=%i k=%i → %i', (s, k, expected, prompt) => {
    const question = codesOnceQuestion(s, k);
    expect(answer(question)).toBe(expected);
    expect(stepOf(question).prompt).toBe(prompt);
  });

  it('writes the once explanation with the choices per digit', () => {
    expect(stepOf(codesOnceQuestion(4, 3)).check('0').explanation).toBe(
      'Systematisch tellen: 4 keuzes voor het 1e cijfer, 3 voor het 2e, 2 voor het 3e → 4 × 3 × 2 = 24',
    );
    expect(stepOf(codesOnceQuestion(4, 2)).check('0').explanation).toBe(
      'Systematisch tellen: 4 keuzes voor het 1e cijfer, 3 voor het 2e → 4 × 3 = 12',
    );
  });

  it.each([
    [5, 3, 125, 'Een slot heeft een code van 3 cijfers uit 1, 2, 3, 4 en 5. Een cijfer mag vaker voorkomen. Hoeveel codes zijn er?'],
    [3, 2, 9, 'Een slot heeft een code van 2 cijfers uit 1, 2 en 3. Een cijfer mag vaker voorkomen. Hoeveel codes zijn er?'],
  ])('codes repeating s=%i k=%i → %i', (s, k, expected, prompt) => {
    const question = codesRepeatQuestion(s, k);
    expect(answer(question)).toBe(expected);
    expect(stepOf(question).prompt).toBe(prompt);
  });

  it('writes the repeating explanation with the power', () => {
    expect(stepOf(codesRepeatQuestion(5, 3)).check('0').explanation).toBe(
      'Systematisch tellen: 5 keuzes voor elk van de 3 cijfers → 5 × 5 × 5 = 125',
    );
  });

  it.each([
    [5, ['Anna', 'Bram'], 48, 'Op hoeveel manieren kunnen 5 kinderen in een rij staan als Anna en Bram naast elkaar moeten staan?'],
    [4, ['Chris', 'Dora'], 12, 'Op hoeveel manieren kunnen 4 kinderen in een rij staan als Chris en Dora naast elkaar moeten staan?'],
  ])('together n=%i → %i', (n, pair, expected, prompt) => {
    const question = togetherQuestion(n, pair as [string, string]);
    expect(answer(question)).toBe(expected);
    expect(stepOf(question).prompt).toBe(prompt);
  });

  it('writes the together explanation with the block', () => {
    expect(stepOf(togetherQuestion(5, ['Anna', 'Bram'])).check('0').explanation).toBe(
      'Systematisch tellen: Anna en Bram samen zijn 1 blok → 4 dingen in een rij: 4 × 3 × 2 × 1 = 24 → het blok kan twee kanten op → 24 × 2 = 48',
    );
  });
});

describe('countingCases: generated questions', () => {
  it('uses the three forms equally', () => {
    for (const form of ['once', 'repeat', 'together']) {
      const share = withForm(form).length / SAMPLES;
      expect(share, form).toBeGreaterThan(0.3);
      expect(share, form).toBeLessThan(0.37);
    }
  });

  it('keeps codes once within s in [4, 6] and k in [2, 3]', () => {
    for (const question of withForm('once')) {
      const [, , sText, kText] = question.key.split(':');
      const [s, k] = [Number(sText), Number(kText)];
      expect(s).toBeGreaterThanOrEqual(4);
      expect(s).toBeLessThanOrEqual(6);
      expect(k).toBeGreaterThanOrEqual(2);
      expect(k).toBeLessThanOrEqual(3);
      let expected = 1;
      for (let i = 0; i < k; i++) expected *= s - i;
      expect(answer(question)).toBe(expected);
    }
  });

  it('keeps codes repeating within s in [3, 5] and k in [2, 3]', () => {
    for (const question of withForm('repeat')) {
      const [, , sText, kText] = question.key.split(':');
      const [s, k] = [Number(sText), Number(kText)];
      expect(s).toBeGreaterThanOrEqual(3);
      expect(s).toBeLessThanOrEqual(5);
      expect(k).toBeGreaterThanOrEqual(2);
      expect(k).toBeLessThanOrEqual(3);
      expect(answer(question)).toBe(s ** k);
    }
  });

  it('keeps the together form at n in {4, 5} with the names as a pair', () => {
    for (const question of withForm('together')) {
      const [, , nText, names] = question.key.split(':');
      const n = Number(nText);
      expect([4, 5]).toContain(n);
      expect([`Anna-Bram`, `Chris-Dora`]).toContain(names);
      expect(answer(question)).toBe(factorial(n - 1) * 2);
    }
  });

  it('gives prompts without a slot, under 170 characters, and a number step without suffix', () => {
    for (const question of questions) {
      const step = question.steps[0]!;
      expect(question.topic).toBe('countingCases');
      expect(step.kind).toBe('number');
      expect(step.suffix).toBeUndefined();
      expect(step.prompt).not.toContain(SLOT);
      expect(step.prompt.length).toBeLessThanOrEqual(170);
    }
  });

  it('accepts the expected answer and rejects a wrong one', () => {
    for (const question of questions) {
      const step = stepOf(question);
      const correct = answer(question);
      expect(step.check(String(correct)).correct).toBe(true);
      expect(step.check(String(correct + 1)).correct).toBe(false);
    }
  });

  it('gives an explanation that starts with the heuristic', () => {
    for (const question of questions) {
      const explanation = stepOf(question).check(String(answer(question) + 1)).explanation;
      expect(explanation, question.key).toMatch(/^Systematisch tellen: /);
    }
  });

  it('maps each dedup key to one prompt and sees many keys', () => {
    const promptsByKey = new Map<string, Set<string>>();
    for (const question of questions) {
      const prompts = promptsByKey.get(question.key) ?? new Set<string>();
      prompts.add(stepOf(question).prompt);
      promptsByKey.set(question.key, prompts);
    }
    for (const [key, prompts] of promptsByKey) expect(prompts.size, key).toBe(1);
    expect(promptsByKey.size).toBeGreaterThanOrEqual(12);
  });
});
