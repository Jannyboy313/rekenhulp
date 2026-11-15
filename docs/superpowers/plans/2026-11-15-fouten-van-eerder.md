# Plan v8 — Fouten van eerder

Spec: `docs/superpowers/specs/2026-11-15-fouten-van-eerder-design.md` ("the spec"). TDD, one
commit per task, `npm test` and `npm run check` before each commit, `main` deployable after
each. Executed inline, no subagents. No new tips, no new stored data.

Checkpoints: after task 2 (the `lib/` part) and after task 4 (the app), each with a reread of
the diff against the spec and a short status.

## Task 1 — `dueTopics`

Files: `src/lib/review.ts` (new), `src/lib/review.test.ts` (new).

```ts
/** The topics that are due at `now`, the oldest mistake first (spec §3). */
export function dueTopics(
  records: readonly PracticeRecord[],
  now: number,
  known: ReadonlySet<string> = TOPIC_IDS, // the keys of GENERATORS
): Topic[];
```

- One pass that keeps per topic: the highest `at`, whether a record with that `at` is wrong,
  and the index of its first record. A higher `at` resets the judgement.
- The local day of a moment: year, month and date of `new Date(ms)`; no date library, no
  arithmetic on milliseconds (a day is not always 24 hours).
- Tests build moments with `new Date(2026, 10, day, hour, minute).getTime()`, so they hold in
  any time zone.

Test table (`now` is 15 November 12:00 unless stated; `tables`, `lcm`, … are current ids):

| Records (topic, correct, moment)                               | Expected           |
| -------------------------------------------------------------- | ------------------ |
| none                                                           | `[]`               |
| tables wrong, 15th 09:00                                       | `[]`               |
| tables wrong, 14th 20:00                                       | `[tables]`         |
| tables wrong, 8th                                              | `[tables]`         |
| tables right, 14th                                             | `[]`               |
| tables wrong 14th; tables right 15th 09:00                     | `[]`               |
| tables wrong 14th 10:00; tables right 14th 10:05 (other `at`)  | `[]`               |
| tables right then wrong, same `at` on the 14th                 | `[tables]`         |
| tables wrong then right, same `at` on the 14th                 | `[tables]`         |
| tables wrong 14th; tables wrong 15th 09:00                     | `[]`               |
| tables right 13th; tables wrong 14th                           | `[tables]`         |
| `gone-topic` wrong 14th                                        | `[]`               |
| lcm wrong 14th; tables wrong 12th                              | `[tables, lcm]`    |
| lcm wrong and tables wrong, same `at` on the 14th, lcm first   | `[lcm, tables]`    |
| tables wrong 14th 23:59, `now` 15th 00:01                      | `[tables]`         |
| tables wrong 14th; lcm right 14th (another topic does not clear) | `[tables]`       |

Commit: `Added the due topics of earlier mistakes`.

## Task 2 — `reviewSession`

Files: `src/lib/session.ts`, `src/lib/session.test.ts`.

```ts
export const REVIEW_PER_TOPIC = 2;
export const REVIEW_MAX_TOPICS = 7;

/** Two new exercises of each of the first seven topics, shuffled (spec §5). */
export function reviewSession(
  topics: readonly Topic[],
  rng: Rng,
  generators: Record<Topic, Generator> = GENERATORS,
): Question[];
```

Built on the existing `repeat` and `generatePlan` (de-duplication and shuffle); no new helper.

| Input                          | Expected                                                   |
| ------------------------------ | ---------------------------------------------------------- |
| `[]`                           | `[]`                                                       |
| one topic                      | 2 questions of that topic, different keys                  |
| three topics                   | 6 questions, 2 per topic                                   |
| eight topics                   | 14 questions, 2 of each of the first seven, none of the 8th |
| 1000 seeds, three topics       | never a duplicate key or first prompt within a session     |
| same seed twice                | the same questions                                         |

Commit: `Added the session of earlier mistakes`. **Checkpoint.**

## Task 3 — the row and its glyph

Files: `src/lib/review.ts` and its test, `src/components/PracticeSetList.svelte` (and its test
file if one exists, else covered in task 4), `src/components/SetGlyph.svelte`.

```ts
/** The row on the Oefenen tab (spec §4): display data only, not a set. */
export const REVIEW_ROW = { id: 'fouten', name: 'Fouten van eerder' } as const;
export function reviewDescription(count: number): string;
```

```ts
// PracticeSetList
/** The first row, only with due topics (spec §4). */
review?: { count: number; onstart: () => void };
```

| `reviewDescription` | Expected                        |
| ------------------- | ------------------------------- |
| 1                   | `1 onderwerp om te herhalen`    |
| 2                   | `2 onderwerpen om te herhalen`  |
| 12                  | `12 onderwerpen om te herhalen` |

- The row is a `SetRow` with `{ ...REVIEW_ROW, description }`, rendered before the sets.
- Glyph `fouten` in `KNOWN`: a violet circular arrow (stroke) around an amber dot, with the
  existing classes; no raw colours.
- Nothing shows it yet: `App` passes no `review` until task 4.

Commit: `Added the row and the glyph of earlier mistakes`.

## Task 4 — `App.svelte`: reading, the session, the scene

Files: `src/App.svelte`, `src/App.test.ts` (append, do not overwrite),
`src/components/ClearMemory.svelte`, `src/screens/scenes.ts`, `screenshots/screens.spec.ts`.

- State `due: Topic[]` (`$state.raw`, starts empty). `refreshDue()` reads `memory.all()` and
  sets `dueTopics(records, Date.now())`; a rejection is logged and gives `[]`.
- An effect calls `refreshDue()` whenever `screen.name` is `sets`. The save of a session is
  issued before this read (results come before the overview), and both memories answer in call
  order, so the read sees the session.
- `ClearMemory` gets `oncleared?: () => void`, called after a successful clear only; `App`
  passes `refreshDue`.
- `Origin` gains `{ kind: 'review'; topics: Topic[] }`:
  - `startReview(topics)`: `show(...)` with `reviewSession(topics, rng)`; the origin's topics
    are the topics of the built questions (at most seven).
  - `originName` → `REVIEW_ROW.name`; `restart` → `startReview(origin.topics)`;
    `practiseMistakes` unchanged (default generators); `leaveResults` unchanged (overview).
  - `save`: the source is `set` for a review, else `origin.kind` (spec decision 11).
- `PracticeSetList` gets `review={{ count: due.length, onstart: () => startReview(due) }}` only
  when `due.length > 0`.
- Scene `app-review`: `App` with a volatile memory seeded with wrong records of three topics
  from a fixed past date. Shot `overview-review` on that scene; the compact project skips it by
  its id, like the other overview shots.

`App.test.ts`, a new `describe('App: Fouten van eerder (review spec)')`, with a helper that
seeds a volatile memory (`yesterday` = now − 24 h under a faked `Date` at noon):

| Case                                                        | Expected                                                             |
| ----------------------------------------------------------- | -------------------------------------------------------------------- |
| empty memory                                                | no button "Fouten van eerder"                                        |
| tables wrong today                                          | no row                                                               |
| tables wrong yesterday                                      | row first in the list, "1 onderwerp om te herhalen"                  |
| tables and lcm wrong yesterday                              | "2 onderwerpen om te herhalen"                                       |
| tap on the row                                              | play screen named "Fouten van eerder", 2 exercises, no setup screen  |
| session answered (wrong), Menu                              | row gone; 2 new records with source `set` and today's `at`           |
| session stopped at once, back on the overview               | row still there                                                      |
| Opnieuw on its results                                      | a new session named "Fouten van eerder" with 2 exercises             |
| Fouten oefenen on its results                               | a session of `3 × mistakes` exercises, same name                     |
| Gegevens wissen → Wissen                                    | row gone                                                             |
| memory whose `all` rejects                                  | the list without the row, the error logged, no error screen          |
| Lesstof tab with a due topic                                | no row                                                               |

Existing tests that index rows or buttons of the list (Gemengd, Oefentoets) keep an empty
memory, so they do not change.

Commit: `Added the earlier mistakes to the overview`. Then `npm run screenshots` for the new
shot on every layout, a look at the PNGs (tile grid with 14 tiles, Gegevens wissen still in a
free cell). **Checkpoint.**

## Task 5 — documents

- Spec: status "built on …".
- Main spec: §1 non-goals (the records have one reader; "no adaptive difficulty" as spec
  decision 14), §3 (Opnieuw after a review session), §3.1 (the row), §3.5 (Opnieuw), §12 and
  §12.16 (done).
- Memory spec: §1 (v8 reads the records), §3.1 (a review session has the source `set`).
- `CLAUDE.md`: project description ("Nothing reads the records yet"), Status (v8 done), the
  roadmap table, architecture (`lib/review.ts`, `reviewSession`, the `review` origin), "Out of
  scope" (reading the records is allowed for this feature only).

Commit: `Updated the specs and the status with the earlier mistakes as done`.

## Final review

- `npm test`, `npm run check`, `npm run build` (ends with the `dist/sw.js` checks); read
  `dist/sw.js` for one `manifest.webmanifest` entry, the `woff2`, and no `skipWaiting` on install.
- `npm run smoke` is not needed: `main.ts` and the PWA config do not change.
- Reread the whole diff against the spec; `npx prettier --check` on the touched files.
- `git rm` this plan; commit `Removed the plan of the earlier mistakes`.

## Edge cases to keep in mind

- A due topic whose generator throws: `show` gives the error screen, as for any session.
- The day changes while the overview is open: the row is not refreshed until the overview is
  shown again. Accepted.
- Two reads in flight (overview shown, then Gegevens wissen): both memories answer in call
  order, so the later read wins.
- Deviation from spec §8: the scene and the shot move from step 3 to step 4, because the scene
  needs `App` to read the memory. The spec is updated in this commit.
