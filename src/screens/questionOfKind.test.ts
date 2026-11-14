import { describe, expect, it } from 'vitest';
import { rational } from '../lib/rational';
import { numberStep } from '../lib/steps';
import type { Generator, Topic } from '../lib/types';
import { ANSWER_KINDS, questionOfKind } from './questionOfKind';

describe('questionOfKind', () => {
  it.each(ANSWER_KINDS)('finds a question whose first step is %s', (kind) => {
    expect(questionOfKind(kind).steps[0]?.kind).toBe(kind);
  });

  it('is deterministic', () => {
    expect(questionOfKind('fraction').key).toBe(questionOfKind('fraction').key);
  });

  it('throws when no generator produces the kind', () => {
    const onlyNumbers: Partial<Record<Topic, Generator>> = {
      tables: () => ({
        key: '1',
        topic: 'tables',
        steps: [numberStep({ prompt: '1 × 1', answer: rational(1n) })],
      }),
    };
    expect(() => questionOfKind('roman', onlyNumbers)).toThrow('roman');
  });
});
