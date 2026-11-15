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

const DATABASE = 'rekenhulp';
const STORE = 'records';

function openDatabase(factory: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = factory.open(DATABASE, 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore(STORE, { autoIncrement: true });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function databaseMemory(database: IDBDatabase): Memory {
  /** One transaction; resolves with the result of `work` once it is committed. */
  function run<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>) {
    return new Promise<T>((resolve, reject) => {
      const transaction = database.transaction(STORE, mode);
      const request = work(transaction.objectStore(STORE));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onerror = transaction.onabort = () => reject(transaction.error);
    });
  }

  return {
    async add(records) {
      await run('readwrite', (store) => {
        const requests = records.map((record) => store.add(record));
        // Never empty: `openMemory` skips an empty list.
        return requests[requests.length - 1] as IDBRequest<IDBValidKey>;
      });
    },
    all: () => run<PracticeRecord[]>('readonly', (store) => store.getAll()),
    async clear() {
      await run('readwrite', (store) => store.clear());
    },
  };
}

/**
 * IndexedDB when there is one that opens, else volatile for the rest of the app run (memory
 * spec §3.3). `onFirstAdd` fires once, after the first add that reached IndexedDB (§3.4).
 */
export function openMemory(factory: IDBFactory | undefined, onFirstAdd?: () => void): Memory {
  const fallback = createVolatileMemory();
  if (!factory) return fallback;

  // Opened on the first call and reused; a failed open is cached too, so it is logged once.
  let backend: Promise<Memory> | undefined;
  let reported = false;

  function connect(source: IDBFactory): Promise<Memory> {
    backend ??= openDatabase(source).then(
      (database) => {
        // A newer app version in another tab needs the database: reopen on the next call.
        database.onversionchange = () => {
          database.close();
          backend = undefined;
        };
        return databaseMemory(database);
      },
      (error: unknown) => {
        console.error(error);
        return fallback;
      },
    );
    return backend;
  }

  return {
    async add(records) {
      if (records.length === 0) return;
      const memory = await connect(factory);
      await memory.add(records);
      if (memory === fallback || reported) return;
      reported = true;
      onFirstAdd?.();
    },
    all: async () => (await connect(factory)).all(),
    clear: async () => (await connect(factory)).clear(),
  };
}
