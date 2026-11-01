import { describe, expect, it } from 'vitest';
import { createRng } from '../random';
import { compare, fromInteger } from '../rational';
import type { Question } from '../types';
import {
  backQuestion,
  factorQuestion,
  generateScalingSolids,
  modelQuestion,
  valueQuestion,
} from './scalingSolids';
import { answerOf, decimal, stepOf } from './testHelpers';

describe('question text', () => {
  it.each<[string, () => Question, string, string, string, string]>([
    [
      'kubus x3 inhoud',
      () => factorQuestion('kubus', 'inhoud', 3, 'lang'),
      'De ribben van een kubus worden 3 keer zo lang. Hoeveel keer zo groot wordt de inhoud?',
      '27',
      'keer',
      'inhoud: 3 × 3 × 3 = 27 keer',
    ],
    [
      'kubus x3 oppervlakte',
      () => factorQuestion('kubus', 'oppervlakte', 3, 'lang'),
      'De ribben van een kubus worden 3 keer zo lang. Hoeveel keer zo groot wordt de oppervlakte?',
      '9',
      'keer',
      'oppervlakte: 3 × 3 = 9 keer',
    ],
    [
      'vierkant x3 omtrek',
      () => factorQuestion('vierkant', 'omtrek', 3, 'lang'),
      'De zijden van een vierkant worden 3 keer zo lang. Hoeveel keer zo groot wordt de omtrek?',
      '3',
      'keer',
      'omtrek: 3 keer',
    ],
    [
      'balk x10 inhoud',
      () => factorQuestion('balk', 'inhoud', 10, 'lang'),
      'De ribben van een balk worden 10 keer zo lang. Hoeveel keer zo groot wordt de inhoud?',
      '1000',
      'keer',
      'inhoud: 10 × 10 × 10 = 1000 keer',
    ],
    [
      'kubus 2 keer zo klein inhoud',
      () => factorQuestion('kubus', 'inhoud', 2, 'klein'),
      'De ribben van een kubus worden 2 keer zo klein. Hoeveel keer zo klein wordt de inhoud?',
      '8',
      'keer',
      'inhoud: 2 × 2 × 2 = 8 keer',
    ],
    [
      'rechthoek 4 keer zo klein oppervlakte',
      () => factorQuestion('rechthoek', 'oppervlakte', 4, 'klein'),
      'De zijden van een rechthoek worden 4 keer zo klein. Hoeveel keer zo klein wordt de oppervlakte?',
      '16',
      'keer',
      'oppervlakte: 4 × 4 = 16 keer',
    ],
    [
      'kubus 2 cm, x3 inhoud',
      () => valueQuestion('kubus', [2], 'inhoud', 3),
      'Een kubus met ribben van 2 cm heeft een inhoud van 8 cm³. De ribben worden 3 keer zo lang. Hoe groot wordt de inhoud?',
      '216',
      'cm³',
      'inhoud: 3 × 3 × 3 = 27 keer → 8 × 27 = 216',
    ],
    [
      'vierkant 5 cm, x2 omtrek',
      () => valueQuestion('vierkant', [5], 'omtrek', 2),
      'Een vierkant met zijden van 5 cm heeft een omtrek van 20 cm. De zijden worden 2 keer zo lang. Hoe groot wordt de omtrek?',
      '40',
      'cm',
      'omtrek: 2 keer → 20 × 2 = 40',
    ],
    [
      'rechthoek 3 x 4, x5 oppervlakte',
      () => valueQuestion('rechthoek', [3, 4], 'oppervlakte', 5),
      'Een rechthoek met zijden van 3 cm en 4 cm heeft een oppervlakte van 12 cm². De zijden worden 5 keer zo lang. Hoe groot wordt de oppervlakte?',
      '300',
      'cm²',
      'oppervlakte: 5 × 5 = 25 keer → 12 × 25 = 300',
    ],
    [
      'balk 2 x 3 x 4, x2 oppervlakte',
      () => valueQuestion('balk', [2, 3, 4], 'oppervlakte', 2),
      'Een balk met ribben van 2 cm, 3 cm en 4 cm heeft een oppervlakte van 52 cm². De ribben worden 2 keer zo lang. Hoe groot wordt de oppervlakte?',
      '208',
      'cm²',
      'oppervlakte: 2 × 2 = 4 keer → 52 × 4 = 208',
    ],
    [
      'maquette 10x, 0,5 m²',
      () => modelQuestion(10, decimal('0,5')),
      'Een maquette is 10 keer zo klein als het echte gebouw. Het dak van de maquette is 0,5 m². Hoe groot is het echte dak?',
      '50',
      'm²',
      'oppervlakte: 10 × 10 = 100 keer → 0,5 × 100 = 50',
    ],
    [
      'inhoud x8',
      () => backQuestion('kubus', 'inhoud', 2),
      'De inhoud van een kubus wordt 8 keer zo groot. Hoeveel keer zo lang worden de ribben?',
      '2',
      'keer',
      '8 = 2 × 2 × 2 → 2 keer',
    ],
    [
      'oppervlakte x9',
      () => backQuestion('rechthoek', 'oppervlakte', 3),
      'De oppervlakte van een rechthoek wordt 9 keer zo groot. Hoeveel keer zo lang worden de zijden?',
      '3',
      'keer',
      '9 = 3 × 3 → 3 keer',
    ],
  ])('%s', (_label, make, prompt, answer, suffix, explanation) => {
    const step = stepOf(make());
    expect(step.kind).toBe('number');
    expect(step.prompt).toBe(prompt);
    expect(step.suffix).toBe(suffix);
    expect(step.check(answer).correct).toBe(true);
    expect(step.check('').expected).toBe(answer);
    expect(step.check('1').explanation).toBe(explanation);
  });

  it('has keys of the form, the figure and the numbers', () => {
    expect(factorQuestion('kubus', 'inhoud', 3, 'lang').key).toBe(
      'scalingSolids:factor:kubus:inhoud:lang:3',
    );
    expect(valueQuestion('balk', [2, 3, 4], 'inhoud', 3).key).toBe(
      'scalingSolids:value:balk:inhoud:2:3:4:3',
    );
    expect(modelQuestion(10, decimal('0,5')).key).toBe('scalingSolids:model:10:0,5');
    expect(backQuestion('kubus', 'inhoud', 2).key).toBe('scalingSolids:back:kubus:inhoud:2');
    expect(backQuestion('kubus', 'inhoud', 2).topic).toBe('scalingSolids');
  });
});

describe('generateScalingSolids', () => {
  const rng = createRng(5101);
  const questions = Array.from({ length: 4000 }, () => generateScalingSolids(rng));
  const keys = (form: string) =>
    questions.filter(({ key }) => key.startsWith(`scalingSolids:${form}:`));
  const parts = ({ key }: Question) => key.split(':').slice(1);

  it('creates single-step number questions that accept their own answer', () => {
    for (const question of questions) {
      expect(question.topic).toBe('scalingSolids');
      expect(question.steps).toHaveLength(1);
      const step = stepOf(question);
      expect(step.kind).toBe('number');
      const result = step.check(step.check('').expected);
      expect(result.correct, question.key).toBe(true);
      expect(result.explanation, question.key).toBeTruthy();
    }
  });

  it('uses factor, value (incl. model) and back about a third each', () => {
    const value = keys('value').length + keys('model').length;
    for (const count of [keys('factor').length, value, keys('back').length]) {
      expect(Math.abs(count / questions.length - 1 / 3)).toBeLessThan(0.04);
    }
  });

  it('draws the model form for about half of the value form', () => {
    const model = keys('model').length;
    const value = keys('value').length + model;
    expect(Math.abs(model / value - 0.5)).toBeLessThan(0.07);
  });

  it('draws every figure about equally often in the factor form', () => {
    const factor = keys('factor').map((question) => parts(question)[1]);
    for (const figure of ['vierkant', 'rechthoek', 'kubus', 'balk']) {
      const share = factor.filter((item) => item === figure).length / factor.length;
      expect(Math.abs(share - 0.25), figure).toBeLessThan(0.06);
    }
  });

  it('asks the omtrek in about 20% of the 2D factor and value exercises, only for 2D', () => {
    const flat = [...keys('factor'), ...keys('value')].filter((question) =>
      ['vierkant', 'rechthoek'].includes(parts(question)[1]!),
    );
    const omtrek = flat.filter((question) => parts(question)[2] === 'omtrek').length;
    expect(Math.abs(omtrek / flat.length - 0.2)).toBeLessThan(0.05);
    for (const question of [...keys('factor'), ...keys('value')]) {
      if (['kubus', 'balk'].includes(parts(question)[1]!)) {
        expect(['oppervlakte', 'inhoud']).toContain(parts(question)[2]);
      } else {
        expect(['omtrek', 'oppervlakte']).toContain(parts(question)[2]);
      }
    }
  });

  it('draws factors from the spec sets, klein 25%', () => {
    const factor = keys('factor').map(parts);
    const lang = factor.filter((item) => item[3] === 'lang');
    const klein = factor.filter((item) => item[3] === 'klein');
    expect(Math.abs(klein.length / factor.length - 0.25)).toBeLessThan(0.05);
    expect(new Set(lang.map((item) => item[4]))).toEqual(new Set(['2', '3', '4', '5', '10']));
    expect(new Set(klein.map((item) => item[4]))).toEqual(new Set(['2', '3', '4', '5']));
  });

  it('keeps value lengths whole in [1, 10], k in 2..5 and the answer at most 10 000', () => {
    for (const question of keys('value')) {
      const [, , , ...numbers] = parts(question);
      const k = Number(numbers.at(-1));
      const lengths = numbers.slice(0, -1).map(Number);
      expect([2, 3, 4, 5]).toContain(k);
      for (const length of lengths) {
        expect(Number.isInteger(length) && length >= 1 && length <= 10, question.key).toBe(true);
      }
      expect(compare(answerOf(question), fromInteger(10_000)), question.key).toBeLessThanOrEqual(0);
    }
  });

  it('keeps the model k in {2, 5, 10, 20}, the area at most 1 decimal and the answer at most 5000', () => {
    const models = keys('model');
    expect(new Set(models.map((question) => parts(question)[1]))).toEqual(
      new Set(['2', '5', '10', '20']),
    );
    for (const question of models) {
      const area = decimal(parts(question)[2]!.replace(' ', ''));
      expect(area.den === 1n || 10n % area.den === 0n, question.key).toBe(true);
      expect(compare(answerOf(question), fromInteger(5000)), question.key).toBeLessThanOrEqual(0);
    }
  });

  it('draws back factors k² for k in [2, 10] and k³ for k in {2, 3, 4, 5, 10}', () => {
    const back = keys('back').map(parts);
    const area = back.filter((item) => item[2] === 'oppervlakte').map((item) => Number(item[3]));
    const volume = back.filter((item) => item[2] === 'inhoud').map((item) => Number(item[3]));
    expect(new Set(area)).toEqual(new Set([2, 3, 4, 5, 6, 7, 8, 9, 10]));
    expect(new Set(volume)).toEqual(new Set([2, 3, 4, 5, 10]));
    for (const item of back.filter((item) => ['kubus', 'balk'].includes(item[1]!))) {
      expect(['oppervlakte', 'inhoud']).toContain(item[2]);
    }
    for (const item of back.filter((item) => ['vierkant', 'rechthoek'].includes(item[1]!))) {
      expect(item[2]).toBe('oppervlakte');
    }
  });

  it('is deterministic for a fixed seed', () => {
    const seeded = (seed: number) => {
      const random = createRng(seed);
      return Array.from({ length: 50 }, () => generateScalingSolids(random).key);
    };
    expect(seeded(7)).toEqual(seeded(7));
    expect(seeded(7)).not.toEqual(seeded(8));
  });
});
