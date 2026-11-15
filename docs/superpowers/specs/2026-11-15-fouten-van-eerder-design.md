# Rekenhulp v8 — Fouten van eerder (yesterday's mistakes)

Date: 2026-11-15. Status: approved, not built. Implements the v8 entry of main spec §12.16.

"Main spec" is `2026-10-05-rekenhulp-design.md`, "memory spec" is
`2026-11-15-geheugen-design.md`, "v4 spec" is `2026-11-14-tablet-design.md`.

## 1. Goal

A topic that went wrong comes back on a later day: the Oefenen tab then shows a row **Fouten
van eerder**, which starts a short session of new exercises of those topics. It is the first
reader of the practice records of v7 and stores nothing new.

What comes back is a topic, not an exercise: a record holds no prompt or answer (memory spec
§3.1), so the session generates new exercises, as Fouten oefenen does (main spec §3.5).

### Non-goals

- Spaced repetition (a topic that returns after 3 and 7 days), a schedule, reminders or
  notifications.
- Mixing these topics into a normal session, a Gemengd session or a test: the app never changes
  the content of a session by itself. The user starts the row, or not.
- Showing history: which exercise went wrong, when, how often, or a list of the open topics.
- New stored data: no new record field, no new store, no index, no stored "done" state.
- Remembering the table choice of a Tafels mistake: the record has only the topic `tables`.

## 2. Decisions

Decided with the user on 2026-11-15: 1–4 as choices, 5–14 as the confirmed defaults of the draft.

| #   | Question                | Decision                                                                                                                                                              |
| --- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Where it starts         | A row on the Oefenen tab, shown only when at least one topic is due (§4).                                                                                             |
| 2   | When a mistake is back  | From the next calendar day (local time) on, and it stays until it is cleared. No schedule.                                                                            |
| 3   | When it is cleared      | When the topic went right later, in any session: derived from the records (§3), nothing is stored.                                                                    |
| 4   | Size of the session     | Two new exercises per due topic, oldest mistake first, capped at the default session length of 15 (§5).                                                               |
| 5   | "Went right later"      | Per topic only its last session counts (the records with its latest `at`): the topic is open when that session has a wrong record. One session is judged as a whole.  |
| 6   | Which records count     | All sources: sets, Gemengd, Fouten oefenen, a lesson session, the Oefentoets and this session itself.                                                                 |
| 7   | The cap                 | At most 7 topics, so at most 14 exercises: a topic is never cut to one exercise. The other due topics stay due and keep the row on the overview.                      |
| 8   | Setup screen            | None: a tap on the row starts the session. No count, no level (a topic has one level, memory spec decision 5).                                                        |
| 9   | Place of the row        | The first row of the list, above Tafels; a tile like the others on a tablet.                                                                                          |
| 10  | Tafels                  | A due `tables` topic practises all tables (2–12), not the choice of the session that went wrong.                                                                      |
| 11  | Its own records         | Saved like any session, with the source `set`: no new `RecordSource`, nothing reads the source yet.                                                                   |
| 12  | Results screen          | As a session: **Opnieuw** starts new exercises of the same topics, **Fouten oefenen** as usual, **Menu** to the overview.                                             |
| 13  | When the app reads      | Each time the overview is shown, and after **Gegevens wissen**. A failed read is logged and shows no row.                                                             |
| 14  | Adaptive difficulty     | Not adaptive (main spec §1): the level of an exercise is never adjusted, and the topics only come back in a session the user starts for that purpose.                 |

## 3. Which topics are due

`lib/review.ts`, pure and without Svelte imports:

```ts
/** The topics that are due at `now`, the oldest mistake first (§3). */
function dueTopics(records: readonly PracticeRecord[], now: number): Topic[];
```

For each topic that occurs in the records:

1. A record whose `topic` is not a current `Topic` id is skipped (memory spec §3.1).
2. Its **last session** is the set of its records with the highest `at`. The records of one
   session share their `at` (memory spec decision 7).
3. The topic is **open** when its last session holds at least one record with
   `correct: false`.
4. An open topic is **due** when the local calendar day of that `at` is before the local
   calendar day of `now`.

The result is sorted on that `at`, ascending; topics with the same `at` keep the order of their
first record.

Consequences, all intended:

- A mistake of today is not due today. It is due tomorrow, and stays due on every later day
  until the topic is practised again.
- Any later session with the topic replaces the judgement: all right clears it (also Fouten
  oefenen on the same day, or a normal session a week later), a new mistake keeps it open and
  moves it to the day after that session.
- Within one session the order of right and wrong does not matter: right then wrong, and wrong
  then right, both leave the topic open.
- A topic that is not practised again never expires.
- The days come from the device clock; a clock or time zone change is not corrected for.

`all()` is read in full and grouped in memory; no index is added (memory spec §3.3). With
unlimited retention this stays small: 15 records per session.

## 4. The row on the overview

- On the **Oefenen** tab, as the first row and only with at least one due topic: name **Fouten
  van eerder**, description "1 onderwerp om te herhalen" or "n onderwerpen om te herhalen",
  with the number of due topics (not capped at 7). The **Lesstof** tab has no such row.
- It is display data like the Oefentoets row (`REVIEW_ROW` with the id `fouten`, not a set) and
  uses `SetRow`. Its glyph, in the style of the others (main spec §3.1): a violet circular arrow
  around an amber dot.
- On a tablet it is one more tile: 14 tiles, which still leave a free cell for **Gegevens
  wissen** in both grids (4 columns: two, 3 columns: one; memory spec §5).
- `App.svelte` reads `memory.all()` when the overview is shown and computes `dueTopics` with the
  current time. Until the read finishes there is no row, so on the first overview of an app
  start the row can appear a moment after the list. No placeholder is reserved.
- After **Gegevens wissen** the row disappears: `ClearMemory` reports a successful clear
  (`oncleared`) and `App` reads again.
- A read that fails is logged to the console and gives no row.

## 5. The session

```ts
const REVIEW_PER_TOPIC = 2;
const REVIEW_MAX_TOPICS = 7;

/** Two new exercises of each of the first seven topics, shuffled (§5). */
function reviewSession(topics: readonly Topic[], rng: Rng): Question[];
```

- A tap on the row starts the session at once (decision 8): `reviewSession` over the due topics
  of that moment, in `lib/session.ts` next to `mistakeSession`. Exercises are freshly generated
  and de-duplicated as in main spec §4.2, then shuffled.
- The session is named "Fouten van eerder" and runs as any other: repeats, tips, kladblok,
  lesson links, Stop.
- `App.svelte` gets a fourth `Origin`, `{ kind: 'review'; topics: Topic[] }` with the topics
  that are in the session (at most 7).
- Saving: as any session (memory spec §4), source `set` (decision 11). The records carry
  today's time, so every topic that was answered leaves the row for today: right, it is
  cleared; wrong, it is due again tomorrow. A topic that was not answered (Stop) has no new
  record and stays due.
- Results (main spec §3.5): **Opnieuw** starts `reviewSession` over the same topics, **Fouten
  oefenen** uses the mistakes of this session, **Menu** and the system back go to the overview,
  where the row shows the topics that are still due, or is gone.

## 6. Code structure

- `lib/review.ts`: `dueTopics`, `REVIEW_ROW`, the description text for a count.
- `lib/session.ts`: `reviewSession` and its two constants.
- `App.svelte`: the due topics as state, read when `screen.name` becomes `sets` and on
  `oncleared`; the `review` origin (`originName`, `restart`, `save` maps it to the source
  `set`); the `onreview` handler.
- `PracticeSetList.svelte`: an optional `review` prop (`{ count, onstart }`), rendered as the
  first row.
- `ClearMemory.svelte`: `oncleared`.
- `SetGlyph.svelte`: the glyph `fouten`.

## 7. Testing

- `lib/review.test.ts`, table-driven, with records built from a day and a time: no records; a
  mistake of today (not due); a mistake of yesterday (due); one of a week ago (due); wrong
  yesterday and right today (cleared); wrong yesterday and right later yesterday in another
  session (cleared); right then wrong and wrong then right in one session (both due the next
  day); wrong yesterday and wrong today (not due today); an unknown topic id (skipped); the
  order (oldest first, then first record); a mistake at 23:59 seen at 00:01 (due).
- `lib/session.test.ts`: `reviewSession` gives two exercises per topic, of those topics only,
  without duplicates; eight topics give 14 exercises of the first seven; no topics gives an
  empty list.
- `App.test.ts`: no row with an empty memory and with only today's mistakes; the row and its
  count with a seeded memory; a tap starts a session named "Fouten van eerder"; after the
  session the row is gone and the records are stored with the source `set`; Opnieuw; the row
  disappears after Gegevens wissen; a memory whose `all` rejects shows the list without the row.
- Shots: a scene of the overview with the row (`overview-review`), on every layout the overview
  shots have. The session and its results need none: they are `PlayScreen` and `ResultScreen`.
- `npm run smoke`: not needed, `main.ts` and the PWA config do not change.

## 8. Build order

One plan, one commit per task, `main` deployable after each.

1. `lib/review.ts`: `dueTopics`.
2. `reviewSession` in `lib/session.ts`.
3. The row: `REVIEW_ROW`, the glyph, `PracticeSetList`.
4. `App.svelte`: reading, the `review` origin, `oncleared`; the scene and the shot.
5. The documents: main spec §1 (non-goals: the records have a reader; adaptive difficulty as
   decision 14), §3 (Opnieuw), §3.1 (the row), §3.5, §12 and §12.16 (done, pointer to this
   spec); memory spec §1 and §4 (the first reader, the source of a review session);
   `CLAUDE.md` (Status, roadmap row, architecture, "Out of scope").

## 9. Open assumptions

None. The defaults of the draft (decisions 5–14 of §2, the texts and the glyph of §4) were
confirmed on 2026-11-15.
