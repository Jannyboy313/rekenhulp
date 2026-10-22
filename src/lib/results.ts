import type { AnswerKind, CheckResult, Question } from './types';

export interface StepAttempt {
  input: string;
  result: CheckResult;
}

export interface QuestionRecord {
  question: Question;
  attempts: readonly StepAttempt[];
  /** From showing the question until the final step was submitted. */
  durationMs: number;
}

export interface SessionSummary {
  answered: number;
  correct: number;
  percentage: number;
  /** Wall-clock session time, as shown by the header timer. */
  totalMs: number;
  averageMs: number;
  mistakes: QuestionRecord[];
}

/** A step answered wrongly, as the result screen lists it. */
export interface WrongStep {
  prompt: string;
  kind: AnswerKind;
  attempt: StepAttempt;
}

/** One entry per wrong step, so a multi-step question shows only the step that failed. */
export function wrongSteps(records: readonly QuestionRecord[]): WrongStep[] {
  return records.flatMap((record) =>
    record.attempts
      .map((attempt, index): WrongStep => {
        const step = record.question.steps[index];
        return { prompt: step?.prompt ?? '', kind: step?.kind ?? 'number', attempt };
      })
      .filter(({ attempt }) => !attempt.result.correct),
  );
}

export function isCorrect(record: QuestionRecord): boolean {
  return (
    record.attempts.length === record.question.steps.length &&
    record.attempts.every((attempt) => attempt.result.correct)
  );
}

export function summarize(records: readonly QuestionRecord[], totalMs: number): SessionSummary {
  const answered = records.length;
  const correct = records.filter(isCorrect).length;
  const durationSum = records.reduce((sum, record) => sum + record.durationMs, 0);
  return {
    answered,
    correct,
    percentage: answered === 0 ? 0 : Math.round((correct / answered) * 100),
    totalMs,
    averageMs: answered === 0 ? 0 : durationSum / answered,
    mistakes: records.filter((record) => !isCorrect(record)),
  };
}
