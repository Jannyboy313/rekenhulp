import type { Rng } from '../random';
import { fromInteger } from '../rational';
import { numberStep } from '../steps';
import type { Question } from '../types';

export function generateHexBinary(rng: Rng): Question {
  void rng;
  return {
    key: 'hexBinary:stub',
    topic: 'hexBinary',
    steps: [numberStep({ prompt: 'Stub', answer: fromInteger(0) })],
  };
}
