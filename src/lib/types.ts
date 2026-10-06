import type { Rng } from './random';

/** Bewerkingen adds 'expression' (spec §6). */
export type AnswerKind = 'number' | 'fraction' | 'boolean' | 'factorization';

/** Topics of the implemented sets. Each later plan adds the topics of its set (spec §4.1). */
export type Topic =
  | 'tables'
  | 'volume'
  | 'area'
  | 'length'
  | 'mass'
  | 'time'
  | 'numberUnits'
  | 'percentages'
  | 'ratios'
  | 'lcm'
  | 'gcd'
  | 'prime'
  | 'factorization';

export interface CheckResult {
  correct: boolean;
  /** Correct answer, formatted for display. */
  expected: string;
  explanation?: string;
}

export interface Step {
  kind: AnswerKind;
  prompt: string;
  /** Fixed unit shown before the input: '€'. */
  prefix?: string;
  /** Fixed unit shown after the input, e.g. 'cm³' or '%'. */
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
