import type { Rng } from './random';
import { isCorrect, type QuestionRecord, type StepAttempt } from './results';
import { insertRepeat } from './session';
import type { Question, Step } from './types';

export interface QueueEntry {
  question: Question;
  /** A wrongly answered question shown again (spec §3.4); it is not recorded again. */
  repeat: boolean;
}

/** The state of a running session. Every transition returns a new state; none mutates. */
export interface PlayState {
  readonly queue: readonly QueueEntry[];
  readonly questionIndex: number;
  readonly stepIndex: number;
  /** Attempts on the steps of the current question. */
  readonly attempts: readonly StepAttempt[];
  /** The attempt whose feedback is shown; null while a step waits for its answer. */
  readonly feedback: StepAttempt | null;
  /** First attempts only: one record per original question (spec §3.4). */
  readonly records: readonly QuestionRecord[];
  /** When the current question was shown, in ms. */
  readonly questionStart: number;
  readonly finished: boolean;
}

export function startPlay(questions: readonly Question[], now: number): PlayState {
  return {
    queue: questions.map((question) => ({ question, repeat: false })),
    questionIndex: 0,
    stepIndex: 0,
    attempts: [],
    feedback: null,
    records: [],
    questionStart: now,
    finished: false,
  };
}

export function currentEntry(state: PlayState): QueueEntry {
  return state.queue[state.questionIndex]!;
}

export function currentStep(state: PlayState): Step {
  return currentEntry(state).question.steps[state.stepIndex]!;
}

/** The 1-based number of the current question among the originals (the header counter). */
export function originalNumber(state: PlayState): number {
  return state.queue.slice(0, state.questionIndex + 1).filter((entry) => !entry.repeat).length;
}

/**
 * An answer on the current step. On the last step the question is recorded (a repeat is not)
 * and, when it was not correct, queued again (spec §3.4). Ignored while feedback is shown.
 */
export function answer(state: PlayState, attempt: StepAttempt, now: number, rng: Rng): PlayState {
  if (state.finished || state.feedback !== null) return state;
  const entry = currentEntry(state);
  const { question } = entry;
  const attempts = [...state.attempts, attempt];
  let { queue, records } = state;
  if (attempts.length === question.steps.length) {
    const record = { question, attempts, durationMs: now - state.questionStart };
    if (!entry.repeat) records = [...records, record];
    if (!isCorrect(record)) {
      queue = insertRepeat(queue, state.questionIndex, { question, repeat: true }, rng);
    }
  }
  return { ...state, queue, records, attempts, feedback: attempt };
}

/** After the feedback: the next step, the next question, or finished. */
export function advance(state: PlayState, now: number): PlayState {
  if (state.finished || state.feedback === null) return state;
  if (state.stepIndex + 1 < currentEntry(state).question.steps.length) {
    return { ...state, feedback: null, stepIndex: state.stepIndex + 1 };
  }
  if (state.questionIndex + 1 < state.queue.length) {
    return {
      ...state,
      feedback: null,
      questionIndex: state.questionIndex + 1,
      stepIndex: 0,
      attempts: [],
      questionStart: now,
    };
  }
  return { ...state, finished: true };
}

/** Stoppen: finished with the records so far. */
export function stop(state: PlayState): PlayState {
  return state.finished ? state : { ...state, finished: true };
}
