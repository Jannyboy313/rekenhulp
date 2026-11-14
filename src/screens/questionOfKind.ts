import { createRng } from '../lib/random';
import { GENERATORS } from '../lib/topics';
import type { AnswerKind, Generator, Question, Topic } from '../lib/types';

const SEEDS = 200;

// A Record, so the type checker flags a new AnswerKind that is missing here.
const KINDS: Record<AnswerKind, true> = {
  number: true,
  fraction: true,
  boolean: true,
  expression: true,
  factorization: true,
  scientific: true,
  baseDigits: true,
  roman: true,
  choice: true,
};

export const ANSWER_KINDS = Object.keys(KINDS) as AnswerKind[];

/** The first question (registry order, seeds 1..200) whose first step has `kind`. */
export function questionOfKind(
  kind: AnswerKind,
  generators: Partial<Record<Topic, Generator>> = GENERATORS,
): Question {
  for (const generate of Object.values(generators)) {
    for (let seed = 1; seed <= SEEDS; seed++) {
      const question = generate(createRng(seed));
      if (question.steps[0]?.kind === kind) return question;
    }
  }
  throw new Error(`No generator produces a ${kind} question`);
}
