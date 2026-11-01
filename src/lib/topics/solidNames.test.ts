import { describe, expect, it } from 'vitest';
import { createRng } from '../random';
import {
  countQuestion,
  generateSolidNames,
  nameQuestion,
  NAME_ITEMS,
  SOLID_NAMES,
} from './solidNames';
import { stepOf } from './testHelpers';

const BOX_FAMILY = ['kubus', 'balk', 'prisma'];

describe('nameQuestion', () => {
  it.each<[number, string, string]>([
    [0, 'Welk ruimtefiguur heeft een cirkel als grondvlak en een punt als top?', 'kegel'],
    [1, 'Welk ruimtefiguur heeft twee gelijke cirkels als grondvlak en bovenvlak?', 'cilinder'],
    [
      2,
      'Welk ruimtefiguur heeft een veelhoek als grondvlak en driehoeken als zijvlakken die in één punt samenkomen?',
      'piramide',
    ],
    [
      3,
      'Welk ruimtefiguur heeft twee gelijke driehoeken als grondvlak en bovenvlak en rechthoeken als zijvlakken?',
      'prisma',
    ],
    [4, 'Welk ruimtefiguur heeft zes vierkanten als zijvlakken?', 'kubus'],
    [5, 'Welk ruimtefiguur heeft zes rechthoeken als zijvlakken, niet allemaal vierkant?', 'balk'],
    [
      6,
      'Welk ruimtefiguur heeft geen ribben en geen hoekpunten, en elk punt even ver van het middelpunt?',
      'bol',
    ],
  ])('item %i', (index, prompt, answer) => {
    const question = nameQuestion(index, createRng(1));
    const step = stepOf(question);
    expect(step.kind).toBe('choice');
    expect(step.prompt).toBe(prompt);
    expect(step.check(answer).correct).toBe(true);
    expect(question.key).toBe(`solidNames:name:${answer}`);
    expect(question.topic).toBe('solidNames');
  });

  it('explains a kegel', () => {
    const step = stepOf(nameQuestion(0, createRng(1)));
    expect(step.check('bol').explanation).toBe(
      'Een kegel heeft een cirkel als grondvlak en loopt uit in een punt.',
    );
  });

  it('never offers the other members of kubus, balk and prisma as distractors', () => {
    const rng = createRng(11);
    for (let i = 0; i < 1000; i++) {
      for (let index = 0; index < NAME_ITEMS.length; index++) {
        const step = stepOf(nameQuestion(index, rng));
        const answer = step.check('').expected;
        expect(step.options).toHaveLength(4);
        expect(new Set(step.options).size).toBe(4);
        expect(step.options).toContain(answer);
        for (const option of step.options!) expect(SOLID_NAMES).toContain(option);
        if (BOX_FAMILY.includes(answer)) {
          const family = step.options!.filter((option) => BOX_FAMILY.includes(option));
          expect(family).toEqual([answer]);
        }
      }
    }
  });
});

describe('countQuestion', () => {
  it.each<[string, () => ReturnType<typeof countQuestion>, string, string, string, string]>([
    [
      'prisma zeshoek ribben',
      () => countQuestion('prisma', 6, 'ribben'),
      'Hoeveel ribben heeft een prisma met een zeshoek als grondvlak?',
      '18',
      'ribben',
      'zeshoek als grondvlak: 6 ribben onder, 6 boven en 6 opstaand → 18',
    ],
    [
      'prisma driehoek vlakken',
      () => countQuestion('prisma', 3, 'vlakken'),
      'Hoeveel vlakken heeft een prisma met een driehoek als grondvlak?',
      '5',
      'vlakken',
      'driehoek als grondvlak: 2 grondvlakken en 3 zijvlakken → 5',
    ],
    [
      'prisma achthoek hoekpunten',
      () => countQuestion('prisma', 8, 'hoekpunten'),
      'Hoeveel hoekpunten heeft een prisma met een achthoek als grondvlak?',
      '16',
      'hoekpunten',
      'achthoek als grondvlak: 8 hoekpunten onder en 8 boven → 16',
    ],
    [
      'piramide vierkant ribben',
      () => countQuestion('piramide', 4, 'ribben'),
      'Hoeveel ribben heeft een piramide met een vierkant als grondvlak?',
      '8',
      'ribben',
      'vierkant als grondvlak: 4 ribben in het grondvlak en 4 naar de top → 8',
    ],
    [
      'piramide vierkant hoekpunten',
      () => countQuestion('piramide', 4, 'hoekpunten'),
      'Hoeveel hoekpunten heeft een piramide met een vierkant als grondvlak?',
      '5',
      'hoekpunten',
      'vierkant als grondvlak: 4 hoekpunten in het grondvlak en 1 top → 5',
    ],
    [
      'piramide vijfhoek vlakken',
      () => countQuestion('piramide', 5, 'vlakken'),
      'Hoeveel vlakken heeft een piramide met een vijfhoek als grondvlak?',
      '6',
      'vlakken',
      'vijfhoek als grondvlak: 1 grondvlak en 5 zijvlakken → 6',
    ],
    [
      'kubus ribben',
      () => countQuestion('kubus', undefined, 'ribben'),
      'Hoeveel ribben heeft een kubus?',
      '12',
      'ribben',
      'Een kubus heeft 12 ribben.',
    ],
    [
      'balk hoekpunten',
      () => countQuestion('balk', undefined, 'hoekpunten'),
      'Hoeveel hoekpunten heeft een balk?',
      '8',
      'hoekpunten',
      'Een balk heeft 8 hoekpunten.',
    ],
    [
      'balk vlakken',
      () => countQuestion('balk', undefined, 'vlakken'),
      'Hoeveel vlakken heeft een balk?',
      '6',
      'vlakken',
      'Een balk heeft 6 vlakken.',
    ],
  ])('%s', (_label, make, prompt, answer, suffix, explanation) => {
    const step = stepOf(make());
    expect(step.kind).toBe('number');
    expect(step.prompt).toBe(prompt);
    expect(step.suffix).toBe(suffix);
    expect(step.check(answer).correct).toBe(true);
    expect(step.check('').expected).toBe(answer);
    expect(step.check('1').explanation).toBe(explanation);
  });

  it('has a key of the solid, the base and the property', () => {
    expect(countQuestion('prisma', 6, 'ribben').key).toBe('solidNames:count:prisma:6:ribben');
    expect(countQuestion('kubus', undefined, 'ribben').key).toBe('solidNames:count:kubus:ribben');
  });
});

describe('generateSolidNames', () => {
  const rng = createRng(2411);
  const questions = Array.from({ length: 3000 }, () => generateSolidNames(rng));

  it('creates questions that accept their own answer', () => {
    for (const question of questions) {
      expect(question.topic).toBe('solidNames');
      expect(question.steps).toHaveLength(1);
      const step = stepOf(question);
      expect(['choice', 'number']).toContain(step.kind);
      const expected = step.check('').expected;
      expect(step.check(expected).correct, question.key).toBe(true);
    }
  });

  it('uses the name and count forms about 50/50', () => {
    const names = questions.filter((question) => stepOf(question).kind === 'choice').length;
    expect(Math.abs(names / questions.length - 0.5)).toBeLessThan(0.05);
  });

  it('draws every name, solid, base and property', () => {
    const keys = new Set(questions.map(({ key }) => key));
    for (const { answer } of NAME_ITEMS) {
      expect(keys.has(`solidNames:name:${answer}`), answer).toBe(true);
    }
    for (const property of ['vlakken', 'ribben', 'hoekpunten']) {
      for (const n of [3, 4, 5, 6, 8]) {
        expect(keys.has(`solidNames:count:prisma:${n}:${property}`)).toBe(true);
        expect(keys.has(`solidNames:count:piramide:${n}:${property}`)).toBe(true);
      }
      expect(keys.has(`solidNames:count:kubus:${property}`)).toBe(true);
      expect(keys.has(`solidNames:count:balk:${property}`)).toBe(true);
    }
  });

  it('counts with the formulas of the spec', () => {
    const FORMULAS = {
      prisma: {
        vlakken: (n: number) => n + 2,
        ribben: (n: number) => 3 * n,
        hoekpunten: (n: number) => 2 * n,
      },
      piramide: {
        vlakken: (n: number) => n + 1,
        ribben: (n: number) => 2 * n,
        hoekpunten: (n: number) => n + 1,
      },
    } as const;
    for (const n of [3, 4, 5, 6, 8]) {
      for (const property of ['vlakken', 'ribben', 'hoekpunten'] as const) {
        for (const solid of ['prisma', 'piramide'] as const) {
          const step = stepOf(countQuestion(solid, n, property));
          expect(step.check('').expected).toBe(String(FORMULAS[solid][property](n)));
        }
      }
    }
  });
});
