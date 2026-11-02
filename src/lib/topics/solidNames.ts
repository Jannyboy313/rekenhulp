import { fromInteger } from '../rational';
import { pick, randomInt, shuffle, type Rng } from '../random';
import { choiceStep, numberStep } from '../steps';
import type { Question } from '../types';
import { POLYGON_NAMES } from './angles';

export const SOLID_NAMES: readonly string[] = [
  'balk',
  'kubus',
  'prisma',
  'kegel',
  'bol',
  'cilinder',
  'piramide',
];

/** Inclusive definitions (spec §5.32): a kubus is a balk and a balk is a prisma. */
const BOX_FAMILY: readonly string[] = ['kubus', 'balk', 'prisma'];

interface NameItem {
  /** Completes `Welk ruimtefiguur heeft …?` */
  has: string;
  answer: string;
  explanation: string;
}

export const NAME_ITEMS: readonly NameItem[] = [
  {
    has: 'een cirkel als grondvlak en een punt als top',
    answer: 'kegel',
    explanation: 'Een kegel heeft een cirkel als grondvlak en loopt uit in een punt.',
  },
  {
    has: 'twee gelijke cirkels als grondvlak en bovenvlak',
    answer: 'cilinder',
    explanation: 'Een cilinder heeft twee gelijke cirkels als grondvlak en bovenvlak.',
  },
  {
    has: 'een veelhoek als grondvlak en driehoeken als zijvlakken die in één punt samenkomen',
    answer: 'piramide',
    explanation:
      'Een piramide heeft een veelhoek als grondvlak en driehoeken die in één punt samenkomen.',
  },
  {
    has: 'twee gelijke driehoeken als grondvlak en bovenvlak en rechthoeken als zijvlakken',
    answer: 'prisma',
    explanation:
      'Een prisma heeft twee gelijke grondvlakken en rechthoeken als zijvlakken; hier zijn het driehoeken.',
  },
  {
    has: 'zes vierkanten als zijvlakken',
    answer: 'kubus',
    explanation: 'Een kubus heeft zes vierkanten als zijvlakken.',
  },
  {
    has: 'zes rechthoeken als zijvlakken, niet allemaal vierkant',
    answer: 'balk',
    explanation: 'Een balk heeft zes rechthoeken als zijvlakken.',
  },
  {
    has: 'geen ribben en geen hoekpunten, en elk punt even ver van het middelpunt',
    answer: 'bol',
    explanation:
      'Een bol heeft geen ribben en geen hoekpunten; elk punt ligt even ver van het middelpunt.',
  },
];

/** The answer and three random others, in random order (spec §5.80). */
export function nameQuestion(index: number, rng: Rng): Question {
  const { has, answer, explanation } = NAME_ITEMS[index]!;
  const others = SOLID_NAMES.filter(
    (name) => name !== answer && !(BOX_FAMILY.includes(answer) && BOX_FAMILY.includes(name)),
  );
  return {
    key: `solidNames:name:${answer}`,
    topic: 'solidNames',
    steps: [
      choiceStep({
        prompt: `Welk ruimtefiguur heeft ${has}?`,
        options: shuffle(rng, [answer, ...shuffle(rng, others).slice(0, 3)]),
        answer,
        explanation,
      }),
    ],
  };
}

export const LINE_TERMS: readonly string[] = [
  'horizontaal',
  'verticaal',
  'diagonaal',
  'loodrecht',
  'evenwijdig',
];

/** `Loodrecht` also means "straight up" in everyday Dutch (spec §5.80). */
const UPRIGHT: readonly string[] = ['verticaal', 'loodrecht'];

interface LineItem {
  /** Completes `Welk woord hoort bij: …?` */
  meaning: string;
  answer: string;
  explanation: string;
}

export const LINE_ITEMS: readonly LineItem[] = [
  {
    meaning: 'een lijn die waterpas loopt, zoals de horizon',
    answer: 'horizontaal',
    explanation: 'Horizontaal betekent waterpas, zoals de horizon.',
  },
  {
    meaning: 'een lijn die recht omhoog loopt, zoals een vlaggenmast',
    answer: 'verticaal',
    explanation: 'Verticaal betekent recht omhoog, zoals een vlaggenmast.',
  },
  {
    meaning: 'een lijn tussen twee hoekpunten die niet naast elkaar liggen',
    answer: 'diagonaal',
    explanation: 'Een diagonaal verbindt twee hoekpunten die niet naast elkaar liggen.',
  },
  {
    meaning: 'twee lijnen die een rechte hoek met elkaar maken',
    answer: 'loodrecht',
    explanation: 'Loodrechte lijnen maken een rechte hoek (90°) met elkaar.',
  },
  {
    meaning: 'twee lijnen die elkaar nooit snijden, hoe ver je ze ook doortrekt',
    answer: 'evenwijdig',
    explanation: 'Evenwijdige lijnen snijden elkaar nooit.',
  },
];

/** The answer and three random other terms, in random order (spec §5.80). */
export function lineQuestion(index: number, rng: Rng): Question {
  const { meaning, answer, explanation } = LINE_ITEMS[index]!;
  const others = LINE_TERMS.filter(
    (term) => term !== answer && !(UPRIGHT.includes(answer) && UPRIGHT.includes(term)),
  );
  return {
    key: `solidNames:line:${answer}`,
    topic: 'solidNames',
    steps: [
      choiceStep({
        prompt: `Welk woord hoort bij: ${meaning}?`,
        options: shuffle(rng, [answer, ...shuffle(rng, others).slice(0, 3)]),
        answer,
        explanation,
      }),
    ],
  };
}

export type CountSolid ='kubus' | 'balk' | 'prisma' | 'piramide';
export type Property = 'vlakken' | 'ribben' | 'hoekpunten';

const PROPERTIES: readonly Property[] = ['vlakken', 'ribben', 'hoekpunten'];
const BASES: readonly number[] = [3, 4, 5, 6, 8];
const BASE_NAMES: Readonly<Record<number, string>> = {
  ...POLYGON_NAMES,
  3: 'driehoek',
  4: 'vierkant',
};
const BOX_COUNTS: Readonly<Record<Property, number>> = { vlakken: 6, ribben: 12, hoekpunten: 8 };

/** The count and how it is worked out, for a prisma or a piramide with an `n`-hoek as base. */
function baseCount(solid: 'prisma' | 'piramide', n: number, property: Property) {
  const base = `${BASE_NAMES[n]!} als grondvlak`;
  if (solid === 'prisma') {
    switch (property) {
      case 'vlakken':
        return { count: n + 2, how: `${base}: 2 grondvlakken en ${n} zijvlakken` };
      case 'ribben':
        return { count: 3 * n, how: `${base}: ${n} ribben onder, ${n} boven en ${n} opstaand` };
      case 'hoekpunten':
        return { count: 2 * n, how: `${base}: ${n} hoekpunten onder en ${n} boven` };
    }
  }
  switch (property) {
    case 'vlakken':
      return { count: n + 1, how: `${base}: 1 grondvlak en ${n} zijvlakken` };
    case 'ribben':
      return { count: 2 * n, how: `${base}: ${n} ribben in het grondvlak en ${n} naar de top` };
    case 'hoekpunten':
      return { count: n + 1, how: `${base}: ${n} hoekpunten in het grondvlak en 1 top` };
  }
}

/** `n` is the number of sides of the base of a prisma or a piramide; a kubus and a balk have none. */
export function countQuestion(
  solid: CountSolid,
  n: number | undefined,
  property: Property,
): Question {
  if (solid === 'prisma' || solid === 'piramide') {
    const { count, how } = baseCount(solid, n!, property);
    return {
      key: `solidNames:count:${solid}:${n}:${property}`,
      topic: 'solidNames',
      steps: [
        numberStep({
          prompt: `Hoeveel ${property} heeft een ${solid} met een ${BASE_NAMES[n!]!} als grondvlak?`,
          answer: fromInteger(count),
          suffix: property,
          explanation: `${how} → ${count}`,
        }),
      ],
    };
  }
  const count = BOX_COUNTS[property];
  return {
    key: `solidNames:count:${solid}:${property}`,
    topic: 'solidNames',
    steps: [
      numberStep({
        prompt: `Hoeveel ${property} heeft een ${solid}?`,
        answer: fromInteger(count),
        suffix: property,
        explanation: `Een ${solid} heeft ${count} ${property}.`,
      }),
    ],
  };
}

function drawCount(rng: Rng): Question {
  const property = pick(rng, PROPERTIES);
  switch (pick(rng, ['box', 'prisma', 'piramide'] as const)) {
    case 'box':
      return countQuestion(pick(rng, ['kubus', 'balk'] as const), undefined, property);
    case 'prisma':
      return countQuestion('prisma', pick(rng, BASES), property);
    case 'piramide':
      return countQuestion('piramide', pick(rng, BASES), property);
  }
}

/** Name, count or line, each equally likely (spec §5.80). */
export function generateSolidNames(rng: Rng): Question {
  switch (pick(rng, ['name', 'count', 'line'] as const)) {
    case 'name':
      return nameQuestion(randomInt(rng, 0, NAME_ITEMS.length - 1), rng);
    case 'count':
      return drawCount(rng);
    case 'line':
      return lineQuestion(randomInt(rng, 0, LINE_ITEMS.length - 1), rng);
  }
}
