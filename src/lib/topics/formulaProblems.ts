import type { Rng } from '../random';
import { fromInteger } from '../rational';
import { numberStep } from '../steps';
import type { Question } from '../types';

export function generateFormulaProblems(rng: Rng): Question {
  void rng;
  return {
    key: 'formulaProblems:stub',
    topic: 'formulaProblems',
    steps: [numberStep({ prompt: 'Stub', answer: fromInteger(0) })],
  };
}
