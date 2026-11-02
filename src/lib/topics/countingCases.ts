import type { Rng } from '../random';
import { fromInteger } from '../rational';
import { numberStep } from '../steps';
import type { Question } from '../types';

export function generateCountingCases(rng: Rng): Question {
  void rng;
  return {
    key: 'countingCases:stub',
    topic: 'countingCases',
    steps: [numberStep({ prompt: 'Stub', answer: fromInteger(0) })],
  };
}
