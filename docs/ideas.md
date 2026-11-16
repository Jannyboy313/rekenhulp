# Ideas

Backlog of feature ideas. Not part of the roadmap and not specced: an idea becomes work only when
the user says so, and then goes through the normal spec iteration first. An idea that moves onto
the roadmap moves into the spec (§12) and leaves this file.

## Notifications

Daily reminders for people who installed the PWA.

Known constraints (from the discussion of 2026-10-27):

- Reliable route is Web Push: needs a server that stores subscriptions and sends the pushes. This
  conflicts with "no accounts, no database, no network calls" and the static `dist/`.
- Serverless alternatives (Periodic Background Sync, Notification Triggers) are Chromium-only or
  removed, and give no guaranteed daily time.
- Storing a reminder time is persistence of a setting, which v7 (practice records only) does not
  cover.
- Cheap alternative: a calendar reminder (`.ics` download).

## Mastery per topic with spaced repetition

Fouten van eerder (`lib/review.ts`) is binary: a topic is due when its last session had a mistake
on an earlier day. A Leitner box per topic, derived from the practice records, would repeat a
topic at growing intervals and let a session weigh weak topics more heavily.

- Needs no new storage: the boxes can be computed from the v7 records.
- Is adaptive difficulty in the sense of "Out of scope" in `CLAUDE.md`; that rule has to change
  first.
- Open: whether it replaces Fouten van eerder or feeds the quotas of a normal session.

## Thinking models as input

Answer through a model instead of only the final number: a ratio table to fill in, a bar (strook)
or a number line. This is the PABO didactics itself and targets ratio problems in context.

- Fits v12 (visual improvements, spec §12.14); a lot of UI work per model.
- Each model is a new `AnswerKind` with its own input model, or a step sequence over existing
  kinds; prefer the latter where it works.

## Worked solution after a mistake

Show the solution of the exercise itself, with its own numbers, in the wrong-answer panel. The
lesson link only leads to a general example.

- Expressions: `lib/expr/reduce.ts` already yields the evaluation steps.
- Context exercises: every generator would have to supply its own worked steps; the bulk of the
  work.
- Not a tip: it shows the route to the answer, not a diagnosis of the mistake.
