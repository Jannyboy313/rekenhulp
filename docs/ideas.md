# Ideas

Backlog of feature ideas. Not part of the roadmap and not specced: an idea becomes work only when
the user says so, and then goes through the normal spec iteration first.

## Notifications

Daily reminders for people who installed the PWA.

Known constraints (from the discussion of 2026-10-27):

- Reliable route is Web Push: needs a server that stores subscriptions and sends the pushes. This
  conflicts with "no accounts, no database, no network calls" and the static `dist/`.
- Serverless alternatives (Periodic Background Sync, Notification Triggers) are Chromium-only or
  removed, and give no guaranteed daily time.
- Storing a reminder time is persistence, which is out of scope today.
- Cheap alternative: a calendar reminder (`.ics` download).

## Practice test to PDF

Let the user print the practice test (spec §12.4) to PDF.

Known constraints:

- Depends on the practice test, which is a later v3 step (after mixed categories).
- Print via the browser (`window.print()` with a print stylesheet) needs no new infrastructure or
  network calls; the open question is what to print (questions only, answers, or both).

## Streak

Track a streak of consecutive practice days.

Known constraints:

- Needs persistence (localStorage or more); persistence and streaks are both listed under "Out of
  scope" in `CLAUDE.md`, so the out-of-scope section and the spec need to change first.

## Ratio table as a visual question

Show a 2×2 ratio table with one cell unknown (`?`) as the question, instead of the text form
`3 : 5 = 12 : ?`. Fits the weak spot of ratio problems.

Known constraints (from the discussion of 2026-10-29):

- Today no practice question shows a table: `ratios` (missing term) is an equation of two ratios,
  `formulas` has a table as plain text, and ratio tables only occur in explanations and lessons.
- Answer checking, tips and keypad stay the same: the unknown is still one number step.
- New: an optional `table` field on `Step` (`lib/types.ts`) with `SLOT` in one cell, a
  `RatioTable.svelte`, and a branch in `QuestionView.svelte` that shows the typed answer in the
  cell (like the slot in a sum prompt).
- Generators: a table variant of `ratios` and `ratioProblems`, from the same `m × (p : q)` rules.
- Watch the kladblok, which hides rows below 816 px viewport height (spec §3.6): the table costs
  extra height.
- Open: only 2×2, or also 3 columns with an intermediate step.
- Spec first: §3.3 layout, §5 Verhoudingen, §6 input.
