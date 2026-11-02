import type { Rng } from '../random';
import { fromInteger } from '../rational';
import { numberStep } from '../steps';
import type { Question } from '../types';

export function generateTwoUnknowns(rng: Rng): Question {
  void rng;
  return {
    key: 'twoUnknowns:stub',
    topic: 'twoUnknowns',
    steps: [numberStep({ prompt: 'Stub', answer: fromInteger(0) })],
  };
}
