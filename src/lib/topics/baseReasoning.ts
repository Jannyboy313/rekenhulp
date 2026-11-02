import type { Rng } from '../random';
import { fromInteger } from '../rational';
import { numberStep } from '../steps';
import type { Question } from '../types';

export function generateBaseReasoning(rng: Rng): Question {
  void rng;
  return {
    key: 'baseReasoning:stub',
    topic: 'baseReasoning',
    steps: [numberStep({ prompt: 'Stub', answer: fromInteger(0) })],
  };
}
