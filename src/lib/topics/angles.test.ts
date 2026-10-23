import { describe, expect, it } from 'vitest';
import { createRng, range } from '../random';
import { fromInteger } from '../rational';
import type { Question } from '../types';
import {
  angleSumQuestion,
  clockQuestion,
  generateAngles,
  isoscelesQuestion,
  POLYGON_NAMES,
  REGULAR_SIDES,
  regularAngleQuestion,
  SUM_SIDES,
  triangleQuestion,
} from './angles';
import { answerOf, stepOf, typed } from './testHelpers';

const TIP_SUM = 'Een zeshoek kun je verdelen in 6 − 2 = 4 driehoeken: 4 × 180°.';
const TIP_FACTOR_TEN = 'Je antwoord is 10 keer te groot. Let op de komma en het aantal nullen.';

/** The smaller angle between two hands, from the positions of both in degrees. */
function apart(hourHand: number, minuteHand: number): number {
  const difference = Math.abs(hourHand - minuteHand);
  return Math.min(difference, 360 - difference);
}

/** The smaller angle between the hands at `hours`:`minutes`; the hour hand moves along. */
function smallerAngle(hours: number, minutes: number): number {
  return apart((hours % 12) * 30 + minutes / 2, minutes * 6);
}

describe('polygons', () => {
  it('names the polygons of the angle sum and of the regular polygon', () => {
    expect(POLYGON_NAMES).toEqual({
      4: 'vierhoek',
      5: 'vijfhoek',
      6: 'zeshoek',
      8: 'achthoek',
      9: 'negenhoek',
      10: 'tienhoek',
      12: 'twaalfhoek',
    });
  });

  it('lists the sides of spec §5.30', () => {
    expect(SUM_SIDES).toEqual([4, 5, 6, 8, 10, 12]);
    expect(REGULAR_SIDES).toEqual([5, 6, 8, 9, 10, 12]);
    for (const sides of [...SUM_SIDES, ...REGULAR_SIDES]) expect(POLYGON_NAMES[sides]).toBeTruthy();
  });
});

describe('question text', () => {
  it.each<[string, () => Question, string, string, string]>([
    [
      'triangle 50, 70',
      () => triangleQuestion(50, 70),
      'Een driehoek heeft hoeken van 50° en 70°. Hoe groot is de derde hoek?',
      '60',
      '180 − 50 − 70 = 60',
    ],
    [
      'triangle 20, 140 (edge: smallest and largest)',
      () => triangleQuestion(20, 140),
      'Een driehoek heeft hoeken van 20° en 140°. Hoe groot is de derde hoek?',
      '20',
      '180 − 20 − 140 = 20',
    ],
    [
      'tophoek 40',
      () => isoscelesQuestion('tophoek', 40),
      'Een gelijkbenige driehoek heeft een tophoek van 40°. Hoe groot is een basishoek?',
      '70',
      '(180 − 40) : 2 = 70',
    ],
    [
      'tophoek 160 (edge)',
      () => isoscelesQuestion('tophoek', 160),
      'Een gelijkbenige driehoek heeft een tophoek van 160°. Hoe groot is een basishoek?',
      '10',
      '(180 − 160) : 2 = 10',
    ],
    [
      'basishoek 70',
      () => isoscelesQuestion('basishoek', 70),
      'Een gelijkbenige driehoek heeft basishoeken van 70°. Hoe groot is de tophoek?',
      '40',
      '180 − 2 × 70 = 40',
    ],
    [
      'basishoek 85 (edge)',
      () => isoscelesQuestion('basishoek', 85),
      'Een gelijkbenige driehoek heeft basishoeken van 85°. Hoe groot is de tophoek?',
      '10',
      '180 − 2 × 85 = 10',
    ],
    [
      'sum 6',
      () => angleSumQuestion(6),
      'Hoeveel graden zijn de hoeken van een zeshoek samen?',
      '720',
      '(6 − 2) × 180 = 720',
    ],
    [
      'sum 4 (edge: smallest)',
      () => angleSumQuestion(4),
      'Hoeveel graden zijn de hoeken van een vierhoek samen?',
      '360',
      '(4 − 2) × 180 = 360',
    ],
    [
      'sum 12 (edge: largest)',
      () => angleSumQuestion(12),
      'Hoeveel graden zijn de hoeken van een twaalfhoek samen?',
      '1800',
      '(12 − 2) × 180 = 1800',
    ],
    [
      'regular 8',
      () => regularAngleQuestion(8),
      'Hoe groot is één hoek van een regelmatige achthoek?',
      '135',
      '(8 − 2) × 180 : 8 = 135',
    ],
    [
      'regular 9',
      () => regularAngleQuestion(9),
      'Hoe groot is één hoek van een regelmatige negenhoek?',
      '140',
      '(9 − 2) × 180 : 9 = 140',
    ],
    [
      'regular 5 (edge: smallest)',
      () => regularAngleQuestion(5),
      'Hoe groot is één hoek van een regelmatige vijfhoek?',
      '108',
      '(5 − 2) × 180 : 5 = 108',
    ],
    [
      '4 uur',
      () => clockQuestion(4, false),
      'Hoe groot is de kleinste hoek tussen de wijzers om 4 uur?',
      '120',
      'elk uur op de klok is 360 : 12 = 30° → 4 × 30 = 120',
    ],
    [
      '9 uur: counted the other way round the clock',
      () => clockQuestion(9, false),
      'Hoe groot is de kleinste hoek tussen de wijzers om 9 uur?',
      '90',
      'elk uur op de klok is 360 : 12 = 30° → 3 × 30 = 90',
    ],
    [
      '6 uur (edge: straight)',
      () => clockQuestion(6, false),
      'Hoe groot is de kleinste hoek tussen de wijzers om 6 uur?',
      '180',
      'elk uur op de klok is 360 : 12 = 30° → 6 × 30 = 180',
    ],
    [
      'half 4',
      () => clockQuestion(4, true),
      'Hoe groot is de kleinste hoek tussen de wijzers om half 4?',
      '75',
      'de grote wijzer staat op de 6, de kleine halverwege de 3 en de 4 → 2,5 × 30 = 75',
    ],
    [
      'half 7',
      () => clockQuestion(7, true),
      'Hoe groot is de kleinste hoek tussen de wijzers om half 7?',
      '15',
      'de grote wijzer staat op de 6, de kleine halverwege de 6 en de 7 → 0,5 × 30 = 15',
    ],
    [
      'half 10',
      () => clockQuestion(10, true),
      'Hoe groot is de kleinste hoek tussen de wijzers om half 10?',
      '105',
      'de grote wijzer staat op de 6, de kleine halverwege de 9 en de 10 → 3,5 × 30 = 105',
    ],
    [
      'half 1 (edge: between 12 and 1)',
      () => clockQuestion(1, true),
      'Hoe groot is de kleinste hoek tussen de wijzers om half 1?',
      '165',
      'de grote wijzer staat op de 6, de kleine halverwege de 12 en de 1 → 5,5 × 30 = 165',
    ],
    [
      'half 12 (edge)',
      () => clockQuestion(12, true),
      'Hoe groot is de kleinste hoek tussen de wijzers om half 12?',
      '165',
      'de grote wijzer staat op de 6, de kleine halverwege de 11 en de 12 → 5,5 × 30 = 165',
    ],
  ])('%s', (_label, make, prompt, answer, explanation) => {
    const step = stepOf(make());
    expect(step.kind).toBe('number');
    expect(step.prompt).toBe(prompt);
    expect(step.suffix).toBe('°');
    expect(step.prefix).toBeUndefined();
    expect(step.check(answer).correct).toBe(true);
    expect(step.check('').expected).toBe(answer);
    expect(step.check(answer).explanation).toBe(explanation);
    expect(step.check('1').explanation).toBe(explanation);
  });

  it('has a key of the form and the numbers', () => {
    expect(triangleQuestion(50, 70).key).toBe('angles:triangle:50:70');
    expect(isoscelesQuestion('tophoek', 40).key).toBe('angles:isosceles:tophoek:40');
    expect(isoscelesQuestion('basishoek', 40).key).toBe('angles:isosceles:basishoek:40');
    expect(angleSumQuestion(6).key).toBe('angles:sum:6');
    expect(regularAngleQuestion(8).key).toBe('angles:regular:8');
    expect(clockQuestion(4, false).key).toBe('angles:clock:uur:4');
    expect(clockQuestion(4, true).key).toBe('angles:clock:half:4');
    expect(triangleQuestion(50, 70).topic).toBe('angles');
  });
});

describe('clockQuestion', () => {
  it('answers the smaller angle between the hands for every whole hour 1 to 11', () => {
    for (const hour of range(1, 11)) {
      const question = clockQuestion(hour, false);
      expect(answerOf(question), `${hour} uur`).toEqual(fromInteger(smallerAngle(hour, 0)));
      expect(stepOf(question).check('').explanation, `${hour} uur`).toMatch(
        new RegExp(`= ${smallerAngle(hour, 0)}$`, 'u'),
      );
    }
  });

  it('answers the smaller angle between the hands for every half hour 1 to 12 (half 4 = 3:30)', () => {
    for (const hour of range(1, 12)) {
      const question = clockQuestion(hour, true);
      expect(answerOf(question), `half ${hour}`).toEqual(fromInteger(smallerAngle(hour - 1, 30)));
      expect(stepOf(question).check('').explanation, `half ${hour}`).toMatch(
        new RegExp(`= ${smallerAngle(hour - 1, 30)}$`, 'u'),
      );
    }
  });
});

describe('tips', () => {
  it.each<[string, string, () => Question, string | undefined]>([
    ['sum 6', '1080', () => angleSumQuestion(6), TIP_SUM],
    [
      'sum 4',
      '720',
      () => angleSumQuestion(4),
      'Een vierhoek kun je verdelen in 4 − 2 = 2 driehoeken: 2 × 180°.',
    ],
    ['sum 6: a wrong answer', '900', () => angleSumQuestion(6), undefined],
    ['sum 6: factor of ten', '7200', () => angleSumQuestion(6), TIP_FACTOR_TEN],
    [
      'regular 8',
      '45',
      () => regularAngleQuestion(8),
      'Dat is de buitenhoek; één hoek binnenin is 180° − 45° = 135°.',
    ],
    [
      'regular 9',
      '40',
      () => regularAngleQuestion(9),
      'Dat is de buitenhoek; één hoek binnenin is 180° − 40° = 140°.',
    ],
    [
      'regular 5',
      '72',
      () => regularAngleQuestion(5),
      'Dat is de buitenhoek; één hoek binnenin is 180° − 72° = 108°.',
    ],
    ['regular 8: a wrong answer', '90', () => regularAngleQuestion(8), undefined],
    ['regular 8: factor of ten', '1350', () => regularAngleQuestion(8), TIP_FACTOR_TEN],
    [
      'half 4, the hour hand on the 3',
      '90',
      () => clockQuestion(4, true),
      'Om half 4 staat de kleine wijzer halverwege de 3 en de 4.',
    ],
    [
      'half 4, the hour hand on the 4',
      '60',
      () => clockQuestion(4, true),
      'Om half 4 staat de kleine wijzer halverwege de 3 en de 4.',
    ],
    [
      'half 1, the hour hand on the 12',
      '180',
      () => clockQuestion(1, true),
      'Om half 1 staat de kleine wijzer halverwege de 12 en de 1.',
    ],
    [
      'half 1, the hour hand on the 1',
      '150',
      () => clockQuestion(1, true),
      'Om half 1 staat de kleine wijzer halverwege de 12 en de 1.',
    ],
    ['half 4: a wrong answer', '45', () => clockQuestion(4, true), undefined],
    ['half 4: factor of ten', '750', () => clockQuestion(4, true), TIP_FACTOR_TEN],
    ['4 uur: a wrong answer, no topic tip', '60', () => clockQuestion(4, false), undefined],
    ['4 uur: factor of ten', '1200', () => clockQuestion(4, false), TIP_FACTOR_TEN],
    ['triangle: a wrong answer, no topic tip', '110', () => triangleQuestion(50, 70), undefined],
    [
      'tophoek: a wrong answer, no topic tip',
      '40',
      () => isoscelesQuestion('tophoek', 40),
      undefined,
    ],
  ])('%s, typing %s', (_label, input, make, tip) => {
    expect(stepOf(make()).check(input).tip).toBe(tip);
  });

  it('names n × 180 as the mistake of every angle sum', () => {
    for (const sides of SUM_SIDES) {
      const triangles = sides - 2;
      const tip = `Een ${POLYGON_NAMES[sides]} kun je verdelen in ${sides} − 2 = ${triangles} driehoeken: ${triangles} × 180°.`;
      expect(stepOf(angleSumQuestion(sides)).check(String(sides * 180)).tip, `${sides}`).toBe(tip);
    }
  });

  it('names the exterior angle as the mistake of every regular polygon, never the answer', () => {
    for (const sides of REGULAR_SIDES) {
      const exterior = 360 / sides;
      const interior = 180 - exterior;
      const tip = `Dat is de buitenhoek; één hoek binnenin is 180° − ${exterior}° = ${interior}°.`;
      expect(exterior, `${sides}`).not.toBe(interior);
      expect(stepOf(regularAngleQuestion(sides)).check(String(exterior)).tip, `${sides}`).toBe(tip);
    }
  });

  it('names the angle with the hour hand on either whole hour at half past', () => {
    for (const hour of range(1, 12)) {
      const step = stepOf(clockQuestion(hour, true));
      const before = hour === 1 ? 12 : hour - 1;
      const tip = `Om half ${hour} staat de kleine wijzer halverwege de ${before} en de ${hour}.`;
      for (const position of [before, hour]) {
        const mistaken = apart((position % 12) * 30, 180);
        expect(mistaken, `half ${hour}`).not.toBe(smallerAngle(hour - 1, 30));
        expect(step.check(String(mistaken)).tip, `half ${hour}, hand on ${position}`).toBe(tip);
      }
    }
  });

  it('gives a correct answer no tip, also when the mistake has the same value', () => {
    // A square has no mistake to tell: the exterior angle 360 : 4 is its interior angle.
    const square = stepOf(regularAngleQuestion(4)).check('90');
    expect(square.correct).toBe(true);
    expect(square.tip).toBeUndefined();
    for (const question of [angleSumQuestion(6), regularAngleQuestion(8), clockQuestion(4, true)]) {
      const result = stepOf(question).check(typed(answerOf(question)));
      expect(result.correct, question.key).toBe(true);
      expect(result.tip, question.key).toBeUndefined();
    }
  });
});

describe('generateAngles', () => {
  const COUNT = 4000;
  const rng = createRng(5099);
  const questions = Array.from({ length: COUNT }, () => generateAngles(rng));

  type Form = 'triangle' | 'tophoek' | 'basishoek' | 'sum' | 'regular' | 'uur' | 'half';

  const NAMES = new Map(
    Object.entries(POLYGON_NAMES).map(([sides, name]): [string, number] => [name, Number(sides)]),
  );
  /** The prompt of each form; the groups are the numbers or the polygon name. */
  const PROMPTS: readonly (readonly [Form, RegExp])[] = [
    [
      'triangle',
      /^Een driehoek heeft hoeken van (\d+)° en (\d+)°\. Hoe groot is de derde hoek\?$/u,
    ],
    [
      'tophoek',
      /^Een gelijkbenige driehoek heeft een tophoek van (\d+)°\. Hoe groot is een basishoek\?$/u,
    ],
    [
      'basishoek',
      /^Een gelijkbenige driehoek heeft basishoeken van (\d+)°\. Hoe groot is de tophoek\?$/u,
    ],
    ['sum', /^Hoeveel graden zijn de hoeken van een ([a-z]+) samen\?$/u],
    ['regular', /^Hoe groot is één hoek van een regelmatige ([a-z]+)\?$/u],
    ['uur', /^Hoe groot is de kleinste hoek tussen de wijzers om (\d+) uur\?$/u],
    ['half', /^Hoe groot is de kleinste hoek tussen de wijzers om half (\d+)\?$/u],
  ];
  const KEY_PARTS: Record<Form, string> = {
    triangle: 'triangle',
    tophoek: 'isosceles:tophoek',
    basishoek: 'isosceles:basishoek',
    sum: 'sum',
    regular: 'regular',
    uur: 'clock:uur',
    half: 'clock:half',
  };

  interface Parsed {
    form: Form;
    /** The numbers of the prompt, in the order shown; a polygon is its number of sides. */
    numbers: readonly number[];
    question: Question;
  }

  function parse(question: Question): Parsed {
    const { prompt } = stepOf(question);
    for (const [form, pattern] of PROMPTS) {
      const match = pattern.exec(prompt);
      if (match === null) continue;
      const numbers = match.slice(1).map((text) => NAMES.get(text) ?? Number(text));
      return { form, numbers, question };
    }
    throw new Error(`Unexpected prompt: ${prompt}`);
  }

  /** The answer, worked out from the numbers of the prompt alone. */
  function expectedAnswer({ form, numbers }: Parsed): number {
    const first = numbers[0]!;
    switch (form) {
      case 'triangle':
        return 180 - first - numbers[1]!;
      case 'tophoek':
        return (180 - first) / 2;
      case 'basishoek':
        return 180 - 2 * first;
      case 'sum':
        return 180 * (first - 2);
      case 'regular':
        return 180 - 360 / first;
      case 'uur':
        return smallerAngle(first, 0);
      case 'half':
        return smallerAngle(first - 1, 30);
    }
  }

  const all = questions.map(parse);
  const of = (...forms: Form[]) => all.filter((one) => forms.includes(one.form));
  const share = (part: readonly Parsed[], whole: readonly Parsed[]) => part.length / whole.length;
  const near = (actual: number, expected: number) =>
    expect(Math.abs(actual - expected)).toBeLessThan(0.05);
  const numbersOf = (forms: readonly Parsed[]) => new Set(forms.map(({ numbers }) => numbers[0]));

  it('creates single-step number questions in degrees that accept their own answer', () => {
    for (const question of questions) {
      expect(question.topic).toBe('angles');
      expect(question.steps, question.key).toHaveLength(1);
      expect(stepOf(question).kind).toBe('number');
      expect(stepOf(question).suffix).toBe('°');
      const result = stepOf(question).check(typed(answerOf(question)));
      expect(result.correct, question.key).toBe(true);
      expect(result.explanation, question.key).toBeTruthy();
    }
  });

  it('answers a whole number of degrees, worked out from the prompt', () => {
    for (const one of all) {
      expect(answerOf(one.question), one.question.key).toEqual(fromInteger(expectedAnswer(one)));
    }
  });

  it('picks the triangle, the angle sum, the regular polygon and the clock 25% each', () => {
    near(share(of('triangle', 'tophoek', 'basishoek'), all), 0.25);
    near(share(of('sum'), all), 0.25);
    near(share(of('regular'), all), 0.25);
    near(share(of('uur', 'half'), all), 0.25);
  });

  it('splits the triangle variants, the isosceles directions and the clock hours 50% each', () => {
    const triangles = of('triangle', 'tophoek', 'basishoek');
    const isosceles = of('tophoek', 'basishoek');
    const clocks = of('uur', 'half');
    near(share(of('triangle'), triangles), 0.5);
    near(share(of('tophoek'), isosceles), 0.5);
    near(share(of('uur'), clocks), 0.5);
  });

  it('draws two given angles of a multiple of 5, each at least 20, together at most 160', () => {
    for (const { numbers, question } of of('triangle')) {
      const [first, second] = numbers as readonly [number, number];
      expect(first % 5, question.key).toBe(0);
      expect(second % 5, question.key).toBe(0);
      expect(Math.min(first, second), question.key).toBeGreaterThanOrEqual(20);
      expect(first + second, question.key).toBeLessThanOrEqual(160);
    }
  });

  it('draws a tophoek of 20 to 160 in tens and a basishoek of 20 to 85 in fives', () => {
    const tophoeken = of('tophoek').map(({ numbers }) => numbers[0]!);
    const basishoeken = of('basishoek').map(({ numbers }) => numbers[0]!);
    expect(new Set(tophoeken)).toEqual(new Set(range(2, 16).map((tens) => tens * 10)));
    expect(new Set(basishoeken)).toEqual(new Set(range(4, 17).map((fives) => fives * 5)));
  });

  it('draws the polygons of spec §5.30 and the hours of the clock', () => {
    expect(numbersOf(of('sum'))).toEqual(new Set(SUM_SIDES));
    expect(numbersOf(of('regular'))).toEqual(new Set(REGULAR_SIDES));
    expect(numbersOf(of('uur'))).toEqual(new Set(range(1, 11)));
    expect(numbersOf(of('half'))).toEqual(new Set(range(1, 12)));
  });

  it('has a key of the form and the numbers', () => {
    for (const { form, numbers, question } of all) {
      expect(question.key, stepOf(question).prompt).toBe(
        ['angles', KEY_PARTS[form], ...numbers].join(':'),
      );
    }
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
      return Array.from({ length: 50 }, () => generateAngles(random).key);
    };
    expect(keys(7)).toEqual(keys(7));
    expect(keys(7)).not.toEqual(keys(8));
  });
});
