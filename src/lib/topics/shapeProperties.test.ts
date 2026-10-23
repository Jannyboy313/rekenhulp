import { describe, expect, it } from 'vitest';
import { createRng } from '../random';
import { NO, YES } from '../steps';
import type { Question } from '../types';
import {
  ALWAYS,
  generateShapeProperties,
  hierarchyStatements,
  isA,
  PROPERTIES,
  propertyStatements,
  TRIANGLE_STATEMENTS,
  type Quadrilateral,
  type Statement,
} from './shapeProperties';
import { stepOf } from './testHelpers';

const SHAPES = Object.keys(ALWAYS) as Quadrilateral[];

/** The article of each shape, written out independently of the module. */
const ARTICLE: Record<Quadrilateral, string> = {
  vierkant: 'elk',
  rechthoek: 'elke',
  ruit: 'elke',
  parallellogram: 'elk',
  trapezium: 'elk',
  vlieger: 'elke',
};

/** The 11 ordered pairs (X, Y) where every X is a Y (spec §5.32). */
const HIERARCHY_YES: readonly (readonly [Quadrilateral, Quadrilateral])[] = [
  ['vierkant', 'rechthoek'],
  ['vierkant', 'ruit'],
  ['vierkant', 'parallellogram'],
  ['vierkant', 'trapezium'],
  ['vierkant', 'vlieger'],
  ['rechthoek', 'parallellogram'],
  ['rechthoek', 'trapezium'],
  ['ruit', 'parallellogram'],
  ['ruit', 'trapezium'],
  ['ruit', 'vlieger'],
  ['parallellogram', 'trapezium'],
];

/** The triangle table of spec §5.32. */
const TRIANGLES: readonly (readonly [string, boolean, string])[] = [
  [
    'Bestaat er een driehoek met twee rechte hoeken?',
    false,
    'De hoeken zijn samen 180°: na 90° + 90° blijft 0° over.',
  ],
  [
    'Bestaat er een driehoek met twee stompe hoeken?',
    false,
    'Twee stompe hoeken zijn samen al meer dan 180°.',
  ],
  [
    'Bestaat er een rechthoekige driehoek die gelijkbenig is?',
    true,
    'Bijvoorbeeld hoeken van 90°, 45° en 45°.',
  ],
  [
    'Bestaat er een stomphoekige driehoek die gelijkbenig is?',
    true,
    'Bijvoorbeeld hoeken van 120°, 30° en 30°.',
  ],
  [
    'Bestaat er een rechthoekige driehoek die gelijkzijdig is?',
    false,
    'Een gelijkzijdige driehoek heeft drie hoeken van 60°.',
  ],
  ['Is elke gelijkzijdige driehoek gelijkbenig?', true, 'Hij heeft zelfs drie gelijke zijden.'],
  [
    'Is elke gelijkbenige driehoek gelijkzijdig?',
    false,
    'Bijvoorbeeld zijden van 5 cm, 5 cm en 3 cm.',
  ],
  ['Is elke gelijkzijdige driehoek scherphoekig?', true, 'Alle hoeken zijn 60°.'],
  [
    'Bestaat er een driehoek met zijden van 2 cm, 3 cm en 6 cm?',
    false,
    '2 + 3 is kleiner dan 6: de korte zijden halen elkaar niet.',
  ],
  ['Bestaat er een driehoek met zijden van 3 cm, 4 cm en 6 cm?', true, '3 + 4 is groter dan 6.'],
];

function statementOf(statements: readonly Statement[], prompt: string): Statement {
  const found = statements.find((candidate) => candidate.prompt === prompt);
  if (found === undefined) throw new Error(`Unknown statement: ${prompt}`);
  return found;
}

describe('PROPERTIES and ALWAYS', () => {
  it('lists the 8 properties of spec §5.32 in table order, as a verb and a rest', () => {
    expect(PROPERTIES.map(({ verb, rest }) => [verb, rest])).toEqual([
      ['zijn', 'de vier zijden even lang'],
      ['zijn', 'de vier hoeken recht'],
      ['zijn', 'de overstaande zijden evenwijdig'],
      ['zijn', 'minstens twee zijden evenwijdig'],
      ['is', 'een diagonaal een symmetrieas'],
      ['zijn', 'de diagonalen even lang'],
      ['staan', 'de diagonalen loodrecht op elkaar'],
      ['delen', 'de diagonalen elkaar middendoor'],
    ]);
  });

  it('lists the 6 quadrilaterals in table order', () => {
    expect(SHAPES).toEqual([
      'vierkant',
      'rechthoek',
      'ruit',
      'parallellogram',
      'trapezium',
      'vlieger',
    ]);
  });

  it.each<[number, Quadrilateral[]]>([
    [0, ['vierkant', 'ruit']],
    [1, ['vierkant', 'rechthoek']],
    [2, ['vierkant', 'rechthoek', 'ruit', 'parallellogram']],
    [3, ['vierkant', 'rechthoek', 'ruit', 'parallellogram', 'trapezium']],
    [4, ['vierkant', 'ruit', 'vlieger']],
    [5, ['vierkant', 'rechthoek']],
    [6, ['vierkant', 'ruit', 'vlieger']],
    [7, ['vierkant', 'rechthoek', 'ruit', 'parallellogram']],
  ])('has property %i in the shapes of its table row', (index, shapes) => {
    expect(SHAPES.filter((shape) => ALWAYS[shape].includes(index))).toEqual(shapes);
  });
});

describe('isA', () => {
  it.each<[Quadrilateral, Quadrilateral, boolean]>([
    ['vierkant', 'ruit', true],
    ['ruit', 'vlieger', true],
    ['parallellogram', 'trapezium', true],
    ['vierkant', 'vlieger', true],
    ['ruit', 'vierkant', false],
    ['rechthoek', 'vlieger', false],
    ['trapezium', 'parallellogram', false],
    ['vlieger', 'trapezium', false],
  ])('isA(%s, %s) is %s', (x, y, expected) => {
    expect(isA(x, y)).toBe(expected);
  });

  it('holds for exactly 11 ordered pairs of different shapes', () => {
    const pairs = SHAPES.flatMap((x) =>
      SHAPES.filter((y) => y !== x && isA(x, y)).map((y) => [x, y]),
    );
    expect(pairs).toEqual(HIERARCHY_YES);
  });

  it('holds for a shape and itself', () => {
    for (const shape of SHAPES) expect(isA(shape, shape), shape).toBe(true);
  });
});

describe('hierarchyStatements', () => {
  const statements = hierarchyStatements();

  it('has 30 statements, 11 of them Ja', () => {
    expect(statements).toHaveLength(30);
    expect(statements.filter(({ answer }) => answer)).toHaveLength(11);
  });

  it('asks every ordered pair of different shapes, with the article of the first', () => {
    const prompts = SHAPES.flatMap((x) =>
      SHAPES.filter((y) => y !== x).map((y) => `Is ${ARTICLE[x]} ${x} een ${y}?`),
    );
    expect(new Set(statements.map(({ prompt }) => prompt))).toEqual(new Set(prompts));
  });

  it('answers Ja exactly for the 11 pairs where every X is a Y', () => {
    const yes = HIERARCHY_YES.map(([x, y]) => `Is ${ARTICLE[x]} ${x} een ${y}?`);
    const answered = statements.filter(({ answer }) => answer).map(({ prompt }) => prompt);
    expect(new Set(answered)).toEqual(new Set(yes));
  });

  it.each<[string, boolean, string]>([
    [
      'Is elk vierkant een ruit?',
      true,
      'Bij een ruit zijn de vier zijden even lang; bij elk vierkant ook.',
    ],
    [
      'Is elke ruit een vierkant?',
      false,
      'Bij een vierkant zijn de vier hoeken recht, bij een ruit niet altijd.',
    ],
    [
      'Is elke rechthoek een trapezium?',
      true,
      'Bij een trapezium zijn minstens twee zijden evenwijdig; bij elke rechthoek ook.',
    ],
    [
      'Is elk parallellogram een vlieger?',
      false,
      'Bij een vlieger is een diagonaal een symmetrieas, bij een parallellogram niet altijd.',
    ],
    [
      'Is elke vlieger een trapezium?',
      false,
      'Bij een trapezium zijn minstens twee zijden evenwijdig, bij een vlieger niet altijd.',
    ],
  ])('%s', (prompt, answer, explanation) => {
    expect(statementOf(statements, prompt)).toEqual({ prompt, answer, explanation });
  });
});

describe('propertyStatements', () => {
  const statements = propertyStatements();

  it('has 48 statements, 25 of them Ja', () => {
    expect(statements).toHaveLength(48);
    expect(statements.filter(({ answer }) => answer)).toHaveLength(25);
  });

  it.each<[string, boolean, string]>([
    [
      'Zijn bij elke ruit de vier zijden even lang?',
      true,
      'Bij elke ruit zijn de vier zijden even lang.',
    ],
    [
      'Staan bij elk parallellogram de diagonalen loodrecht op elkaar?',
      false,
      'Niet bij elk parallellogram staan de diagonalen loodrecht op elkaar.',
    ],
    [
      'Is bij elke vlieger een diagonaal een symmetrieas?',
      true,
      'Bij elke vlieger is een diagonaal een symmetrieas.',
    ],
    [
      'Delen bij elke ruit de diagonalen elkaar middendoor?',
      true,
      'Bij elke ruit delen de diagonalen elkaar middendoor.',
    ],
    [
      'Zijn bij elke rechthoek de vier zijden even lang?',
      false,
      'Niet bij elke rechthoek zijn de vier zijden even lang.',
    ],
    [
      'Is bij elk trapezium een diagonaal een symmetrieas?',
      false,
      'Niet bij elk trapezium is een diagonaal een symmetrieas.',
    ],
  ])('%s', (prompt, answer, explanation) => {
    expect(statementOf(statements, prompt)).toEqual({ prompt, answer, explanation });
  });
});

describe('TRIANGLE_STATEMENTS', () => {
  it('lists the 10 statements of the spec table, 5 of them Ja', () => {
    const rows = TRIANGLE_STATEMENTS.map(({ prompt, answer, explanation }) => [
      prompt,
      answer,
      explanation,
    ]);
    expect(rows).toEqual(TRIANGLES);
    expect(TRIANGLE_STATEMENTS.filter(({ answer }) => answer)).toHaveLength(5);
  });
});

describe('all statements', () => {
  it('have different prompts across the three lists', () => {
    const statements = [...hierarchyStatements(), ...propertyStatements(), ...TRIANGLE_STATEMENTS];
    const prompts = statements.map(({ prompt }) => prompt);
    expect(prompts).toHaveLength(88);
    expect(new Set(prompts).size).toBe(88);
  });
});

describe('generateShapeProperties', () => {
  const COUNT = 6000;
  const rng = createRng(3206);
  const questions = Array.from({ length: COUNT }, () => generateShapeProperties(rng));

  type Kind = 'hierarchy' | 'properties' | 'triangles';

  const STATEMENTS: Record<Kind, readonly Statement[]> = {
    hierarchy: hierarchyStatements(),
    properties: propertyStatements(),
    triangles: TRIANGLE_STATEMENTS,
  };
  const KINDS = Object.keys(STATEMENTS) as Kind[];

  interface Parsed {
    kind: Kind;
    statement: Statement;
    question: Question;
  }

  function parse(question: Question): Parsed {
    const { prompt } = stepOf(question);
    for (const kind of KINDS) {
      const statement = STATEMENTS[kind].find((candidate) => candidate.prompt === prompt);
      if (statement !== undefined) return { kind, statement, question };
    }
    throw new Error(`Unexpected prompt: ${prompt}`);
  }

  const all = questions.map(parse);
  const ofKind = (kind: Kind) => all.filter((one) => one.kind === kind);
  const share = (part: readonly Parsed[], whole: readonly Parsed[]) => part.length / whole.length;
  const near = (actual: number, expected: number) =>
    expect(Math.abs(actual - expected)).toBeLessThan(0.05);
  const yes = (parsed: readonly Parsed[]) => parsed.filter(({ statement }) => statement.answer);

  it('creates single-step Ja/Nee questions that accept their own answer and give no tip', () => {
    for (const { question } of all) {
      const step = stepOf(question);
      expect(question.topic).toBe('shapeProperties');
      expect(question.steps, question.key).toHaveLength(1);
      expect(step.kind, question.key).toBe('boolean');
      const { expected } = step.check('');
      const result = step.check(expected);
      expect(result.correct, question.key).toBe(true);
      expect(result.explanation, question.key).toBeTruthy();
      const wrong = step.check(expected === YES ? NO : YES);
      expect(wrong.correct, question.key).toBe(false);
      expect(wrong.tip, question.key).toBeUndefined();
    }
  });

  it('answers and explains what its statement says', () => {
    for (const { statement, question } of all) {
      const result = stepOf(question).check('');
      expect(result.expected, question.key).toBe(statement.answer ? YES : NO);
      expect(result.explanation, question.key).toBe(statement.explanation);
    }
  });

  it('has a key of the prompt, 88 different in all', () => {
    for (const { statement, question } of all) {
      expect(question.key).toBe(`shapeProperties:${statement.prompt}`);
    }
    expect(new Set(questions.map(({ key }) => key)).size).toBe(88);
  });

  it('picks the hierarchy, the properties and the triangles 40%, 40% and 20%', () => {
    near(share(ofKind('hierarchy'), all), 0.4);
    near(share(ofKind('properties'), all), 0.4);
    near(share(ofKind('triangles'), all), 0.2);
  });

  it('answers Ja and Nee 50% each, overall and in every kind', () => {
    near(share(yes(all), all), 0.5);
    for (const kind of KINDS) near(share(yes(ofKind(kind)), ofKind(kind)), 0.5);
  });

  it('is deterministic for a fixed seed', () => {
    const keys = (seed: number) => {
      const random = createRng(seed);
      return Array.from({ length: 50 }, () => generateShapeProperties(random).key);
    };
    expect(keys(7)).toEqual(keys(7));
    expect(keys(7)).not.toEqual(keys(8));
  });
});
