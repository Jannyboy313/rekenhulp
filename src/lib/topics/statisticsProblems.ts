import type { Rng } from '../random';
import { fromInteger } from '../rational';
import { numberStep } from '../steps';
import type { Question } from '../types';

export function generateStatisticsProblems(rng: Rng): Question {
  void rng;
  return {
    key: 'statisticsProblems:stub',
    topic: 'statisticsProblems',
    steps: [numberStep({ prompt: 'Stub', answer: fromInteger(0) })],
  };
}
