# Plan — v5 Oefentoets (practice test)

Spec: `docs/superpowers/specs/2026-11-14-oefentoets-design.md` ("test spec"); main spec and v4
spec as named there. TDD, one commit per task, `main` deployable after each: the overview row
comes last (task 7), so nothing is reachable before it. Per task: tests first, then code,
`npm test` + `npm run check`, `npx prettier --check` on the touched files, commit. Checkpoints
after task 4 (all of `lib/`) and after task 7 (all UI).

No tips: the test shows none (test spec §5.1), and no topic or step changes.

Deviations from the test spec, made in the task named and written into the spec there:

- **D1** (task 1): the module is `lib/practiceTest.ts`, not `lib/test.ts`: `test.ts` with its
  test file `test.test.ts` reads as a test helper and is easy to mix up with Vitest's own files.
- **D2** (task 2): `buildTestSession(config, pool, rng, generators?)` takes the `TestConfig` and
  derives the blueprint, instead of a blueprint and `lkt` side by side (one source of truth).
- **D3** (task 5): no `QuestionView` prop. With `feedback: false` the reducer moves to the next
  step or question in the same transition as the answer, and `QuestionView` is keyed on
  `questionIndex-stepIndex`, so it unmounts before its correct state can render; the last answer
  ends the test. A component test asserts this; the prop is added only if that test fails.

## Task 1 — `lib/practiceTest.ts`: domains, blueprints, pass mark, remaining time

Files: `src/lib/practiceTest.ts`, `src/lib/practiceTest.test.ts`, `src/lib/format.ts` (+ its
test). Spec: rename `lib/test.ts` to `lib/practiceTest.ts` in §3.1, §7, §8 (D1).

```ts
export type TestLength = 'short' | 'long';
export interface TestConfig { length: TestLength; lkt: boolean }
export type DomainId = 'A' | 'B' | 'C' | 'D' | 'H';
export interface Domain {
  id: DomainId;
  name: string;                       // Dutch, as on the setup (§3.1)
  sets: readonly string[];            // set ids, always in the test
  lktSets?: readonly string[];        // set ids added with RWT + LKT
}
export interface Blueprint {
  total: number;
  limitMs: number;
  counts: Readonly<Record<DomainId, number>>;
}
export const DOMAINS: readonly Domain[];   // A, B, C, D, H (H: sets [], lktSets ['heuristieken'])
export const PASS_PERCENT = 70;
export function blueprintFor(config: TestConfig): Blueprint;
export function domainSets(domain: Domain, pool: readonly PracticeSet[], lkt: boolean): PracticeSet[];
export function neededToPass(total: number): number;      // smallest n with n × 100 ≥ 70 × total
export function hasPassed(correct: number, total: number): boolean;
export function remainingMs(deadline: number, now: number): number;
```

`format.ts`: `formatCountdown(ms)`: the remaining time rounded **up** to a whole second, as
`m:ss` (reuses `formatDuration`).

Domain A: `sets: ['bewerkingen', 'getalbegrip']`, `lktSets: ['getallen', 'talstelsels']`.

| Input                                        | Expected                                     |
| -------------------------------------------- | -------------------------------------------- |
| `blueprintFor({short, lkt: false})`          | A8 B5 C2 D0 H0, total 15, 17 × 60 000 ms     |
| `blueprintFor({short, lkt: true})`           | A7 B4 C2 D0 H2, total 15, 17 min             |
| `blueprintFor({long, lkt: false})`           | A15 B14 C12 D9 H0, total 50, 57 min          |
| `blueprintFor({long, lkt: true})`            | A13 B12 C10 D8 H7, total 50, 57 min          |
| every blueprint                              | counts sum to `total`                        |
| `PRACTICE_SETS` minus `tafels`               | each id in exactly one domain (sets ∪ lktSets) |
| `tafels`                                     | in no domain                                 |
| `domainSets(A, PRACTICE_SETS, false)`        | Bewerkingen, Getalbegrip (pool order)        |
| `domainSets(A, PRACTICE_SETS, true)`         | Getallen & delers, Bewerkingen, Getalbegrip, Talstelsels (pool order) |
| `domainSets(H, PRACTICE_SETS, false)`        | `[]`                                         |
| `domainSets(A, pool without talstelsels, true)` | without Talstelsels (an id not in the pool is skipped) |
| `neededToPass(15)` / `(50)`                  | 11 / 35                                      |
| `hasPassed(10, 15)` / `(11, 15)`             | false / true                                 |
| `hasPassed(34, 50)` / `(35, 50)`             | false / true                                 |
| `hasPassed(0, 15)`                           | false                                        |
| `remainingMs(1000, 400)` / `(1000, 1000)` / `(1000, 5000)` | 600 / 0 / 0                    |
| `formatCountdown(17 × 60 000)`               | `17:00`                                      |
| `formatCountdown(59 001)` / `(59 000)`       | `1:00` / `0:59`                              |
| `formatCountdown(1)` / `(0)`                 | `0:01` / `0:00`                              |

Commit: `Added the domains and blueprints of the practice test`

## Task 2 — `buildTestSession`, with the shared planning helper

Files: `src/lib/session.ts`, `src/lib/session.test.ts`. Spec: §7 signature (D2).

- Extract from `buildMixedSession` a private
  `planForSets(sets, level, mainCount, quickCount, rng): Topic[]` (its two loops). Both builders
  use it; `buildMixedSession` keeps its behaviour (existing tests unchanged, they are the guard).
- `export function buildTestSession(config: TestConfig, pool: readonly PracticeSet[], rng: Rng, generators = GENERATORS): Question[]`:
  1. `blueprint = blueprintFor(config)`; the domains with a count > 0.
  2. `quick = Math.round(QUICK_SHARE_PERCENT × total / 100)` (not `shareCount`: its size rule is
     for sessions), allocated over those domains with `allocateQuotas`, weight = count.
  3. Per domain: `planForSets(domainSets(domain, pool, config.lkt), 'deep', count − q, q, rng)`.
  4. One `generatePlan` over the concatenated plan (shuffle and de-duplication once).
- A domain with a count but no sets in the pool throws a `RangeError` (App shows the error
  screen, main spec §3); not reachable with `PRACTICE_SETS`.

To count per domain in tests: a helper in the test file maps a topic to its set via
`PRACTICE_SETS` (`topics` and `deep`) and the set to its domain via `DOMAINS`.

| Input (1000 seeds each)                 | Expected                                                     |
| --------------------------------------- | ------------------------------------------------------------ |
| each of the four configs                | `length === total`                                           |
| each config                             | count per domain = blueprint count, exactly                  |
| each config                             | Opfrisser topics = 3 (short) / 10 (long); the rest `deep` topics |
| short RWT                               | Opfrisser 1 per domain A, B, C (min-one rule)                |
| each config                             | no `tables` question                                         |
| `lkt: false`                            | no topic of Getallen & delers, Talstelsels or Heuristieken   |
| `lkt: true`, long                       | every one of the 10 sets occurs in at least one seed         |
| each config                             | no duplicate key, no duplicate first prompt                  |
| each config                             | every question: `check(expected)` correct on every step      |
| pool without Verbanden, long            | throws `RangeError`                                          |
| `buildMixedSession` (existing tests)    | unchanged                                                    |

Commit: `Added the session builder of the practice test`

## Task 3 — Play policy in `lib/play.ts`

Files: `src/lib/play.ts`, `src/lib/play.test.ts`.

```ts
export interface PlayPolicy { repeatWrong: boolean; feedback: boolean }
export const PRACTICE_POLICY: PlayPolicy = { repeatWrong: true, feedback: true };
export const TEST_POLICY: PlayPolicy = { repeatWrong: false, feedback: false };
export function startPlay(questions, now, policy = PRACTICE_POLICY): PlayState;
// PlayState gains `readonly policy: PlayPolicy`
```

`answer` with `feedback: false`: records as now, then returns `advance(stateWithFeedback, now)`,
so `feedback` is `null` afterwards. `repeatWrong: false`: no `insertRepeat`. `stop` unchanged.

| Given (test policy unless said)                 | Action                     | Expected                                             |
| ----------------------------------------------- | -------------------------- | ---------------------------------------------------- |
| 2 one-step questions                            | wrong answer on q1         | `questionIndex` 1, `feedback` null, queue length 2, 1 record (wrong) |
| 2 one-step questions                            | right answer on q1         | `questionIndex` 1, `feedback` null, 1 record (right) |
| two-step q1                                     | wrong step 1               | `stepIndex` 1, no record yet                         |
| two-step q1                                     | wrong step 1, right step 2 | 1 record, not correct, `questionIndex` 1             |
| last question                                   | any answer                 | `finished`, all records                              |
| q1 answered, q2 open                            | `stop`                     | `finished`, 1 record                                 |
| `durationMs`                                    | answer at `now + 5000`     | 5000; next `questionStart` = that `now`              |
| default policy                                  | existing tests             | unchanged (repeat, feedback, advance)                |
| `TEST_POLICY` state                             | `advance`                  | returns the same state (feedback is null)            |

Commit: `Added a play policy without feedback and repeats`

## Task 4 — `summarizeTest` and the test results on `ResultScreen`

Files: `src/lib/results.ts` (+ test), `src/components/ResultScreen.svelte` (+ test), and the
callers of its changed prop: `App.svelte` (`name={set.name}`), `src/screens/scenes.ts`. Spec:
none.

```ts
export interface TestOutcome {
  total: number; unanswered: number; needed: number; passed: boolean;
  limitMs: number; timedOut: boolean;
}
// SessionSummary gains `test?: TestOutcome`
export function summarizeTest(
  records: readonly QuestionRecord[], total: number, limitMs: number,
  totalMs: number, timedOut: boolean,
): SessionSummary;  // summarize(...) + test; percentage over total; totalMs capped at limitMs
```

`ResultScreen` (test spec §6), only when `summary.test` is set:

- prop `name: string` replaces reading `set.name` (the `set` prop goes; `App` passes the name).
- verdict block at the top of the score card: "Geslaagd" + ✓ (good tokens) or "Niet geslaagd"
  + ✕ (bad tokens); under it "Je had {needed} van de {total} goed nodig (70%). Dit is een
  indicatie, geen Cito-norm."
- score `correct / total`, bar and pill over `percentage`.
- stats: "Tijd" `12:34 van 17:00` instead of "Totale tijd"; "De tijd was om." when `timedOut`;
  "Gemiddeld per som" as now; "Niet beantwoord" only when `unanswered > 0`.
- shown also when `answered === 0` (no "Geen opgaven beantwoord.").
- "Alles goed!" only when `correct === total`; with unanswered and no mistakes, no list.

| `summarizeTest` input                                   | Expected                                          |
| ------------------------------------------------------- | ------------------------------------------------- |
| 15 total, 12 records, 11 correct                        | answered 12, unanswered 3, percentage 73, passed, needed 11 |
| 15 total, 15 records, 10 correct                        | percentage 67, not passed                         |
| 15 total, 0 records                                     | percentage 0, unanswered 15, averageMs 0, topics [] |
| totalMs 1 100 000, limit 1 020 000                      | totalMs 1 020 000                                 |
| timedOut true                                           | `test.timedOut` true                              |
| 10 records, 2 wrong                                     | mistakes 2, topics over the 10 records only       |
| `summarize` (existing tests)                            | unchanged, no `test`                              |

| `ResultScreen` with                    | Expected text                                                 |
| -------------------------------------- | ------------------------------------------------------------- |
| passed summary                         | "Geslaagd", "Je had 11 van de 15 goed nodig (70%). …"         |
| failed summary                         | "Niet geslaagd"                                               |
| 12 of 15 answered, 11 correct          | "11 / 15", "73%", "Niet beantwoord" "3"                       |
| all answered                           | no "Niet beantwoord"                                          |
| timed out                              | "De tijd was om.", "17:00 van 17:00"                          |
| 0 answered                             | verdict and "0 / 15", no "Geen opgaven beantwoord."           |
| 12 answered, all correct               | no "Alles goed!", no Fouten list                              |
| 15 answered, all correct               | "Alles goed!"                                                 |
| practice summary (no `test`)           | unchanged (existing tests, with `name`)                       |

Commit: `Added the verdict and test stats to the results screen`

**Checkpoint:** reread the diff of tasks 1–4 against test spec §3, §6, §7; short status.

## Task 5 — Shared play shell, `TestScreen`, stop dialog

Files: new `src/components/PlayShell.svelte`, `TestScreen.svelte` (+ test), `StopDialog.svelte`,
`ModalDialog.svelte`; changed `PlayScreen.svelte`, `UpdateDialog.svelte`, their tests, `App.svelte`
and `scenes.ts` (the `name` prop). Spec: §8 (D3).

- **`PlayShell`** takes over from `PlayScreen` the `<main class="play">`, the header and all their
  per-layout CSS (the layout rules then exist once). Props: `name: string`, `onstop: () => void`,
  `progress: number`, `max: number`, snippets `meta` (right side of the header line) and
  `children`. `PlayScreen` keeps its Herhaling label and timer in `meta`; its `set` prop becomes
  `name: string`. The existing `PlayScreen` tests are the guard (no behaviour change).
- **`ModalDialog`**: the scrim, card and actions layout of `UpdateDialog`, with `labelledby`, the
  focus target and an `oncancel` for Escape. `UpdateDialog` uses it (its tests are the guard).
- **`StopDialog`** (test spec §5.4): title "Toets stoppen?", text "Opgaven die je niet hebt
  beantwoord tellen als fout.", **Verder werken** (secondary) and **Stoppen** (primary, focused).
  Escape = Verder werken.
- **`TestScreen`**: props `questions`, `limitMs`, `onfinish(records, totalMs, timedOut)`.
  - `startPlay(questions, start, TEST_POLICY)`; `deadline = start + limitMs`, set once at mount.
  - `now` updates every second and on `visibilitychange` to visible; when
    `remainingMs(deadline, now) === 0` it applies `stop` with `timedOut = true`.
  - header: "Oefentoets", `n / total`, `formatCountdown(remaining)`; from ≤ 60 000 ms the time gets
    class `last-minute` (`--bad-text`, bold) and an `aria-live="polite"` region says
    "Nog één minuut" once.
  - `QuestionView` as in `PlayScreen` (kladblok, reserved space, notes reset per question); no
    announcement of right or wrong; no `Feedback`, lesson or Enter-for-Verder code.
  - ✕ opens `StopDialog`; under the "too low" notice the dialog is not rendered (it stays open in
    state, as the lesson sheet does).
  - wake lock as in `PlayScreen`.

`TestScreen` component tests (fake timers, `Date` faked too):

| Given                                        | Action                         | Expected                                              |
| -------------------------------------------- | ------------------------------ | ----------------------------------------------------- |
| 2 questions, 17 min                          | mount                          | "Oefentoets", "1 / 2", "17:00"                        |
| mount                                        | type a wrong answer, OK        | "2 / 2", no Feedback panel, no correct state, live region empty |
| mount                                        | right answer, OK               | "2 / 2" at once (no 600 ms wait), no ✓                |
| two-step question                            | wrong step 1                   | step 2 shown                                          |
| last question                                | answer                         | `onfinish` once, `timedOut` false                     |
| mount                                        | advance 16 min                 | "1:00", `last-minute` class, "Nog één minuut"         |
| mount                                        | advance 16:30                  | "Nog één minuut" still once                           |
| mount                                        | advance 17 min                 | `onfinish` with 0 records, `timedOut` true            |
| 1 answered                                   | advance 17 min                 | `onfinish` with 1 record                              |
| mount                                        | ✕                              | dialog open, timer still running                      |
| dialog open                                  | Verder werken / Escape         | dialog closed, test goes on                           |
| dialog open                                  | Stoppen                        | `onfinish`, `timedOut` false                          |
| dialog open                                  | advance to the deadline        | `onfinish`, `timedOut` true                           |
| typed "12"                                   | viewport phone → tablet-landscape | "12" still typed, same deadline                    |
| hidden                                       | advance past deadline, visible | `onfinish` at once, `timedOut` true                   |

Commit: `Added the test screen with a countdown and a stop dialog`

## Task 6 — `TestSetupScreen`, with the shared setup controls

Files: new `src/components/TestSetupScreen.svelte` (+ test), `SetupShell.svelte`,
`SegmentedControl.svelte`; changed `SetupScreen.svelte`. Spec: none.

- **`SetupShell`**: from `SetupScreen` the `<main class="setup">`, header (Terug, glyph, title),
  scrolling content and pinned Start with their per-layout CSS. Props: `id`, `name` (glyph and
  title), `count`, `canStart`, `onstart`, `onback`, `children`.
- **`SegmentedControl`**: the radiogroup with `onRadioKey` (arrow keys, disabled options
  skipped). Props: `options: { value: T; label: string }[]`, `value` (bindable), `enabled?`,
  `labelledby`, `class`. `SetupScreen` uses both for size and level; its tests are the guard.
- **`TestSetupScreen`**: props `config` (bindable `TestConfig`), `onstart`, `onback`. Sections
  Lengte, Onderwerpen, "Zo werkt het" (the three lines of test spec §4.2), "Wat zit erin" (one row
  per domain with count > 0: name and "{n} opgaven"). Start: "Start · {total} opgaven".
- Tablet: the CSS of the Gemengd setup column (v4 spec §8); in landscape Lengte and Onderwerpen
  side by side.

| Given                         | Action           | Expected                                                         |
| ----------------------------- | ---------------- | ---------------------------------------------------------------- |
| default config                | mount            | Kort and RWT checked; "15 opgaven · 17 minuten"; "De vier domeinen van de RWT"; rows A 8, B 5, C 2; no D, no H; "Start · 15 opgaven" |
| default                       | choose Lang      | "50 opgaven · 57 minuten"; rows A 15, B 14, C 12, D 9; "Start · 50 opgaven" |
| Lang                          | choose RWT + LKT | "Ook Getallen & delers, Talstelsels en Heuristieken"; rows A 13 … H 7 |
| Kort, RWT + LKT               | mount            | rows A 7, B 4, C 2, Heuristieken 2                               |
| any                           | Start            | `onstart` once; Start never disabled                             |
| Lengte group                  | ArrowRight       | Lang checked                                                     |
| any                           | Terug            | `onback`                                                         |

Commit: `Added the setup screen of the practice test`

## Task 7 — `App.svelte`: states, row, glyph, update rule; scenes and shots

Files: `App.svelte` (+ `App.test.ts`, append), `PracticeSetList.svelte`, `SetRow.svelte`,
`SetGlyph.svelte`, `lib/update.ts` (+ test), `src/screens/scenes.ts`,
`screenshots/screens.spec.ts`. Spec: main spec §2, §3, §3.1, §3.5, §10 (test spec §12).

- `SetRow` takes `Pick<PracticeSet, 'id' | 'name' | 'description'>`. `PracticeSetList` gets
  `ontest` and renders a last row from `TEST_ROW` (in `practiceTest.ts`: id `oefentoets`, name
  "Oefentoets", description "Toets met tijdslimiet, uitslag na afloop").
- `SetGlyph`: a glyph for `oefentoets` (sheet, check mark, small clock; violet/amber/blue tokens).
- `App`: an `Origin = { kind: 'set'; set } | { kind: 'test'; config }` on `playing` and
  `results`; new states `testSetup` and `testing { config, questions, limitMs }`; `testConfig`
  in memory (default `{ length: 'short', lkt: false }`). Opnieuw and Fouten oefenen follow the
  origin (Fouten oefenen after a test: `PlayScreen` with name "Oefentoets", `GENERATORS`). The
  system back is ignored on `testing`, as on `playing`.
- `lib/update.ts`: `testSetup` joins `PROMPT_SCREENS`.
- Scenes and shots: `test-setup`, `test-question`, `test-last-minute`, `test-stop`,
  `results-test-passed`, `results-test-failed`, on the layouts of the play and results shots.

| Given (App test, 360 × 780)          | Action                               | Expected                                  |
| ------------------------------------ | ------------------------------------ | ----------------------------------------- |
| overview                             | —                                    | last row "Oefentoets"; Lesstof tab has none |
| overview                             | Oefentoets                           | test setup                                |
| test setup, Lang chosen              | Terug, Oefentoets                    | Lang still chosen                         |
| test setup                           | Start                                | test screen, "1 / 15", "17:00"            |
| test screen                          | system back                          | still the test                            |
| test screen                          | ✕, Stoppen                           | results with "Niet geslaagd", "0 / 15"    |
| test results                         | Opnieuw                              | a new test screen, "1 / 15"               |
| test results with a mistake          | Fouten oefenen                       | `PlayScreen` "Oefentoets", 3 questions    |
| that session's results               | —                                    | no verdict; Opnieuw starts a test         |
| `shouldPrompt(…, 'testSetup')`       | —                                    | true; `'testing'` false                   |

Commit: `Added the practice test to the overview`

**Checkpoint:** reread the diff of tasks 5–7 against test spec §4–§6, §8 and the v4 layout rules;
`npm run screenshots` for the new shots on every layout; short status.

## Task 8 — Documents

Files: `CLAUDE.md`, main spec, test spec. Test spec §12 lists them:

- main spec §12.6 "(done)"; test spec status "built".
- `CLAUDE.md`: Status ("Done besides the sets": v5), the roadmap row of v5 removed, architecture
  entries (`lib/practiceTest.ts`, `TestScreen`, `TestSetupScreen`, `PlayShell`, `SetupShell`,
  `SegmentedControl`, `ModalDialog`, `StopDialog`, the play policy).
- Final review: the combined diff against the spec, `npm run build` and `dist/sw.js` (one
  `manifest.webmanifest` entry, `woff2` listed, `skipWaiting` only in the message handler).
- `git rm` this plan.

Commit: `Updated the docs for the practice test`
