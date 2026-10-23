import { capitalize } from '../format';
import { pick, type Rng } from '../random';
import { booleanStep } from '../steps';
import type { Question } from '../types';

const SHAPES = ['vierkant', 'rechthoek', 'ruit', 'parallellogram', 'trapezium', 'vlieger'] as const;

export type Quadrilateral = (typeof SHAPES)[number];

export interface ShapeProperty {
  /** The verb of the question and the fact: 'zijn', 'is', 'staan', 'delen'. */
  verb: string;
  rest: string;
}

/** The 8 properties of spec §5.32, in table order; the first one a shape has defines it. */
export const PROPERTIES: readonly ShapeProperty[] = [
  { verb: 'zijn', rest: 'de vier zijden even lang' },
  { verb: 'zijn', rest: 'de vier hoeken recht' },
  { verb: 'zijn', rest: 'de overstaande zijden evenwijdig' },
  { verb: 'zijn', rest: 'minstens twee zijden evenwijdig' },
  { verb: 'is', rest: 'een diagonaal een symmetrieas' },
  { verb: 'zijn', rest: 'de diagonalen even lang' },
  { verb: 'staan', rest: 'de diagonalen loodrecht op elkaar' },
  { verb: 'delen', rest: 'de diagonalen elkaar middendoor' },
];

/** Which properties each quadrilateral always has, as indexes into PROPERTIES (spec §5.32). */
export const ALWAYS: Readonly<Record<Quadrilateral, readonly number[]>> = {
  vierkant: [0, 1, 2, 3, 4, 5, 6, 7],
  rechthoek: [1, 2, 3, 5, 7],
  ruit: [0, 2, 3, 4, 6, 7],
  parallellogram: [2, 3, 7],
  trapezium: [3],
  vlieger: [4, 6],
};

/** X is a Y when X always has every property of Y. */
export function isA(x: Quadrilateral, y: Quadrilateral): boolean {
  return ALWAYS[y].every((index) => ALWAYS[x].includes(index));
}

const ARTICLES: Record<Quadrilateral, 'elk' | 'elke'> = {
  vierkant: 'elk',
  rechthoek: 'elke',
  ruit: 'elke',
  parallellogram: 'elk',
  trapezium: 'elk',
  vlieger: 'elke',
};

export interface Statement {
  prompt: string;
  answer: boolean;
  explanation: string;
}

/** 'zijn de vier zijden even lang' */
function clause(index: number): string {
  const { verb, rest } = PROPERTIES[index]!;
  return `${verb} ${rest}`;
}

/**
 * `Is elk vierkant een ruit?` for every ordered pair of different shapes (30, 11 Ja). The
 * explanation names the defining property of Y (Ja) or the first property of Y that X lacks (Nee).
 */
export function hierarchyStatements(): Statement[] {
  return SHAPES.flatMap((x) =>
    SHAPES.filter((y) => y !== x).map((y) => {
      const prompt = `Is ${ARTICLES[x]} ${x} een ${y}?`;
      const lacking = ALWAYS[y].find((index) => !ALWAYS[x].includes(index));
      if (lacking === undefined) {
        const explanation = `Bij een ${y} ${clause(ALWAYS[y][0]!)}; bij ${ARTICLES[x]} ${x} ook.`;
        return { prompt, answer: true, explanation };
      }
      const explanation = `Bij een ${y} ${clause(lacking)}, bij een ${x} niet altijd.`;
      return { prompt, answer: false, explanation };
    }),
  );
}

/** `Zijn bij elke ruit de vier zijden even lang?` for every shape and property (48, 25 Ja). */
export function propertyStatements(): Statement[] {
  return SHAPES.flatMap((shape) =>
    PROPERTIES.map(({ verb, rest }, index) => {
      const who = `${ARTICLES[shape]} ${shape}`;
      const answer = ALWAYS[shape].includes(index);
      return {
        prompt: `${capitalize(verb)} bij ${who} ${rest}?`,
        answer,
        explanation: `${answer ? 'Bij' : 'Niet bij'} ${who} ${verb} ${rest}.`,
      };
    }),
  );
}

/** Spec §5.32: 10 statements, 5 of them Ja. */
export const TRIANGLE_STATEMENTS: readonly Statement[] = [
  {
    prompt: 'Bestaat er een driehoek met twee rechte hoeken?',
    answer: false,
    explanation: 'De hoeken zijn samen 180°: na 90° + 90° blijft 0° over.',
  },
  {
    prompt: 'Bestaat er een driehoek met twee stompe hoeken?',
    answer: false,
    explanation: 'Twee stompe hoeken zijn samen al meer dan 180°.',
  },
  {
    prompt: 'Bestaat er een rechthoekige driehoek die gelijkbenig is?',
    answer: true,
    explanation: 'Bijvoorbeeld hoeken van 90°, 45° en 45°.',
  },
  {
    prompt: 'Bestaat er een stomphoekige driehoek die gelijkbenig is?',
    answer: true,
    explanation: 'Bijvoorbeeld hoeken van 120°, 30° en 30°.',
  },
  {
    prompt: 'Bestaat er een rechthoekige driehoek die gelijkzijdig is?',
    answer: false,
    explanation: 'Een gelijkzijdige driehoek heeft drie hoeken van 60°.',
  },
  {
    prompt: 'Is elke gelijkzijdige driehoek gelijkbenig?',
    answer: true,
    explanation: 'Hij heeft zelfs drie gelijke zijden.',
  },
  {
    prompt: 'Is elke gelijkbenige driehoek gelijkzijdig?',
    answer: false,
    explanation: 'Bijvoorbeeld zijden van 5 cm, 5 cm en 3 cm.',
  },
  {
    prompt: 'Is elke gelijkzijdige driehoek scherphoekig?',
    answer: true,
    explanation: 'Alle hoeken zijn 60°.',
  },
  {
    prompt: 'Bestaat er een driehoek met zijden van 2 cm, 3 cm en 6 cm?',
    answer: false,
    explanation: '2 + 3 is kleiner dan 6: de korte zijden halen elkaar niet.',
  },
  {
    prompt: 'Bestaat er een driehoek met zijden van 3 cm, 4 cm en 6 cm?',
    answer: true,
    explanation: '3 + 4 is groter dan 6.',
  },
];

const HIERARCHY_STATEMENTS = hierarchyStatements();
const PROPERTY_STATEMENTS = propertyStatements();

/**
 * The answer first (Ja and Nee half of the time each), then the kind (hierarchy 40%, properties
 * 40%, triangles 20%) and a statement of that kind with that answer.
 */
export function generateShapeProperties(rng: Rng): Question {
  const answer = rng() < 0.5;
  const kind = rng();
  let statements = TRIANGLE_STATEMENTS;
  if (kind < 0.4) statements = HIERARCHY_STATEMENTS;
  else if (kind < 0.8) statements = PROPERTY_STATEMENTS;
  const candidates = statements.filter((statement) => statement.answer === answer);
  const { prompt, explanation } = pick(rng, candidates);
  return {
    key: `shapeProperties:${prompt}`,
    topic: 'shapeProperties',
    steps: [booleanStep({ prompt, answer, explanation })],
  };
}
