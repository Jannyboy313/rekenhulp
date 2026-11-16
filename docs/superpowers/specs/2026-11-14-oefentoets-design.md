# Rekenhulp v5 — Oefentoets (practice test)

Date: 2026-11-14. Status: built on 2026-11-15. Implements main spec §12.6.

"Main spec" is `2026-10-05-rekenhulp-design.md`, "v4 spec" is `2026-11-14-tablet-design.md`. The
toetsmatrijs is table 1 of `docs/references/cito-rwt-handreiking.md` (§3.3).

## 1. Goal

A session in the form of the RWT: a fixed number of exercises spread over the domains as the
toetsmatrijs does, a time limit, no feedback while it runs, and a verdict afterwards. It answers
"would I pass now, and what do I still need to practise?".

It is a third way to start a session, next to a set and Gemengd. Everything about one exercise
stays as it is: generators, answer kinds, keypads, kladblok, layouts.

### Non-goals

- A history of results. Since v7 the answered exercises of a test are stored as practice records
  (`2026-11-15-geheugen-design.md` §4), but nothing shows them.
- Adaptive selection and a scale score, as the real RWT has (handreiking §3.1): the test is the
  same kind of fixed test as the Cito practice tests (§3.2), scored as the number correct.
- Calculator exercises in Kort: it is the hoofdrekenen part. Lang has the calculator topics of
  its sets since v9 (§3.3, `2026-11-15-rekenmachine-design.md` §8).
- Printing (v10), a pause button, going back to an earlier exercise, skipping an exercise.
- An LKT test form: the LKT distribution is unconfirmed (main spec §12.7). The LKT-only sets can
  be added to the RWT form (§3.3), nothing more.
- Moving Gemengd and Tafels onto a shared session configuration (§8).

## 2. Decisions

Decided with the user on 2026-11-14 (1–4) and 2026-11-15 (7–8, and the confirmed defaults of
the draft: 6, 9–13); 5 follows from main spec §12.6.

| #   | Question             | Decision                                                                                                                                                                                    |
| --- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Composition          | Two lengths: **Kort**, 15 exercises as the hoofdrekenen part (8/5/2/0), and **Lang**, 50 as the whole test (15/14/12/9) (§3).                                                               |
| 2   | LKT-only sets        | A choice on the setup, default off. On: Getallen & delers and Talstelsels join domain A, Heuristieken is a fifth group (§3.1).                                                              |
| 3   | Time                 | A limit that counts down: 17 minutes for Kort, 57 for Lang (the same pace). At 0:00 the test ends; unanswered counts as wrong (§5.3).                                                       |
| 4   | Pass mark            | 70% of all exercises of the test: 11 of 15, 35 of 50. Shown as an indication, not a Cito norm (§6).                                                                                         |
| 5   | Feedback             | Only after the test: no correct or wrong state, no tips, no lesson links, no repeats (§5.1).                                                                                                |
| 6   | Level                | Verdieping, with the 20% Opfrisser share, so Tafels is never in the test (§3.2). Not a setting.                                                                                             |
| 7   | Getallen & delers    | Only with **RWT + LKT**: of its 10 topics only `squares` (A.4d) and `remainders` (delen met rest, A.4a) are RWT eindtermen; KGV, GGD, priemgetallen and deelbaarheid are LKT matter (§3.1). |
| 8   | Heuristieken in Kort | 2 exercises, the weight of the smallest domain with exercises (C), as D has none in Kort (§3.2).                                                                                            |
| 9   | Topics control       | A segmented control (RWT / RWT + LKT), not a switch: the app has no switch, and the segments name both states (§4.2).                                                                       |
| 10  | Stopping             | A dialog before stopping, unlike a practice session: an accidental tap would end a test of up to 57 minutes as failed (§5.4).                                                               |
| 11  | Skipping             | No skip button: OK stays disabled on an empty field, so a guess is the way on. The real RWT has no going back (handreiking §3.1) (§5.1).                                                    |
| 12  | Unanswered           | Count for the verdict and the score, not in "Per onderwerp" or "Fouten" (§6).                                                                                                               |
| 13  | Last minute          | Marked from 1:00 (colour, bold, one announcement); nothing else warns about the time (§5.2). Fouten oefenen is offered after a test (§6).                                                   |

## 3. Composition

### 3.1 Domains

Each set belongs to one domain of the toetsmatrijs. Within a domain every set weighs the same,
as in Gemengd (main spec §4.2).

| Domain | Name on the setup       | Sets                                                               |
| ------ | ----------------------- | ------------------------------------------------------------------ |
| A      | Hele getallen           | Bewerkingen, Getalbegrip; with LKT: Getallen & delers, Talstelsels |
| B      | Verhoudingen en breuken | Verhoudingen, Breuken & kommagetallen                              |
| C      | Meten en meetkunde      | Meten, Meetkunde                                                   |
| D      | Verbanden en statistiek | Verbanden & statistiek                                             |
| H      | Heuristieken            | Heuristieken (with LKT only)                                       |

Tafels is in no domain. Getallen & delers counts only with LKT (decision 7), so with **RWT** it
and Talstelsels are not in the test, and A has two sets. The mapping is configuration
(`lib/practiceTest.ts`), by set id; a test checks that every set of `PRACTICE_SETS` except Tafels is in
exactly one domain, so a new set cannot be forgotten.

### 3.2 Blueprints

The number of exercises per domain is a fixed table, not computed at run time:

| Length | Topics    | A   | B   | C   | D   | H   | Total | Limit |
| ------ | --------- | --- | --- | --- | --- | --- | ----- | ----- |
| Kort   | RWT       | 8   | 5   | 2   | 0   | —   | 15    | 17:00 |
| Kort   | RWT + LKT | 7   | 4   | 2   | 0   | 2   | 15    | 17:00 |
| Lang   | RWT       | 15  | 14  | 12  | 9   | —   | 50    | 57:00 |
| Lang   | RWT + LKT | 13  | 12  | 10  | 8   | 7   | 50    | 57:00 |

- The RWT rows are table 1 of the handreiking: the hoofdrekenen column and the total column.
- The LKT rows keep the total and the limit. Heuristieken gets the weight of the smallest domain
  that has exercises (Kort: 2, as C; Lang: 9, as D), and the five weights are scaled back to the
  total with the largest remainder method (Lang: 15/14/12/9/9 → 13/12/10/8/7, the tie between D
  and H given to D).
- 57 minutes is 50 exercises at the pace of 17 minutes for 15, rounded up to a whole minute.
- Kort has no domain D, as the hoofdrekenen part of the RWT.

### 3.3 Quota algorithm

Given a blueprint with total `n`:

1. `quickCount = Math.round(20 × n / 100)`: 3 for Kort, 10 for Lang. It is distributed over the
   domains that have exercises, in proportion to their counts, with `allocateQuotas` (main spec
   §4.2 steps 2–3, the domain count as the weight). A domain's Verdieping count is its count
   minus its Opfrisser count.
2. Per domain, the Verdieping count is distributed over its sets (all weight 1) and each set
   spreads its count over its `deep` topics; the Opfrisser count is distributed over the same
   sets, independently, and each set spreads it over its Opfrisser `topics`, without the tables
   share. This is the Gemengd distribution (main spec §4.2, Gemengd steps 1–3) run per domain.
3. Shuffle and de-duplication (main spec §4.2 steps 4–5) run once over the whole list, so the
   domains are mixed and no question appears twice in a test.

The counts per domain are exact for every seed; which sets and topics get the leftovers is
random.

Calculator topics (v9, decided 2026-11-15): Kort is built from the sets without the calculator
topics of their `deep` (`withoutCalculator`), so it never has one; Lang has them as any other
Verdieping topic, by their weights. The time limit and the pass mark do not change, and the test
screen shows the calculator button as the play screen does.

Examples:

- **Kort, RWT:** Opfrisser 3 over A, B and C: 1 each (three domains, so each gets at least one).
  Verdieping 7 / 4 / 1. A: 7 over 2 sets, so 4 + 3; C: 1 for Meten or Meetkunde, and the
  Opfrisser exercise for either.
- **Lang, RWT:** Opfrisser 10 over 15/14/12/9: shares 3 / 2,8 / 2,4 / 1,8, so 3 / 3 / 2 / 2.
  Verdieping 12 / 11 / 10 / 7. A: 12 over 2 sets, so 6 each over their 4 Verdieping
  topics.
- **Lang, RWT + LKT:** Opfrisser 10 over 13/12/10/8/7: shares 2,6 / 2,4 / 2 / 1,6 / 1,4, so
  3 / 2 / 2 / 2 / 1. Verdieping 10 / 10 / 8 / 6 / 6. A now has 4 sets.

A two-step exercise (`properties`, in the Opfrisser share of A) counts as one exercise.

## 4. Entry and setup

### 4.1 Overview

- A row **Oefentoets** on the **Oefenen** tab, the last one, after Gemengd. Description: "Toets
  met tijdslimiet, uitslag na afloop". It gets its own glyph in `SetGlyph` in the existing style
  (violet, amber and blue tokens): a sheet with a check mark and a small clock.
- It is not a set: the **Lesstof** tab has no row for it, and Gemengd has no pill for it.
- On a tablet the Oefenen grid then has 13 tiles for its 4 × 3 (or 3 × 4) cells: the grid scrolls,
  as v4 spec §8 says for a grid that does not fit.

### 4.2 Test setup

A screen of its own (`testSetup`), with the header of the setup screen: the back button
(aria-label **Terug**), the glyph and "Oefentoets". From top to bottom:

1. **Lengte** — a segmented control of 2 (a radio group, as the count): **Kort** and **Lang**.
   Under it one line: "15 opgaven · 17 minuten" or "50 opgaven · 57 minuten".
2. **Onderwerpen** — a segmented control of 2: **RWT** and **RWT + LKT**. Under it one line:
   "De vier domeinen van de RWT" or "Ook Getallen & delers, Talstelsels en Heuristieken".
3. **Zo werkt het** — a card with three lines:
   - "Je ziet pas na afloop wat goed en fout was."
   - "De tijd loopt door, ook als je de app verlaat. Bij 0:00 stopt de toets."
   - "Niet beantwoord telt als fout. Je bent geslaagd vanaf 70% goed."
4. **Wat zit erin** — one display-only row per domain of the chosen blueprint: the name of §3.1
   on the left, the count on the right ("8 opgaven"). A domain with 0 exercises has no row.
5. **Start**, pinned to the bottom: "Start · 15 opgaven" (or 50), styled as on the setup screen.
   It is never disabled.

- Defaults: Kort and RWT. Both choices are kept in memory while the app stays open, as the count
  is (main spec §3.2); nothing is persisted.
- Terug and the system back go to `sets`. The update dialog may show here, as on `setup`.
- Tablet: the column of "Setup, Gemengd" (v4 spec §8): 800 in landscape with Lengte and
  Onderwerpen side by side, 640 in portrait with everything stacked.
- The segmented control, the cards and the pinned Start are the ones of `SetupScreen`: shared,
  not copied (§8).

## 5. The test

A screen of its own (`testing`). It looks like the play screen and uses its sizes and layouts on
every layout (main spec §3.3, v4 spec §4): the same header, kladblok, prompt, answer field and
keypad. The differences:

### 5.1 No feedback

- After OK (or a tap on Ja/Nee or an option) the next step or exercise is shown at once. There is
  no correct state (no green field, no ✓, no bar, no 600 ms wait), no wrong panel, no tip, no
  explanation and no **Les:** buttons. The slot of a prompt never changes colour.
- Nothing announces whether an answer was right, also not to a screen reader.
- A wrong answer is not repeated; there is no **Herhaling**.
- A two-step exercise shows its second step whatever the first answer was.
- What stays: the inline error for input that is not a valid answer ("Ongeldig getal"), because
  it says nothing about right or wrong; OK is disabled on an empty field, so an exercise cannot
  be skipped (typing a guess is the way on); the kladblok with its reserved space; the wake
  lock; the physical keyboard for answers.
- The answers are checked as they are given (`Step.check`), only not shown.

### 5.2 Header

- "Oefentoets", the counter `7 / 15`, and the remaining time `mm:ss`, counting down.
- The progress bar runs over the answered exercises.
- From 1:00 left the time is shown in the `--bad-text` colour and bold, and "Nog één minuut" is
  announced once (`aria-live`, polite). The digits are the signal, the colour is an extra.

### 5.3 Time

- The limit runs on the wall clock from the moment the test screen is shown: a deadline, not a
  sum of ticks. It keeps running while the app is in the background, under the "too low" notice
  (v4 spec §3.3) and while the stop dialog is open. There is no pause.
- The shown time is the remaining time rounded up to a whole second, so the test starts at
  `17:00` and ends as `0:00` appears.
- At the deadline the test ends and the results are shown, whatever is on the screen (an
  unfinished answer is not submitted, an open stop dialog closes). When the app comes back from
  the background after the deadline, it ends at once.
- The remaining time is recomputed every second and when the app becomes visible again.

### 5.4 Stopping

- The ✕ (aria-label "Stoppen") does not end the test at once, unlike a practice session: it
  opens a modal dialog, "Toets stoppen?" with the text "Opgaven die je niet hebt beantwoord
  tellen als fout." and the buttons **Verder werken** (neutral) and **Stoppen** (primary).
  The dialog has the form of the update dialog (centred, max 384, scrim) on every layout.
- Stoppen ends the test and shows the results. Verder werken and Escape close the dialog.
- The system back is ignored during the test, as during a session (main spec §3).
- The update dialog never shows on this screen.

### 5.5 End

The test ends after the last exercise, at the deadline, or by Stoppen. An exercise is answered
when its last step was submitted; every other exercise of the test is unanswered: the current
one, a two-step exercise left after its first step, and the ones not reached.

## 6. Results

The results screen of a session (main spec §3.5), with these differences for a test:

- The header says "Oefentoets".
- **Verdict**, at the top of the score card: "Geslaagd" with a ✓ in the good colours, or "Niet
  geslaagd" with a ✕ in the bad colours. Under it: "Je had 11 van de 15 goed nodig (70%). Dit is
  een indicatie, geen Cito-norm." with the numbers of this test.
- Passed means `correct × 100 ≥ 70 × total`, in integers, where `total` is every exercise of the
  test, unanswered ones included. The needed number is 11 for Kort and 35 for Lang.
- **Score** `x / total` and the percentage, also over all exercises of the test (a session shows
  `x / answered`).
- **Tijd**: the time used `van` the limit, such as `12:34 van 17:00`; the time used is never
  more than the limit. When the deadline ended the test, a line "De tijd was om." "Gemiddeld
  per som" stays, over the answered exercises.
- **Niet beantwoord**: a third stat with the number of unanswered exercises, shown only when it
  is not 0.
- **Per onderwerp** and **Fouten** cover the answered exercises only, as now: an exercise the
  user never saw says nothing about a topic and has no "Jouw antwoord". "Alles goed!" shows only
  when every exercise of the test was answered correctly; with unanswered exercises and no
  mistakes the list is left out.
- With no exercise answered the screen still shows the verdict and `0 / total`, instead of
  "Geen opgaven beantwoord."
- **Opnieuw** starts a new test with the same length and topics. **Menu** goes to `sets`.
- **Fouten oefenen · n** works as for a session (main spec §3.5): three new exercises per wrong
  answered exercise, of its topic. That session is a practice session with feedback and repeats;
  its header says "Oefentoets", its results have no verdict, and its Opnieuw starts a new test.
- Tablet: the layouts of v4 spec §8 for the results; the verdict is part of the score card in
  the left column.

## 7. Model

All in `lib/`, pure and without Svelte.

`lib/practiceTest.ts` (new):

```ts
type TestLength = 'short' | 'long';
interface TestConfig { length: TestLength; lkt: boolean }      // plain data (v7, v10)
type DomainId = 'A' | 'B' | 'C' | 'D' | 'H';
interface Domain { id: DomainId; name: string; sets: readonly string[]; lktSets?: readonly string[] }
interface Blueprint { total: number; limitMs: number; counts: Readonly<Record<DomainId, number>> }

const PASS_PERCENT = 70;
blueprintFor(config): Blueprint                       // the table of §3.2
domainSets(domain, pool, lkt): PracticeSet[]          // the sets of a domain, in pool order
neededToPass(total): number                           // 11, 35
hasPassed(correct, total): boolean
remainingMs(deadline, now): number                    // never below 0
```

`lib/session.ts`: `buildTestSession(config, pool, rng, generators?)`; it derives the blueprint from the config. It shares the
per-set planning with `buildMixedSession` (one helper that returns the planned topics for a list
of sets, a Verdieping count and an Opfrisser count), and generates the whole plan in one go.

`lib/play.ts`: `startPlay(questions, now, policy?)` with
`PlayPolicy = { repeatWrong: boolean; feedback: boolean }`; the default is the practice
behaviour (both true), so existing callers do not change. With `feedback: false`, `answer`
records the attempt and moves on in the same transition (`feedback` stays `null`); with
`repeatWrong: false` nothing is queued again. `stop` is unchanged and also ends a test at the
deadline.

`lib/results.ts`: `SessionSummary` gets an optional `test`:

```ts
interface TestOutcome { total: number; unanswered: number; needed: number; passed: boolean;
                        limitMs: number; timedOut: boolean }
summarizeTest(records, blueprint, totalMs, timedOut): SessionSummary
```

`percentage` of a test summary is over `total`. The other fields keep their meaning.

## 8. Code structure

- **No pseudo set.** The test is not a `PracticeSet` and is not added to `PRACTICE_SETS` or next
  to `MIXED_SET`. `App.svelte` gets the states `testSetup` and `testing`; the `results` state
  keeps what started the session (a set, or a test config), which decides what Opnieuw and
  Fouten oefenen do. The overview row needs display data only (id, name, description, glyph).
- `PlayScreen` and `ResultScreen` take the name they show instead of reading `set.name`, so a
  test needs no set.
- **`TestScreen`** (new) runs `lib/play.ts` with the test policy and keeps only the deadline
  timer and the stop dialog. It has no lesson code. The shell it shares with `PlayScreen` (the
  one-screen-high frame and the header with ✕, name, counter, time and progress bar, with their
  per-layout rules) is extracted into one component used by both; the layout rules must not
  exist twice (CLAUDE.md, layout pitfalls).
- `QuestionView` is unchanged: with the test policy the answer moves on in the same transition,
  and `QuestionView` is keyed on the step, so its correct state never renders (a component test
  guards this). The stop dialog and the update dialog share one modal dialog component.
- **`TestSetupScreen`** (new). The segmented control and the pinned Start of `SetupScreen` are
  shared by extraction, not copied.
- `ResultScreen` renders the verdict, the score over `total` and the extra stats from
  `summary.test`; without it nothing changes.
- A layout change never remounts the test (v4 spec §3.1): the deadline, the typed answer and an
  open stop dialog survive a rotation.
- `lib/update.ts`: `testSetup` joins the screens where the update dialog may show.
- Out of scope: moving Gemengd and Tafels onto one session configuration. It was suggested in
  the architecture analysis of 2026-11-14, but the test needs only its own config.

## 9. Testing

- `lib/practiceTest.ts`: every blueprint sums to its total; the pass mark at its boundaries (10 and 11
  of 15, 34 and 35 of 50); `remainingMs` before, at and after the deadline; every set except
  Tafels in exactly one domain.
- `buildTestSession`, 1000 seeds per blueprint: the total; the exact count per domain (via the
  set of each question's topic); the Opfrisser and Verdieping counts; no `tables`; without LKT
  no topic of Getallen & delers, Talstelsels or Heuristieken; no duplicate keys or first prompts.
- `lib/play.ts`, table-driven: with the test policy a wrong answer adds no repeat and leaves no
  feedback, a two-step question goes to step 2 after a wrong step 1, the last answer finishes;
  the default policy is unchanged (the existing tests stay as they are).
- `summarizeTest`: unanswered counts against the score but not in the topics or the mistakes;
  none answered; timed out; the time capped at the limit.
- Component tests: no correct state and no wrong panel after an answer; the stop dialog
  (Stoppen, Verder werken, Escape); the deadline ending the test with fake timers, also with the
  dialog open; "Nog één minuut"; a rotation keeping the deadline and the typed answer; the
  verdict and the stats on the results; Opnieuw starting a test again; the test setup (defaults,
  the rows per blueprint, the choices kept after Terug).
- Scenes and shots (main spec §10, CLAUDE.md): `test-setup`, `test-question`, `test-last-minute`,
  `test-stop`, `results-test-passed`, `results-test-failed`, on every layout the play and
  results shots have.
- `npm run smoke` is not needed: no change to the PWA config, the service worker or `main.ts`.

## 10. Build order

One plan, one commit per task, `main` deployable after each. The row on the overview comes last,
so an unfinished test is never reachable.

1. `lib/practiceTest.ts`: domains, blueprints, pass mark, remaining time.
2. `buildTestSession`, with the shared planning helper.
3. The play policy in `lib/play.ts`.
4. `summarizeTest` and the test results on `ResultScreen`.
5. The shared shell, `TestScreen`, the stop dialog.
6. `TestSetupScreen`, with the shared setup controls.
7. `App.svelte`: the states, the row and its glyph, the update rule; scenes and shots.
8. The documents of §12.

## 11. Open assumptions

None. The assumptions of the draft were decided on 2026-11-15: decisions 6–13 of §2.

## 12. Changes to other documents

Made in the task that changes the behaviour, so spec and code never disagree on `main`:

- Main spec §3 (the states `testSetup` and `testing`, the system back), §3.1 (the row), §3.5
  (pointer to §6 here), §2 (the update dialog on `testSetup`), §10 (shots), §12.6 (done).
- `CLAUDE.md`: Status, the roadmap row of v5, the architecture entries (`lib/practiceTest.ts`,
  `TestScreen`, `TestSetupScreen`, the shared shell, the play policy).
