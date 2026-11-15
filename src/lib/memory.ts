import { isCorrect, type QuestionRecord } from './results';

/** What started the session of a record; Fouten oefenen keeps the source of its session. */
export type RecordSource = 'set' | 'test' | 'lesson';

/** One answered exercise, as plain data that can be stored (memory spec §3.1). */
export interface PracticeRecord {
  /** A `Topic` id. Stored data: a reader skips an id that no longer exists. */
  topic: string;
  /** Correct on the first attempt. */
  correct: boolean;
  /** Epoch milliseconds: the moment the session was saved. */
  at: number;
  source: RecordSource;
}

export interface Memory {
  add(records: readonly PracticeRecord[]): Promise<void>;
  /** In the order they were added. */
  all(): Promise<PracticeRecord[]>;
  clear(): Promise<void>;
}

/** The records of a finished session (memory spec §4). */
export function toPracticeRecords(
  records: readonly QuestionRecord[],
  source: RecordSource,
  at: number,
): PracticeRecord[] {
  return records.map((record) => ({
    topic: record.question.topic,
    correct: isCorrect(record),
    at,
    source,
  }));
}

/** Lasts until the app closes; also the fallback without IndexedDB and the test double. */
export function createVolatileMemory(): Memory {
  let stored: PracticeRecord[] = [];
  return {
    async add(records) {
      stored = [...stored, ...records];
    },
    async all() {
      return [...stored];
    },
    async clear() {
      stored = [];
    },
  };
}
