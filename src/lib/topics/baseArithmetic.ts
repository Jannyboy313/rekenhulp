import type { Rng } from '../random';
import { fromInteger } from '../rational';
import { numberStep } from '../steps';
import type { Question } from '../types';

export function generateBaseArithmetic(rng: Rng): Question {
  void rng;
  return {
    key: 'baseArithmetic:stub',
    topic: 'baseArithmetic',
    steps: [numberStep({ prompt: 'Stub', answer: fromInteger(0) })],
  };
}
