import { describe, expect, it } from 'vitest';
import {
  advance,
  answer,
  currentEntry,
  currentStep,
  originalNumber,
  startPlay,
  stop,
  type PlayState,
} from './play';
import { createRng } from './random';
import { fromInteger } from './rational';
import type { StepAttempt } from './results';
import { numberStep } from './steps';
import type { Question } from './types';

function question(prompt: string, ...answers: number[]): Question {
  return {
    key: prompt,
    topic: 'tables',
    steps: answers.map((value, index) =>
      numberStep({ prompt: `${prompt} step ${index}`, answer: fromInteger(value) }),
    ),
  };
}

const A = question('a', 1);
const B = question('b', 2);
const C = question('c', 3);
const TWO_STEPS = question('two', 4, 5);

const rng = () => createRng(1);

/** An attempt on the current step with `input`. */
function attempt(state: PlayState, input: string): StepAttempt {
  return { input, result: currentStep(state).check(input) };
}

function give(state: PlayState, input: string, now = 0): PlayState {
  return answer(state, attempt(state, input), now, rng());
}

describe('startPlay', () => {
  it('starts on the first step of the first question', () => {
    const state = startPlay([A, B, C], 1000);
    expect(state).toMatchObject({
      questionIndex: 0,
      stepIndex: 0,
      attempts: [],
      feedback: null,
      records: [],
      questionStart: 1000,
      finished: false,
    });
    expect(state.queue).toEqual([A, B, C].map((q) => ({ question: q, repeat: false })));
  });
});

describe('answer', () => {
  it('records a correct answer with its duration and leaves the queue alone', () => {
    const state = give(startPlay([A, B, C], 1000), '1', 1500);
    expect(state.feedback?.result.correct).toBe(true);
    expect(state.records).toHaveLength(1);
    expect(state.records[0]).toMatchObject({ question: A, durationMs: 500 });
    expect(state.queue).toHaveLength(3);
  });

  it('records a wrong answer and queues a repeat, not directly next', () => {
    for (let seed = 0; seed < 50; seed++) {
      const start = startPlay([A, B, C], 0);
      const state = answer(start, attempt(start, '9'), 0, createRng(seed));
      expect(state.records).toHaveLength(1);
      expect(state.queue).toHaveLength(4);
      const index = state.queue.findIndex((entry) => entry.repeat);
      expect(index).toBeGreaterThanOrEqual(2);
      expect(state.queue[index]).toEqual({ question: A, repeat: true });
    }
  });

  it('appends the repeat directly when nothing else remains', () => {
    const state = give(startPlay([A], 0), '9');
    expect(state.queue).toEqual([
      { question: A, repeat: false },
      { question: A, repeat: true },
    ]);
  });

  it('records nothing after the first step of a multi-step question', () => {
    const state = give(startPlay([TWO_STEPS, B], 0), '4');
    expect(state.feedback?.result.correct).toBe(true);
    expect(state.records).toEqual([]);
    expect(state.queue).toHaveLength(2);
  });

  it('records one question with both attempts and queues a repeat after a wrong first step', () => {
    let state = give(startPlay([TWO_STEPS, B], 0), '9');
    expect(state.queue).toHaveLength(2);
    state = give(advance(state, 0), '5');
    expect(state.records).toHaveLength(1);
    expect(state.records[0]?.attempts.map((a) => a.result.correct)).toEqual([false, true]);
    expect(state.queue.filter((entry) => entry.repeat)).toHaveLength(1);
  });

  it('does not record a repeat again, and repeats it again when wrong', () => {
    let state = advance(give(startPlay([A], 0), '9'), 0);
    expect(currentEntry(state).repeat).toBe(true);
    state = give(state, '9');
    expect(state.records).toHaveLength(1);
    expect(state.queue).toHaveLength(3);
    state = give(advance(state, 0), '1');
    expect(state.records).toHaveLength(1);
    expect(state.queue).toHaveLength(3);
  });

  it('ignores a second answer while the feedback is shown', () => {
    const state = give(startPlay([A, B], 0), '1');
    expect(give(state, '1')).toBe(state);
  });
});

describe('advance', () => {
  it('moves to the next step and keeps the attempts and the start time', () => {
    const state = advance(give(startPlay([TWO_STEPS], 1000), '4', 1200), 1300);
    expect(state).toMatchObject({ questionIndex: 0, stepIndex: 1, feedback: null });
    expect(state.attempts).toHaveLength(1);
    expect(state.questionStart).toBe(1000);
  });

  it('moves to the next question and restarts its clock', () => {
    const state = advance(give(startPlay([A, B], 1000), '1', 1500), 2000);
    expect(state).toMatchObject({
      questionIndex: 1,
      stepIndex: 0,
      attempts: [],
      feedback: null,
      questionStart: 2000,
      finished: false,
    });
  });

  it('finishes after the last question', () => {
    const state = advance(give(startPlay([A], 0), '1'), 0);
    expect(state.finished).toBe(true);
    expect(state.records).toHaveLength(1);
  });

  it('does nothing while a step waits for its answer', () => {
    const state = startPlay([A, B], 0);
    expect(advance(state, 0)).toBe(state);
  });
});

describe('stop', () => {
  it('finishes with only the answered originals, also with a repeat waiting', () => {
    const state = stop(advance(give(startPlay([A, B, C], 0), '9'), 0));
    expect(state.finished).toBe(true);
    expect(state.records.map((record) => record.question)).toEqual([A]);
  });
});

describe('a finished state', () => {
  it('ignores every further action', () => {
    const state = stop(startPlay([A, B], 0));
    expect(give(state, '1')).toBe(state);
    expect(advance(state, 0)).toBe(state);
    expect(stop(state)).toBe(state);
  });
});

describe('originalNumber', () => {
  it('counts the originals up to the current entry, so a repeat keeps the last number', () => {
    let state = startPlay([A, B], 0);
    expect(originalNumber(state)).toBe(1);
    state = advance(give(state, '1'), 0);
    expect(originalNumber(state)).toBe(2);
    // B wrong: its repeat is the only entry left.
    state = advance(give(state, '9'), 0);
    expect(currentEntry(state).repeat).toBe(true);
    expect(originalNumber(state)).toBe(2);
  });
});

describe('purity', () => {
  it('does not mutate the state it is given', () => {
    const start = startPlay([A, TWO_STEPS], 0);
    const frozen = structuredCloneShape(start);
    const wrong = give(start, '9');
    advance(wrong, 0);
    stop(wrong);
    expect(structuredCloneShape(start)).toEqual(frozen);
  });
});

/** The comparable shape of a state (steps hold functions, so compare lengths and positions). */
function structuredCloneShape(state: PlayState) {
  return {
    queue: state.queue.map((entry) => [entry.question.key, entry.repeat]),
    questionIndex: state.questionIndex,
    stepIndex: state.stepIndex,
    attempts: state.attempts.length,
    feedback: state.feedback,
    records: state.records.length,
    questionStart: state.questionStart,
    finished: state.finished,
  };
}
