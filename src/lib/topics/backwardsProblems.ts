import type { Rng } from '../random';
import { fromInteger } from '../rational';
import { numberStep } from '../steps';
import type { Question } from '../types';

export function generateBackwardsProblems(rng: Rng): Question {
  void rng;
  return {
    key: 'backwardsProblems:stub',
    topic: 'backwardsProblems',
    steps: [numberStep({ prompt: 'Stub', answer: fromInteger(0) })],
  };
}
