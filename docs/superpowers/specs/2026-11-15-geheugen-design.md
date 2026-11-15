# Rekenhulp v7 — Geheugen (persistent memory)

Date: 2026-11-15. Status: built on 2026-11-15. Implements the v7 entry of main spec §12.

"Main spec" is `2026-10-05-rekenhulp-design.md`, "v4 spec" is `2026-11-14-tablet-design.md`.

## 1. Goal

The app remembers, on the device, what was practised and how it went: one small record per
answered exercise. v7 is the framework only. It stores the records and lets the user delete
them; nothing reads them yet. Its first readers are v8 (yesterday's mistakes, main spec §12.16)
and v11 (the streak, §12.13).

### Non-goals

- Anything that shows or uses the stored records: statistics, history, a streak (v11), mistakes
  that come back (v8), adaptive difficulty.
- Sync, export, import, accounts, a server. The records never leave the device; the app still
  makes no network calls.
- Remembering settings (count, level, table choice, the active tab): every app start still uses
  the defaults (main spec §3.1, §3.2).
- Storing an exercise itself (prompt, answer, input): a `Question` cannot be stored
  (`Step.check` is a closure), and v8 makes a new exercise of the same topic.
- Pruning old records, storage quota handling, migration tooling.

## 2. Decisions

Decided with the user on 2026-11-15: 1–4 as choices, 5–11 as the confirmed defaults of the draft.

| #   | Question          | Decision                                                                                                                                                                  |
| --- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | What is stored    | One record per answered exercise: topic, correct on the first attempt, time, source (§3). No duration, prompt or answer.                                                  |
| 2   | Visible in v7     | Only **Gegevens wissen** with a confirmation (§5). No explanation text, no other UI.                                                                                      |
| 3   | Which sessions    | All: sets, Gemengd, Fouten oefenen, a lesson session and the Oefentoets; also the answered exercises of a stopped session (§4).                                           |
| 4   | Retention         | Unlimited; no pruning.                                                                                                                                                    |
| 5   | Level             | Not stored: a topic belongs to exactly one level (`topics` or `deep` in `lib/sets.ts`), `tables` to Opfrisser.                                                            |
| 6   | When it is saved  | Once, when the session ends (finished, stopped, or a test that ran out of time). A session that is abandoned by closing the app saves nothing.                            |
| 7   | Time of a record  | The moment of saving, the same for every record of the session. A session that crosses midnight counts for the day it ended.                                              |
| 8   | No IndexedDB      | The app works as before, with a memory that lasts until the app closes. Nothing is shown (§3.3).                                                                          |
| 9   | Failed write      | Logged to the console; the results screen shows as usual. Saving never delays or blocks a screen.                                                                         |
| 10  | Durable storage   | After the first successful save the app asks `navigator.storage.persist()` once per app start and ignores the answer. Chrome on Android decides without a prompt (§3.4).  |
| 11  | Library           | None at runtime: the plain IndexedDB API (one store, three operations). Tests use the dev dependency `fake-indexeddb`.                                                    |

## 3. Storage

### 3.1 Record

```ts
/** What started the session of a record. Fouten oefenen keeps the source of its session. */
type RecordSource = 'set' | 'test' | 'lesson';

interface PracticeRecord {
  /** A `Topic` id. Stored data: an id that no longer exists is skipped by its reader. */
  topic: string;
  /** Correct on the first attempt, as the score on the results screen (main spec §3.5). */
  correct: boolean;
  /** Epoch milliseconds (decision 7). */
  at: number;
  source: RecordSource;
}
```

- `source` is `set` for a set and for Gemengd, `test` for the Oefentoets, `lesson` for
  **Oefen 5 sommen**; Fouten oefenen keeps the source of the session it follows.
- A `Topic` id is from now on a storage format: renaming or removing a topic leaves old records
  with an unknown id. A reader skips those; nothing is migrated. `topic` is therefore a `string`
  in the record, not a `Topic`.
- A reader derives the day from `at` in local time. No date string is stored.

### 3.2 Interface

`lib/memory.ts`, without Svelte imports:

```ts
interface Memory {
  add(records: readonly PracticeRecord[]): Promise<void>;
  all(): Promise<PracticeRecord[]>;
  clear(): Promise<void>;
}

/** Lasts until the app closes; also the fallback and the test double. */
function createVolatileMemory(): Memory;
/** IndexedDB when there is one that opens, else volatile (§3.3). */
function openMemory(factory: IDBFactory | undefined, onFirstAdd?: () => void): Memory;
/** The records of a finished session (§4). */
function toPracticeRecords(
  records: readonly QuestionRecord[],
  source: RecordSource,
  at: number,
): PracticeRecord[];
```

- `all()` returns the records in the order they were added. v7 itself only uses it in tests; it
  is the read side v8 and v11 build on.
- `add([])` writes nothing.

### 3.3 IndexedDB

- Database `rekenhulp`, version 1, one object store `records` with an auto-increment key and no
  indexes. An index is added with a version bump when a reader needs one.
- The database is opened on the first call, not at app start, and the connection is reused.
- When `indexedDB` is missing, or opening fails (private mode, a blocked or corrupt database),
  the memory falls back to the volatile variant for the rest of the app run (decision 8). The
  failure is logged once. An operation that fails on an open database is not a fallback: its
  promise rejects (decision 9, §5).
- A newer app version in another tab can need the database (`versionchange`): the connection is
  closed then, and reopened on the next call.

### 3.4 Durable storage

Without it the browser may evict the origin's storage under pressure, the records included.
`navigator.storage.persist()` is asked after the first successful `add` to IndexedDB of an app
run; a missing API or a refusal changes nothing (decision 10). It lives in `main.ts`, passed
into the memory as `onFirstAdd`, so `lib/memory.ts` does not touch `navigator`.

## 4. Saving a session

- `App.svelte` saves in `finishSession` and `finishTest`, next to building the summary: it maps
  the `QuestionRecord`s with `toPracticeRecords` and calls `memory.add` without awaiting it.
- One `PracticeRecord` per `QuestionRecord`: `correct` is `isCorrect(record)` (`lib/results.ts`).
  A repeat of a wrong exercise (main spec §3.4) has no `QuestionRecord` and so no record.
- An exercise that was shown but not answered (a stopped session, the unanswered exercises of a
  test) has no record.
- `App` gets the memory as a prop, like `updates`; `main.ts` passes `openMemory(indexedDB)`.
  Without the prop (component tests) `App` uses a volatile memory.

## 5. Gegevens wissen

- On the **Oefenen** tab of the set overview, under the last row (Oefentoets): a small text
  button **Gegevens wissen**, in the muted text colour, 44 px high. It is the last item of the
  list and scrolls with it: centred on the phone; on a tablet it takes the free cells after the
  last tile, at their bottom right (13 tiles leave free cells in both tablet grids). It is
  always shown, also when nothing is stored. The **Lesstof** tab does not have it.
- A tap opens a modal dialog (`ModalDialog`): title "Gegevens wissen?", text "Je resultaten op
  dit apparaat worden verwijderd. Dit kan niet ongedaan worden gemaakt.", buttons **Annuleren**
  (secondary, has the focus) and **Wissen** (primary). Escape closes it like Annuleren.
- **Wissen** calls `memory.clear()`, closes the dialog and replaces the button by the text
  "Gegevens gewist." (`role="status"`) until the tab or the overview is left. A failed clear is
  logged; the text is then "Wissen is niet gelukt." and the button stays.
- The update dialog (main spec §2) waits while this dialog is open. A system back is not handled
  by the dialog: on `sets` it behaves as the system default (main spec §3).
- Under the "too low" notice (v4 spec §3.3) the dialog is out of reach like the screen; it is
  still open after turning back.

## 6. Code structure

- `lib/memory.ts`: the types and functions of §3.2.
- `components/ClearMemory.svelte`: the button, its status text and its dialog (a
  `ModalDialog`). `App.svelte` passes it to `PracticeSetList` as a `footer` snippet, the last
  item of the list; the list and the shell get no memory props.
- `App.svelte`: the `memory` prop, saving in `finishSession` and `finishTest`, and
  `shouldPrompt` not shown while the clear dialog is open.
- `main.ts`: `openMemory`, the `persist()` callback.
- `package.json`: dev dependency `fake-indexeddb`.

## 7. Testing

- `lib/memory.test.ts`: one table of behaviours run against both variants (volatile, and
  IndexedDB on `fake-indexeddb`): add then all, order kept, `add([])`, clear, records surviving
  a second `openMemory` on the same factory. The
  fallback: `openMemory(undefined)`, and a factory whose `open` fails. `toPracticeRecords`:
  first-attempt correct and wrong, a multi-step question, the source and the time passed
  through.
- `App.test.ts`: a finished session, a stopped session, Fouten oefenen, a lesson session and a
  test each add their records with the right source; a memory whose `add` rejects still shows
  the results. Gegevens wissen: Annuleren, Escape and Wissen; the status text; the update dialog
  waiting.
- Shots (main spec §10, CLAUDE.md): `clear-dialog` (the scene `app` with a tap on the button), on
  every layout the overview shots have. The button itself is in the shot `overview-practice`.
- `npm run smoke`: needed, `main.ts` changes. The smoke test also checks that a played session
  left records in IndexedDB.

## 8. Build order

One plan, one commit per task, `main` deployable after each.

1. `lib/memory.ts`: the record, `toPracticeRecords`, the volatile memory.
2. The IndexedDB memory and `openMemory`, with `fake-indexeddb`.
3. Saving from `App.svelte`; `main.ts` with `persist()`; the smoke test.
4. Gegevens wissen: the button, the dialog, the update rule; scenes and shots.
5. The documents of §9.

## 9. Changes to other documents

Made in the task that changes the behaviour, so spec and code never disagree on `main`:

- Main spec §1 (non-goals: persistence of results is allowed, in IndexedDB only; statistics,
  streaks and history stay out until their versions), §2 (the update dialog waits for the clear
  dialog), §3.1 (the button), §3.2 (wording), §12 (v7 done, pointer to this spec).
- `CLAUDE.md`: the project description ("no persistence"), Status, the roadmap row of v7, the
  architecture entries (`lib/memory.ts`, `ClearMemory`), "Out of scope" (persistence only
  through `lib/memory.ts`; localStorage, statistics and streaks stay out).
- `docs/ideas.md`: the note that storing a reminder time waits for v7.
- Oefentoets spec §1: its non-goal is a shown history, the records of a test are stored.

## 10. Open assumptions

None. The defaults of the draft (decisions 5–11 of §2, the place and texts of §5) were confirmed
on 2026-11-15.
