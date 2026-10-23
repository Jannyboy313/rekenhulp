import { beforeAll, describe, expect, it } from 'vitest';
import { createRng } from '../random';
import { fromInteger, multiply, type Rational } from '../rational';
import type { Question } from '../types';
import { PI } from './perimeterArea';
import {
  CONTAINER_RANGES,
  generateSolids,
  litresQuestion,
  surfaceQuestion,
  volumeQuestion,
  type Container,
  type Solid,
} from './solids';
import { answerOf, stepOf, typed } from './testHelpers';

const TIP_VOLUME = 'Dat is de inhoud; gevraagd is de oppervlakte.';
const TIP_SURFACE = 'Dat is de oppervlakte; gevraagd is de inhoud.';
const TIP_RADIUS = 'De straal is de helft van de diameter: 10 : 2 = 5.';
const TIP_FACTOR_TEN = 'Je antwoord is 10 keer te groot. Let op de komma en het aantal nullen.';
const TIP_FACTOR_THOUSAND =
  'Je antwoord is 1000 keer te groot. Let op de komma en het aantal nullen.';

describe('question text', () => {
  it.each<[string, () => Question, string, string, string, string]>([
    [
      'kubus 4, inhoud',
      () => volumeQuestion('kubus', [4]),
      'Een kubus heeft ribben van 4 cm. Hoe groot is de inhoud?',
      '64',
      'cm³',
      '4 × 4 × 4 = 64',
    ],
    [
      'kubus 4, oppervlakte',
      () => surfaceQuestion('kubus', [4]),
      'Een kubus heeft ribben van 4 cm. Hoe groot is de oppervlakte?',
      '96',
      'cm²',
      '6 × 4 × 4 = 96',
    ],
    [
      'kubus 10, inhoud (edge)',
      () => volumeQuestion('kubus', [10]),
      'Een kubus heeft ribben van 10 cm. Hoe groot is de inhoud?',
      '1000',
      'cm³',
      '10 × 10 × 10 = 1000',
    ],
    [
      'balk 8, 5, 3, inhoud',
      () => volumeQuestion('balk', [8, 5, 3]),
      'Een balk is 8 cm lang, 5 cm breed en 3 cm hoog. Hoe groot is de inhoud?',
      '120',
      'cm³',
      '8 × 5 × 3 = 120',
    ],
    [
      'balk 8, 5, 3, oppervlakte',
      () => surfaceQuestion('balk', [8, 5, 3]),
      'Een balk is 8 cm lang, 5 cm breed en 3 cm hoog. Hoe groot is de oppervlakte?',
      '158',
      'cm²',
      '2 × (8 × 5 + 8 × 3 + 5 × 3) = 2 × 79 = 158',
    ],
    [
      'balk 20, 10, 9, oppervlakte (edge)',
      () => surfaceQuestion('balk', [20, 10, 9]),
      'Een balk is 20 cm lang, 10 cm breed en 9 cm hoog. Hoe groot is de oppervlakte?',
      '940',
      'cm²',
      '2 × (20 × 10 + 20 × 9 + 10 × 9) = 2 × 470 = 940',
    ],
    [
      'cilinder straal 5, hoogte 4',
      () => volumeQuestion('cilinder', [5, 4], 'straal'),
      'Een cilinder heeft een straal van 5 cm en een hoogte van 4 cm. Hoe groot is de inhoud? Neem π = 3,14.',
      '314',
      'cm³',
      '3,14 × 5 × 5 × 4 = 314',
    ],
    [
      'cilinder diameter 10, hoogte 4',
      () => volumeQuestion('cilinder', [10, 4], 'diameter'),
      'Een cilinder heeft een diameter van 10 cm en een hoogte van 4 cm. Hoe groot is de inhoud? Neem π = 3,14.',
      '314',
      'cm³',
      'straal = 10 : 2 = 5 → 3,14 × 5 × 5 × 4 = 314',
    ],
    [
      'cilinder straal 1, hoogte 7 (edge: 2 decimals)',
      () => volumeQuestion('cilinder', [1, 7], 'straal'),
      'Een cilinder heeft een straal van 1 cm en een hoogte van 7 cm. Hoe groot is de inhoud? Neem π = 3,14.',
      '21,98',
      'cm³',
      '3,14 × 1 × 1 × 7 = 21,98',
    ],
    [
      'cilinder straal 10, hoogte 10 (edge)',
      () => volumeQuestion('cilinder', [10, 10], 'straal'),
      'Een cilinder heeft een straal van 10 cm en een hoogte van 10 cm. Hoe groot is de inhoud? Neem π = 3,14.',
      '3140',
      'cm³',
      '3,14 × 10 × 10 × 10 = 3140',
    ],
    [
      'aquarium 60, 30, 40',
      () => litresQuestion('aquarium', [60, 30, 40]),
      'Een aquarium is 60 cm lang, 30 cm breed en 40 cm hoog. Hoeveel liter water past erin?',
      '72',
      'L',
      '60 cm = 6 dm, 30 cm = 3 dm, 40 cm = 4 dm → 6 × 3 × 4 = 72 dm³ = 72 L',
    ],
    [
      'aquarium 100, 50, 60 (edge: 10 dm)',
      () => litresQuestion('aquarium', [100, 50, 60]),
      'Een aquarium is 100 cm lang, 50 cm breed en 60 cm hoog. Hoeveel liter water past erin?',
      '300',
      'L',
      '100 cm = 10 dm, 50 cm = 5 dm, 60 cm = 6 dm → 10 × 5 × 6 = 300 dm³ = 300 L',
    ],
    [
      'koelbox 60, 40, 30',
      () => litresQuestion('koelbox', [60, 40, 30]),
      'Een koelbox is 60 cm lang, 40 cm breed en 30 cm hoog. Hoeveel liter past erin?',
      '72',
      'L',
      '60 cm = 6 dm, 40 cm = 4 dm, 30 cm = 3 dm → 6 × 4 × 3 = 72 dm³ = 72 L',
    ],
    [
      'opbergbox 40, 30, 20',
      () => litresQuestion('opbergbox', [40, 30, 20]),
      'Een opbergbox is 40 cm lang, 30 cm breed en 20 cm hoog. Hoeveel liter past erin?',
      '24',
      'L',
      '40 cm = 4 dm, 30 cm = 3 dm, 20 cm = 2 dm → 4 × 3 × 2 = 24 dm³ = 24 L',
    ],
  ])('%s', (_label, make, prompt, answer, suffix, explanation) => {
    const step = stepOf(make());
    expect(step.kind).toBe('number');
    expect(step.prompt).toBe(prompt);
    expect(step.suffix).toBe(suffix);
    expect(step.prefix).toBeUndefined();
    expect(step.check(answer).correct).toBe(true);
    expect(step.check('').expected).toBe(answer);
    expect(step.check(answer).explanation).toBe(explanation);
    expect(step.check('1').explanation).toBe(explanation);
  });

  it('has a key of the form, the solid or container and the numbers', () => {
    expect(volumeQuestion('kubus', [4]).key).toBe('solids:volume:kubus:4');
    expect(surfaceQuestion('balk', [8, 5, 3]).key).toBe('solids:surface:balk:8:5:3');
    expect(volumeQuestion('cilinder', [5, 4], 'straal').key).toBe(
      'solids:volume:cilinder:straal:5:4',
    );
    expect(volumeQuestion('cilinder', [10, 4], 'diameter').key).toBe(
      'solids:volume:cilinder:diameter:10:4',
    );
    expect(litresQuestion('aquarium', [60, 30, 40]).key).toBe('solids:litres:aquarium:60:30:40');
    expect(volumeQuestion('kubus', [4]).topic).toBe('solids');
  });

  it('shows a cylinder by its radius unless the diameter is given', () => {
    expect(volumeQuestion('cilinder', [5, 4]).key).toBe(
      volumeQuestion('cilinder', [5, 4], 'straal').key,
    );
  });

  it('rejects container lengths that are not whole dm', () => {
    expect(() => litresQuestion('aquarium', [65, 30, 40])).toThrow(RangeError);
  });
});

describe('tips', () => {
  it.each<[string, string, () => Question, string | undefined]>([
    ['kubus 4, oppervlakte', '64', () => surfaceQuestion('kubus', [4]), TIP_VOLUME],
    ['kubus 4, inhoud', '96', () => volumeQuestion('kubus', [4]), TIP_SURFACE],
    ['kubus 4, inhoud: a wrong answer', '63', () => volumeQuestion('kubus', [4]), undefined],
    ['balk 8, 5, 3, inhoud', '158', () => volumeQuestion('balk', [8, 5, 3]), TIP_SURFACE],
    ['balk 8, 5, 3, oppervlakte', '120', () => surfaceQuestion('balk', [8, 5, 3]), TIP_VOLUME],
    [
      'balk 8, 5, 3, inhoud: a wrong answer',
      '157',
      () => volumeQuestion('balk', [8, 5, 3]),
      undefined,
    ],
    [
      'cilinder diameter 10, hoogte 4',
      '1256',
      () => volumeQuestion('cilinder', [10, 4], 'diameter'),
      TIP_RADIUS,
    ],
    [
      'cilinder straal 5, hoogte 4: no diameter mistake',
      '1256',
      () => volumeQuestion('cilinder', [5, 4], 'straal'),
      undefined,
    ],
    [
      'cilinder straal 5, hoogte 4',
      '3140',
      () => volumeQuestion('cilinder', [5, 4], 'straal'),
      TIP_FACTOR_TEN,
    ],
    [
      'aquarium 60, 30, 40',
      '72000',
      () => litresQuestion('aquarium', [60, 30, 40]),
      TIP_FACTOR_THOUSAND,
    ],
    [
      'aquarium 60, 30, 40: no topic tips',
      '36',
      () => litresQuestion('aquarium', [60, 30, 40]),
      undefined,
    ],
  ])('%s, typing %s', (_label, input, make, tip) => {
    expect(stepOf(make()).check(input).tip).toBe(tip);
  });

  it.each<[string, string, () => Question]>([
    ['kubus 6, inhoud', '216', () => volumeQuestion('kubus', [6])],
    ['kubus 6, oppervlakte', '216', () => surfaceQuestion('kubus', [6])],
    ['balk 20, 5, 4, inhoud', '400', () => volumeQuestion('balk', [20, 5, 4])],
    ['balk 20, 5, 4, oppervlakte', '400', () => surfaceQuestion('balk', [20, 5, 4])],
  ])('%s, typing %s: volume and surface area are equal, so correct without a tip', (_label, input, make) => {
    const result = stepOf(make()).check(input);
    expect(result.correct).toBe(true);
    expect(result.tip).toBeUndefined();
  });

  it('quotes the diameter in the tip for a cylinder with another diameter', () => {
    const result = stepOf(volumeQuestion('cilinder', [4, 3], 'diameter')).check('150,72');
    expect(result.tip).toBe('De straal is de helft van de diameter: 4 : 2 = 2.');
  });
});

describe('generateSolids', () => {
  const COUNT = 3000;
  const rng = createRng(2311);
  const questions = Array.from({ length: COUNT }, () => generateSolids(rng));

  type Form = 'volume' | 'surface' | 'litres';
  type Given = 'straal' | 'diameter';
  const FORM_OF = { inhoud: 'volume', oppervlakte: 'surface' } as const;
  const CONTAINERS: readonly Container[] = ['aquarium', 'koelbox', 'opbergbox'];
  const PROMPTS = {
    kubus: /^Een kubus heeft ribben van (\d+) cm\. Hoe groot is de (inhoud|oppervlakte)\?$/u,
    balk:
      /^Een balk is (\d+) cm lang, (\d+) cm breed en (\d+) cm hoog\. Hoe groot is de (inhoud|oppervlakte)\?$/u,
    cilinder:
      /^Een cilinder heeft een (straal|diameter) van (\d+) cm en een hoogte van (\d+) cm\. Hoe groot is de inhoud\? Neem π = 3,14\.$/u,
    litres:
      /^Een (aquarium|koelbox|opbergbox) is (\d+) cm lang, (\d+) cm breed en (\d+) cm hoog\. Hoeveel liter( water)? past erin\?$/u,
  };

  interface Parsed {
    form: Form;
    /** The solid, or the container of the litres form. */
    figure: Solid | Container;
    lengths: number[];
    given?: Given;
    water: boolean;
    question: Question;
  }

  /** Reads the figure back from the prompt and checks the key against it. */
  function parsed(
    question: Question,
    form: Form,
    figure: Solid | Container,
    lengths: number[],
    given?: Given,
    water = false,
  ): Parsed {
    const key = ['solids', form, figure, ...(given === undefined ? [] : [given]), ...lengths];
    expect(question.key, stepOf(question).prompt).toBe(key.join(':'));
    return { form, figure, lengths, given, water, question };
  }

  function parse(question: Question): Parsed {
    const { prompt } = stepOf(question);
    const cube = PROMPTS.kubus.exec(prompt);
    if (cube !== null) {
      const form = FORM_OF[cube.at(-1) as keyof typeof FORM_OF];
      return parsed(question, form, 'kubus', cube.slice(1, -1).map(Number));
    }
    const box = PROMPTS.balk.exec(prompt);
    if (box !== null) {
      const form = FORM_OF[box.at(-1) as keyof typeof FORM_OF];
      return parsed(question, form, 'balk', box.slice(1, -1).map(Number));
    }
    const cylinder = PROMPTS.cilinder.exec(prompt);
    if (cylinder !== null) {
      const given = cylinder[1] as Given;
      return parsed(question, 'volume', 'cilinder', cylinder.slice(2).map(Number), given);
    }
    const litres = PROMPTS.litres.exec(prompt);
    if (litres !== null) {
      const container = litres[1] as Container;
      const lengths = litres.slice(2, 5).map(Number);
      return parsed(question, 'litres', container, lengths, undefined, litres[5] !== undefined);
    }
    throw new Error(`Unexpected prompt: ${prompt}`);
  }

  /** The answer worked out independently of the generator, from the numbers of the prompt. */
  function expected({ form, figure, lengths, given }: Parsed): Rational {
    const [a = 0, b = a, c = a] = lengths;
    switch (figure) {
      case 'kubus':
      case 'balk':
        return fromInteger(form === 'volume' ? a * b * c : 2 * (a * b + a * c + b * c));
      case 'cilinder': {
        const radius = given === 'diameter' ? a / 2 : a;
        return multiply(PI, fromInteger(radius * radius * b));
      }
      case 'aquarium':
      case 'koelbox':
      case 'opbergbox':
        return fromInteger((a / 10) * (b / 10) * (c / 10));
    }
  }

  function inRange(value: number, min: number, max: number, label: string): void {
    expect(Number.isInteger(value), label).toBe(true);
    expect(value, label).toBeGreaterThanOrEqual(min);
    expect(value, label).toBeLessThanOrEqual(max);
  }

  const all: Parsed[] = [];
  beforeAll(() => {
    all.push(...questions.map(parse));
  });

  const share = (matches: (one: Parsed) => boolean, of: readonly Parsed[]) =>
    of.filter(matches).length / of.length;

  it('creates single-step number questions that accept their own answer', () => {
    for (const question of questions) {
      expect(question.topic).toBe('solids');
      expect(question.steps, question.key).toHaveLength(1);
      expect(stepOf(question).kind).toBe('number');
      const result = stepOf(question).check(typed(answerOf(question)));
      expect(result.correct, question.key).toBe(true);
      expect(result.explanation, question.key).toBeTruthy();
    }
  });

  it('uses volume 50%, surface area 25% and litres 25%', () => {
    expect(Math.abs(share(({ form }) => form === 'volume', all) - 0.5)).toBeLessThan(0.05);
    expect(Math.abs(share(({ form }) => form === 'surface', all) - 0.25)).toBeLessThan(0.05);
    expect(Math.abs(share(({ form }) => form === 'litres', all) - 0.25)).toBeLessThan(0.05);
  });

  it('draws the volume solids 1/3 each and the surface solids 1/2 each, never a cylinder', () => {
    const volume = all.filter(({ form }) => form === 'volume');
    for (const solid of ['kubus', 'balk', 'cilinder']) {
      const used = share(({ figure }) => figure === solid, volume);
      expect(Math.abs(used - 1 / 3), solid).toBeLessThan(0.05);
    }
    const surface = all.filter(({ form }) => form === 'surface');
    for (const solid of ['kubus', 'balk']) {
      const used = share(({ figure }) => figure === solid, surface);
      expect(Math.abs(used - 1 / 2), solid).toBeLessThan(0.05);
    }
    expect(surface.some(({ figure }) => figure === 'cilinder')).toBe(false);
  });

  it('gives each solid its numbers in the ranges of spec §5.28', () => {
    for (const { figure, lengths, question } of all) {
      const label = question.key;
      const [a = 0, b = 0, c = 0] = lengths;
      switch (figure) {
        case 'kubus':
          inRange(a, 2, 10, label);
          break;
        case 'balk':
          inRange(a, 3, 20, label);
          inRange(b, 2, 10, label);
          inRange(c, 2, 10, label);
          expect(new Set([a, b, c]).size, label).toBe(3);
          expect(a * b * c, label).toBeLessThanOrEqual(2000);
          break;
        case 'cilinder':
          inRange(b, 1, 10, label);
      }
    }
  });

  it('shows a cylinder by its radius or its diameter about equally often, with every radius', () => {
    const cylinders = all.filter(({ figure }) => figure === 'cilinder');
    const byDiameter = share(({ given }) => given === 'diameter', cylinders);
    expect(Math.abs(byDiameter - 0.5)).toBeLessThan(0.1);
    const radii = cylinders.map(({ lengths, given }) =>
      given === 'diameter' ? lengths[0]! / 2 : lengths[0]!,
    );
    expect(new Set(radii)).toEqual(new Set([1, 2, 5, 10]));
  });

  it('draws the containers 1/3 each with lengths in tens within their ranges', () => {
    const litres = all.filter(({ form }) => form === 'litres');
    for (const container of CONTAINERS) {
      const used = share(({ figure }) => figure === container, litres);
      expect(Math.abs(used - 1 / 3), container).toBeLessThan(0.05);
    }
    for (const { figure, lengths, water, question } of litres) {
      const label = question.key;
      expect(water, label).toBe(figure === 'aquarium');
      CONTAINER_RANGES[figure as Container].forEach(([min, max], index) => {
        expect(lengths[index]! % 10, label).toBe(0);
        inRange(lengths[index]!, min, max, label);
      });
    }
  });

  it('answers each question with the formula of its solid, with the unit of its form', () => {
    const SUFFIX: Record<Form, string> = { volume: 'cm³', surface: 'cm²', litres: 'L' };
    for (const one of all) {
      expect(answerOf(one.question), one.question.key).toEqual(expected(one));
      expect(stepOf(one.question).suffix, one.question.key).toBe(SUFFIX[one.form]);
    }
  });

  it('gives whole litres and at most 2 decimals everywhere', () => {
    for (const { form, question } of all) {
      const answer = answerOf(question);
      expect(multiply(answer, fromInteger(100)).den, question.key).toBe(1n);
      if (form === 'litres') expect(answer.den, question.key).toBe(1n);
    }
  });

  it('gives the same prompt and answer to questions with the same key', () => {
    const seen = new Map<string, string>();
    for (const question of questions) {
      const shown = `${stepOf(question).prompt} ${stepOf(question).check('').expected}`;
      expect(seen.get(question.key) ?? shown, question.key).toBe(shown);
      seen.set(question.key, shown);
    }
    expect(seen.size).toBeGreaterThan(300);
  });

  it('is deterministic for a fixed seed', () => {
    const keys = (seed: number) => {
      const random = createRng(seed);
      return Array.from({ length: 50 }, () => generateSolids(random).key);
    };
    expect(keys(7)).toEqual(keys(7));
    expect(keys(7)).not.toEqual(keys(8));
  });
});
