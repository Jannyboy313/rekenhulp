import { describe, expect, it } from 'vitest';
import { createRng } from '../random';
import { fromInteger, rational } from '../rational';
import type { Question } from '../types';
import {
  clockAngleQuestion,
  generateAngleReasoning,
  isoscelesRatioQuestion,
  polygonSidesQuestion,
  ratioQuestion,
  regularExteriorQuestion,
  triangleExteriorQuestion,
} from './angleReasoning';
import { answerOf, decimal, stepOf } from './testHelpers';

describe('question text', () => {
  it.each<[string, () => Question, string, string, string, string]>([
    [
      'driehoek 50 en 60',
      () => triangleExteriorQuestion(50, 60),
      'Een driehoek heeft hoeken van 50° en 60°. Hoe groot is de buitenhoek bij de derde hoek?',
      '110',
      '°',
      'buitenhoek = som van de twee andere hoeken: 50 + 60 = 110',
    ],
    [
      'regelmatige achthoek',
      () => regularExteriorQuestion(8),
      'Hoe groot is de buitenhoek van een regelmatige achthoek?',
      '45',
      '°',
      '360 : 8 = 45',
    ],
    [
      'aantal hoeken bij 140°',
      () => polygonSidesQuestion(9),
      'Een regelmatige veelhoek heeft hoeken van 140°. Hoeveel hoeken heeft hij?',
      '9',
      'hoeken',
      'buitenhoek 180 − 140 = 40 → 360 : 40 = 9',
    ],
    [
      'verhouding 2 : 3 : 4 grootste',
      () => ratioQuestion([2, 3, 4], 'grootste'),
      'De hoeken van een driehoek verhouden zich als 2 : 3 : 4. Hoe groot is de grootste hoek?',
      '80',
      '°',
      '2 + 3 + 4 = 9 delen → 1 deel = 180 : 9 = 20 → 4 × 20 = 80',
    ],
    [
      'verhouding 2 : 3 : 4 kleinste',
      () => ratioQuestion([4, 2, 3], 'kleinste'),
      'De hoeken van een driehoek verhouden zich als 4 : 2 : 3. Hoe groot is de kleinste hoek?',
      '40',
      '°',
      '4 + 2 + 3 = 9 delen → 1 deel = 180 : 9 = 20 → 2 × 20 = 40',
    ],
    [
      'verhouding 2 : 3 : 4 middelste',
      () => ratioQuestion([2, 3, 4], 'middelste'),
      'De hoeken van een driehoek verhouden zich als 2 : 3 : 4. Hoe groot is de middelste hoek?',
      '60',
      '°',
      '2 + 3 + 4 = 9 delen → 1 deel = 180 : 9 = 20 → 3 × 20 = 60',
    ],
    [
      'tophoek 3 keer basishoek',
      () => isoscelesRatioQuestion(3, 'tophoek'),
      'In een gelijkbenige driehoek is de tophoek 3 keer zo groot als een basishoek. Hoe groot is de tophoek?',
      '108',
      '°',
      'tophoek 3 delen, twee basishoeken 1 deel elk: 3 + 1 + 1 = 5 delen → 1 deel = 180 : 5 = 36 → 3 × 36 = 108',
    ],
    [
      'tophoek 3 keer basishoek, basishoek',
      () => isoscelesRatioQuestion(3, 'basishoek'),
      'In een gelijkbenige driehoek is de tophoek 3 keer zo groot als een basishoek. Hoe groot is een basishoek?',
      '36',
      '°',
      'tophoek 3 delen, twee basishoeken 1 deel elk: 3 + 1 + 1 = 5 delen → 1 deel = 180 : 5 = 36',
    ],
    [
      'tophoek 6 keer basishoek (halve graden)',
      () => isoscelesRatioQuestion(6, 'basishoek'),
      'In een gelijkbenige driehoek is de tophoek 6 keer zo groot als een basishoek. Hoe groot is een basishoek?',
      '22,5',
      '°',
      'tophoek 6 delen, twee basishoeken 1 deel elk: 6 + 1 + 1 = 8 delen → 1 deel = 180 : 8 = 22,5',
    ],
    [
      'klok 4:20',
      () => clockAngleQuestion(4, 20),
      'Hoe groot is de kleinste hoek tussen de wijzers om 4:20?',
      '10',
      '°',
      'grote wijzer: 20 × 6 = 120°, kleine wijzer: 4 × 30 + 20 × 0,5 = 130° → 130 − 120 = 10',
    ],
    [
      'klok 4:25',
      () => clockAngleQuestion(4, 25),
      'Hoe groot is de kleinste hoek tussen de wijzers om 4:25?',
      '17,5',
      '°',
      'grote wijzer: 25 × 6 = 150°, kleine wijzer: 4 × 30 + 25 × 0,5 = 132,5° → 150 − 132,5 = 17,5',
    ],
    [
      'klok 12:20 (de andere kant op)',
      () => clockAngleQuestion(12, 20),
      'Hoe groot is de kleinste hoek tussen de wijzers om 12:20?',
      '110',
      '°',
      'grote wijzer: 20 × 6 = 120°, kleine wijzer: 0 × 30 + 20 × 0,5 = 10° → 120 − 10 = 110',
    ],
    [
      'klok 7:05 (meer dan 180°)',
      () => clockAngleQuestion(7, 5),
      'Hoe groot is de kleinste hoek tussen de wijzers om 7:05?',
      '177,5',
      '°',
      'grote wijzer: 5 × 6 = 30°, kleine wijzer: 7 × 30 + 5 × 0,5 = 212,5° → 212,5 − 30 = 182,5 is meer dan 180° → 360 − 182,5 = 177,5',
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

  it('has keys of the form and the numbers', () => {
    expect(triangleExteriorQuestion(50, 60).key).toBe('angleReasoning:exterior:triangle:50:60');
    expect(regularExteriorQuestion(8).key).toBe('angleReasoning:exterior:regular:8');
    expect(polygonSidesQuestion(9).key).toBe('angleReasoning:exterior:count:9');
    expect(ratioQuestion([2, 3, 4], 'grootste').key).toBe('angleReasoning:ratio:2:3:4:grootste');
    expect(isoscelesRatioQuestion(3, 'tophoek').key).toBe('angleReasoning:isosceles:3:tophoek');
    expect(clockAngleQuestion(4, 20).key).toBe('angleReasoning:clock:4:20');
    expect(clockAngleQuestion(4, 20).topic).toBe('angleReasoning');
  });
});

describe('generateAngleReasoning', () => {
  const rng = createRng(8101);
  const questions = Array.from({ length: 6000 }, () => generateAngleReasoning(rng));
  const parts = ({ key }: Question) => key.split(':').slice(1);
  const of = (form: string, variant?: string) =>
    questions.filter((question) => {
      const [first, second] = parts(question);
      return first === form && (variant === undefined || second === variant);
    });

  it('creates single-step number questions that accept their own answer', () => {
    for (const question of questions) {
      expect(question.topic).toBe('angleReasoning');
      expect(question.steps).toHaveLength(1);
      const step = stepOf(question);
      expect(step.kind).toBe('number');
      const result = step.check(step.check('').expected);
      expect(result.correct, question.key).toBe(true);
      expect(result.explanation, question.key).toBeTruthy();
    }
  });

  it('uses exterior, ratio (incl. isosceles) and clock about a third each', () => {
    const ratio = of('ratio').length + of('isosceles').length;
    for (const count of [of('exterior').length, ratio, of('clock').length]) {
      expect(Math.abs(count / questions.length - 1 / 3)).toBeLessThan(0.04);
    }
  });

  it('draws the three exterior variants equally often within their ranges', () => {
    const exterior = of('exterior');
    for (const variant of ['triangle', 'regular', 'count']) {
      expect(
        Math.abs(of('exterior', variant).length / exterior.length - 1 / 3),
        variant,
      ).toBeLessThan(0.05);
    }
    for (const question of of('exterior', 'triangle')) {
      const [, , a, b] = parts(question).map(Number);
      for (const angle of [a!, b!]) {
        expect(angle % 5).toBe(0);
        expect(angle).toBeGreaterThanOrEqual(20);
      }
      expect(a! + b!).toBeLessThanOrEqual(160);
      expect(answerOf(question)).toEqual(fromInteger(a! + b!));
    }
    const regular = new Set(of('exterior', 'regular').map((question) => parts(question)[2]));
    expect(regular).toEqual(new Set(['5', '6', '8', '9', '10', '12']));
    for (const question of of('exterior', 'regular')) {
      expect(answerOf(question)).toEqual(rational(360n, BigInt(parts(question)[2]!)));
    }
    const count = new Set(of('exterior', 'count').map((question) => parts(question)[2]));
    expect(count).toEqual(new Set(['5', '6', '8', '9', '10', '12', '15', '18', '20']));
    for (const question of of('exterior', 'count')) {
      expect(answerOf(question)).toEqual(fromInteger(Number(parts(question)[2])));
      expect(stepOf(question).suffix).toBe('hoeken');
    }
  });

  it('draws ratios with terms in [1, 9], not all equal, summing to a divisor of 180', () => {
    const asked = new Set<string>();
    for (const question of of('ratio')) {
      const [, ...rest] = parts(question);
      const terms = rest.slice(0, 3).map(Number);
      const kind = rest[3]!;
      asked.add(kind);
      for (const term of terms) {
        expect(term).toBeGreaterThanOrEqual(1);
        expect(term).toBeLessThanOrEqual(9);
      }
      const sum = terms[0]! + terms[1]! + terms[2]!;
      expect(180 % sum, question.key).toBe(0);
      expect(new Set(terms).size, question.key).toBeGreaterThan(1);
      if (kind === 'middelste') expect(new Set(terms).size).toBe(3);
      const sorted = [...terms].sort((a, b) => a - b);
      const part = kind === 'kleinste' ? sorted[0]! : kind === 'grootste' ? sorted[2]! : sorted[1]!;
      expect(answerOf(question), question.key).toEqual(fromInteger((part * 180) / sum));
    }
    expect(asked).toEqual(new Set(['kleinste', 'grootste', 'middelste']));
  });

  it('draws isosceles ratios for 30% of the ratio form, with every factor, top and base', () => {
    const isosceles = of('isosceles');
    const share = isosceles.length / (isosceles.length + of('ratio').length);
    expect(Math.abs(share - 0.3)).toBeLessThan(0.05);
    expect(new Set(isosceles.map((question) => parts(question)[1]))).toEqual(
      new Set(['2', '3', '4', '6', '7']),
    );
    expect(new Set(isosceles.map((question) => parts(question)[2]))).toEqual(
      new Set(['tophoek', 'basishoek']),
    );
    for (const question of isosceles) {
      const factor = Number(parts(question)[1]);
      const base = rational(180n, BigInt(factor + 2));
      expect(answerOf(question), question.key).toEqual(
        parts(question)[2] === 'tophoek' ? multiplyBy(base, factor) : base,
      );
    }
  });

  it('draws clock times with minutes in fives, never :00 or :30, with at most 1 decimal', () => {
    const clocks = of('clock').map(parts);
    expect(new Set(clocks.map(([, hour]) => hour))).toEqual(
      new Set(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']),
    );
    expect(new Set(clocks.map(([, , minutes]) => minutes))).toEqual(
      new Set(['5', '10', '15', '20', '25', '35', '40', '45', '50', '55']),
    );
    for (const question of of('clock')) {
      const [, hour, minutes] = parts(question).map(Number);
      const diff = Math.abs(30 * hour! - 5.5 * minutes!) % 360;
      const expected = diff > 180 ? 360 - diff : diff;
      expect(answerOf(question), question.key).toEqual(decimal(String(expected).replace('.', ',')));
      expect(expected).toBeGreaterThan(0);
      expect(expected).toBeLessThanOrEqual(180);
    }
  });

  it('is deterministic for a fixed seed', () => {
    const seeded = (seed: number) => {
      const random = createRng(seed);
      return Array.from({ length: 50 }, () => generateAngleReasoning(random).key);
    };
    expect(seeded(7)).toEqual(seeded(7));
    expect(seeded(7)).not.toEqual(seeded(8));
  });
});

function multiplyBy(value: ReturnType<typeof rational>, factor: number) {
  return rational(value.num * BigInt(factor), value.den);
}
