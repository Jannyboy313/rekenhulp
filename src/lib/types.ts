import type { Rng } from './random';

/** Beta: numeric answers only. Later plans add 'boolean' | 'expression' | 'factorization'. */
export type AnswerKind = 'number';

/** Topics of the implemented sets. Each later plan adds the topics of its set (spec §4.1). */
export type Topic = 'tables' | 'volume' | 'area' | 'length' | 'mass' | 'time' | 'numberUnits';

export interface CheckResult {
  correct: boolean;
  /** Correct answer, formatted for display. */
  expected: string;
  explanation?: string;
}

export interface Step {
  kind: AnswerKind;
  prompt: string;
  /** Fixed unit shown next to the input, e.g. 'cm³'. */
  suffix?: string;
  check(input: string): CheckResult;
}

export interface Question {
  /** Canonical identity, used for de-duplication within a session. */
  key: string;
  topic: Topic;
  steps: readonly Step[];
}

export type Generator = (rng: Rng) => Question;

export interface TopicWeight {
  topic: Topic;
  weight: number;
}

export interface PracticeSet {
  id: string;
  /** Dutch display name. */
  name: string;
  /** Dutch one-line description. */
  description: string;
  /** Topics besides the mixed-in tables. */
  topics: readonly TopicWeight[];
  /** Integer percentage of table exercises: 100 for Tafels, 15 for the other sets. */
  tablesPercent: number;
}
