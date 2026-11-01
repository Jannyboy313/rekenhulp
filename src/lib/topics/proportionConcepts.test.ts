import { describe, expect, it } from 'vitest';
import { createRng, range } from '../random';
import { hasSlot } from '../slot';
import type { Question } from '../types';
import {
  CONTEXTS,
  fillIn,
  generateProportionConcepts,
  oneInQuestion,
  statementQuestion,
  type Kind,
} from './proportionConcepts';

const SAMPLES = 2000;

function sample(): Question[] {
  const rng = createRng(54);
  return Array.from({ length: SAMPLES }, () => generateProportionConcepts(rng));
}

/** Every text a context can show for a kind, by the kind. */
function textsOf(context: string, kind: Kind): Set<string> {
  const texts = new Set<string>();
  for (const statement of CONTEXTS[context]![kind]) {
    for (const value of statement.values ?? [undefined]) texts.add(fillIn(statement, value));
  }
  return texts;
}

function kindOf(context: string, option: string): Kind | undefined {
  return (['relative', 'absolute'] as const).find((kind) => textsOf(context, kind).has(option));
}

describe('oneInQuestion', () => {
  it('offers the percentage, the ratio trap, n% and the fraction for 1 op de 4', () => {
    const question = oneInQuestion(4, createRng(1));
    const step = question.steps[0]!;
    expect(step.prompt).toBe('"1 op de 4" betekent hetzelfde als …');
    expect([...step.options!].sort()).toEqual(['1 : 4', '1/3', '25%', '4%']);
    expect(step.check('25%')).toEqual({
      correct: true,
      expected: '25%',
      explanation: '1 op de 4 = 1/4 = 25%; 1 : 4 is 1 op de 5',
    });
    expect(step.check('1 : 4').correct).toBe(false);
  });

  it('keeps four distinct options for every n, replacing the trap n% at n = 10', () => {
    for (const n of [4, 5, 10, 20, 25]) {
      const options = oneInQuestion(n, createRng(n)).steps[0]!.options!;
      expect(new Set(options).size).toBe(4);
      expect(options).toContain(`${100 / n}%`);
      expect(options).toContain(`1 : ${n}`);
      expect(options).toContain(`1/${n - 1}`);
    }
  });
});

describe('statementQuestion', () => {
  it('asks for the relative statement', () => {
    const question = statementQuestion(
      'relative',
      'dorp',
      'Er wonen 5% meer mensen.',
      ['Er wonen 30 mensen meer.', 'Er wonen nu 20 mensen.', 'Er zijn 40 nieuwe huizen.'],
      createRng(2),
    );
    const step = question.steps[0]!;
    expect(step.prompt).toBe('Welke uitspraak is relatief?');
    expect(step.check('Er wonen 5% meer mensen.')).toMatchObject({
      correct: true,
      explanation: 'Relatief: een deel van het geheel (procent, breuk, 1 op de n).',
    });
    expect(step.check('Er wonen nu 20 mensen.').correct).toBe(false);
  });
});

describe('generateProportionConcepts', () => {
  const questions = sample();

  it('is always a choice step with four distinct options and one correct answer', () => {
    for (const question of questions) {
      expect(question.topic).toBe('proportionConcepts');
      expect(question.steps).toHaveLength(1);
      const step = question.steps[0]!;
      expect(step.kind).toBe('choice');
      expect(new Set(step.options).size).toBe(4);
      expect(step.options!.filter((option) => step.check(option).correct)).toHaveLength(1);
    }
  });

  it('uses both forms and every context', () => {
    const forms = new Set(questions.map(({ key }) => key.split(':')[1]));
    expect([...forms].sort()).toEqual(['oneIn', 'statement']);
    const contexts = new Set(
      questions.filter(({ key }) => key.includes(':statement:')).map(({ key }) => key.split(':')[3]),
    );
    expect([...contexts].sort()).toEqual(['dorp', 'school', 'winkel']);
    const asked = new Set(
      questions.filter(({ key }) => key.includes(':statement:')).map(({ key }) => key.split(':')[2]),
    );
    expect([...asked].sort()).toEqual(['absolute', 'relative']);
  });

  it('has exactly one statement of the asked kind and three of the other', () => {
    for (const question of questions.filter(({ key }) => key.includes(':statement:'))) {
      const [, , asked, context] = question.key.split(':') as [string, string, Kind, string];
      const step = question.steps[0]!;
      const kinds = step.options!.map((option) => kindOf(context, option));
      expect(kinds, step.prompt).not.toContain(undefined);
      expect(kinds.filter((kind) => kind === asked)).toHaveLength(1);
      const answer = step.options!.find((option) => step.check(option).correct)!;
      expect(kindOf(context, answer)).toBe(asked);
      expect(step.prompt).toBe(
        `Welke uitspraak is ${asked === 'relative' ? 'relatief' : 'absoluut'}?`,
      );
    }
  });

  it('draws 1 op de n from the listed values and offers the answer 100/n %', () => {
    const seen = new Set<number>();
    for (const question of questions.filter(({ key }) => key.includes(':oneIn:'))) {
      const n = Number(question.key.split(':')[2]);
      seen.add(n);
      const step = question.steps[0]!;
      expect(step.options).toContain(`${100 / n}%`);
      expect(step.check(`${100 / n}%`).correct).toBe(true);
    }
    expect([...seen].sort((a, b) => a - b)).toEqual([4, 5, 10, 20, 25]);
  });

  it('uses the small number sets of the spec', () => {
    for (const question of questions.filter(({ key }) => key.includes(':statement:'))) {
      for (const option of question.steps[0]!.options!) {
        const percent = /^(?:Er wonen |De jas is |)(\d+)%/.exec(option)?.[1];
        if (percent) expect([5, 10, 20, 25]).toContain(Number(percent));
      }
    }
  });

  it('draws the current population of the dorp from 2000 to 9000 in steps of 100', () => {
    const population = CONTEXTS.dorp!.absolute.find(({ template }) => template.includes('nu'))!;
    expect(population.values).toEqual(range(20, 90).map((hundreds) => hundreds * 100));
  });

  it('has a stable key and no slot in its prompts', () => {
    expect(generateProportionConcepts(createRng(9)).key).toBe(
      generateProportionConcepts(createRng(9)).key,
    );
    for (const { steps } of questions) expect(hasSlot(steps[0]!.prompt)).toBe(false);
  });
});
