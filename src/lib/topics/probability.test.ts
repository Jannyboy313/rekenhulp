import { describe, expect, it } from 'vitest';
import { createRng } from '../random';
import { equals, rational } from '../rational';
import type { Question } from '../types';
import {
  DIE_EVENTS,
  dieQuestion,
  generateProbability,
  marblesQuestion,
  type Colour,
  type Marbles,
} from './probability';
import { stepOf } from './testHelpers';

const TIP_BAG = 'Deel door het totaal aantal knikkers: 3 + 5 + 2 = 10.';

const event = (text: string) => DIE_EVENTS.find((candidate) => candidate.text === text)!;
const bag = (...entries: [Colour, number][]): Marbles[] =>
  entries.map(([colour, count]) => ({ colour, count }));
const BAG_352 = bag(['rood', 3], ['blauw', 5], ['groen', 2]);

describe('DIE_EVENTS', () => {
  it('lists the nine events of spec §5.38 in its order', () => {
    expect(DIE_EVENTS.map(({ text }) => text)).toEqual([
      'een 6',
      'een even getal',
      'een oneven getal',
      'meer dan 4',
      'minder dan 3',
      'meer dan 2',
      'een 5 of een 6',
      'geen 6',
      'een veelvoud van 3',
    ]);
  });

  it.each([
    ['een 6', [6]],
    ['een even getal', [2, 4, 6]],
    ['een oneven getal', [1, 3, 5]],
    ['meer dan 4', [5, 6]],
    ['minder dan 3', [1, 2]],
    ['meer dan 2', [3, 4, 5, 6]],
    ['een 5 of een 6', [5, 6]],
    ['geen 6', [1, 2, 3, 4, 5]],
    ['een veelvoud van 3', [3, 6]],
  ])('%s has the outcomes %j', (text, outcomes) => {
    expect(event(text).outcomes).toEqual(outcomes);
  });
});

describe('question text', () => {
  it.each<[string, () => Question, string, string, string]>([
    [
      'die: even',
      () => dieQuestion(event('een even getal')),
      'Je gooit met een dobbelsteen. Hoe groot is de kans op een even getal?',
      '1/2',
      '3 van de 6 uitkomsten: 2, 4, 6 → 3/6 = 1/2',
    ],
    [
      'die: a 6',
      () => dieQuestion(event('een 6')),
      'Je gooit met een dobbelsteen. Hoe groot is de kans op een 6?',
      '1/6',
      '1 van de 6 uitkomsten: 6 → 1/6',
    ],
    [
      'die: no 6',
      () => dieQuestion(event('geen 6')),
      'Je gooit met een dobbelsteen. Hoe groot is de kans op geen 6?',
      '5/6',
      '5 van de 6 uitkomsten: 1, 2, 3, 4, 5 → 5/6',
    ],
    [
      'die: more than 2',
      () => dieQuestion(event('meer dan 2')),
      'Je gooit met een dobbelsteen. Hoe groot is de kans op meer dan 2?',
      '2/3',
      '4 van de 6 uitkomsten: 3, 4, 5, 6 → 4/6 = 2/3',
    ],
    [
      'marbles: blue',
      () => marblesQuestion(BAG_352, 'blauw', false),
      'In een zak zitten 3 rode, 5 blauwe en 2 groene knikkers. Je pakt er zonder te kijken één. Hoe groot is de kans op een blauwe?',
      '1/2',
      '5 van de 3 + 5 + 2 = 10 knikkers zijn blauw → 5/10 = 1/2',
    ],
    [
      'marbles: two colours, one marble',
      () => marblesQuestion(bag(['rood', 1], ['blauw', 4]), 'rood', false),
      'In een zak zitten 1 rode en 4 blauwe knikkers. Je pakt er zonder te kijken één. Hoe groot is de kans op een rode?',
      '1/5',
      '1 van de 1 + 4 = 5 knikkers is rood → 1/5',
    ],
    [
      'marbles: not red',
      () => marblesQuestion(BAG_352, 'rood', true),
      'In een zak zitten 3 rode, 5 blauwe en 2 groene knikkers. Je pakt er zonder te kijken één. Hoe groot is de kans op een knikker die niet rood is?',
      '7/10',
      '7 van de 3 + 5 + 2 = 10 knikkers zijn niet rood → 7/10',
    ],
    [
      'marbles: yellow, in simplest form',
      () => marblesQuestion(bag(['groen', 2], ['geel', 3]), 'geel', false),
      'In een zak zitten 2 groene en 3 gele knikkers. Je pakt er zonder te kijken één. Hoe groot is de kans op een gele?',
      '3/5',
      '3 van de 2 + 3 = 5 knikkers zijn geel → 3/5',
    ],
  ])('%s', (_label, make, prompt, expected, explanation) => {
    const step = stepOf(make());
    expect(step.prompt).toBe(prompt);
    expect(step.kind).toBe('fraction');
    expect(step.check(expected)).toMatchObject({ correct: true, expected, explanation });
  });

  it('builds the key from the form and the event or the counts', () => {
    expect(dieQuestion(event('een even getal')).key).toBe('probability:die:een even getal');
    expect(marblesQuestion(BAG_352, 'rood', true).key).toBe(
      'probability:marbles:rood3,blauw5,groen2:rood:true',
    );
  });
});

describe('answers', () => {
  it.each<[string, string, boolean, string | undefined]>([
    ['1/2', '1/2', true, undefined],
    ['0,5', '0,5', true, undefined],
    ['3/6', '3/6', false, 'De waarde klopt, maar vereenvoudig nog: 3/6 = 1/2.'],
  ])('even number, typing %s', (_label, input, correct, tip) => {
    const result = stepOf(dieQuestion(event('een even getal'))).check(input);
    expect(result.correct).toBe(correct);
    expect(result.tip).toBe(tip);
  });

  it('names 0,33 an approximation of 1/3', () => {
    const result = stepOf(dieQuestion(event('meer dan 4'))).check('0,33');
    expect(result.correct).toBe(false);
    expect(result.tip).toBe('1/3 is geen eindig kommagetal: schrijf het antwoord als breuk.');
  });
});

describe('tips', () => {
  it.each<[string, string, () => Question, string | undefined]>([
    ['red over the others', '3/7', () => marblesQuestion(BAG_352, 'rood', false), TIP_BAG],
    ['blue over the others (5/5)', '1', () => marblesQuestion(BAG_352, 'blauw', false), TIP_BAG],
    ['not red over red', '7/3', () => marblesQuestion(BAG_352, 'rood', true), TIP_BAG],
    [
      'marbles: another wrong answer',
      '1/3',
      () => marblesQuestion(BAG_352, 'rood', false),
      undefined,
    ],
    ['die: no topic tip', '1/3', () => dieQuestion(event('een even getal')), undefined],
    [
      'die: the outcomes over the other ones',
      '1',
      () => dieQuestion(event('een even getal')),
      undefined,
    ],
  ])('%s, typing %s', (_label, input, make, tip) => {
    expect(stepOf(make()).check(input).tip).toBe(tip);
  });
});

describe('generateProbability', () => {
  const COUNT = 4000;
  const rng = createRng(5138);
  const questions = Array.from({ length: COUNT }, () => generateProbability(rng));

  const ADJECTIVES: Record<string, Colour> = {
    rode: 'rood',
    blauwe: 'blauw',
    groene: 'groen',
    gele: 'geel',
  };

  interface Parsed {
    question: Question;
    form: 'die' | 'marbles';
    bag: Marbles[];
    not: boolean;
  }

  const parsed: Parsed[] = questions.map((question) => {
    const prompt = stepOf(question).prompt;
    const match = /^In een zak zitten (.*) knikkers\. .* de kans op (.*)\?$/u.exec(prompt);
    if (!match) return { question, form: 'die', bag: [], not: false };
    const entries = match[1]!.split(/, | en /u).map((part) => {
      const [count, adjective] = part.split(' ') as [string, string];
      return { colour: ADJECTIVES[adjective]!, count: Number(count) };
    });
    return { question, form: 'marbles', bag: entries, not: match[2]!.startsWith('een knikker') };
  });
  const near = (count: number, of: number, share: number) => Math.abs(count / of - share) <= 0.05;

  it('picks the die and the marbles 1/2 each', () => {
    expect(near(parsed.filter((item) => item.form === 'die').length, COUNT, 0.5)).toBe(true);
  });

  it('picks every die event equally likely', () => {
    const dice = parsed.filter((item) => item.form === 'die');
    for (const { text } of DIE_EVENTS) {
      const count = dice.filter((item) => item.question.key === `probability:die:${text}`).length;
      expect(near(count, dice.length, 1 / DIE_EVENTS.length), text).toBe(true);
    }
  });

  it('draws 2 or 3 colours, counts in [1, 12], the total in [5, 20]', () => {
    const marbles = parsed.filter((item) => item.form === 'marbles');
    const threeColours = marbles.filter((item) => item.bag.length === 3).length;
    expect(near(threeColours, marbles.length, 0.5)).toBe(true);
    for (const { bag: drawn, question } of marbles) {
      expect([2, 3], question.key).toContain(drawn.length);
      expect(new Set(drawn.map(({ colour }) => colour)).size, question.key).toBe(drawn.length);
      for (const { count } of drawn) {
        expect(count, question.key).toBeGreaterThanOrEqual(1);
        expect(count, question.key).toBeLessThanOrEqual(12);
      }
      const total = drawn.reduce((sum, { count }) => sum + count, 0);
      expect(total, question.key).toBeGreaterThanOrEqual(5);
      expect(total, question.key).toBeLessThanOrEqual(20);
    }
  });

  it('asks "niet" in 25% of the marbles questions and keeps the prompt short', () => {
    const marbles = parsed.filter((item) => item.form === 'marbles');
    expect(near(marbles.filter((item) => item.not).length, marbles.length, 0.25)).toBe(true);
    for (const { question } of marbles) {
      expect(stepOf(question).prompt.length, question.key).toBeLessThanOrEqual(150);
    }
  });

  it('answers with a probability strictly between 0 and 1, and explains it', () => {
    for (const question of questions) {
      const step = stepOf(question);
      const expected = step.check('').expected;
      const [num, den] = expected.split('/').map(Number) as [number, number];
      expect(den, question.key).toBeGreaterThan(num);
      expect(num, question.key).toBeGreaterThan(0);
      const result = step.check(expected);
      expect(result.correct, question.key).toBe(true);
      expect(result.explanation, question.key).toBeTruthy();
      expect(question.topic).toBe('probability');
    }
  });

  it('keeps the answer equal to the share of marbles', () => {
    for (const { form, bag: drawn, question } of parsed) {
      if (form !== 'marbles') continue;
      const total = drawn.reduce((sum, { count }) => sum + count, 0);
      const [, , , asked, not] = question.key.split(':');
      const own = drawn.find(({ colour }) => colour === asked)!.count;
      const wanted = not === 'true' ? total - own : own;
      expect(
        equals(rational(BigInt(wanted), BigInt(total)), parse(stepOf(question).check('').expected)),
        question.key,
      ).toBe(true);
    }
  });
});

/** '7/10' as a rational. */
function parse(text: string) {
  const [num, den] = text.split('/').map(BigInt) as [bigint, bigint];
  return rational(num, den);
}
