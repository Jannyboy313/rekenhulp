import { describe, expect, it } from 'vitest';
import { formatRational } from '../format';
import { createRng } from '../random';
import { SLOT } from '../slot';
import { compare, decimalPlaces, fromInteger, multiply } from '../rational';
import type { Question } from '../types';
import {
  generateMeasureSense,
  INSTRUMENT_ITEMS,
  instrumentQuestion,
  orderingOptions,
  orderingQuestion,
  ORDER_UNITS,
  REFERENCES,
  referenceQuestion,
  UNIT_ITEMS,
  unitQuestion,
  type Length,
} from './measureSense';
import { decimal, stepOf } from './testHelpers';

const SAMPLES = 1000;
const DASH = ' – ';

const length = (value: string, unit: string): Length => ({ value: decimal(value), unit });

describe('REFERENCES', () => {
  const base: Record<string, number> = {
    ml: 1,
    L: 1000,
    cm: 1,
    m: 100,
    'km/u': 1,
    g: 1,
    kg: 1000,
    miljoen: 1e6,
    miljard: 1e9,
  };
  const sizeOf = (option: string) => {
    const [value, unit] = option.split(' ');
    return Number(value!.replace(',', '.')) * base[unit!]!;
  };

  it('has the nine Cito references with four options in ascending size', () => {
    expect(REFERENCES).toHaveLength(9);
    for (const { options, answer } of REFERENCES) {
      expect(new Set(options).size).toBe(4);
      expect(options).toContain(answer);
      const sizes = options.map(sizeOf);
      expect(sizes).toEqual([...sizes].sort((a, b) => a - b));
    }
  });

  it('explains with a sentence', () => {
    const step = stepOf(referenceQuestion(2));
    expect(step.prompt).toBe('Hoe hoog is een deur ongeveer?');
    expect(step.options).toEqual(['1 m', '2 m', '4 m', '20 m']);
    expect(step.check('2 m').correct).toBe(true);
    expect(step.check('1 m').explanation).toBe('Een deur is ongeveer 2 m hoog.');
  });
});

describe('UNIT_ITEMS', () => {
  it('has 14 items with four unique options, the answer among them', () => {
    expect(UNIT_ITEMS).toHaveLength(14);
    for (const { options, answer } of UNIT_ITEMS) {
      expect(new Set(options).size).toBe(4);
      expect(options).toContain(answer);
    }
  });

  it('puts the unit in the slot and fills it in on error', () => {
    const question = unitQuestion(0);
    expect(question.steps[0]!.prompt).toBe(`In een drinkglas past ongeveer 200 ${SLOT}.`);
    const step = stepOf(question);
    expect(step.check('ml').correct).toBe(true);
    expect(step.check('dl').explanation).toBe('In een drinkglas past ongeveer 200 ml (2 dl).');
    expect(step.options).toEqual(['ml', 'cl', 'dl', 'L']);
  });

  it('places the second unit before the end of the sentence', () => {
    const index = UNIT_ITEMS.findIndex((item) => item.before.startsWith('Een voetbalveld'));
    expect(stepOf(unitQuestion(index)).check('').explanation).toBe(
      'Een voetbalveld is ongeveer 7000 m² (0,7 ha) groot.',
    );
  });
});

describe('instruments', () => {
  const draws = (what: string) => {
    const index = INSTRUMENT_ITEMS.findIndex((item) => item.what === what);
    const rng = createRng(6);
    return Array.from({ length: SAMPLES }, () => instrumentQuestion(index, rng));
  };

  it('has 8 items', () => {
    expect(INSTRUMENT_ITEMS).toHaveLength(8);
  });

  it('never offers the excluded neighbour and always the answer', () => {
    for (const question of draws('de lengte van een potlood')) {
      const step = stepOf(question);
      expect(step.prompt).toBe('Waarmee meet je de lengte van een potlood?');
      expect(step.options).not.toContain('meetlint');
      expect(step.options).toContain('liniaal');
      expect(new Set(step.options).size).toBe(4);
    }
    for (const question of draws('de breedte van een kamer')) {
      expect(stepOf(question).options).not.toContain('liniaal');
    }
  });

  it('explains with a sentence', () => {
    const question = draws('de lengte van een potlood')[0]!;
    expect(stepOf(question).check('meetlint').explanation).toBe(
      'De lengte van een potlood meet je met een liniaal.',
    );
  });
});

describe('orderingOptions', () => {
  const lengths = [
    length('5,2', 'mm'),
    length('76', 'cm'),
    length('2', 'm'),
    length('104', 'dm'),
  ];

  it('contains the right order and the order of the bare numbers', () => {
    const options = orderingOptions(lengths, 'up', createRng(1));
    expect(options).toHaveLength(4);
    expect(new Set(options).size).toBe(4);
    expect(options).toContain(['5,2 mm', '76 cm', '2 m', '104 dm'].join(DASH));
    expect(options).toContain(['2 m', '5,2 mm', '76 cm', '104 dm'].join(DASH));
  });

  it('turns the answer around for groot naar klein', () => {
    const options = orderingOptions(lengths, 'down', createRng(1));
    expect(options).toContain(['104 dm', '2 m', '76 cm', '5,2 mm'].join(DASH));
  });

  it('offers neighbour swaps of the right order', () => {
    const right = ['5,2 mm', '76 cm', '2 m', '104 dm'];
    const swaps = [0, 1, 2].map((index) => {
      const copy = [...right];
      [copy[index], copy[index + 1]] = [copy[index + 1]!, copy[index]!];
      return copy.join(DASH);
    });
    for (let seed = 1; seed <= 20; seed++) {
      const options = orderingOptions(lengths, 'up', createRng(seed));
      expect(options.filter((option) => swaps.includes(option))).toHaveLength(2);
    }
  });

  it('never repeats the bare order as a swap', () => {
    // The bare order 1 mm – 6 dm – 50 cm – 60 m is itself a swap of the right order.
    const swapped = [length('1', 'mm'), length('50', 'cm'), length('6', 'dm'), length('60', 'm')];
    for (let seed = 1; seed <= 20; seed++) {
      const options = orderingOptions(swapped, 'up', createRng(seed));
      expect(new Set(options).size).toBe(4);
      expect(options).toContain(['1 mm', '50 cm', '6 dm', '60 m'].join(DASH));
      expect(options).toContain(['1 mm', '6 dm', '50 cm', '60 m'].join(DASH));
    }
  });
});

describe('orderingQuestion', () => {
  it('explains with all lengths in cm, in the right order', () => {
    const lengths = [length('5,2', 'mm'), length('76', 'cm'), length('2', 'm'), length('104', 'dm')];
    expect(stepOf(orderingQuestion(lengths, 'up', createRng(1))).check('').explanation).toBe(
      'in cm: 0,52 – 76 – 200 – 1040',
    );
    expect(stepOf(orderingQuestion(lengths, 'down', createRng(1))).check('').explanation).toBe(
      'in cm: 1040 – 200 – 76 – 0,52',
    );
  });
});

describe('generateMeasureSense', () => {
  const rng = createRng(3);
  const questions = Array.from({ length: SAMPLES }, () => generateMeasureSense(rng));
  const form = (name: string) => questions.filter((q) => q.key.startsWith(`measureSense:${name}:`));

  it('uses the four forms about equally often and always four unique options', () => {
    for (const name of ['reference', 'instrument', 'unit', 'order']) {
      expect(form(name).length / SAMPLES).toBeGreaterThan(0.19);
      expect(form(name).length / SAMPLES).toBeLessThan(0.31);
    }
    for (const question of questions) {
      const step = question.steps[0]!;
      expect(question.topic).toBe('measureSense');
      expect(step.kind).toBe('choice');
      expect(new Set(step.options).size).toBe(4);
      expect(step.options).toContain(step.check('').expected);
    }
  });

  it('uses every reference and unit item', () => {
    expect(new Set(form('reference').map((q) => q.key)).size).toBe(REFERENCES.length);
    expect(new Set(form('unit').map((q) => q.key)).size).toBe(UNIT_ITEMS.length);
  });

  describe('ordering', () => {
    const parse = (question: Question) => {
      const [, , direction, ...values] = question.key.split(':');
      return { direction, values: values.map((value) => decimal(value)) };
    };
    const ordering = form('order');
    const unitMm: Record<string, number> = { mm: 1, cm: 10, dm: 100, m: 1000 };

    it('uses the four units once each with values in range', () => {
      expect(ORDER_UNITS).toEqual(['mm', 'cm', 'dm', 'm']);
      expect(ordering.length).toBeGreaterThan(100);
      for (const question of ordering) {
        const { direction, values } = parse(question);
        expect(['up', 'down']).toContain(direction);
        expect(values).toHaveLength(4);
        const sizes = values.map((value, index) => {
          const size = multiply(value, fromInteger(unitMm[ORDER_UNITS[index]!]!));
          return Number(size.num) / Number(size.den);
        });
        values.forEach((value, index) => {
          expect(decimalPlaces(value)!).toBeLessThanOrEqual(1);
          expect(compare(value, decimal('0,1'))).toBeGreaterThanOrEqual(0);
          expect(compare(value, fromInteger(999))).toBeLessThanOrEqual(0);
          expect(sizes[index]!).toBeGreaterThanOrEqual(5);
          expect(sizes[index]!).toBeLessThanOrEqual(20_000);
        });
        const sorted = [...sizes].sort((a, b) => a - b);
        for (let index = 1; index < sorted.length; index++) {
          expect(sorted[index]! / sorted[index - 1]!).toBeGreaterThanOrEqual(1.1 - 1e-9);
        }
      }
    });

    it('has a bare-number order that differs from the right order', () => {
      for (const question of ordering) {
        const { direction, values } = parse(question);
        const lengthsOf = values.map((value, index) => ({ value, unit: ORDER_UNITS[index]! }));
        const options = question.steps[0]!.options!;
        const answer = question.steps[0]!.check('').expected;
        const bare = [...lengthsOf]
          .sort((a, b) => compare(a.value, b.value) * (direction === 'up' ? 1 : -1))
          .map(({ value, unit }) => `${formatRational(value)} ${unit}`)
          .join(DASH);
        expect(bare).not.toBe(answer);
        expect(options).toContain(bare);
      }
    });

    it('explains in cm', () => {
      for (const question of ordering) {
        expect(question.steps[0]!.check('').explanation!.startsWith('in cm: ')).toBe(true);
      }
    });

    it('uses both directions in the prompt', () => {
      const prompts = new Set(ordering.map((q) => q.steps[0]!.prompt));
      expect(prompts).toEqual(
        new Set(['Welke rij staat van klein naar groot?', 'Welke rij staat van groot naar klein?']),
      );
    });
  });

});
