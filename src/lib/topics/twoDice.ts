import type { Rng } from '../random';
import { fromInteger } from '../rational';
import { numberStep } from '../steps';
import type { Question } from '../types';

export function generateTwoDice(rng: Rng): Question {
  void rng;
  return {
    key: 'twoDice:stub',
    topic: 'twoDice',
    steps: [numberStep({ prompt: 'Stub', answer: fromInteger(0) })],
  };
}
