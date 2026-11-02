import { describe, expect, it } from 'vitest';
import { createRng } from '../random';
import { add, fromInteger, multiply } from '../rational';
import type { Question } from '../types';
import {
  cylinderQuestion,
  generateSurfaceArea,
  prismQuestion,
  pyramidQuestion,
  sphereQuestion,
  TRIPLES,
} from './surfaceArea';
import { answerOf, decimal, stepOf } from './testHelpers';

describe('question text', () => {
  it.each<[string, () => Question, string, string, string, string]>([
    [
      'piramide 3, hoogte 5',
      () => pyramidQuestion(3, 5, 'm', 'height'),
      'Een piramide heeft een vierkant grondvlak van 3 m bij 3 m. Elk zijvlak is een driehoek met een basis van 3 m en een hoogte van 5 m. Hoe groot is de totale oppervlakte?',
      '39',
      'm²',
      'grondvlak 3 × 3 = 9, zijvlak 3 × 5 : 2 = 7,5 → 9 + 4 × 7,5 = 39',
    ],
    [
      'piramide 3, zijvlak 7,5 gegeven',
      () => pyramidQuestion(3, 5, 'm', 'area'),
      'Een piramide heeft een vierkant grondvlak van 3 m bij 3 m. Elk van de vier zijvlakken heeft een oppervlakte van 7,5 m². Hoe groot is de totale oppervlakte?',
      '39',
      'm²',
      'grondvlak 3 × 3 = 9 → 9 + 4 × 7,5 = 39',
    ],
    [
      'piramide 12, hoogte 20 cm',
      () => pyramidQuestion(12, 20, 'cm', 'height'),
      'Een piramide heeft een vierkant grondvlak van 12 cm bij 12 cm. Elk zijvlak is een driehoek met een basis van 12 cm en een hoogte van 20 cm. Hoe groot is de totale oppervlakte?',
      '624',
      'cm²',
      'grondvlak 12 × 12 = 144, zijvlak 12 × 20 : 2 = 120 → 144 + 4 × 120 = 624',
    ],
    [
      'tent 3-4-5, 6 m',
      () => prismQuestion('tent', [3, 4, 5], 6),
      'Een tent is een prisma. De voorkant en achterkant zijn driehoeken met zijden van 3 m, 4 m en 5 m en een rechte hoek. De tent is 6 m lang. Hoe groot is de totale oppervlakte?',
      '84',
      'm²',
      '2 driehoeken: 2 × (3 × 4 : 2) = 12, 3 rechthoeken: (3 + 4 + 5) × 6 = 72 → 12 + 72 = 84',
    ],
    [
      'doos 5-12-13, 2 cm',
      () => prismQuestion('doos', [5, 12, 13], 2),
      'Een doos is een prisma. De voorkant en achterkant zijn driehoeken met zijden van 5 cm, 12 cm en 13 cm en een rechte hoek. De doos is 2 cm lang. Hoe groot is de totale oppervlakte?',
      '120',
      'cm²',
      '2 driehoeken: 2 × (5 × 12 : 2) = 60, 3 rechthoeken: (5 + 12 + 13) × 2 = 60 → 60 + 60 = 120',
    ],
    [
      'blik 25,1 en 225,3',
      () => cylinderQuestion('blik', decimal('25,1'), decimal('225,3')),
      'Een blik heeft een grondvlak van 25,1 cm² en een mantel van 225,3 cm². Hoe groot is de totale oppervlakte?',
      '275,5',
      'cm²',
      '225,3 + 2 × 25,1 = 275,5',
    ],
    [
      'ton in dm²',
      () => cylinderQuestion('ton', decimal('80'), decimal('500')),
      'Een ton heeft een grondvlak van 80 dm² en een mantel van 500 dm². Hoe groot is de totale oppervlakte?',
      '660',
      'dm²',
      '500 + 2 × 80 = 660',
    ],
    [
      'bol, straal 5',
      () => sphereQuestion(5, 'radius'),
      'Een bol heeft een straal van 5 cm. De oppervlakte van een bol is 4 × π × straal × straal. Neem π = 3,14. Hoe groot is de oppervlakte?',
      '314',
      'cm²',
      '4 × 5 × 5 = 100 → 100 × 3,14 = 314',
    ],
    [
      'bol, diameter 10',
      () => sphereQuestion(5, 'diameter'),
      'Een bol heeft een diameter van 10 cm. De oppervlakte van een bol is 4 × π × straal × straal. Neem π = 3,14. Hoe groot is de oppervlakte?',
      '314',
      'cm²',
      'straal = 10 : 2 = 5 → 4 × 5 × 5 = 100 → 100 × 3,14 = 314',
    ],
    [
      'bol, straal 2',
      () => sphereQuestion(2, 'radius'),
      'Een bol heeft een straal van 2 cm. De oppervlakte van een bol is 4 × π × straal × straal. Neem π = 3,14. Hoe groot is de oppervlakte?',
      '50,24',
      'cm²',
      '4 × 2 × 2 = 16 → 16 × 3,14 = 50,24',
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

  it('has keys of the form, the context and the numbers', () => {
    expect(pyramidQuestion(3, 5, 'm', 'height').key).toBe('surfaceArea:pyramid:height:m:3:5');
    expect(pyramidQuestion(3, 5, 'cm', 'area').key).toBe('surfaceArea:pyramid:area:cm:3:5');
    expect(prismQuestion('tent', [3, 4, 5], 6).key).toBe('surfaceArea:prism:tent:3:4:5:6');
    expect(cylinderQuestion('blik', decimal('25,1'), decimal('225,3')).key).toBe(
      'surfaceArea:cylinder:blik:25,1:225,3',
    );
    expect(sphereQuestion(5, 'diameter').key).toBe('surfaceArea:sphere:diameter:5');
    expect(pyramidQuestion(3, 5, 'm', 'height').topic).toBe('surfaceArea');
  });
});

describe('generateSurfaceArea', () => {
  const rng = createRng(6101);
  const questions = Array.from({ length: 4000 }, () => generateSurfaceArea(rng));
  const parts = ({ key }: Question) => key.split(':').slice(1);
  const of = (form: string) => questions.filter((question) => parts(question)[0] === form);

  it('creates single-step number questions that accept their own answer', () => {
    for (const question of questions) {
      expect(question.topic).toBe('surfaceArea');
      expect(question.steps).toHaveLength(1);
      const step = stepOf(question);
      expect(step.kind).toBe('number');
      const result = step.check(step.check('').expected);
      expect(result.correct, question.key).toBe(true);
      expect(result.explanation, question.key).toBeTruthy();
    }
  });

  it('uses pyramid, prism, cylinder and sphere about a quarter each', () => {
    for (const form of ['pyramid', 'prism', 'cylinder', 'sphere']) {
      expect(Math.abs(of(form).length / questions.length - 1 / 4), form).toBeLessThan(0.04);
    }
  });

  it('draws spheres with r in {1, 2, 5, 10}, radius or diameter 50/50, answer 4 × 3,14 × r²', () => {
    const seen = new Set<string>();
    for (const question of of('sphere')) {
      const [, given, rText] = parts(question);
      const r = Number(rText);
      expect([1, 2, 5, 10]).toContain(r);
      expect(['radius', 'diameter']).toContain(given);
      expect(answerOf(question), question.key).toEqual(
        multiply(decimal('3,14'), fromInteger(4 * r * r)),
      );
      seen.add(`${given}:${r}`);
    }
    expect(seen.size).toBe(8);
    const diameters = of('sphere').filter((question) => parts(question)[1] === 'diameter');
    expect(Math.abs(diameters.length / of('sphere').length - 0.5)).toBeLessThan(0.07);
  });

  it('draws pyramids with z in [2, 12], h in [z, 20], 50% side area given, m and cm 50/50', () => {
    const pyramids = of('pyramid').map(parts);
    for (const [, , unit, z, h] of pyramids) {
      expect(['m', 'cm']).toContain(unit);
      expect(Number(z)).toBeGreaterThanOrEqual(2);
      expect(Number(z)).toBeLessThanOrEqual(12);
      expect(Number(h)).toBeGreaterThanOrEqual(Number(z));
      expect(Number(h)).toBeLessThanOrEqual(20);
    }
    const given = pyramids.filter(([, given]) => given === 'area').length / pyramids.length;
    expect(Math.abs(given - 0.5)).toBeLessThan(0.06);
    const cm = pyramids.filter(([, , unit]) => unit === 'cm').length / pyramids.length;
    expect(Math.abs(cm - 0.5)).toBeLessThan(0.06);
  });

  it('answers a pyramid with z² + 2 × z × h', () => {
    for (const question of of('pyramid')) {
      const [, , , z, h] = parts(question).map(Number);
      expect(answerOf(question), question.key).toEqual(fromInteger(z! * z! + 2 * z! * h!));
    }
  });

  it('draws tent (3-4-5, 2-6 m) and doos (any triple, 5-20 cm) 50/50 with the unit of its context', () => {
    const prisms = of('prism');
    const seen = new Set<string>();
    const tents = prisms.filter((question) => parts(question)[1] === 'tent').length;
    expect(Math.abs(tents / prisms.length - 0.5)).toBeLessThan(0.06);
    for (const question of prisms) {
      const [, context, a, b, c, length] = parts(question);
      seen.add(`${context}:${a}-${b}-${c}`);
      expect(TRIPLES.map((triple) => triple.join('-'))).toContain(`${a}-${b}-${c}`);
      const [min, max] = context === 'tent' ? [2, 6] : [5, 20];
      expect(Number(length)).toBeGreaterThanOrEqual(min);
      expect(Number(length)).toBeLessThanOrEqual(max);
      if (context === 'tent') expect(`${a}-${b}-${c}`).toBe('3-4-5');
      const total = Number(a) * Number(b) + (Number(a) + Number(b) + Number(c)) * Number(length);
      expect(answerOf(question), question.key).toEqual(fromInteger(total));
      expect(stepOf(question).suffix).toBe(context === 'doos' ? 'cm²' : 'm²');
    }
    expect(seen).toEqual(new Set(['tent:3-4-5', 'doos:3-4-5', 'doos:6-8-10', 'doos:5-12-13']));
  });

  it('draws cylinders with base [5, 80] and mantle [50, 500] with 1 decimal', () => {
    const contexts = new Set<string>();
    for (const question of of('cylinder')) {
      const [, context, base, mantle] = parts(question);
      contexts.add(context!);
      const b = decimal(base!);
      const m = decimal(mantle!);
      expect(multiply(b, fromInteger(10)).den, question.key).toBe(1n);
      expect(multiply(m, fromInteger(10)).den, question.key).toBe(1n);
      expect(Number(base!.replace(',', '.'))).toBeGreaterThanOrEqual(5);
      expect(Number(base!.replace(',', '.'))).toBeLessThanOrEqual(80);
      expect(Number(mantle!.replace(',', '.'))).toBeGreaterThanOrEqual(50);
      expect(Number(mantle!.replace(',', '.'))).toBeLessThanOrEqual(500);
      expect(answerOf(question), question.key).toEqual(add(m, multiply(fromInteger(2), b)));
      expect(stepOf(question).suffix).toBe(context === 'ton' ? 'dm²' : 'cm²');
    }
    expect(contexts).toEqual(new Set(['blik', 'koker', 'ton']));
  });

  it('is deterministic for a fixed seed', () => {
    const seeded = (seed: number) => {
      const random = createRng(seed);
      return Array.from({ length: 50 }, () => generateSurfaceArea(random).key);
    };
    expect(seeded(7)).toEqual(seeded(7));
    expect(seeded(7)).not.toEqual(seeded(8));
  });
});
