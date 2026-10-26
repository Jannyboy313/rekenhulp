import { describe, expect, it } from 'vitest';
import { createRng } from '../random';
import type { Question } from '../types';
import {
  combinationsQuestion,
  generateSystematicCounting,
  handshakesQuestion,
  orderingsQuestion,
} from './systematicCounting';
import { answerOf, stepOf, typed } from './testHelpers';

const TIP_FACTOR_TEN = 'Je antwoord is 10 keer te groot. Let op de komma en het aantal nullen.';

describe('question text', () => {
  it.each<[string, () => Question, string, string, string]>([
    [
      'kleding 3, 4',
      () => combinationsQuestion('kleding', [3, 4]),
      'Je hebt 3 broeken en 4 truien. Hoeveel verschillende combinaties van een broek en een trui kun je maken?',
      '12',
      'Systematisch tellen: bij elke broek passen 4 truien → 3 × 4 = 12',
    ],
    [
      'kleding 8, 8 (largest)',
      () => combinationsQuestion('kleding', [8, 8]),
      'Je hebt 8 broeken en 8 truien. Hoeveel verschillende combinaties van een broek en een trui kun je maken?',
      '64',
      'Systematisch tellen: bij elke broek passen 8 truien → 8 × 8 = 64',
    ],
    [
      'menu 3, 4, 2',
      () => combinationsQuestion('menu', [3, 4, 2]),
      "Een restaurant heeft 3 voorgerechten, 4 hoofdgerechten en 2 nagerechten. Hoeveel verschillende menu's van drie gangen kun je kiezen?",
      '24',
      'Systematisch tellen: elk voorgerecht met elk hoofdgerecht en elk nagerecht → 3 × 4 × 2 = 24',
    ],
    [
      'menu 5, 6, 4 (product 120)',
      () => combinationsQuestion('menu', [5, 6, 4]),
      "Een restaurant heeft 5 voorgerechten, 6 hoofdgerechten en 4 nagerechten. Hoeveel verschillende menu's van drie gangen kun je kiezen?",
      '120',
      'Systematisch tellen: elk voorgerecht met elk hoofdgerecht en elk nagerecht → 5 × 6 × 4 = 120',
    ],
    [
      'handen 6',
      () => handshakesQuestion('handen', 6),
      'Op een feest geeft elke gast elke andere gast één keer een hand. Er zijn 6 gasten. Hoeveel handdrukken zijn dat?',
      '15',
      'Systematisch tellen: elk van de 6 gasten geeft 5 handen → 6 × 5 = 30 → zo telt elke handdruk dubbel: 30 : 2 = 15',
    ],
    [
      'competitie 8',
      () => handshakesQuestion('competitie', 8),
      'In een competitie speelt elk team één keer tegen elk ander team. Er doen 8 teams mee. Hoeveel wedstrijden zijn dat?',
      '28',
      'Systematisch tellen: elk van de 8 teams speelt 7 wedstrijden → 8 × 7 = 56 → zo telt elke wedstrijd dubbel: 56 : 2 = 28',
    ],
    [
      'handen 16 (largest)',
      () => handshakesQuestion('handen', 16),
      'Op een feest geeft elke gast elke andere gast één keer een hand. Er zijn 16 gasten. Hoeveel handdrukken zijn dat?',
      '120',
      'Systematisch tellen: elk van de 16 gasten geeft 15 handen → 16 × 15 = 240 → zo telt elke handdruk dubbel: 240 : 2 = 120',
    ],
    [
      'rij 4',
      () => orderingsQuestion('rij', 4),
      'Op hoeveel manieren kunnen 4 kinderen naast elkaar in een rij staan?',
      '24',
      'Systematisch tellen: 4 kinderen kunnen vooraan staan, dan 3 op de 2e plek, … → 4 × 3 × 2 × 1 = 24',
    ],
    [
      'rij 3 (smallest)',
      () => orderingsQuestion('rij', 3),
      'Op hoeveel manieren kunnen 3 kinderen naast elkaar in een rij staan?',
      '6',
      'Systematisch tellen: 3 kinderen kunnen vooraan staan, dan 2 op de 2e plek, … → 3 × 2 × 1 = 6',
    ],
    [
      'podium 6',
      () => orderingsQuestion('podium', 6),
      'Aan een hardloopwedstrijd doen 6 kinderen mee. Op hoeveel manieren kunnen de 1e, 2e en 3e plaats verdeeld worden?',
      '120',
      'Systematisch tellen: 6 kinderen voor de 1e plaats, 5 voor de 2e, 4 voor de 3e → 6 × 5 × 4 = 120',
    ],
    [
      'podium 8 (largest)',
      () => orderingsQuestion('podium', 8),
      'Aan een hardloopwedstrijd doen 8 kinderen mee. Op hoeveel manieren kunnen de 1e, 2e en 3e plaats verdeeld worden?',
      '336',
      'Systematisch tellen: 8 kinderen voor de 1e plaats, 7 voor de 2e, 6 voor de 3e → 8 × 7 × 6 = 336',
    ],
  ])('%s', (_label, make, prompt, expected, explanation) => {
    const step = stepOf(make());
    expect(step.prompt).toBe(prompt);
    expect(step.check(typed(answerOf(make())))).toMatchObject({
      correct: true,
      expected,
      explanation,
    });
  });

  it('builds the key from the form, the context and the counts', () => {
    expect(combinationsQuestion('menu', [3, 4, 2]).key).toBe(
      'systematicCounting:combinations:menu:3:4:2',
    );
    expect(handshakesQuestion('handen', 6).key).toBe('systematicCounting:handshakes:handen:6');
    expect(orderingsQuestion('podium', 6).key).toBe('systematicCounting:orderings:podium:6');
  });
});

describe('tips', () => {
  it.each<[string, string, () => Question, string | undefined]>([
    [
      'kleding: counts added',
      '7',
      () => combinationsQuestion('kleding', [3, 4]),
      'Bij elke broek passen 4 truien: vermenigvuldig, 3 × 4.',
    ],
    [
      'menu: counts added',
      '9',
      () => combinationsQuestion('menu', [3, 4, 2]),
      'Elk voorgerecht past bij elk hoofdgerecht en elk nagerecht: vermenigvuldig, 3 × 4 × 2.',
    ],
    [
      'handen: not halved',
      '30',
      () => handshakesQuestion('handen', 6),
      'Zo tel je elke handdruk twee keer: deel nog door 2.',
    ],
    [
      'competitie: not halved',
      '56',
      () => handshakesQuestion('competitie', 8),
      'Zo tel je elke wedstrijd twee keer: deel nog door 2.',
    ],
    ['handen: factor of ten', '150', () => handshakesQuestion('handen', 6), TIP_FACTOR_TEN],
    ['orderings: no topic tip', '16', () => orderingsQuestion('rij', 4), undefined],
    ['another wrong answer', '13', () => combinationsQuestion('kleding', [3, 4]), undefined],
  ])('%s, typing %s', (_label, input, make, tip) => {
    expect(stepOf(make()).check(input).tip).toBe(tip);
  });

  it('accepts the sum when it equals the product', () => {
    expect(stepOf(combinationsQuestion('kleding', [2, 2])).check('4')).toMatchObject({
      correct: true,
    });
  });
});

describe('generateSystematicCounting', () => {
  const COUNT = 4000;
  const rng = createRng(4141);
  const questions = Array.from({ length: COUNT }, () => generateSystematicCounting(rng));
  const parsed = questions.map((question) => {
    const [, form, context, ...rest] = question.key.split(':');
    return { question, form, context, numbers: rest.map(Number) };
  });
  const near = (count: number, of: number, share: number) => Math.abs(count / of - share) <= 0.05;

  it('picks the three forms equally and each context 1/2 within its form', () => {
    for (const [form, contexts] of [
      ['combinations', ['kleding', 'menu']],
      ['handshakes', ['handen', 'competitie']],
      ['orderings', ['rij', 'podium']],
    ] as const) {
      const ofForm = parsed.filter((item) => item.form === form);
      expect(near(ofForm.length, COUNT, 1 / 3), form).toBe(true);
      const first = ofForm.filter((item) => item.context === contexts[0]).length;
      expect(near(first, ofForm.length, 0.5), form).toBe(true);
    }
  });

  it('draws the counts of spec §5.41', () => {
    const within = (value: number, min: number, max: number) => value >= min && value <= max;
    for (const { context, numbers, question } of parsed) {
      const [n] = numbers as [number];
      switch (context) {
        case 'kleding':
          expect(numbers, question.key).toHaveLength(2);
          for (const count of numbers) expect(within(count, 2, 8), question.key).toBe(true);
          break;
        case 'menu':
          expect(numbers, question.key).toHaveLength(3);
          for (const count of numbers) expect(within(count, 2, 6), question.key).toBe(true);
          expect(numbers.reduce((a, b) => a * b), question.key).toBeLessThanOrEqual(120);
          break;
        case 'handen':
        case 'competitie':
          expect(within(n, 4, 16), question.key).toBe(true);
          break;
        case 'rij':
          expect(within(n, 3, 5), question.key).toBe(true);
          break;
        case 'podium':
          expect(within(n, 4, 8), question.key).toBe(true);
          break;
        default:
          throw new Error(question.key);
      }
    }
  });

  it('answers, explains and keeps every prompt within 170 characters', () => {
    for (const { question } of parsed) {
      const step = stepOf(question);
      const result = step.check(typed(answerOf(question)));
      expect(result.correct, question.key).toBe(true);
      expect(result.explanation, question.key).toMatch(/^Systematisch tellen: /);
      expect(step.prompt.length, question.key).toBeLessThanOrEqual(170);
      expect(question.topic).toBe('systematicCounting');
    }
  });
});
