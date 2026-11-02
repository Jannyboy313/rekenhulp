import type { Rng } from '../random';
import { fromInteger } from '../rational';
import { numberStep } from '../steps';
import type { Question } from '../types';

export function generateStatisticsReasoning(rng: Rng): Question {
  void rng;
  return {
    key: 'statisticsReasoning:stub',
    topic: 'statisticsReasoning',
    steps: [numberStep({ prompt: 'Stub', answer: fromInteger(0) })],
  };
}
