import { describe, expect, it } from 'vitest';
import { MINUS } from '../format';
import { createRng } from '../random';
import type { Question } from '../types';
import {
  arithmeticNextQuestion,
  figurateQuestion,
  generateSequences,
  geometricNextQuestion,
  nthTermQuestion,
  NTH_TERMS,
} from './sequences';
import { answerOf, stepOf, typed } from './testHelpers';

const TIP_NTH = 'Van het 1e naar het 20e getal zijn 19 stappen, geen 20.';
const TIP_FACTOR_TEN = 'Je antwoord is 10 keer te groot. Let op de komma en het aantal nullen.';

describe('NTH_TERMS', () => {
  it('lists the positions of spec §5.35', () => {
    expect(NTH_TERMS).toEqual([10, 12, 15, 20, 25, 30, 50, 100]);
  });
});

describe('question text', () => {
  it.each<[string, () => Question, string, string, string]>([
    [
      'arithmetic 3, +4',
      () => arithmeticNextQuestion(3, 4),
      '3, 7, 11, 15, … Wat is het volgende getal?',
      '19',
      '+4 → 15 + 4 = 19',
    ],
    [
      'arithmetic 10, −6 (crosses zero)',
      () => arithmeticNextQuestion(10, -6),
      `10, 4, ${MINUS}2, ${MINUS}8, … Wat is het volgende getal?`,
      `${MINUS}14`,
      `${MINUS}6 → ${MINUS}8 ${MINUS} 6 = ${MINUS}14`,
    ],
    [
      'arithmetic −20, +15',
      () => arithmeticNextQuestion(-20, 15),
      `${MINUS}20, ${MINUS}5, 10, 25, … Wat is het volgende getal?`,
      '40',
      '+15 → 25 + 15 = 40',
    ],
    [
      'geometric 3, × 2',
      () => geometricNextQuestion(3, 'times2'),
      '3, 6, 12, 24, … Wat is het volgende getal?',
      '48',
      '× 2 → 24 × 2 = 48',
    ],
    [
      'geometric 2, × 3',
      () => geometricNextQuestion(2, 'times3'),
      '2, 6, 18, 54, … Wat is het volgende getal?',
      '162',
      '× 3 → 54 × 3 = 162',
    ],
    [
      'geometric 160, : 2',
      () => geometricNextQuestion(160, 'half'),
      '160, 80, 40, 20, … Wat is het volgende getal?',
      '10',
      ': 2 → 20 : 2 = 10',
    ],
    [
      'geometric 16, : 2 (ends on 1)',
      () => geometricNextQuestion(16, 'half'),
      '16, 8, 4, 2, … Wat is het volgende getal?',
      '1',
      ': 2 → 2 : 2 = 1',
    ],
    [
      'nth 3, 4, 20',
      () => nthTermQuestion(3, 4, 20),
      '3, 7, 11, 15, … Wat is het 20e getal?',
      '79',
      'van het 1e naar het 20e getal zijn 19 stappen van 4 → 3 + 19 × 4 = 79',
    ],
    [
      'nth 5, 10, 100 (largest)',
      () => nthTermQuestion(5, 10, 100),
      '5, 15, 25, 35, … Wat is het 100e getal?',
      '995',
      'van het 1e naar het 100e getal zijn 99 stappen van 10 → 5 + 99 × 10 = 995',
    ],
    [
      'triangular 8',
      () => figurateQuestion('driehoeksgetallen', 8),
      'Driehoeksgetallen: 1, 3, 6, 10, … Wat is het 8e driehoeksgetal?',
      '36',
      '1 + 2 + … + 8 = 8 × 9 : 2 = 36',
    ],
    [
      'square 15',
      () => figurateQuestion('kwadraatgetallen', 15),
      'Kwadraatgetallen: 1, 4, 9, 16, … Wat is het 15e kwadraatgetal?',
      '225',
      '15 × 15 = 225',
    ],
  ])('%s', (_label, make, prompt, expected, explanation) => {
    const step = stepOf(make());
    expect(step.prompt).toBe(prompt);
    expect(step.check(typed(answerOf(make())))).toMatchObject({
      correct: true,
      expected,
      explanation,
    });
  });

  it('builds the key from the form and the numbers', () => {
    expect(arithmeticNextQuestion(3, 4).key).toBe('sequences:next:arithmetic:3:4');
    expect(geometricNextQuestion(3, 'times2').key).toBe('sequences:next:times2:3');
    expect(nthTermQuestion(3, 4, 20).key).toBe('sequences:nth:arithmetic:3:4:20');
    expect(figurateQuestion('kwadraatgetallen', 15).key).toBe(
      'sequences:figurate:kwadraatgetallen:15',
    );
  });
});

describe('tips', () => {
  it.each<[string, string, () => Question, string | undefined]>([
    ['nth: one step too many', '83', () => nthTermQuestion(3, 4, 20), TIP_NTH],
    ['nth: another wrong answer', '80', () => nthTermQuestion(3, 4, 20), undefined],
    ['nth: factor of ten', '790', () => nthTermQuestion(3, 4, 20), TIP_FACTOR_TEN],
    ['next: no topic tip', '18', () => arithmeticNextQuestion(3, 4), undefined],
    ['geometric: no topic tip', '36', () => geometricNextQuestion(3, 'times2'), undefined],
    ['figurate: no topic tip', '64', () => figurateQuestion('driehoeksgetallen', 8), undefined],
  ])('%s, typing %s', (_label, input, make, tip) => {
    expect(stepOf(make()).check(input).tip).toBe(tip);
  });

  it('names the number of steps in the prompt of the position', () => {
    const tip = stepOf(nthTermQuestion(5, 10, 100)).check('1005').tip;
    expect(tip).toBe('Van het 1e naar het 100e getal zijn 99 stappen, geen 100.');
  });
});

describe('generateSequences', () => {
  const COUNT = 4000;
  const rng = createRng(5135);
  const questions = Array.from({ length: COUNT }, () => generateSequences(rng));

  const numbers = (text: string) => text.split(', ').map((v) => Number(v.replace(MINUS, '-')));

  type Kind = 'arithmetic' | 'times2' | 'times3' | 'half';
  interface Parsed {
    question: Question;
    form: 'next' | 'nth' | 'figurate';
    terms: number[];
    kind: Kind | 'driehoeksgetallen' | 'kwadraatgetallen';
    position: number | null;
    answer: number;
  }

  function parse(question: Question): Parsed {
    const prompt = stepOf(question).prompt;
    const answer = Number(answerOf(question).num);
    const figurate = /^(Driehoeksgetallen|Kwadraatgetallen): (.*), … Wat is het (\d+)e/u.exec(
      prompt,
    );
    if (figurate) {
      return {
        question,
        form: 'figurate',
        terms: numbers(figurate[2]!),
        kind: figurate[1] === 'Driehoeksgetallen' ? 'driehoeksgetallen' : 'kwadraatgetallen',
        position: Number(figurate[3]),
        answer,
      };
    }
    const nth = /^(.*), … Wat is het (\d+)e getal\?$/u.exec(prompt);
    const next = /^(.*), … Wat is het volgende getal\?$/u.exec(prompt);
    const terms = numbers((nth ?? next)![1]!);
    const [a, b, c] = terms as [number, number, number];
    const kind: Kind =
      b - a === c - b ? 'arithmetic' : b === 2 * a ? 'times2' : b === 3 * a ? 'times3' : 'half';
    return {
      question,
      form: nth ? 'nth' : 'next',
      terms,
      kind,
      position: nth ? Number(nth[2]) : null,
      answer,
    };
  }

  const parsed = questions.map(parse);
  const near = (count: number, of: number, share: number) => Math.abs(count / of - share) <= 0.05;
  const ofKinds = (...kinds: string[]) =>
    parsed.filter((item) => kinds.includes(item.kind) && item.form === 'next');

  it('picks the three forms equally and shows four terms', () => {
    for (const form of ['next', 'nth', 'figurate']) {
      const count = parsed.filter((item) => item.form === form).length;
      expect(near(count, COUNT, 1 / 3), form).toBe(true);
    }
    for (const { terms, question } of parsed) expect(terms, question.key).toHaveLength(4);
  });

  it('draws the next term arithmetic or geometric, each 1/2, arithmetic decreasing 30%', () => {
    const next = parsed.filter((item) => item.form === 'next');
    const arithmetic = ofKinds('arithmetic');
    expect(near(arithmetic.length, next.length, 0.5)).toBe(true);
    const decreasing = arithmetic.filter((item) => item.terms[1]! < item.terms[0]!);
    expect(near(decreasing.length, arithmetic.length, 0.3)).toBe(true);
    const geometric = next.length - arithmetic.length;
    for (const kind of ['times2', 'times3', 'half']) {
      expect(near(ofKinds(kind).length, geometric, 1 / 3), kind).toBe(true);
    }
  });

  it('draws arithmetic terms within [−50, 100], start [−20, 50], difference [2, 15]', () => {
    for (const { terms, answer, question } of ofKinds('arithmetic')) {
      const difference = Math.abs(terms[1]! - terms[0]!);
      expect(terms[0], question.key).toBeGreaterThanOrEqual(-20);
      expect(terms[0], question.key).toBeLessThanOrEqual(50);
      expect(difference, question.key).toBeGreaterThanOrEqual(2);
      expect(difference, question.key).toBeLessThanOrEqual(15);
      for (const term of [...terms, answer]) {
        expect(term, question.key).toBeGreaterThanOrEqual(-50);
        expect(term, question.key).toBeLessThanOrEqual(100);
      }
    }
  });

  it('draws geometric starts and terms of spec §5.35', () => {
    const starts = { times2: [1, 12], times3: [1, 5] } as const;
    for (const { kind, terms, answer, question } of ofKinds('times2', 'times3', 'half')) {
      const start = terms[0]!;
      if (kind === 'half') {
        expect(start % 16, question.key).toBe(0);
        expect(start / 16, question.key).toBeLessThanOrEqual(10);
      } else {
        expect(start, question.key).toBeGreaterThanOrEqual(starts[kind as 'times2' | 'times3'][0]);
        expect(start, question.key).toBeLessThanOrEqual(starts[kind as 'times2' | 'times3'][1]);
      }
      for (const term of [...terms, answer]) expect(term, question.key).toBeLessThanOrEqual(1000);
    }
  });

  it('draws the n-th term of spec §5.35', () => {
    for (const { terms, position, answer, question } of parsed.filter((i) => i.form === 'nth')) {
      const difference = terms[1]! - terms[0]!;
      expect(terms[0], question.key).toBeGreaterThanOrEqual(1);
      expect(terms[0], question.key).toBeLessThanOrEqual(20);
      expect(difference, question.key).toBeGreaterThanOrEqual(2);
      expect(difference, question.key).toBeLessThanOrEqual(10);
      expect(NTH_TERMS, question.key).toContain(position);
      expect(answer, question.key).toBe(terms[0]! + (position! - 1) * difference);
      expect(answer, question.key).toBeLessThanOrEqual(1000);
    }
  });

  it('draws figurate numbers from 5 to 20, the two kinds equally', () => {
    const figurate = parsed.filter((item) => item.form === 'figurate');
    const triangular = figurate.filter((item) => item.kind === 'driehoeksgetallen');
    expect(near(triangular.length, figurate.length, 0.5)).toBe(true);
    for (const { kind, position, answer, question } of figurate) {
      expect(position, question.key).toBeGreaterThanOrEqual(5);
      expect(position, question.key).toBeLessThanOrEqual(20);
      const n = position!;
      expect(answer, question.key).toBe(kind === 'driehoeksgetallen' ? (n * (n + 1)) / 2 : n * n);
    }
  });

  it('answers every next term from the pattern and explains every question', () => {
    for (const { form, kind, terms, answer, question } of parsed) {
      if (form === 'next') {
        const [a, b] = terms as [number, number];
        const expected =
          kind === 'arithmetic'
            ? terms[3]! + (b - a)
            : kind === 'half'
              ? terms[3]! / 2
              : terms[3]! * (kind === 'times2' ? 2 : 3);
        expect(answer, question.key).toBe(expected);
      }
      const result = stepOf(question).check(typed(answerOf(question)));
      expect(result.correct, question.key).toBe(true);
      expect(result.explanation, question.key).toBeTruthy();
      expect(question.topic).toBe('sequences');
    }
  });
});
