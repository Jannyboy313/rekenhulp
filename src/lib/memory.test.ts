import { describe, expect, it } from 'vitest';
import {
  createVolatileMemory,
  toPracticeRecords,
  type Memory,
  type PracticeRecord,
} from './memory';
import { fromInteger } from './rational';
import type { QuestionRecord } from './results';
import { numberStep } from './steps';
import type { Topic } from './types';

function questionRecord(
  stepResults: boolean[],
  topic: Topic = 'tables',
  answeredSteps = stepResults.length,
): QuestionRecord {
  const steps = stepResults.map((_, i) => numberStep({ prompt: `p${i}`, answer: fromInteger(i) }));
  const attempts = stepResults
    .slice(0, answeredSteps)
    .map((correct) => ({ input: '1', result: { correct, expected: '0' } }));
  return { question: { key: 'k', topic, steps }, attempts, durationMs: 1000 };
}

function practiceRecord(topic: string, correct = true): PracticeRecord {
  return { topic, correct, at: 1000, source: 'set' };
}

describe('toPracticeRecords', () => {
  it('gives nothing for no records', () => {
    expect(toPracticeRecords([], 'set', 1000)).toEqual([]);
  });

  it.each([
    { name: 'one step, correct', steps: [true], answered: 1, correct: true },
    { name: 'one step, wrong', steps: [false], answered: 1, correct: false },
    { name: 'two steps, second wrong', steps: [true, false], answered: 2, correct: false },
    {
      name: 'two steps, only the first answered',
      steps: [true, true],
      answered: 1,
      correct: false,
    },
  ])('$name', ({ steps, answered, correct }) => {
    expect(toPracticeRecords([questionRecord(steps, 'area', answered)], 'set', 1000)).toEqual([
      { topic: 'area', correct, at: 1000, source: 'set' },
    ]);
  });

  it('keeps the order and passes the source and the time through', () => {
    const records = [
      questionRecord([true], 'area'),
      questionRecord([false], 'tables'),
      questionRecord([true], 'lcm'),
    ];
    expect(toPracticeRecords(records, 'test', 1000)).toEqual([
      { topic: 'area', correct: true, at: 1000, source: 'test' },
      { topic: 'tables', correct: false, at: 1000, source: 'test' },
      { topic: 'lcm', correct: true, at: 1000, source: 'test' },
    ]);
  });
});

const VARIANTS: readonly { name: string; create: () => Memory }[] = [
  { name: 'volatile', create: createVolatileMemory },
];

describe.each(VARIANTS)('$name memory', ({ create }) => {
  const [a, b, c] = [
    practiceRecord('area'),
    practiceRecord('tables', false),
    practiceRecord('lcm'),
  ];

  it('starts empty', async () => {
    expect(await create().all()).toEqual([]);
  });

  it('returns the records in the order they were added', async () => {
    const memory = create();
    await memory.add([a, b]);
    await memory.add([c]);
    expect(await memory.all()).toEqual([a, b, c]);
  });

  it('adds nothing for an empty list', async () => {
    const memory = create();
    await memory.add([a]);
    await memory.add([]);
    expect(await memory.all()).toEqual([a]);
  });

  it('clears every record', async () => {
    const memory = create();
    await memory.add([a, b]);
    await memory.clear();
    expect(await memory.all()).toEqual([]);
  });

  it('does not hand out its own list', async () => {
    const memory = create();
    await memory.add([a]);
    (await memory.all()).push(b);
    expect(await memory.all()).toEqual([a]);
  });

  it('does not share records with another memory', async () => {
    await create().add([a]);
    expect(await create().all()).toEqual([]);
  });
});
