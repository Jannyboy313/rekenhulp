import { describe, expect, it } from 'vitest';
import { GROUP_SEPARATOR as S, MINUS } from '../format';
import { createRng } from '../random';
import { compare, decimalPlaces, fromInteger } from '../rational';
import type { Question } from '../types';
import {
  bottlesQuestion,
  fitQuestion,
  generateMeasureProblems,
  groceriesQuestion,
  remainderQuestion,
  runningQuestion,
  sumQuestion,
} from './measureProblems';
import { decimal, stepOf } from './testHelpers';

const SAMPLES = 2000;

/** What the user types: no group separator. */
const typed = (text: string) => text.replaceAll(S, '');

describe('fit', () => {
  it('asks how many glasses fit in a pak', () => {
    const step = stepOf(fitQuestion('glazen', decimal('1,5'), 25));
    expect(step.prompt).toBe('Hoeveel glazen van 25 cl kun je vullen uit een pak van 1,5 L?');
    expect(step.suffix).toBe('glazen');
    expect(step.check('6')).toEqual({
      correct: true,
      expected: '6',
      explanation: '1,5 L = 150 cl → 150 : 25 = 6',
    });
  });

  it('asks for a fles, stukken and porties', () => {
    expect(stepOf(fitQuestion('glazen', decimal('2'), 20, 'fles')).prompt).toBe(
      'Hoeveel glazen van 20 cl kun je vullen uit een fles van 2 L?',
    );
    const stukken = stepOf(fitQuestion('stukken', decimal('2,4'), 30));
    expect(stukken.prompt).toBe(
      'Een plank van 2,4 m wordt in stukken van 30 cm gezaagd. Hoeveel stukken zijn dat?',
    );
    expect(stukken.check('8').explanation).toBe('2,4 m = 240 cm → 240 : 30 = 8');
    const porties = stepOf(fitQuestion('porties', decimal('2'), 125));
    expect(porties.prompt).toBe(
      'Een zak rijst van 2 kg wordt verdeeld in porties van 125 g. Hoeveel porties zijn dat?',
    );
    expect(porties.suffix).toBe('porties');
    expect(porties.check('16').explanation).toBe('2 kg = 2000 g → 2000 : 125 = 16');
  });
});

describe('mixed sum', () => {
  const term = (value: string, unit: string) => ({ value: decimal(value), unit });

  it('converts to the answer unit and adds', () => {
    const step = stepOf(
      sumQuestion([term('1,2', 'm'), term('45', 'cm'), term('8', 'dm')], ['+', '+'], 'cm'),
    );
    expect(step.prompt).toBe('1,2 m + 45 cm + 8 dm = ? cm');
    expect(step.suffix).toBe('cm');
    expect(step.check('245')).toEqual({
      correct: true,
      expected: '245',
      explanation: '1,2 m = 120 cm, 8 dm = 80 cm → 120 + 45 + 80 = 245',
    });
  });

  it('subtracts with a minus sign', () => {
    const step = stepOf(
      sumQuestion([term('2', 'L'), term('35', 'cl'), term('4', 'dl')], ['−', '+'], 'dl'),
    );
    expect(step.prompt).toBe(`2 L ${MINUS} 35 cl + 4 dl = ? dl`);
    expect(step.check('20,5')).toEqual({
      correct: true,
      expected: '20,5',
      explanation: `2 L = 20 dl, 35 cl = 3,5 dl → 20 ${MINUS} 3,5 + 4 = 20,5`,
    });
  });
});

describe('total', () => {
  it('asks the litres of some bottles', () => {
    const step = stepOf(bottlesQuestion(6, 33));
    expect(step.prompt).toBe('Je koopt 6 flesjes van 33 cl. Hoeveel liter is dat?');
    expect(step.check('1,98')).toEqual({
      correct: true,
      expected: '1,98',
      explanation: '6 × 33 = 198 cl = 1,98 L',
    });
  });

  it('adds packs in kg and bags in g', () => {
    const step = stepOf(groceriesQuestion(4, decimal('1,5'), 3, 750));
    expect(step.prompt).toBe(
      'Je koopt 4 pakken van 1,5 kg en 3 zakken van 750 g. Hoeveel kg is dat samen?',
    );
    expect(step.suffix).toBe('kg');
    expect(step.check('8,25')).toEqual({
      correct: true,
      expected: '8,25',
      explanation: '4 × 1,5 = 6 kg, 3 × 750 = 2250 g = 2,25 kg → 6 + 2,25 = 8,25',
    });
  });

  it('adds laps in m and an extra distance in km', () => {
    const step = stepOf(runningQuestion(3, decimal('2,8')));
    expect(step.prompt).toBe(
      'Je loopt 3 rondjes van 400 m en daarna nog 2,8 km. Hoeveel km loop je?',
    );
    expect(step.check('4')).toEqual({
      correct: true,
      expected: '4',
      explanation: '3 × 400 = 1200 m = 1,2 km → 1,2 + 2,8 = 4',
    });
  });
});

describe('remainder', () => {
  it('asks what is left of a touw, a fles and a zak meel', () => {
    const touw = stepOf(remainderQuestion('touw', decimal('5'), 3, 80));
    expect(touw.prompt).toBe(
      'Van een rol touw van 5 m knip je 3 stukken van 80 cm. Hoeveel cm blijft er over?',
    );
    expect(touw.suffix).toBe('cm');
    expect(touw.check('260')).toEqual({
      correct: true,
      expected: '260',
      explanation: `5 m = 500 cm, 3 × 80 = 240 → 500 ${MINUS} 240 = 260`,
    });

    const fles = stepOf(remainderQuestion('fles', decimal('1,5'), 4, 25));
    expect(fles.prompt).toBe(
      'Een fles bevat 1,5 L. Je schenkt 4 glazen van 25 cl in. Hoeveel cl blijft er over?',
    );
    expect(fles.check('50').correct).toBe(true);
    expect(fles.check('0').explanation).toBe(`1,5 L = 150 cl, 4 × 25 = 100 → 150 ${MINUS} 100 = 50`);

    const meel = stepOf(remainderQuestion('meel', decimal('2'), 3, 350));
    expect(meel.prompt).toBe(
      'Een zak bevat 2 kg meel. Je gebruikt 3 keer 350 g. Hoeveel g blijft er over?',
    );
    expect(meel.check('950').correct).toBe(true);
    expect(meel.check('0').explanation).toBe(
      `2 kg = 2000 g, 3 × 350 = 1050 → 2000 ${MINUS} 1050 = 950`,
    );
  });
});

describe('generateMeasureProblems', () => {
  const rng = createRng(31);
  const questions: Question[] = Array.from({ length: SAMPLES }, () => generateMeasureProblems(rng));
  const kind = (name: string) =>
    questions.filter((q) => q.key.startsWith(`measureProblems:${name}:`));

  it('uses the four forms about equally often', () => {
    for (const name of ['fit', 'sum', 'total', 'remainder']) {
      expect(kind(name).length / SAMPLES).toBeGreaterThan(0.2);
      expect(kind(name).length / SAMPLES).toBeLessThan(0.3);
    }
  });

  it('accepts its own answer and explains it', () => {
    for (const question of questions) {
      const step = question.steps[0]!;
      expect(question.topic).toBe('measureProblems');
      const result = step.check(typed(step.check('').expected));
      expect(result.correct, step.prompt).toBe(true);
      expect(result.explanation).toBeTruthy();
    }
  });

  it('keeps fit counts whole in [3, 40] and covers every context', () => {
    const contexts = new Set<string>();
    for (const question of kind('fit')) {
      contexts.add(question.key.split(':')[2]!);
      const count = decimal(question.steps[0]!.check('').expected);
      expect(count.den).toBe(1n);
      expect(compare(count, fromInteger(3))).toBeGreaterThanOrEqual(0);
      expect(compare(count, fromInteger(40))).toBeLessThanOrEqual(0);
    }
    expect(contexts).toEqual(new Set(['glazen', 'stukken', 'porties']));
  });

  it('keeps sums within the spec', () => {
    const sums = kind('sum');
    expect(sums.length).toBeGreaterThan(100);
    let withMinus = 0;
    for (const question of sums) {
      const prompt = stepOf(question).prompt;
      const [expression, unit] = prompt.split(' = ? ');
      const tokens = expression!.split(' ');
      const units = [tokens[1]!, tokens[4]!, tokens[7]!];
      expect(new Set(units).size).toBeGreaterThanOrEqual(2);
      expect(units).toContain(unit);
      for (const forbidden of ['dam', 'hm', 'ton', 'cc', 'kuub', 'ca']) {
        expect(units).not.toContain(forbidden);
      }
      if (expression!.includes(MINUS)) withMinus++;
      const answer = decimal(question.steps[0]!.check('').expected.replaceAll(S, ''));
      expect(compare(answer, fromInteger(0))).toBeGreaterThan(0);
      expect(compare(answer, fromInteger(10_000))).toBeLessThanOrEqual(0);
      expect(decimalPlaces(answer)!).toBeLessThanOrEqual(2);
    }
    expect(withMinus / sums.length).toBeGreaterThan(0.2);
    expect(withMinus / sums.length).toBeLessThan(0.4);
  });

  it('covers every total and remainder context', () => {
    expect(new Set(kind('total').map((q) => q.key.split(':')[2]))).toEqual(
      new Set(['flesjes', 'boodschappen', 'hardlopen']),
    );
    expect(new Set(kind('remainder').map((q) => q.key.split(':')[2]))).toEqual(
      new Set(['touw', 'fles', 'meel']),
    );
  });

  it('leaves a positive rest in whole units of the smaller unit', () => {
    for (const question of kind('remainder')) {
      const rest = decimal(question.steps[0]!.check('').expected.replaceAll(S, ''));
      expect(rest.den).toBe(1n);
      expect(compare(rest, fromInteger(0))).toBeGreaterThan(0);
    }
  });
});
