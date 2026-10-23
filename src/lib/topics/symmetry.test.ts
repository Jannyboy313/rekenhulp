import { describe, expect, it } from 'vitest';
import { createRng } from '../random';
import { NO, YES } from '../steps';
import type { Question } from '../types';
import {
  FIGURES,
  generateSymmetry,
  linesQuestion,
  pointQuestion,
  rotationQuestion,
  type SymmetryFigure,
} from './symmetry';
import { stepOf } from './testHelpers';

const IDS = [
  'vierkant',
  'rechthoek',
  'ruit',
  'parallellogram',
  'vlieger',
  'gelijkbenigTrapezium',
  'gelijkzijdigeDriehoek',
  'gelijkbenigeDriehoek',
  'regelmatigeVijfhoek',
  'regelmatigeZeshoek',
  'regelmatigeAchthoek',
  'regelmatigeTienhoek',
  'regelmatigeTwaalfhoek',
];
const NO_ROTATION = ['vlieger', 'gelijkbenigTrapezium', 'gelijkbenigeDriehoek'];
const POINT_YES = 'Na een halve draai (180°) valt de figuur weer op zichzelf.';
const POINT_NO = 'Na een halve draai (180°) valt de figuur niet op zichzelf.';

function figureById(id: string): SymmetryFigure {
  const found = FIGURES.find((candidate) => candidate.id === id);
  if (found === undefined) throw new Error(`Unknown figure: ${id}`);
  return found;
}

function tipOf(question: Question, input: string): string | undefined {
  return stepOf(question).check(input).tip;
}

describe('FIGURES', () => {
  it('lists the 13 figures of spec §5.31', () => {
    expect(FIGURES.map(({ id }) => id)).toEqual(IDS);
  });

  it('has 10 figures with a rotation and 8 that are point symmetric', () => {
    expect(FIGURES.filter(({ rotation }) => rotation !== null)).toHaveLength(10);
    expect(FIGURES.filter(({ pointSymmetric }) => pointSymmetric)).toHaveLength(8);
    expect(FIGURES.filter(({ rotation }) => rotation === null).map(({ id }) => id)).toEqual(
      NO_ROTATION,
    );
  });

  it('is point symmetric exactly when a half turn is a multiple of the rotation', () => {
    for (const { id, rotation, pointSymmetric } of FIGURES) {
      expect(pointSymmetric, id).toBe(rotation !== null && 180 % rotation === 0);
    }
  });
});

describe('question text', () => {
  it('words the three forms as in the spec', () => {
    expect(stepOf(linesQuestion(figureById('ruit'))).prompt).toBe(
      'Hoeveel symmetrieassen heeft een ruit die geen vierkant is?',
    );
    expect(stepOf(rotationQuestion(figureById('regelmatigeVijfhoek'))).prompt).toBe(
      'Over hoeveel graden moet je een regelmatige vijfhoek minstens draaien om hem weer precies op zichzelf te laten vallen?',
    );
    expect(stepOf(pointQuestion(figureById('parallellogram'))).prompt).toBe(
      'Is een parallellogram dat geen rechthoek of ruit is puntsymmetrisch?',
    );
  });

  it.each<[string, string, string, string]>([
    [
      'vierkant',
      'een vierkant',
      '4',
      'de 2 diagonalen en de 2 lijnen door de middens van de overstaande zijden',
    ],
    [
      'rechthoek',
      'een rechthoek die geen vierkant is',
      '2',
      'de 2 lijnen door de middens van de overstaande zijden; de diagonalen zijn geen symmetrieas',
    ],
    ['ruit', 'een ruit die geen vierkant is', '2', 'de 2 diagonalen'],
    ['parallellogram', 'een parallellogram dat geen rechthoek of ruit is', '0', 'geen'],
    [
      'vlieger',
      'een vlieger die geen ruit is',
      '1',
      'de diagonaal door de hoeken waar de gelijke zijden samenkomen',
    ],
    [
      'gelijkbenigTrapezium',
      'een gelijkbenig trapezium dat geen rechthoek is',
      '1',
      'de lijn door de middens van de evenwijdige zijden',
    ],
    [
      'gelijkzijdigeDriehoek',
      'een gelijkzijdige driehoek',
      '3',
      'van elke hoek naar het midden van de overstaande zijde',
    ],
    [
      'gelijkbenigeDriehoek',
      'een gelijkbenige driehoek die niet gelijkzijdig is',
      '1',
      'van de tophoek naar het midden van de basis',
    ],
  ])('lines, %s', (id, name, answer, explanation) => {
    const step = stepOf(linesQuestion(figureById(id)));
    expect(step.kind).toBe('number');
    expect(step.prompt).toBe(`Hoeveel symmetrieassen heeft ${name}?`);
    expect(step.suffix).toBeUndefined();
    expect(step.check(answer).correct).toBe(true);
    expect(step.check('').expected).toBe(answer);
    expect(step.check(answer).explanation).toBe(explanation);
    expect(step.check('9').explanation).toBe(explanation);
  });

  it.each<[string, string, string]>([
    ['vierkant', '90', '360 : 4 = 90'],
    ['rechthoek', '180', 'pas na een halve draai: 360 : 2 = 180'],
    ['ruit', '180', 'pas na een halve draai: 360 : 2 = 180'],
    ['parallellogram', '180', 'pas na een halve draai: 360 : 2 = 180'],
    ['gelijkzijdigeDriehoek', '120', '360 : 3 = 120'],
    ['regelmatigeVijfhoek', '72', '360 : 5 = 72'],
    ['regelmatigeZeshoek', '60', '360 : 6 = 60'],
    ['regelmatigeAchthoek', '45', '360 : 8 = 45'],
    ['regelmatigeTienhoek', '36', '360 : 10 = 36'],
    ['regelmatigeTwaalfhoek', '30', '360 : 12 = 30'],
  ])('rotation, %s', (id, answer, explanation) => {
    const one = figureById(id);
    const step = stepOf(rotationQuestion(one));
    expect(step.kind).toBe('number');
    expect(step.prompt).toBe(
      `Over hoeveel graden moet je ${one.name} minstens draaien om hem weer precies op zichzelf te laten vallen?`,
    );
    expect(step.suffix).toBe('°');
    expect(step.check(answer).correct).toBe(true);
    expect(step.check('').expected).toBe(answer);
    expect(step.check(answer).explanation).toBe(explanation);
    expect(step.check('1').explanation).toBe(explanation);
  });

  it('throws a rotation question for a figure without a rotation', () => {
    for (const id of NO_ROTATION) {
      expect(() => rotationQuestion(figureById(id)), id).toThrow(RangeError);
    }
  });

  it.each<[string, string, string]>([
    ['vierkant', YES, POINT_YES],
    ['rechthoek', YES, POINT_YES],
    ['ruit', YES, POINT_YES],
    ['parallellogram', YES, POINT_YES],
    ['vlieger', NO, POINT_NO],
    ['gelijkbenigTrapezium', NO, POINT_NO],
    ['gelijkzijdigeDriehoek', NO, POINT_NO],
    ['gelijkbenigeDriehoek', NO, POINT_NO],
    ['regelmatigeVijfhoek', NO, POINT_NO],
    ['regelmatigeZeshoek', YES, POINT_YES],
    ['regelmatigeAchthoek', YES, POINT_YES],
    ['regelmatigeTienhoek', YES, POINT_YES],
    ['regelmatigeTwaalfhoek', YES, POINT_YES],
  ])('point symmetry, %s', (id, answer, explanation) => {
    const one = figureById(id);
    const step = stepOf(pointQuestion(one));
    expect(step.kind).toBe('boolean');
    expect(step.prompt).toBe(`Is ${one.name} puntsymmetrisch?`);
    expect(step.check(answer).correct).toBe(true);
    expect(step.check(answer === YES ? NO : YES).correct).toBe(false);
    expect(step.check('').expected).toBe(answer);
    expect(step.check(answer).explanation).toBe(explanation);
  });

  it.each<[string, number, string]>([
    ['regelmatigeVijfhoek', 5, 'vijfhoek'],
    ['regelmatigeZeshoek', 6, 'zeshoek'],
    ['regelmatigeAchthoek', 8, 'achthoek'],
    ['regelmatigeTienhoek', 10, 'tienhoek'],
    ['regelmatigeTwaalfhoek', 12, 'twaalfhoek'],
  ])('lines of a regular polygon, %s', (id, sides, name) => {
    const one = figureById(id);
    const result = stepOf(linesQuestion(one)).check('');
    expect(one.name).toBe(`een regelmatige ${name}`);
    expect(result.expected).toBe(String(sides));
    expect(result.explanation).toBe(`een regelmatige ${name} heeft ${sides} symmetrieassen`);
  });

  it('has a key of the form and the figure', () => {
    expect(linesQuestion(figureById('ruit')).key).toBe('symmetry:lines:ruit');
    expect(rotationQuestion(figureById('regelmatigeVijfhoek')).key).toBe(
      'symmetry:rotation:regelmatigeVijfhoek',
    );
    expect(pointQuestion(figureById('parallellogram')).key).toBe('symmetry:point:parallellogram');
    expect(linesQuestion(figureById('ruit')).topic).toBe('symmetry');
  });
});

describe('tips', () => {
  it('gives a wrong answer no topic tip, also for Ja/Nee', () => {
    for (const one of FIGURES) {
      expect(tipOf(linesQuestion(one), String(one.lines + 1)), one.id).toBeUndefined();
      if (one.rotation !== null) {
        expect(tipOf(rotationQuestion(one), String(one.rotation + 1)), one.id).toBeUndefined();
      }
      expect(tipOf(pointQuestion(one), one.pointSymmetric ? NO : YES), one.id).toBeUndefined();
    }
  });
});

describe('generateSymmetry', () => {
  const COUNT = 4000;
  const rng = createRng(5311);
  const questions = Array.from({ length: COUNT }, () => generateSymmetry(rng));

  type Form = 'lines' | 'rotation' | 'point';

  /** The prompt of each form; the group is the name of the figure. */
  const PROMPTS: readonly (readonly [Form, RegExp])[] = [
    ['lines', /^Hoeveel symmetrieassen heeft (.+)\?$/u],
    [
      'rotation',
      /^Over hoeveel graden moet je (.+) minstens draaien om hem weer precies op zichzelf te laten vallen\?$/u,
    ],
    ['point', /^Is (.+) puntsymmetrisch\?$/u],
  ];

  interface Parsed {
    form: Form;
    figure: SymmetryFigure;
    question: Question;
  }

  function parse(question: Question): Parsed {
    const { prompt } = stepOf(question);
    for (const [form, pattern] of PROMPTS) {
      const name = pattern.exec(prompt)?.[1];
      if (name === undefined) continue;
      const figure = FIGURES.find((candidate) => candidate.name === name);
      if (figure === undefined) throw new Error(`Unknown figure: ${prompt}`);
      return { form, figure, question };
    }
    throw new Error(`Unexpected prompt: ${prompt}`);
  }

  /** The answer, worked out from the figure of the prompt alone. */
  function expectedAnswer({ form, figure }: Parsed): string {
    switch (form) {
      case 'lines':
        return String(figure.lines);
      case 'rotation':
        return String(figure.rotation);
      case 'point':
        return figure.pointSymmetric ? YES : NO;
    }
  }

  const all = questions.map(parse);
  const of = (form: Form) => all.filter((one) => one.form === form);
  const share = (part: readonly Parsed[], whole: readonly Parsed[]) => part.length / whole.length;
  const near = (actual: number, expected: number) =>
    expect(Math.abs(actual - expected)).toBeLessThan(0.05);
  const idsOf = (parsed: readonly Parsed[]) => new Set(parsed.map(({ figure }) => figure.id));

  it('creates single-step questions that accept their own answer', () => {
    for (const { form, question } of all) {
      const step = stepOf(question);
      expect(question.topic).toBe('symmetry');
      expect(question.steps, question.key).toHaveLength(1);
      expect(step.kind, question.key).toBe(form === 'point' ? 'boolean' : 'number');
      expect(step.suffix, question.key).toBe(form === 'rotation' ? '°' : undefined);
      const result = step.check(step.check('').expected);
      expect(result.correct, question.key).toBe(true);
      expect(result.explanation, question.key).toBeTruthy();
    }
  });

  it('answers what the figure of the prompt has', () => {
    for (const one of all) {
      expect(stepOf(one.question).check('').expected, one.question.key).toBe(expectedAnswer(one));
    }
  });

  it('picks the lines, the rotation and the point symmetry a third each', () => {
    near(share(of('lines'), all), 1 / 3);
    near(share(of('rotation'), all), 1 / 3);
    near(share(of('point'), all), 1 / 3);
  });

  it('draws a rotation only for a figure with a rotation, and every such figure', () => {
    const rotating = FIGURES.filter(({ rotation }) => rotation !== null).map(({ id }) => id);
    expect(idsOf(of('rotation'))).toEqual(new Set(rotating));
  });

  it('draws every figure for the lines and for the point symmetry', () => {
    expect(idsOf(of('lines'))).toEqual(new Set(IDS));
    expect(idsOf(of('point'))).toEqual(new Set(IDS));
  });

  it('answers Ja and Nee 50% each for the point symmetry', () => {
    const point = of('point');
    near(share(point.filter(({ figure }) => figure.pointSymmetric), point), 0.5);
    near(share(point.filter(({ figure }) => !figure.pointSymmetric), point), 0.5);
  });

  it('has a key of the form and the figure, 36 different in all', () => {
    for (const { form, figure, question } of all) {
      expect(question.key, stepOf(question).prompt).toBe(`symmetry:${form}:${figure.id}`);
    }
    expect(new Set(questions.map(({ key }) => key)).size).toBe(36);
  });

  it('gives the same prompt and answer to questions with the same key', () => {
    const seen = new Map<string, string>();
    for (const question of questions) {
      const shown = `${stepOf(question).prompt} ${stepOf(question).check('').expected}`;
      expect(seen.get(question.key) ?? shown, question.key).toBe(shown);
      seen.set(question.key, shown);
    }
  });

  it('is deterministic for a fixed seed', () => {
    const keys = (seed: number) => {
      const random = createRng(seed);
      return Array.from({ length: 50 }, () => generateSymmetry(random).key);
    };
    expect(keys(7)).toEqual(keys(7));
    expect(keys(7)).not.toEqual(keys(8));
  });
});
