import { beforeAll, describe, expect, it } from 'vitest';
import { createRng } from '../random';
import { add, fromInteger, multiply, rational, type Rational } from '../rational';
import type { Question } from '../types';
import {
  diameterAsRadiusTip,
  figureQuestion,
  generatePerimeterArea,
  missingSideQuestion,
  mixedRectangleQuestion,
  PI,
  type Measure,
  type MissingSide,
  type PlaneFigure,
  type PlaneShape,
  type RectangleContext,
} from './perimeterArea';
import { answerOf, decimal, stepOf, typed } from './testHelpers';

function shape(figure: PlaneFigure, ...lengths: number[]): PlaneShape {
  return { figure, lengths };
}

function circle(circleGiven: 'straal' | 'diameter', length: number): PlaneShape {
  return { figure: 'cirkel', lengths: [length], circleGiven };
}

function askFigure(plane: PlaneShape, measure: Measure, input: string) {
  return stepOf(figureQuestion(plane, measure)).check(input);
}

function askMixed(
  context: RectangleContext,
  lengthM: string,
  widthCm: number,
  measure: Measure,
  input: string,
) {
  return stepOf(mixedRectangleQuestion(context, decimal(lengthM), widthCm, measure)).check(input);
}

function askMissing(variant: MissingSide, given: number[], input: string) {
  return stepOf(missingSideQuestion(variant, given)).check(input);
}

const TIP_PERIMETER = 'Dat is de omtrek; gevraagd is de oppervlakte.';
const TIP_AREA = 'Dat is de oppervlakte; gevraagd is de omtrek.';
const TIP_HALF = 'Een driehoek is de helft van een rechthoek: deel nog door 2.';
const TIP_HEIGHT = 'Reken met de hoogte, niet met de schuine zijde: 8 × 4.';
const TIP_RADIUS = 'De straal is de helft van de diameter: 10 : 2 = 5.';
const TIP_DIAMETER = 'De omtrek is π × diameter, en de diameter is 2 × 5 = 10.';
const TIP_FACTOR_TEN = 'Je antwoord is 10 keer te groot. Let op de komma en het aantal nullen.';
const TIP_FACTOR_HUNDRED = 'Je antwoord is 100 keer te groot. Let op de komma en het aantal nullen.';

describe('PI', () => {
  it('is 3,14', () => {
    expect(PI).toEqual(decimal('3,14'));
  });
});

describe('figureQuestion', () => {
  it.each<[string, PlaneShape, Measure, string, string, string, string]>([
    [
      'vierkant 7',
      shape('vierkant', 7),
      'oppervlakte',
      'Een vierkant heeft zijden van 7 cm. Hoe groot is de oppervlakte?',
      '49',
      'cm²',
      '7 × 7 = 49',
    ],
    [
      'vierkant 7',
      shape('vierkant', 7),
      'omtrek',
      'Een vierkant heeft zijden van 7 cm. Hoe groot is de omtrek?',
      '28',
      'cm',
      '4 × 7 = 28',
    ],
    [
      'rechthoek 12 × 5',
      shape('rechthoek', 12, 5),
      'omtrek',
      'Een rechthoek is 12 cm lang en 5 cm breed. Hoe groot is de omtrek?',
      '34',
      'cm',
      '2 × (12 + 5) = 34',
    ],
    [
      'rechthoek 12 × 5',
      shape('rechthoek', 12, 5),
      'oppervlakte',
      'Een rechthoek is 12 cm lang en 5 cm breed. Hoe groot is de oppervlakte?',
      '60',
      'cm²',
      '12 × 5 = 60',
    ],
    [
      'driehoek 8, 5',
      shape('driehoek', 8, 5),
      'oppervlakte',
      'Een driehoek heeft een basis van 8 cm en een hoogte van 5 cm. Hoe groot is de oppervlakte?',
      '20',
      'cm²',
      '8 × 5 : 2 = 20',
    ],
    [
      'rechthoekigeDriehoek 6, 9',
      shape('rechthoekigeDriehoek', 6, 9),
      'oppervlakte',
      'Een rechthoekige driehoek heeft rechthoekszijden van 6 cm en 9 cm. Hoe groot is de oppervlakte?',
      '27',
      'cm²',
      '6 × 9 : 2 = 27',
    ],
    [
      'parallellogram 8, 5, 4',
      shape('parallellogram', 8, 5, 4),
      'oppervlakte',
      'Een parallellogram heeft een basis van 8 cm, schuine zijden van 5 cm en een hoogte van 4 cm. Hoe groot is de oppervlakte?',
      '32',
      'cm²',
      '8 × 4 = 32',
    ],
    [
      'parallellogram 8, 5, 4',
      shape('parallellogram', 8, 5, 4),
      'omtrek',
      'Een parallellogram heeft een basis van 8 cm, schuine zijden van 5 cm en een hoogte van 4 cm. Hoe groot is de omtrek?',
      '26',
      'cm',
      '2 × (8 + 5) = 26',
    ],
    [
      'trapezium 6, 10, 4',
      shape('trapezium', 6, 10, 4),
      'oppervlakte',
      'Een trapezium heeft evenwijdige zijden van 6 cm en 10 cm en een hoogte van 4 cm. Hoe groot is de oppervlakte?',
      '32',
      'cm²',
      '(6 + 10) : 2 × 4 = 32',
    ],
    [
      'cirkel straal 5',
      circle('straal', 5),
      'oppervlakte',
      'Een cirkel heeft een straal van 5 cm. Hoe groot is de oppervlakte? Neem π = 3,14.',
      '78,5',
      'cm²',
      '3,14 × 5 × 5 = 78,5',
    ],
    [
      'cirkel diameter 10',
      circle('diameter', 10),
      'oppervlakte',
      'Een cirkel heeft een diameter van 10 cm. Hoe groot is de oppervlakte? Neem π = 3,14.',
      '78,5',
      'cm²',
      'straal = 10 : 2 = 5 → 3,14 × 5 × 5 = 78,5',
    ],
    [
      'cirkel diameter 10',
      circle('diameter', 10),
      'omtrek',
      'Een cirkel heeft een diameter van 10 cm. Hoe groot is de omtrek? Neem π = 3,14.',
      '31,4',
      'cm',
      '3,14 × 10 = 31,4',
    ],
    [
      'cirkel straal 5',
      circle('straal', 5),
      'omtrek',
      'Een cirkel heeft een straal van 5 cm. Hoe groot is de omtrek? Neem π = 3,14.',
      '31,4',
      'cm',
      'diameter = 2 × 5 = 10 → 3,14 × 10 = 31,4',
    ],
    [
      'cirkel straal 1 (edge)',
      circle('straal', 1),
      'oppervlakte',
      'Een cirkel heeft een straal van 1 cm. Hoe groot is de oppervlakte? Neem π = 3,14.',
      '3,14',
      'cm²',
      '3,14 × 1 × 1 = 3,14',
    ],
    [
      'cirkel straal 4 (edge)',
      circle('straal', 4),
      'oppervlakte',
      'Een cirkel heeft een straal van 4 cm. Hoe groot is de oppervlakte? Neem π = 3,14.',
      '50,24',
      'cm²',
      '3,14 × 4 × 4 = 50,24',
    ],
    [
      'cirkel diameter 20 (edge)',
      circle('diameter', 20),
      'oppervlakte',
      'Een cirkel heeft een diameter van 20 cm. Hoe groot is de oppervlakte? Neem π = 3,14.',
      '314',
      'cm²',
      'straal = 20 : 2 = 10 → 3,14 × 10 × 10 = 314',
    ],
  ])('%s, %s', (_label, plane, measure, prompt, answer, suffix, explanation) => {
    const step = stepOf(figureQuestion(plane, measure));
    expect(step.kind).toBe('number');
    expect(step.prompt).toBe(prompt);
    expect(step.suffix).toBe(suffix);
    expect(step.prefix).toBeUndefined();
    expect(step.check(answer).correct).toBe(true);
    expect(step.check('').expected).toBe(answer);
    expect(step.check(answer).explanation).toBe(explanation);
    expect(step.check('1').explanation).toBe(explanation);
  });

  it('has a key of the form, the figure and the numbers', () => {
    const keyOf = (plane: PlaneShape, measure: Measure) => figureQuestion(plane, measure).key;
    expect(keyOf(shape('vierkant', 7), 'oppervlakte')).toBe('perimeterArea:area:vierkant:7');
    expect(keyOf(shape('rechthoek', 12, 5), 'omtrek')).toBe('perimeterArea:perimeter:rechthoek:12:5');
    expect(keyOf(shape('parallellogram', 8, 5, 4), 'oppervlakte')).toBe(
      'perimeterArea:area:parallellogram:8:5:4',
    );
    expect(keyOf(circle('straal', 5), 'omtrek')).toBe('perimeterArea:perimeter:cirkel:straal:5');
    expect(keyOf(circle('diameter', 10), 'omtrek')).toBe(
      'perimeterArea:perimeter:cirkel:diameter:10',
    );
    expect(figureQuestion(shape('vierkant', 7), 'omtrek').topic).toBe('perimeterArea');
  });

  it('has no perimeter for a triangle or a trapezium', () => {
    for (const plane of [
      shape('driehoek', 8, 5),
      shape('rechthoekigeDriehoek', 6, 9),
      shape('trapezium', 6, 10, 4),
    ]) {
      expect(() => figureQuestion(plane, 'omtrek')).toThrow(RangeError);
    }
  });

  it.each<[string, PlaneShape, Measure, string, string | undefined]>([
    ['rechthoek 12 × 5, oppervlakte', shape('rechthoek', 12, 5), 'oppervlakte', '34', TIP_PERIMETER],
    ['rechthoek 12 × 5, omtrek', shape('rechthoek', 12, 5), 'omtrek', '60', TIP_AREA],
    ['vierkant 4, oppervlakte: equal to the perimeter', shape('vierkant', 4), 'oppervlakte', '16', undefined],
    ['vierkant 4, omtrek: equal to the area', shape('vierkant', 4), 'omtrek', '16', undefined],
    ['vierkant 7, oppervlakte', shape('vierkant', 7), 'oppervlakte', '28', TIP_PERIMETER],
    ['driehoek 8, 5', shape('driehoek', 8, 5), 'oppervlakte', '40', TIP_HALF],
    ['rechthoekigeDriehoek 6, 9', shape('rechthoekigeDriehoek', 6, 9), 'oppervlakte', '54', TIP_HALF],
    ['driehoek 8, 5, a wrong answer', shape('driehoek', 8, 5), 'oppervlakte', '39', undefined],
    ['parallellogram 8, 5, 4, oppervlakte', shape('parallellogram', 8, 5, 4), 'oppervlakte', '40', TIP_HEIGHT],
    ['parallellogram 8, 5, 4, oppervlakte', shape('parallellogram', 8, 5, 4), 'oppervlakte', '26', TIP_PERIMETER],
    ['parallellogram 8, 5, 4, omtrek', shape('parallellogram', 8, 5, 4), 'omtrek', '32', TIP_AREA],
    ['trapezium 6, 10, 4', shape('trapezium', 6, 10, 4), 'oppervlakte', '64', undefined],
    ['cirkel diameter 10, oppervlakte', circle('diameter', 10), 'oppervlakte', '314', TIP_RADIUS],
    ['cirkel diameter 10, oppervlakte', circle('diameter', 10), 'oppervlakte', '31,4', TIP_PERIMETER],
    ['cirkel diameter 10, omtrek', circle('diameter', 10), 'omtrek', '78,5', TIP_AREA],
    ['cirkel diameter 10, omtrek: no radius mistake', circle('diameter', 10), 'omtrek', '15,7', undefined],
    ['cirkel straal 5, omtrek', circle('straal', 5), 'omtrek', '15,7', TIP_DIAMETER],
    ['cirkel straal 5, omtrek', circle('straal', 5), 'omtrek', '78,5', TIP_AREA],
    ['cirkel straal 5, oppervlakte', circle('straal', 5), 'oppervlakte', '785', TIP_FACTOR_TEN],
    ['cirkel straal 5, oppervlakte: no diameter mistake', circle('straal', 5), 'oppervlakte', '314', undefined],
    ['cirkel straal 5, oppervlakte', circle('straal', 5), 'oppervlakte', '78,5', undefined],
  ])('%s, typing %s', (_label, plane, measure, input, tip) => {
    expect(askFigure(plane, measure, input).tip).toBe(tip);
  });

  it('quotes the diameter in the tip for a circle with another diameter', () => {
    expect(askFigure(circle('diameter', 4), 'oppervlakte', '50,24').tip).toBe(
      'De straal is de helft van de diameter: 4 : 2 = 2.',
    );
    expect(askFigure(circle('straal', 2), 'omtrek', '6,28').tip).toBe(
      'De omtrek is π × diameter, en de diameter is 2 × 2 = 4.',
    );
  });
});

describe('diameterAsRadiusTip', () => {
  it.each<[number, string]>([
    [10, 'De straal is de helft van de diameter: 10 : 2 = 5.'],
    [4, 'De straal is de helft van de diameter: 4 : 2 = 2.'],
    [7, 'De straal is de helft van de diameter: 7 : 2 = 3,5.'],
  ])('words the tip for diameter %i', (diameter, tip) => {
    expect(diameterAsRadiusTip(diameter)).toBe(tip);
  });
});

describe('mixedRectangleQuestion', () => {
  it.each<[RectangleContext, string, number, Measure, string, string, string, string]>([
    [
      'tafelblad',
      '1,6',
      80,
      'oppervlakte',
      'Een tafelblad is 1,6 m lang en 80 cm breed. Hoe groot is de oppervlakte in m²?',
      '1,28',
      'm²',
      '80 cm = 0,8 m → 1,6 × 0,8 = 1,28',
    ],
    [
      'tafelblad',
      '1,6',
      80,
      'omtrek',
      'Een tafelblad is 1,6 m lang en 80 cm breed. Hoe groot is de omtrek in m?',
      '4,8',
      'm',
      '80 cm = 0,8 m → 2 × (1,6 + 0,8) = 4,8',
    ],
    [
      'vloerkleed',
      '2,5',
      90,
      'oppervlakte',
      'Een vloerkleed is 2,5 m lang en 90 cm breed. Hoe groot is de oppervlakte in m²?',
      '2,25',
      'm²',
      '90 cm = 0,9 m → 2,5 × 0,9 = 2,25',
    ],
    [
      'raam',
      '1',
      30,
      'oppervlakte',
      'Een raam is 1 m lang en 30 cm breed. Hoe groot is de oppervlakte in m²?',
      '0,3',
      'm²',
      '30 cm = 0,3 m → 1 × 0,3 = 0,3',
    ],
    [
      'raam',
      '3',
      30,
      'omtrek',
      'Een raam is 3 m lang en 30 cm breed. Hoe groot is de omtrek in m?',
      '6,6',
      'm',
      '30 cm = 0,3 m → 2 × (3 + 0,3) = 6,6',
    ],
  ])('%s %s m × %i cm, %s', (context, lengthM, widthCm, measure, prompt, answer, suffix, explanation) => {
    const question = mixedRectangleQuestion(context, decimal(lengthM), widthCm, measure);
    const step = stepOf(question);
    expect(question.topic).toBe('perimeterArea');
    expect(step.kind).toBe('number');
    expect(step.prompt).toBe(prompt);
    expect(step.suffix).toBe(suffix);
    expect(step.prefix).toBeUndefined();
    expect(step.check(answer).correct).toBe(true);
    expect(step.check('').expected).toBe(answer);
    expect(step.check(answer).explanation).toBe(explanation);
    expect(step.check('1').explanation).toBe(explanation);
  });

  it('has a key of the form, the context and the numbers', () => {
    const key = (measure: Measure) =>
      mixedRectangleQuestion('tafelblad', decimal('1,6'), 80, measure).key;
    expect(key('oppervlakte')).toBe('perimeterArea:area:tafelblad:1,6:80');
    expect(key('omtrek')).toBe('perimeterArea:perimeter:tafelblad:1,6:80');
  });

  it.each<[Measure, string, string | undefined]>([
    ['oppervlakte', '4,8', TIP_PERIMETER],
    ['oppervlakte', '128', TIP_FACTOR_HUNDRED], // the width not converted: 1,6 × 80
    ['oppervlakte', '1,28', undefined],
    ['omtrek', '1,28', TIP_AREA],
    ['omtrek', '5', undefined],
  ])('tafelblad 1,6 m × 80 cm, %s: typing %s', (measure, input, tip) => {
    expect(askMixed('tafelblad', '1,6', 80, measure, input).tip).toBe(tip);
  });
});

describe('missingSideQuestion', () => {
  it.each<[MissingSide, number[], string, string, string]>([
    [
      'rectangleFromArea',
      [48, 6],
      'Een rechthoek heeft een oppervlakte van 48 cm² en is 6 cm breed. Hoe lang is de rechthoek?',
      '8',
      '48 : 6 = 8',
    ],
    [
      'rectangleFromPerimeter',
      [34, 5],
      'Een rechthoek heeft een omtrek van 34 cm en is 5 cm breed. Hoe lang is de rechthoek?',
      '12',
      '34 : 2 − 5 = 12',
    ],
    [
      'squareFromPerimeter',
      [36],
      'Een vierkant heeft een omtrek van 36 cm. Hoe lang is een zijde?',
      '9',
      '36 : 4 = 9',
    ],
    [
      'squareFromArea',
      [144],
      'Een vierkant heeft een oppervlakte van 144 cm². Hoe lang is een zijde?',
      '12',
      '√144 = 12',
    ],
  ])('%s %j', (variant, given, prompt, answer, explanation) => {
    const question = missingSideQuestion(variant, given);
    const step = stepOf(question);
    expect(question.topic).toBe('perimeterArea');
    expect(question.key).toBe(`perimeterArea:missing:${variant}:${given.join(':')}`);
    expect(step.kind).toBe('number');
    expect(step.prompt).toBe(prompt);
    expect(step.suffix).toBe('cm');
    expect(step.prefix).toBeUndefined();
    expect(step.check(answer).correct).toBe(true);
    expect(step.check('').expected).toBe(answer);
    expect(step.check(answer).explanation).toBe(explanation);
    expect(step.check('1').explanation).toBe(explanation);
  });

  it('rejects numbers whose answer is not a whole number', () => {
    expect(() => missingSideQuestion('rectangleFromArea', [50, 6])).toThrow(RangeError);
    expect(() => missingSideQuestion('rectangleFromPerimeter', [35, 5])).toThrow(RangeError);
    expect(() => missingSideQuestion('squareFromPerimeter', [37])).toThrow(RangeError);
    expect(() => missingSideQuestion('squareFromArea', [150])).toThrow(RangeError);
  });

  it('has no topic tips, only the factor-of-ten fallback', () => {
    expect(askMissing('rectangleFromArea', [48, 6], '6').tip).toBeUndefined();
    expect(askMissing('rectangleFromArea', [48, 6], '288').tip).toBeUndefined();
    expect(askMissing('rectangleFromPerimeter', [34, 5], '17').tip).toBeUndefined();
    expect(askMissing('squareFromPerimeter', [36], '144').tip).toBeUndefined();
    expect(askMissing('squareFromArea', [144], '72').tip).toBeUndefined();
    expect(askMissing('squareFromArea', [144], '120').tip).toBe(TIP_FACTOR_TEN);
    expect(askMissing('rectangleFromArea', [48, 6], '80').tip).toBe(TIP_FACTOR_TEN);
  });
});

describe('generatePerimeterArea', () => {
  const COUNT = 3000;
  const rng = createRng(2310);
  const questions = Array.from({ length: COUNT }, () => generatePerimeterArea(rng));

  const FIGURE_PROMPTS: Record<PlaneFigure, RegExp> = {
    vierkant: /^Een vierkant heeft zijden van (\d+) cm\. Hoe groot is de (oppervlakte|omtrek)\?$/u,
    rechthoek:
      /^Een rechthoek is (\d+) cm lang en (\d+) cm breed\. Hoe groot is de (oppervlakte|omtrek)\?$/u,
    driehoek:
      /^Een driehoek heeft een basis van (\d+) cm en een hoogte van (\d+) cm\. Hoe groot is de (oppervlakte)\?$/u,
    rechthoekigeDriehoek:
      /^Een rechthoekige driehoek heeft rechthoekszijden van (\d+) cm en (\d+) cm\. Hoe groot is de (oppervlakte)\?$/u,
    parallellogram:
      /^Een parallellogram heeft een basis van (\d+) cm, schuine zijden van (\d+) cm en een hoogte van (\d+) cm\. Hoe groot is de (oppervlakte|omtrek)\?$/u,
    trapezium:
      /^Een trapezium heeft evenwijdige zijden van (\d+) cm en (\d+) cm en een hoogte van (\d+) cm\. Hoe groot is de (oppervlakte)\?$/u,
    cirkel:
      /^Een cirkel heeft een (straal|diameter) van (\d+) cm\. Hoe groot is de (oppervlakte|omtrek)\? Neem π = 3,14\.$/u,
  };
  const MIXED_PROMPT =
    /^Een (tafelblad|vloerkleed|raam) is (\S+) m lang en (\d+) cm breed\. Hoe groot is de (oppervlakte|omtrek) in (m²|m)\?$/u;
  const MISSING_PROMPTS: Record<MissingSide, RegExp> = {
    rectangleFromArea:
      /^Een rechthoek heeft een oppervlakte van (\d+) cm² en is (\d+) cm breed\. Hoe lang is de rechthoek\?$/u,
    rectangleFromPerimeter:
      /^Een rechthoek heeft een omtrek van (\d+) cm en is (\d+) cm breed\. Hoe lang is de rechthoek\?$/u,
    squareFromPerimeter: /^Een vierkant heeft een omtrek van (\d+) cm\. Hoe lang is een zijde\?$/u,
    squareFromArea: /^Een vierkant heeft een oppervlakte van (\d+) cm²\. Hoe lang is een zijde\?$/u,
  };
  const AREA_FIGURES: readonly PlaneFigure[] = [
    'vierkant',
    'rechthoek',
    'driehoek',
    'rechthoekigeDriehoek',
    'parallellogram',
    'trapezium',
    'cirkel',
  ];
  const PERIMETER_FIGURES: readonly PlaneFigure[] = [
    'vierkant',
    'rechthoek',
    'parallellogram',
    'cirkel',
  ];
  // Each of the six area figures is 1/6; the triangle splits 50/50 into its two variants.
  const AREA_SHARES: Record<PlaneFigure, number> = {
    vierkant: 1 / 6,
    rechthoek: 1 / 6,
    driehoek: 1 / 12,
    rechthoekigeDriehoek: 1 / 12,
    parallellogram: 1 / 6,
    trapezium: 1 / 6,
    cirkel: 1 / 6,
  };
  const MIXED_CONTEXTS: readonly RectangleContext[] = ['tafelblad', 'vloerkleed', 'raam'];

  interface ParsedFigure {
    shape: PlaneShape;
    measure: Measure;
    question: Question;
  }
  interface ParsedMixed {
    context: RectangleContext;
    lengthM: Rational;
    widthCm: number;
    measure: Measure;
    question: Question;
  }
  interface ParsedMissing {
    variant: MissingSide;
    given: number[];
    question: Question;
  }

  const FORM_OF_MEASURE: Record<Measure, string> = { oppervlakte: 'area', omtrek: 'perimeter' };
  const PI_DECIMAL = decimal('3,14');

  /** Reads the figure back from the prompt and checks the key against it. */
  function parseFigure(question: Question): ParsedFigure | null {
    const { prompt } = stepOf(question);
    for (const figure of AREA_FIGURES) {
      const match = FIGURE_PROMPTS[figure].exec(prompt);
      if (match === null) continue;
      const measure = match.at(-1) as Measure;
      const circleGiven = figure === 'cirkel' ? (match[1] as 'straal' | 'diameter') : undefined;
      const lengths = match.slice(circleGiven === undefined ? 1 : 2, -1).map(Number);
      const key = [
        'perimeterArea',
        FORM_OF_MEASURE[measure],
        figure,
        ...(circleGiven === undefined ? [] : [circleGiven]),
        ...lengths,
      ].join(':');
      expect(question.key, prompt).toBe(key);
      return { shape: { figure, lengths, circleGiven }, measure, question };
    }
    return null;
  }

  function parseMixed(question: Question): ParsedMixed | null {
    const { prompt } = stepOf(question);
    const match = MIXED_PROMPT.exec(prompt);
    if (match === null) return null;
    const [, context, length, width, measure, unit] = match;
    expect(unit, prompt).toBe(measure === 'oppervlakte' ? 'm²' : 'm');
    expect(question.key, prompt).toBe(
      `perimeterArea:${FORM_OF_MEASURE[measure as Measure]}:${context}:${length}:${width}`,
    );
    return {
      context: context as RectangleContext,
      lengthM: decimal(length!),
      widthCm: Number(width),
      measure: measure as Measure,
      question,
    };
  }

  function parseMissing(question: Question): ParsedMissing | null {
    const { prompt } = stepOf(question);
    for (const variant of Object.keys(MISSING_PROMPTS) as MissingSide[]) {
      const match = MISSING_PROMPTS[variant].exec(prompt);
      if (match === null) continue;
      const given = match.slice(1).map(Number);
      expect(question.key, prompt).toBe(`perimeterArea:missing:${variant}:${given.join(':')}`);
      return { variant, given, question };
    }
    return null;
  }

  /** The answer worked out independently of the generator, from the numbers of the prompt. */
  function expected({ figure, lengths, circleGiven }: PlaneShape, measure: Measure): Rational {
    const [a = 0, b = 0, c = 0] = lengths;
    const area = measure === 'oppervlakte';
    switch (figure) {
      case 'vierkant':
        return fromInteger(area ? a * a : 4 * a);
      case 'rechthoek':
        return fromInteger(area ? a * b : 2 * (a + b));
      case 'driehoek':
      case 'rechthoekigeDriehoek':
        return rational(BigInt(a * b), 2n);
      case 'parallellogram':
        return fromInteger(area ? a * c : 2 * (a + b));
      case 'trapezium':
        return rational(BigInt((a + b) * c), 2n);
      case 'cirkel': {
        const diameter = circleGiven === 'diameter' ? a : 2 * a;
        return area
          ? multiply(PI_DECIMAL, rational(BigInt(diameter * diameter), 4n))
          : multiply(PI_DECIMAL, fromInteger(diameter));
      }
    }
  }

  function inRange(value: number, min: number, max: number, label: string): void {
    expect(Number.isInteger(value), label).toBe(true);
    expect(value, label).toBeGreaterThanOrEqual(min);
    expect(value, label).toBeLessThanOrEqual(max);
  }

  const figures: ParsedFigure[] = [];
  const mixed: ParsedMixed[] = [];
  const missing: ParsedMissing[] = [];
  beforeAll(() => {
    for (const question of questions) {
      const found = parseFigure(question) ?? parseMixed(question) ?? parseMissing(question);
      if (found === null) throw new Error(`Unexpected prompt: ${stepOf(question).prompt}`);
      if ('shape' in found) figures.push(found);
      else if ('context' in found) mixed.push(found);
      else missing.push(found);
    }
  });

  it('creates single-step number questions that accept their own answer', () => {
    for (const question of questions) {
      expect(question.topic).toBe('perimeterArea');
      expect(question.steps, question.key).toHaveLength(1);
      expect(stepOf(question).kind).toBe('number');
      const result = stepOf(question).check(typed(answerOf(question)));
      expect(result.correct, question.key).toBe(true);
      expect(result.explanation, question.key).toBeTruthy();
    }
  });

  it('uses the three forms about equally often', () => {
    for (const form of ['area', 'perimeter', 'missing']) {
      const used = questions.filter((question) => question.key.split(':')[1] === form).length;
      expect(Math.abs(used / COUNT - 1 / 3), form).toBeLessThan(0.05);
    }
  });

  it('makes about 25% of the area and perimeter questions a mixed rectangle', () => {
    const share = mixed.length / (mixed.length + figures.length);
    expect(Math.abs(share - 0.25)).toBeLessThan(0.05);
    for (const context of MIXED_CONTEXTS) {
      const used = mixed.filter((one) => one.context === context).length;
      expect(Math.abs(used / mixed.length - 1 / 3), context).toBeLessThan(0.1);
    }
    for (const measure of ['oppervlakte', 'omtrek']) {
      expect(mixed.some((one) => one.measure === measure), measure).toBe(true);
    }
  });

  it('draws the area figures with the shares of spec §5.27', () => {
    const area = figures.filter(({ measure }) => measure === 'oppervlakte');
    for (const figure of AREA_FIGURES) {
      const used = area.filter(({ shape: { figure: drawn } }) => drawn === figure).length;
      expect(Math.abs(used / area.length - AREA_SHARES[figure]), figure).toBeLessThan(0.05);
    }
  });

  it('draws the perimeter figures equally often, and no triangle or trapezium', () => {
    const perimeter = figures.filter(({ measure }) => measure === 'omtrek');
    for (const figure of AREA_FIGURES) {
      const used = perimeter.filter(({ shape: { figure: drawn } }) => drawn === figure).length;
      if (PERIMETER_FIGURES.includes(figure)) {
        expect(Math.abs(used / perimeter.length - 1 / 4), figure).toBeLessThan(0.05);
      } else {
        expect(used, figure).toBe(0);
      }
    }
  });

  it('gives each figure its numbers in the ranges of spec §5.27', () => {
    for (const { shape: { figure, lengths, circleGiven }, question } of figures) {
      const label = question.key;
      const [a = 0, b = 0, c = 0] = lengths;
      switch (figure) {
        case 'vierkant':
          inRange(a, 2, 25, label);
          break;
        case 'rechthoek':
          inRange(a, 3, 40, label);
          inRange(b, 2, 12, label);
          expect(b, label).toBeLessThan(a);
          break;
        case 'driehoek':
        case 'rechthoekigeDriehoek':
          inRange(a, 2, 20, label);
          inRange(b, 2, 20, label);
          expect((a * b) % 2, label).toBe(0);
          break;
        case 'parallellogram':
          inRange(a, 3, 20, label);
          inRange(c, 2, 12, label);
          inRange(b, c + 1, 20, label);
          break;
        case 'trapezium':
          inRange(a, 2, 20, label);
          inRange(b, 2, 20, label);
          inRange(c, 2, 12, label);
          expect(a, label).not.toBe(b);
          expect((a + b) % 2, label).toBe(0);
          break;
        case 'cirkel': {
          const radius = circleGiven === 'diameter' ? a / 2 : a;
          expect([1, 2, 3, 4, 5, 10], label).toContain(radius);
        }
      }
    }
  });

  it('shows a circle by its radius or its diameter about equally often, with every radius', () => {
    const circles = figures.filter(({ shape }) => shape.figure === 'cirkel');
    const byDiameter = circles.filter(({ shape }) => shape.circleGiven === 'diameter').length;
    expect(Math.abs(byDiameter / circles.length - 0.5)).toBeLessThan(0.1);
    const radii = circles.map(({ shape: { lengths, circleGiven } }) =>
      circleGiven === 'diameter' ? lengths[0]! / 2 : lengths[0]!,
    );
    expect(new Set(radii)).toEqual(new Set([1, 2, 3, 4, 5, 10]));
  });

  it('answers each figure question with the formula of the figure', () => {
    for (const { shape: plane, measure, question } of figures) {
      expect(answerOf(question), question.key).toEqual(expected(plane, measure));
      const suffix = measure === 'oppervlakte' ? 'cm²' : 'cm';
      expect(stepOf(question).suffix, question.key).toBe(suffix);
    }
  });

  it('gives a mixed rectangle a length in [1; 3] m and a width of 30 to 90 cm in tens', () => {
    for (const { lengthM, widthCm, measure, question } of mixed) {
      const label = question.key;
      const tenths = multiply(lengthM, fromInteger(10));
      expect(tenths.den, label).toBe(1n);
      expect(tenths.num, label).toBeGreaterThanOrEqual(10n);
      expect(tenths.num, label).toBeLessThanOrEqual(30n);
      expect(widthCm % 10, label).toBe(0);
      inRange(widthCm, 30, 90, label);
      const width = rational(BigInt(widthCm), 100n);
      const area = multiply(lengthM, width);
      const perimeter = multiply(fromInteger(2), add(lengthM, width));
      expect(answerOf(question), label).toEqual(measure === 'oppervlakte' ? area : perimeter);
      expect(stepOf(question).suffix, label).toBe(measure === 'oppervlakte' ? 'm²' : 'm');
    }
  });

  it('uses the four missing-side variants about equally often', () => {
    for (const variant of Object.keys(MISSING_PROMPTS)) {
      const used = missing.filter((one) => one.variant === variant).length;
      expect(Math.abs(used / missing.length - 1 / 4), variant).toBeLessThan(0.05);
    }
  });

  it('keeps the missing side in the ranges of the figures', () => {
    for (const { variant, given, question } of missing) {
      const label = question.key;
      const answer = Number(typed(answerOf(question)));
      const [first = 0, second = 0] = given;
      expect(stepOf(question).suffix, label).toBe('cm');
      switch (variant) {
        case 'rectangleFromArea':
          expect(first, label).toBe(answer * second);
          inRange(answer, 3, 40, label);
          inRange(second, 2, 12, label);
          expect(second, label).toBeLessThan(answer);
          break;
        case 'rectangleFromPerimeter':
          expect(answer, label).toBe(first / 2 - second);
          inRange(answer, 3, 40, label);
          inRange(second, 2, 12, label);
          expect(second, label).toBeLessThan(answer);
          break;
        case 'squareFromPerimeter':
          expect(first, label).toBe(4 * answer);
          inRange(answer, 2, 25, label);
          break;
        case 'squareFromArea':
          expect(first, label).toBe(answer * answer);
          inRange(answer, 2, 25, label);
      }
    }
  });

  it('shows the π hint in circle prompts only', () => {
    for (const question of questions) {
      const { prompt } = stepOf(question);
      expect(prompt.includes('Neem π = 3,14.'), prompt).toBe(prompt.startsWith('Een cirkel'));
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
      return Array.from({ length: 50 }, () => generatePerimeterArea(random).key);
    };
    expect(keys(7)).toEqual(keys(7));
    expect(keys(7)).not.toEqual(keys(8));
  });

  it('never has more than 2 decimals in an answer', () => {
    for (const question of questions) {
      const hundredths = multiply(answerOf(question), fromInteger(100));
      expect(hundredths.den, question.key).toBe(1n);
    }
  });
});
