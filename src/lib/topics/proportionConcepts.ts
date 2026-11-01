import { formatInteger } from '../format';
import { pick, range, shuffle, type Rng } from '../random';
import { choiceStep } from '../steps';
import type { Question } from '../types';

/** A statement with at most one number `{}` drawn from `values` (spec §5.54). */
export interface Statement {
  template: string;
  values?: readonly number[];
}

const COUNTS = range(2, 9).map((tens) => tens * 10);
const POPULATIONS = range(20, 90).map((hundreds) => hundreds * 100);
const PERCENTAGES = [5, 10, 20, 25];
const N_VALUES = [2, 3, 4, 5, 10];

const count = (template: string): Statement => ({ template, values: COUNTS });
const percentage = (template: string): Statement => ({ template, values: PERCENTAGES });
const oneIn = (template: string): Statement => ({ template, values: N_VALUES });
const fixed = (template: string): Statement => ({ template });

export type Kind = 'relative' | 'absolute';

interface Context {
  absolute: readonly Statement[];
  relative: readonly Statement[];
}

export const CONTEXTS: Readonly<Record<string, Context>> = {
  dorp: {
    absolute: [
      count('Er wonen {} mensen meer.'),
      { template: 'Er wonen nu {} mensen.', values: POPULATIONS },
      count('Er zijn {} nieuwe huizen.'),
    ],
    relative: [
      percentage('Er wonen {}% meer mensen.'),
      oneIn('1 op de {} inwoners is nieuw.'),
      fixed('Een kwart van de inwoners is kind.'),
    ],
  },
  school: {
    absolute: [
      count('Er zijn {} leerlingen ziek.'),
      count('Er zitten {} meisjes in de klas.'),
      count('De school heeft {} leraren.'),
    ],
    relative: [
      percentage('{}% van de leerlingen is ziek.'),
      fixed('De helft van de klas is meisje.'),
      oneIn('1 op de {} leerlingen fietst.'),
    ],
  },
  winkel: {
    absolute: [
      count('De jas is € {} goedkoper.'),
      count('Er zijn {} jassen verkocht.'),
      count('De jas kost nu € {}.'),
    ],
    relative: [
      percentage('De jas is {}% goedkoper.'),
      oneIn('1 op de {} klanten koopt een jas.'),
      fixed('Een derde van de jassen is verkocht.'),
    ],
  },
};

export const FILL_IN = '{}';

export function fillIn({ template, values }: Statement, value?: number): string {
  return value === undefined ? template : template.replace(FILL_IN, formatInteger(value));
}

function draw(rng: Rng, statement: Statement): string {
  return fillIn(statement, statement.values && pick(rng, statement.values));
}

const RELATIVE_EXPLANATION = 'Relatief: een deel van het geheel (procent, breuk, 1 op de n).';
const ABSOLUTE_EXPLANATION = 'Absoluut: een aantal of bedrag.';

/** `Welke uitspraak is relatief?` with one statement of that kind and three of the other. */
export function statementQuestion(
  asked: Kind,
  context: string,
  answer: string,
  others: readonly string[],
  rng: Rng,
): Question {
  const options = shuffle(rng, [answer, ...others]);
  return {
    key: `proportionConcepts:statement:${asked}:${context}:${[...options].sort().join('|')}`,
    topic: 'proportionConcepts',
    steps: [
      choiceStep({
        prompt: `Welke uitspraak is ${asked === 'relative' ? 'relatief' : 'absoluut'}?`,
        options,
        answer,
        explanation: asked === 'relative' ? RELATIVE_EXPLANATION : ABSOLUTE_EXPLANATION,
      }),
    ],
  };
}

/** `"1 op de 4" betekent hetzelfde als …` The trap `n%` is replaced at n = 10, where it is right. */
export function oneInQuestion(n: number, rng: Rng): Question {
  const answer = `${100 / n}%`;
  const options = shuffle(rng, [answer, `1 : ${n}`, n === 10 ? '1%' : `${n}%`, `1/${n - 1}`]);
  return {
    key: `proportionConcepts:oneIn:${n}`,
    topic: 'proportionConcepts',
    steps: [
      choiceStep({
        prompt: `"1 op de ${n}" betekent hetzelfde als …`,
        options,
        answer,
        explanation: `1 op de ${n} = 1/${n} = ${answer}; 1 : ${n} is 1 op de ${n + 1}`,
      }),
    ],
  };
}

function randomStatements(rng: Rng): Question {
  const asked: Kind = rng() < 0.5 ? 'relative' : 'absolute';
  const other: Kind = asked === 'relative' ? 'absolute' : 'relative';
  const name = pick(rng, Object.keys(CONTEXTS));
  const context = CONTEXTS[name]!;
  return statementQuestion(
    asked,
    name,
    draw(rng, pick(rng, context[asked])),
    context[other].map((statement) => draw(rng, statement)),
    rng,
  );
}

const ONE_IN_VALUES = [4, 5, 10, 20, 25];

export function generateProportionConcepts(rng: Rng): Question {
  if (rng() < 0.5) return randomStatements(rng);
  return oneInQuestion(pick(rng, ONE_IN_VALUES), rng);
}
