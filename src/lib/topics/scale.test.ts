import { beforeAll, describe, expect, it } from 'vitest';
import { formatRational, GROUP_SEPARATOR } from '../format';
import { createRng } from '../random';
import {
  compare,
  decimalPlaces,
  divide,
  equals,
  fromInteger,
  multiply,
  parseDutchNumber,
  type Rational,
} from '../rational';
import type { Question, Step } from '../types';
import {
  generateScale,
  mapDistancesFor,
  oneCentimetre,
  realDistance,
  realUnit,
  scaleExplanation,
  scaleQuestion,
  scaleTip,
  SCALES,
  type ScaleForm,
} from './scale';

const FORMS: readonly ScaleForm[] = ['mapToReal', 'realToMap', 'findScale'];

/** A value written in Dutch notation: '7,5'. */
function decimal(text: string): Rational {
  return parseDutchNumber(text)!;
}

/** What the user types for a value: the digits and the comma, without grouping. */
function typed(value: Rational): string {
  return formatRational(value).replaceAll(GROUP_SEPARATOR, '');
}

function stepOf(question: Question): Step {
  return question.steps[0]!;
}

/** The correct answer of a question, read back from its expected answer. */
function answerOf(question: Question): Rational {
  return decimal(stepOf(question).check('').expected.replaceAll(GROUP_SEPARATOR, ''));
}

/** The result of typing `input` on the question of `form` on scale 1 : n with `map` cm. */
function ask(form: ScaleForm, n: number, map: string, input: string) {
  return stepOf(scaleQuestion(form, n, decimal(map))).check(input);
}

/** The centimetres in a metre or a kilometre: how a real distance relates to the map. */
function centimetresPer(unit: string): Rational {
  return fromInteger(unit === 'm' ? 100 : 100_000);
}

const TIP_25_000 =
  'Reken in dezelfde eenheid: 1 cm op de kaart is 25\u{202f}000 cm = 250 m = 0,25 km in het echt.';
const TIP_250 = 'Reken in dezelfde eenheid: 1 cm op de tekening is 250 cm = 2,5 m in het echt.';
const TIP_50_000 =
  'Reken in dezelfde eenheid: 1 cm op de kaart is 50\u{202f}000 cm = 500 m = 0,5 km in het echt.';
const TIP_FIND_KM = 'Reken eerst beide afstanden om naar cm: 2 km = 200\u{202f}000 cm.';
const TIP_FIND_M = 'Reken eerst beide afstanden om naar cm: 7,5 m = 750 cm.';

describe('SCALES', () => {
  it('lists the scales of spec §5.24 in ascending order', () => {
    expect(SCALES).toEqual([
      100, 200, 250, 500, 1000, 2000, 2500, 5000, 10_000, 20_000, 25_000, 50_000, 100_000, 200_000,
      250_000, 500_000, 1_000_000,
    ]);
  });
});

describe('realUnit', () => {
  it('is metres up to 5000 and kilometres from 10 000', () => {
    expect(realUnit(100)).toBe('m');
    expect(realUnit(5000)).toBe('m');
    expect(realUnit(10_000)).toBe('km');
    expect(realUnit(1_000_000)).toBe('km');
  });
});

describe('realDistance', () => {
  it.each<[number, string, string]>([
    [25_000, '4', '1'],
    [250, '3', '7,5'],
    [100, '7', '7'],
    [50_000, '6', '3'],
    [5000, '20', '1000'],
    [10_000, '1', '0,1'],
    [25_000, '1,2', '0,3'],
    [250, '0,5', '1,25'],
    [1_000_000, '30', '300'],
  ])('puts 1 : %i with %s cm on the map at %s in its unit', (n, map, real) => {
    expect(equals(realDistance(n, decimal(map)), decimal(real))).toBe(true);
  });
});

describe('oneCentimetre', () => {
  it.each<[number, string]>([
    [25_000, '1 cm = 25\u{202f}000 cm = 250 m = 0,25 km'],
    [250, '1 cm = 250 cm = 2,5 m'],
    [100, '1 cm = 100 cm = 1 m'],
    [5000, '1 cm = 5000 cm = 50 m'],
    [10_000, '1 cm = 10\u{202f}000 cm = 100 m = 0,1 km'],
    [50_000, '1 cm = 50\u{202f}000 cm = 500 m = 0,5 km'],
    [1_000_000, '1 cm = 1\u{202f}000\u{202f}000 cm = 10\u{202f}000 m = 10 km'],
  ])('writes what 1 cm on 1 : %i is as %s', (n, chain) => {
    expect(oneCentimetre(n)).toBe(chain);
  });
});

describe('mapDistancesFor', () => {
  it('has candidates for every scale', () => {
    for (const n of SCALES) expect(mapDistancesFor(n).length, String(n)).toBeGreaterThan(0);
  });

  it('keeps distances of at most 2 significant digits and 1 decimal in [0,5; 30]', () => {
    for (const n of SCALES) {
      for (const map of mapDistancesFor(n)) {
        expect(compare(map, decimal('0,5')), `${n}: ${typed(map)}`).toBeGreaterThanOrEqual(0);
        expect(compare(map, fromInteger(30)), `${n}: ${typed(map)}`).toBeLessThanOrEqual(0);
        expect(decimalPlaces(map)).toBeLessThanOrEqual(1);
        const digits = typed(map).replace(',', '').replace(/^0+/, '');
        expect(digits.length, `${n}: ${typed(map)}`).toBeLessThanOrEqual(2);
      }
    }
  });

  it('keeps a real distance in [0,1; 1000] with at most 2 decimals, and drops all others', () => {
    const tenths = (from: number, count: number) =>
      Array.from({ length: count }, (_, i) => divide(fromInteger(from + i), fromInteger(10)));
    const all = [
      ...tenths(5, 5), // 0,5 … 0,9
      ...tenths(10, 90), // 1 … 9,9
      ...Array.from({ length: 21 }, (_, i) => fromInteger(10 + i)), // 10 … 30
    ];
    for (const n of SCALES) {
      const perCm = centimetresPer(realUnit(n));
      const expected = all.filter((map) => {
        const real = divide(multiply(map, fromInteger(n)), perCm);
        return (
          compare(real, decimal('0,1')) >= 0 &&
          compare(real, fromInteger(1000)) <= 0 &&
          decimalPlaces(real)! <= 2
        );
      });
      expect(mapDistancesFor(n).map(typed), String(n)).toEqual(expected.map(typed));
    }
  });

  it('offers tenths from 0,5 to 9,9 and the integers 10 to 30 on a floor plan scale', () => {
    const shown = mapDistancesFor(100).map(typed);
    expect(shown[0]).toBe('0,5');
    expect(shown).toContain('0,9');
    expect(shown).toContain('1');
    expect(shown).toContain('9,9');
    expect(shown).toContain('10');
    expect(shown).toContain('30');
    expect(shown).not.toContain('0,4');
    expect(shown).not.toContain('31');
    expect(shown).toHaveLength(5 + 90 + 21);
  });

  it('drops distances whose real distance is below 0,1 km or has 3 decimals', () => {
    expect(mapDistancesFor(10_000).map(typed)).not.toContain('0,9'); // 0,09 km
    expect(mapDistancesFor(10_000).map(typed)).toContain('1'); // 0,1 km
    expect(mapDistancesFor(25_000).map(typed)).not.toContain('1,1'); // 0,275 km
    expect(mapDistancesFor(25_000).map(typed)).toContain('1,2'); // 0,3 km
    expect(mapDistancesFor(5000).map(typed)).toContain('20'); // 1000 m
    expect(mapDistancesFor(5000).map(typed)).not.toContain('21'); // 1050 m
  });
});

describe('scaleQuestion', () => {
  it.each<[ScaleForm, number, string, string]>([
    ['mapToReal', 25_000, '4', 'Schaal 1 : 25\u{202f}000. 4 cm op de kaart is in het echt ? km'],
    ['mapToReal', 250, '3', 'Schaal 1 : 250. 3 cm op de tekening is in het echt ? m'],
    ['mapToReal', 5000, '0,5', 'Schaal 1 : 5000. 0,5 cm op de tekening is in het echt ? m'],
    ['mapToReal', 10_000, '1', 'Schaal 1 : 10\u{202f}000. 1 cm op de kaart is in het echt ? km'],
    ['realToMap', 50_000, '6', 'Schaal 1 : 50\u{202f}000. 3 km in het echt is op de kaart ? cm'],
    [
      'realToMap',
      25_000,
      '1,2',
      'Schaal 1 : 25\u{202f}000. 0,3 km in het echt is op de kaart ? cm',
    ],
    ['realToMap', 100, '7,5', 'Schaal 1 : 100. 7,5 m in het echt is op de tekening ? cm'],
    ['findScale', 50_000, '4', '4 cm op de kaart is 2 km in het echt. Schaal 1 : ?'],
    ['findScale', 250, '3', '3 cm op de tekening is 7,5 m in het echt. Schaal 1 : ?'],
    ['findScale', 250, '0,5', '0,5 cm op de tekening is 1,25 m in het echt. Schaal 1 : ?'],
  ])('words the %s question on 1 : %i with %s cm', (form, n, map, prompt) => {
    expect(stepOf(scaleQuestion(form, n, decimal(map))).prompt).toBe(prompt);
  });

  it('writes the grouping of the scale as narrow no-break spaces and the rest with spaces', () => {
    const prompt = stepOf(scaleQuestion('mapToReal', 250_000, decimal('2'))).prompt;
    expect(prompt.startsWith('Schaal 1 : 250\u{202f}000. 2 cm op de kaart')).toBe(true);
  });

  it('is a single number step with a key of the form, the scale and the map distance', () => {
    const question = scaleQuestion('realToMap', 100, decimal('7,5'));
    expect(question.topic).toBe('scale');
    expect(question.key).toBe('scale:realToMap:100:7,5');
    expect(question.steps).toHaveLength(1);
    expect(stepOf(question).kind).toBe('number');
    expect(scaleQuestion('findScale', 50_000, decimal('4')).key).toBe('scale:findScale:50000:4');
  });

  it('puts the unit of the answer in the suffix and the scale in the prefix', () => {
    const affixes = (form: ScaleForm, n: number, map: string) => {
      const { prefix, suffix } = stepOf(scaleQuestion(form, n, decimal(map)));
      return [prefix, suffix];
    };
    expect(affixes('mapToReal', 25_000, '4')).toEqual([undefined, 'km']);
    expect(affixes('mapToReal', 250, '3')).toEqual([undefined, 'm']);
    expect(affixes('realToMap', 50_000, '6')).toEqual([undefined, 'cm']);
    expect(affixes('realToMap', 250, '3')).toEqual([undefined, 'cm']);
    expect(affixes('findScale', 50_000, '4')).toEqual(['1\u{a0}:', undefined]);
    expect(affixes('findScale', 250, '3')).toEqual(['1\u{a0}:', undefined]);
  });

  it('rejects a scale or map distance outside the supported ones', () => {
    // 300 is no listed scale, 31 and 0,4 lie outside [0,5; 30], 0,45 has 2 decimals.
    expect(() => scaleQuestion('mapToReal', 300, decimal('4'))).toThrow(RangeError);
    expect(() => scaleQuestion('mapToReal', 250, decimal('31'))).toThrow(RangeError);
    expect(() => scaleQuestion('mapToReal', 250, decimal('0,4'))).toThrow(RangeError);
    expect(() => scaleQuestion('mapToReal', 250, decimal('0,45'))).toThrow(RangeError);
    // 0,5 cm on 1 : 10 000 is 0,05 km, 1,1 cm on 1 : 25 000 is 0,275 km, 21 cm on 1 : 5000 is
    // 1050 m.
    expect(() => scaleQuestion('realToMap', 10_000, decimal('0,5'))).toThrow(RangeError);
    expect(() => scaleQuestion('realToMap', 25_000, decimal('1,1'))).toThrow(RangeError);
    expect(() => scaleQuestion('findScale', 5000, decimal('21'))).toThrow(RangeError);
  });
});

describe('scale answers', () => {
  it.each<[ScaleForm, number, string, string, boolean, string | undefined]>([
    ['mapToReal', 25_000, '4', '1', true, undefined],
    ['mapToReal', 25_000, '4', '1,0', true, undefined],
    ['mapToReal', 25_000, '4', '1000', false, TIP_25_000],
    ['mapToReal', 25_000, '4', '100000', false, TIP_25_000],
    ['mapToReal', 25_000, '4', '0,1', false, TIP_25_000],
    ['mapToReal', 25_000, '4', '0,25', false, undefined],
    ['mapToReal', 25_000, '4', '2', false, undefined],
    ['mapToReal', 25_000, '4', '', false, undefined],
    ['mapToReal', 250, '3', '7,5', true, undefined],
    ['mapToReal', 250, '3', '750', false, TIP_250],
    ['mapToReal', 250, '3', '0,75', false, TIP_250],
    ['mapToReal', 250, '3', '75', false, TIP_250],
    ['realToMap', 50_000, '6', '6', true, undefined],
    ['realToMap', 50_000, '6', '0,6', false, TIP_50_000],
    ['realToMap', 50_000, '6', '60', false, TIP_50_000],
    ['realToMap', 50_000, '6', '3', false, undefined],
    ['findScale', 50_000, '4', '50000', true, undefined],
    ['findScale', 50_000, '4', '500', false, TIP_FIND_KM],
    ['findScale', 50_000, '4', '0,5', false, TIP_FIND_KM],
    ['findScale', 50_000, '4', '5000', false, TIP_FIND_KM],
    ['findScale', 50_000, '4', '25000', false, undefined],
    ['findScale', 250, '3', '250', true, undefined],
    ['findScale', 250, '3', '2,5', false, TIP_FIND_M],
    ['findScale', 250, '3', '25', false, TIP_FIND_M],
    ['findScale', 250, '3', '2500', false, TIP_FIND_M],
    ['findScale', 250, '3', '500', false, undefined],
  ])('%s 1 : %i, %s cm: typing %s', (form, n, map, input, correct, tip) => {
    const result = ask(form, n, map, input);
    expect(result.correct).toBe(correct);
    expect(result.tip).toBe(tip);
  });

  it.each<[ScaleForm, number, string, string]>([
    ['mapToReal', 25_000, '4', '1'],
    ['mapToReal', 250, '3', '7,5'],
    ['mapToReal', 100, '0,5', '0,5'],
    ['realToMap', 50_000, '6', '6'],
    ['realToMap', 25_000, '1,2', '1,2'],
    ['findScale', 50_000, '4', '50\u{202f}000'],
    ['findScale', 250, '3', '250'],
    ['findScale', 5000, '3', '5000'],
    ['findScale', 1_000_000, '3', '1\u{202f}000\u{202f}000'],
  ])('shows the expected answer of %s on 1 : %i with %s cm as %s', (form, n, map, expected) => {
    expect(ask(form, n, map, '').expected).toBe(expected);
  });
});

describe('scaleExplanation', () => {
  it.each<[ScaleForm, number, string, string]>([
    ['mapToReal', 25_000, '4', '1 cm = 25\u{202f}000 cm = 250 m = 0,25 km → 4 × 0,25 = 1 km'],
    ['mapToReal', 250, '3', '1 cm = 250 cm = 2,5 m → 3 × 2,5 = 7,5 m'],
    ['mapToReal', 100, '7', '1 cm = 100 cm = 1 m → 7 × 1 = 7 m'],
    ['mapToReal', 10_000, '1,5', '1 cm = 10\u{202f}000 cm = 100 m = 0,1 km → 1,5 × 0,1 = 0,15 km'],
    ['realToMap', 50_000, '6', '1 cm = 50\u{202f}000 cm = 500 m = 0,5 km → 3 : 0,5 = 6 cm'],
    ['realToMap', 250, '3', '1 cm = 250 cm = 2,5 m → 7,5 : 2,5 = 3 cm'],
    ['findScale', 50_000, '4', '2 km = 200\u{202f}000 cm → 200\u{202f}000 : 4 = 50\u{202f}000'],
    ['findScale', 250, '3', '7,5 m = 750 cm → 750 : 3 = 250'],
  ])('explains %s on 1 : %i with %s cm', (form, n, map, explanation) => {
    expect(scaleExplanation(form, n, decimal(map))).toBe(explanation);
  });

  it('is shown for a correct and for a wrong answer', () => {
    const explanation = '1 cm = 250 cm = 2,5 m → 3 × 2,5 = 7,5 m';
    expect(ask('mapToReal', 250, '3', '7,5').explanation).toBe(explanation);
    expect(ask('mapToReal', 250, '3', '2').explanation).toBe(explanation);
  });
});

describe('scaleTip', () => {
  it('never recognises the correct answer', () => {
    expect(scaleTip('mapToReal', 25_000, decimal('4'))(decimal('1'))).toBeUndefined();
    expect(scaleTip('realToMap', 50_000, decimal('6'))(decimal('6'))).toBeUndefined();
    expect(scaleTip('findScale', 50_000, decimal('4'))(fromInteger(50_000))).toBeUndefined();
  });

  it('recognises a factor of ten in either direction, and nothing else', () => {
    const tip = scaleTip('mapToReal', 250, decimal('3'));
    expect(tip(decimal('75'))).toBe(TIP_250);
    expect(tip(decimal('0,75'))).toBe(TIP_250);
    expect(tip(decimal('7500'))).toBe(TIP_250);
    expect(tip(decimal('15'))).toBeUndefined();
    expect(tip(decimal('0'))).toBeUndefined();
    expect(tip(decimal('\u{2212}7,5'))).toBeUndefined();
  });
});

describe('every supported scale question', () => {
  const TIP = /^Reken (in dezelfde eenheid|eerst beide afstanden om naar cm): /;

  it('accepts its own answer, explains it and tips a factor of ten', () => {
    for (const form of FORMS) {
      for (const n of SCALES) {
        const perCm = centimetresPer(realUnit(n));
        for (const map of mapDistancesFor(n)) {
          const label = `${form} 1 : ${n} with ${typed(map)} cm`;
          // Independent of realDistance: n cm in reality per cm on the map.
          const real = divide(multiply(map, fromInteger(n)), perCm);
          const answer = { mapToReal: real, realToMap: map, findScale: fromInteger(n) }[form];
          const step = stepOf(scaleQuestion(form, n, map));
          const correct = step.check(typed(answer));
          expect(correct.correct, label).toBe(true);
          expect(correct.tip, label).toBeUndefined();
          expect(correct.expected, label).toBe(formatRational(answer));
          expect(correct.explanation, label).toBeTruthy();
          for (const factor of [10, 100]) {
            const larger = step.check(typed(multiply(answer, fromInteger(factor))));
            const smaller = step.check(typed(divide(answer, fromInteger(factor))));
            expect(larger.correct, label).toBe(false);
            expect(larger.tip, label).toMatch(TIP);
            expect(smaller.correct, label).toBe(false);
            expect(smaller.tip, label).toMatch(TIP);
          }
          const doubled = step.check(typed(multiply(answer, fromInteger(2))));
          expect(doubled.correct, label).toBe(false);
          expect(doubled.tip, label).toBeUndefined();
        }
      }
    }
  });
});

describe('generateScale', () => {
  const COUNT = 1000;
  const rng = createRng(41);
  const questions = Array.from({ length: COUNT }, () => generateScale(rng));

  const NUMBER = '([^ ]+)';
  const NOUN = '(kaart|tekening)';
  const UNIT = '(m|km)';
  const MAP_TO_REAL = new RegExp(
    `^Schaal 1 : ${NUMBER}\\. ${NUMBER} cm op de ${NOUN} is in het echt \\? ${UNIT}$`,
    'u',
  );
  const REAL_TO_MAP = new RegExp(
    `^Schaal 1 : ${NUMBER}\\. ${NUMBER} ${UNIT} in het echt is op de ${NOUN} \\? cm$`,
    'u',
  );
  const FIND = new RegExp(
    `^${NUMBER} cm op de ${NOUN} is ${NUMBER} ${UNIT} in het echt\\. Schaal 1 : \\?$`,
    'u',
  );

  interface Parsed {
    form: ScaleForm;
    n: number;
    map: Rational;
    prompt: string;
    /** The real distance, its unit and the kind of picture, as written in the prompt. */
    real: Rational;
    unit: string;
    noun: string;
  }

  /** A number as written in a prompt: '25 000' with a narrow no-break space, '0,25'. */
  function shown(text: string | undefined): Rational {
    return decimal(text!.replaceAll(GROUP_SEPARATOR, ''));
  }

  function matchOf(pattern: RegExp, prompt: string): string[] {
    const match = pattern.exec(prompt);
    if (match === null) throw new Error(`Unexpected prompt: ${prompt}`);
    return match;
  }

  /** Reads the numbers back from the key and the prompt, so they are checked independently. */
  function parse(question: Question): Parsed {
    const [, form, scale, mapText] = question.key.split(':');
    const n = Number(scale);
    const map = decimal(mapText!);
    const { prompt } = stepOf(question);
    if (form === 'mapToReal') {
      const match = matchOf(MAP_TO_REAL, prompt);
      expect(shown(match[1]), prompt).toEqual(fromInteger(n));
      expect(shown(match[2]), prompt).toEqual(map);
      const real = answerOf(question);
      return { form, n, map, prompt, real, unit: match[4]!, noun: match[3]! };
    }
    if (form === 'realToMap') {
      const match = matchOf(REAL_TO_MAP, prompt);
      expect(shown(match[1]), prompt).toEqual(fromInteger(n));
      expect(answerOf(question), prompt).toEqual(map);
      const real = shown(match[2]);
      return { form, n, map, prompt, real, unit: match[3]!, noun: match[4]! };
    }
    const match = matchOf(FIND, prompt);
    expect(shown(match[1]), prompt).toEqual(map);
    expect(answerOf(question), prompt).toEqual(fromInteger(n));
    const real = shown(match[3]);
    return { form: 'findScale', n, map, prompt, real, unit: match[4]!, noun: match[2]! };
  }

  let parsed: Parsed[] = [];
  beforeAll(() => {
    parsed = questions.map(parse);
  });

  it('creates single-step number questions that accept their own answer', () => {
    for (const question of questions) {
      expect(question.topic).toBe('scale');
      expect(question.steps).toHaveLength(1);
      expect(stepOf(question).kind).toBe('number');
      const result = stepOf(question).check(typed(answerOf(question)));
      expect(result.correct, question.key).toBe(true);
      expect(result.explanation, question.key).toBeTruthy();
    }
  });

  it('uses the three forms about equally often', () => {
    for (const form of FORMS) {
      const share = parsed.filter((question) => question.form === form).length / COUNT;
      expect(share, form).toBeGreaterThan(0.26);
      expect(share, form).toBeLessThan(0.41);
    }
  });

  it('uses every scale, in metres and in kilometres', () => {
    for (const n of SCALES) {
      const used = parsed.filter((question) => question.n === n).length;
      expect(used, String(n)).toBeGreaterThan(20);
    }
    expect(parsed.some(({ unit }) => unit === 'm')).toBe(true);
    expect(parsed.some(({ unit }) => unit === 'km')).toBe(true);
  });

  it('draws the map distance in [0,5; 30] with 1 decimal and 2 significant digits', () => {
    for (const { map, n } of parsed) {
      expect(compare(map, decimal('0,5')), `${n}: ${typed(map)}`).toBeGreaterThanOrEqual(0);
      expect(compare(map, fromInteger(30)), `${n}: ${typed(map)}`).toBeLessThanOrEqual(0);
      expect(decimalPlaces(map)).toBeLessThanOrEqual(1);
      const digits = typed(map).replace(',', '').replace(/^0+/, '');
      expect(digits.length, `${n}: ${typed(map)}`).toBeLessThanOrEqual(2);
    }
  });

  it('makes the real distance fit the scale, in [0,1; 1000] with at most 2 decimals', () => {
    for (const { n, map, real, unit } of parsed) {
      const label = `1 : ${n}, ${typed(map)} cm, ${typed(real)} ${unit}`;
      // Independent check: 1 cm on the map is n cm in reality.
      const lhs = multiply(real, centimetresPer(unit));
      expect(equals(lhs, multiply(map, fromInteger(n))), label).toBe(true);
      expect(compare(real, decimal('0,1')), label).toBeGreaterThanOrEqual(0);
      expect(compare(real, fromInteger(1000)), label).toBeLessThanOrEqual(0);
      expect(decimalPlaces(real), label).toBeLessThanOrEqual(2);
    }
  });

  it('uses metres and a drawing exactly up to 1 : 5000', () => {
    for (const { n, unit, noun } of parsed) {
      expect(unit, String(n)).toBe(n <= 5000 ? 'm' : 'km');
      expect(noun, String(n)).toBe(n <= 5000 ? 'tekening' : 'kaart');
    }
    for (const { n, prompt } of parsed) {
      expect(prompt.includes('tekening'), prompt).toBe(n <= 5000);
      expect(prompt.includes('kaart'), prompt).toBe(n > 5000);
    }
  });

  it('is deterministic for a fixed seed', () => {
    const keys = (seed: number) => {
      const seeded = createRng(seed);
      return Array.from({ length: 50 }, () => generateScale(seeded).key);
    };
    expect(keys(5)).toEqual(keys(5));
  });
});
