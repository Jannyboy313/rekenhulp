import { capitalize } from '../format';
import { pick, type Rng } from '../random';
import { fromInteger } from '../rational';
import { booleanStep, numberStep } from '../steps';
import type { Question, Step } from '../types';
import { POLYGON_NAMES } from './angles';

export interface SymmetryFigure {
  /** The figure in the question key: 'ruit', 'regelmatigeVijfhoek'. */
  id: string;
  /** The prompt text; a qualifier excludes the special case (spec §5.31). */
  name: string;
  lines: number;
  linesExplanation: string;
  /** The smallest angle in degrees, null without rotational symmetry. */
  rotation: number | null;
  pointSymmetric: boolean;
}

/** `sides` lines, a rotation of 360 : sides, point symmetric when `sides` is even. */
function regularPolygon(sides: number): SymmetryFigure {
  const name = POLYGON_NAMES[sides]!;
  return {
    id: `regelmatige${capitalize(name)}`,
    name: `een regelmatige ${name}`,
    lines: sides,
    linesExplanation: `een regelmatige ${name} heeft ${sides} symmetrieassen`,
    rotation: 360 / sides,
    pointSymmetric: sides % 2 === 0,
  };
}

/** The 13 figures of spec §5.31: the 9 named ones and the regular 6-, 8-, 10- and 12-gon. */
export const FIGURES: readonly SymmetryFigure[] = [
  {
    id: 'vierkant',
    name: 'een vierkant',
    lines: 4,
    linesExplanation: 'de 2 diagonalen en de 2 lijnen door de middens van de overstaande zijden',
    rotation: 90,
    pointSymmetric: true,
  },
  {
    id: 'rechthoek',
    name: 'een rechthoek die geen vierkant is',
    lines: 2,
    linesExplanation:
      'de 2 lijnen door de middens van de overstaande zijden; de diagonalen zijn geen symmetrieas',
    rotation: 180,
    pointSymmetric: true,
  },
  {
    id: 'ruit',
    name: 'een ruit die geen vierkant is',
    lines: 2,
    linesExplanation: 'de 2 diagonalen',
    rotation: 180,
    pointSymmetric: true,
  },
  {
    id: 'parallellogram',
    name: 'een parallellogram dat geen rechthoek of ruit is',
    lines: 0,
    linesExplanation: 'geen',
    rotation: 180,
    pointSymmetric: true,
  },
  {
    id: 'vlieger',
    name: 'een vlieger die geen ruit is',
    lines: 1,
    linesExplanation: 'de diagonaal door de hoeken waar de gelijke zijden samenkomen',
    rotation: null,
    pointSymmetric: false,
  },
  {
    id: 'gelijkbenigTrapezium',
    name: 'een gelijkbenig trapezium dat geen rechthoek is',
    lines: 1,
    linesExplanation: 'de lijn door de middens van de evenwijdige zijden',
    rotation: null,
    pointSymmetric: false,
  },
  {
    id: 'gelijkzijdigeDriehoek',
    name: 'een gelijkzijdige driehoek',
    lines: 3,
    linesExplanation: 'van elke hoek naar het midden van de overstaande zijde',
    rotation: 120,
    pointSymmetric: false,
  },
  {
    id: 'gelijkbenigeDriehoek',
    name: 'een gelijkbenige driehoek die niet gelijkzijdig is',
    lines: 1,
    linesExplanation: 'van de tophoek naar het midden van de basis',
    rotation: null,
    pointSymmetric: false,
  },
  ...[5, 6, 8, 10, 12].map(regularPolygon),
];

function symmetryQuestion(form: string, figure: SymmetryFigure, step: Step): Question {
  return { key: `symmetry:${form}:${figure.id}`, topic: 'symmetry', steps: [step] };
}

/** `Hoeveel symmetrieassen heeft een ruit die geen vierkant is?` (0 is a valid answer). */
export function linesQuestion(figure: SymmetryFigure): Question {
  return symmetryQuestion(
    'lines',
    figure,
    numberStep({
      prompt: `Hoeveel symmetrieassen heeft ${figure.name}?`,
      answer: fromInteger(figure.lines),
      explanation: figure.linesExplanation,
    }),
  );
}

export function rotationQuestion(figure: SymmetryFigure): Question {
  const { rotation } = figure;
  if (rotation === null) throw new RangeError(`${figure.name} has no rotational symmetry`);
  const sum = `360 : ${360 / rotation} = ${rotation}`;
  return symmetryQuestion(
    'rotation',
    figure,
    numberStep({
      prompt: `Over hoeveel graden moet je ${figure.name} minstens draaien om hem weer precies op zichzelf te laten vallen?`,
      answer: fromInteger(rotation),
      suffix: '°',
      explanation: rotation === 180 ? `pas na een halve draai: ${sum}` : sum,
    }),
  );
}

export function pointQuestion(figure: SymmetryFigure): Question {
  const again = figure.pointSymmetric ? 'weer' : 'niet';
  return symmetryQuestion(
    'point',
    figure,
    booleanStep({
      prompt: `Is ${figure.name} puntsymmetrisch?`,
      answer: figure.pointSymmetric,
      explanation: `Na een halve draai (180°) valt de figuur ${again} op zichzelf.`,
    }),
  );
}

const FORMS = ['lines', 'rotation', 'point'] as const;
const ROTATING = FIGURES.filter(({ rotation }) => rotation !== null);
const POINT_SYMMETRIC = FIGURES.filter(({ pointSymmetric }) => pointSymmetric);
const NOT_POINT_SYMMETRIC = FIGURES.filter(({ pointSymmetric }) => !pointSymmetric);

/**
 * The three forms equally likely, each with a figure that fits it. Point symmetry draws its answer
 * first (Ja and Nee half of the time) and then a figure with that answer.
 */
export function generateSymmetry(rng: Rng): Question {
  switch (pick(rng, FORMS)) {
    case 'lines':
      return linesQuestion(pick(rng, FIGURES));
    case 'rotation':
      return rotationQuestion(pick(rng, ROTATING));
    case 'point':
      return pointQuestion(pick(rng, rng() < 0.5 ? POINT_SYMMETRIC : NOT_POINT_SYMMETRIC));
  }
}
