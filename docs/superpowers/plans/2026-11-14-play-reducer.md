# Play reducer (`lib/play.ts`)

Light plan for the open follow-up in `CLAUDE.md`: move the session state of `PlayScreen` (queue,
repeats, records) into a pure reducer. No behaviour changes, so no spec change: the existing
`PlayScreen.test.ts` must stay green untouched. It prepares v5 (practice test, spec §12.6), which
needs the same flow without repeats and without feedback during the session.

TDD, one commit per task. Inline, no subagents.

## Scope

In the reducer: the queue with repeats, the question and step position, the attempts of the
current question, the feedback being shown, the records, the start time of the current question
and the finished flag.

Stays in `PlayScreen.svelte`: the clock (`now`, the interval), the auto-advance timer, the wake
lock, the kladblok notes, the lesson sheet and all markup. Timers and `Date.now()` are not pure;
the component passes the time in.

Not in this plan (v5 decides them in its own spec): a test mode, options on the reducer,
serialisable state.

## Task 1 — `lib/play.ts` with tests

Files: `src/lib/play.ts`, `src/lib/play.test.ts`.

```ts
export interface QueueEntry {
  question: Question;
  /** A wrongly answered question shown again (spec §3.4); it is not recorded again. */
  repeat: boolean;
}

export interface PlayState {
  readonly queue: readonly QueueEntry[];
  readonly questionIndex: number;
  readonly stepIndex: number;
  /** Attempts on the steps of the current question. */
  readonly attempts: readonly StepAttempt[];
  /** The attempt whose feedback is shown; null while a step waits for its answer. */
  readonly feedback: StepAttempt | null;
  /** First attempts only: one record per original question (spec §3.4). */
  readonly records: readonly QuestionRecord[];
  /** When the current question was shown, in ms. */
  readonly questionStart: number;
  readonly finished: boolean;
}

export function startPlay(questions: readonly Question[], now: number): PlayState;

/** An answer on the current step. On the last step it records and, if wrong, queues a repeat. */
export function answer(state: PlayState, attempt: StepAttempt, now: number, rng: Rng): PlayState;

/** After the feedback: the next step, the next question, or finished. */
export function advance(state: PlayState, now: number): PlayState;

/** Stoppen: finished with the records so far. */
export function stop(state: PlayState): PlayState;

export function currentEntry(state: PlayState): QueueEntry;
export function currentStep(state: PlayState): Step;
/** The 1-based number of the current question among the originals (the header counter). */
export function originalNumber(state: PlayState): number;
```

`insertRepeat` stays in `lib/session.ts`; `answer` calls it. The progress bar reads
`state.records.length` (today's `firstAttempts`).

Test cases (questions built from `numberStep` fixtures, a seeded rng, fixed `now` values):

| Case | Input | Expected |
| --- | --- | --- |
| start | 3 questions, now 1000 | index 0, step 0, no feedback, no records, `questionStart` 1000, not finished |
| correct answer, one step | `answer` correct at 1500 | feedback set, 1 record with `durationMs` 500, queue length unchanged |
| wrong answer, one step | `answer` wrong | 1 record, queue length +1, new entry has `repeat: true` and lies after `questionIndex + 1` when other questions remain |
| wrong on the last question | 1 question, wrong | the repeat is appended directly (nothing else remains) |
| multi-step, first step | 2-step question, `answer` on step 0 | feedback set, no record yet, queue unchanged |
| multi-step, wrong first step then correct second | two `answer` calls with `advance` between | 1 record with 2 attempts, a repeat queued |
| advance within a question | after step 0 feedback | `stepIndex` 1, feedback null, `attempts` kept, `questionStart` unchanged |
| advance to the next question | after the last step, now 2000 | `questionIndex` +1, `stepIndex` 0, `attempts` empty, `questionStart` 2000 |
| advance after the last question | last entry answered correctly | `finished` true |
| repeat answered | answer a `repeat` entry correctly | records unchanged |
| repeat answered wrongly | answer a `repeat` entry wrongly | records unchanged, another repeat queued |
| stop | `stop` mid-session with a repeat waiting | `finished` true, records only the answered originals |
| after finished | `answer`, `advance`, `stop` on a finished state | the same state object |
| answer while feedback is shown | second `answer` before `advance` | the same state object (double-tap guard) |
| originalNumber | on an original, on a repeat after two originals | 1-based count of non-repeat entries up to the current one |
| purity | any transition | the input state and its arrays are not mutated |

Commit: `Added a pure play reducer for the session state`

## Task 2 — `PlayScreen` on the reducer

Files: `src/components/PlayScreen.svelte` only.

- One `let play = $state.raw(startPlay(questions, Date.now()))` replaces `queue`,
  `questionIndex`, `firstAttempts`, `stepIndex`, `feedback`, `questionStart`, `attempts`,
  `records` and `finished`.
- `handleAnswer`: `play = answer(play, { input, result }, Date.now(), rng)`, then start the
  auto-advance timer when the attempt was correct.
- `handleNext`: clear the timer, `play = advance(play, Date.now())`; clear the notes when
  `questionIndex` changed; call `onfinish` when it became finished.
- `finish` (Stoppen): `play = stop(play)`, then `onfinish`. `onfinish` is called at most once: only
  on the transition to `finished`.
- `entry`, `question`, `step`, `originalNumber` become `$derived` from the helpers.
- No test changes: `PlayScreen.test.ts` and `App.test.ts` pass as they are.

Commit: `Replaced the PlayScreen session state with the play reducer`

## Task 3 — docs

- `CLAUDE.md`: add `play.ts` to the Architecture list, remove the follow-up from "Open follow-ups",
  note in the v5 row that the practice test builds on `lib/play.ts`.
- Delete this plan with `git rm`.

Commit: `Updated the docs for the play reducer`

## Checks

After each task: `npm test`, `npm run check`. At the end: `npm run build` (runs the `dist/sw.js`
check), `npm run smoke` and `npm run screenshots`; compare the question, feedback and results
shots with the current ones.

## Risks

- The auto-advance timer and the reducer can disagree when Stoppen is pressed during the timer:
  covered by the existing tests "does not advance after Stoppen" and "calls onfinish at most once".
- `$state.raw` with a new object per transition re-runs every `$derived` on each answer; with one
  screen and a handful of derived values that is not measurable.
