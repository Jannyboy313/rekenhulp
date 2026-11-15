import { IDBFactory as FakeFactory } from 'fake-indexeddb';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createVolatileMemory,
  openMemory,
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
  { name: 'IndexedDB', create: () => openMemory(new FakeFactory()) },
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

describe('openMemory', () => {
  const [a, b] = [practiceRecord('area'), practiceRecord('tables', false)];

  /** An `open` whose request fails, as a blocked or corrupt database does. */
  function failingFactory(): IDBFactory {
    return {
      open() {
        const request = { error: new Error('open failed') } as unknown as IDBOpenDBRequest;
        queueMicrotask(() => request.onerror?.(new Event('error')));
        return request;
      },
    } as unknown as IDBFactory;
  }

  function throwingFactory(): IDBFactory {
    return {
      open() {
        throw new Error('no storage');
      },
    } as unknown as IDBFactory;
  }

  afterEach(() => vi.restoreAllMocks());

  it('keeps the records for a later memory on the same database', async () => {
    const factory = new FakeFactory();
    await openMemory(factory).add([a, b]);
    expect(await openMemory(factory).all()).toEqual([a, b]);
  });

  it('clears the records for a later memory too', async () => {
    const factory = new FakeFactory();
    const memory = openMemory(factory);
    await memory.add([a]);
    await memory.clear();
    expect(await openMemory(factory).all()).toEqual([]);
  });

  it('is volatile without IndexedDB', async () => {
    const memory = openMemory(undefined);
    await memory.add([a]);
    expect(await memory.all()).toEqual([a]);
  });

  it.each([
    { name: 'throws', factory: throwingFactory },
    { name: 'fails', factory: failingFactory },
  ])('is volatile when opening $name, and logs it once', async ({ factory }) => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const memory = openMemory(factory());
    await memory.add([a]);
    await memory.add([b]);
    expect(await memory.all()).toEqual([a, b]);
    expect(log).toHaveBeenCalledTimes(1);
  });

  it('reports the first add that reached IndexedDB, once', async () => {
    const onFirstAdd = vi.fn();
    const memory = openMemory(new FakeFactory(), onFirstAdd);
    await memory.add([]);
    expect(onFirstAdd).not.toHaveBeenCalled();
    await memory.add([a]);
    expect(onFirstAdd).toHaveBeenCalledTimes(1);
    await memory.add([b]);
    expect(onFirstAdd).toHaveBeenCalledTimes(1);
  });

  it.each([
    { name: 'without IndexedDB', factory: () => undefined },
    { name: 'when opening fails', factory: failingFactory },
  ])('does not report an add $name', async ({ factory }) => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const onFirstAdd = vi.fn();
    await openMemory(factory(), onFirstAdd).add([a]);
    expect(onFirstAdd).not.toHaveBeenCalled();
  });

  it('lets go of the database when a newer version needs it', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const factory = new FakeFactory();
    const memory = openMemory(factory);
    await memory.add([a]);
    await new Promise<void>((resolve, reject) => {
      const request = factory.open('rekenhulp', 2);
      request.onsuccess = () => {
        request.result.close();
        resolve();
      };
      request.onerror = request.onblocked = () => reject(new Error('the upgrade was blocked'));
    });
    // Version 1 can no longer open the database: the memory goes on, volatile.
    await memory.add([b]);
    expect(await memory.all()).toEqual([b]);
  });
});
