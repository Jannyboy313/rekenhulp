# Rekenhulp

Offline-first PWA for practising mental arithmetic on a phone (no calculator), growing into a
practice platform for the arithmetic of PABO students (RWT and LKT). A session is a generated set
of exercises (default 15). The current level, Opfrisser, is short practice on the go (target ~3
minutes); v3 adds Verdieping, at PABO-test level with more time per exercise (spec §12.2). No
accounts, no database, no persistence, no network calls.

The design spec is the source of truth: `docs/superpowers/specs/2026-10-05-rekenhulp-design.md`.
If code and spec disagree, ask which one is wrong. The spec is long; read what the change needs,
not all of it:

- always: §1–§4 (goal, platform, session flow incl. tips and kladblok, sets and quotas), §6
  (input) and §8 (conventions)
- per topic: its §5.x section and its rows in the tips table (§3.4.1)
- expressions: §7; a new set: its entry in §12.1, open assumptions in §11
- lesstof (study material per set): its own spec, `docs/superpowers/specs/2026-10-25-lesstof-design.md`
  (framework §3–§6, content per set §7); the main spec only holds its entry points
- RWT scope (gaps in §12.5, check in §12.6): `docs/references/cito-rwt-handreiking.md`, an
  excerpt of the official Cito handreiking (toetsmatrijs in §3.3, eindtermen in ch. 6); the PDF
  next to it is leading

## Status

Done: the sets Tafels, Meten (v1 + v2: `speed`), Verhoudingen (v1 + v2: `percentChange`, `scale`,
`ratioProblems`), Getallen & delers, Bewerkingen, Getalbegrip,
Breuken & kommagetallen, Meetkunde (`perimeterArea`, `solids`, `pythagoras`, `angles`,
`symmetry`, `shapeProperties`) and Verbanden & statistiek (`statistics`, `percentagePoints`,
`sequences`, `formulas`, `equations`, `probability`), Talstelsels (`numberSystems`,
`romanNumerals`) and Heuristieken (`systematicCounting`, `workingBackwards`, `guessAndCheck`,
`simplifyProblem`), plus stacked fractions, the kladblok (§3.6), repeat until correct
(§3.4), tips (§3.4.1), the table choice for Tafels (§3.2) and the Design V1 UI (violet palette,
Inter, glyphs, correct state with auto-advance, wrong-answer panel).

Lesstof (lesstof spec): the framework is done (Oefenen/Lesstof tabs, topic list, lesson view,
content checks, back guard). Lessons done: every set except Tafels (`lib/lessons/<set>.ts`); its row is disabled. The
lesstof is developed separately from the practice sets and is not part of the roadmap below: no
fixed order, content only when the user asks for it (iterate its spec §7 first). Linking from
other screens is supported (`openLesson(set, lesson, returnTo)` in `App.svelte`) but not used
yet.

To add a lesson: write its topics in the lesstof spec §7 first, with a second method wherever
one exists (lesstof spec §1), then add `lib/lessons/<set>.ts`
(a `Lesson` with the set's id) and append it to `LESSONS` in `lib/lessons/index.ts`.
`validate.test.ts` checks structure,
notation and that every `worked` line is a true equality chain. Keep lesson code separate from
the practice code: lesson components get their own files, practice components get no lesson
props or branches; shared are only `SetRow`, the `SetOverview` shell and the `.set-list` class.

Next steps (spec §12.2–§12.5), one at a time and only when the user says so. The levels
framework comes first, then the multiple-choice framework; after them the user picks the next v3
step. There is no v4.

| Step                                                                                                       | New infrastructure                   |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| v3: levels Opfrisser/Verdieping (§12.2), step 2: framework, Verdieping disabled for every set              | level choice on setup, `deep` config |
| v3: multiple choice (§12.2 step 3, §12.5), framework only                                                  | multiple-choice answer kind          |
| v3: per set (§12.2 step 4): Verdieping + RWT gaps (§12.5), the user picks the order; not Tafels            | —                                    |
| v3: mixed categories (§12.3), form decided in its spec iteration                                           | sessions across sets                 |
| v3: practice test (§12.4), after mixed categories                                                          | test session                         |

Between versions: check the sets against the toetsmatrijs (§12.6).

Mental arithmetic only, at both levels: problems that need a calculator are out of scope (spec
§12.7).

To add a set: widen `Topic`/`AnswerKind` in `lib/types.ts`, register generators and labels in
`lib/topics/index.ts`, append the set to `PRACTICE_SETS` in `lib/sets.ts` and give it a glyph in
`SetGlyph.svelte` (multicolour, violet/amber/blue tokens; without one the list shows a letter).
Write the unknown of a prompt as `${SLOT}` (`lib/slot.ts`), never as a literal `?`: a literal `?`
is a question mark, and `slot.sweep.test.ts` checks every generator. A new `AnswerKind`
also needs a `KeypadStates` entry and an `INPUT_MODELS` entry in `lib/inputModels.ts`, and a
reducer in `lib/keypadInput.ts`. A new set shows up greyed out on the Lesstof tab by itself; it
needs no lesson.

## Workflow

**New set or large infrastructure** (new session each time):

1. Read this file and the spec sections listed above.
2. Ask the user about open assumptions (list them in spec §11 while open). Update and commit the
   spec.
3. Write a light plan `docs/superpowers/plans/<date>-<set>.md`: per task the files, the
   signatures and types, the test cases as a table (input → expected, incl. edge cases) and the
   tips. No complete code. TDD, one commit per task. Stop for the user's review.
4. After approval, execute inline in the same session (no subagents): per task tests first,
   then the code, `npm test` + `npm run check`, commit. At a checkpoint after each task bundle,
   reread its diff against the spec and the plan and give the user a short status. Finish with a
   final review that also checks `dist/sw.js`.
5. Update the Status above and delete the plan file (git keeps it).

**Small feature or fix:** no plan document and no review rounds. State assumptions briefly, ask
only the real choices, update and commit the spec, then implement directly with TDD and commit.

## Open follow-ups

- Focus falls back to `body` after a screen or question change, and when the kladblok's "Tik hier
  voor je antwoord" button is activated by keyboard (keyboard/screen-reader users only).
- Move the `PlayScreen` session state (queue, repeats, records) into a pure reducer in
  `lib/play.ts`; separate session with a light plan.

## Svelte pitfalls

- Inline markup with stacked fractions (`MathText`, `KeypadAnswer`) is whitespace-sensitive: a line
  break between tags renders as a space, and Svelte trims spaces at the edges of an element's
  content, so write a deliberate edge space as an expression (`{' en '}`). Tests assert exact
  `textContent` to catch this. Prettier may split such markup over lines; guard it with
  `<!-- prettier-ignore -->` (as the tip in `LessonView`).

## PWA pitfalls

- Do not add `webmanifest` to `workbox.globPatterns`: vite-plugin-pwa already precaches the manifest,
  and a second entry with a different revision makes Workbox throw at SW startup (no offline mode).
  After `npm run build`, `dist/sw.js` must contain exactly one `manifest.webmanifest` entry.
- `woff2` is in `workbox.globPatterns` (the Inter font is precached; `dist/sw.js` must list it).
  Import only the latin file in `app.css`, not the package's `index.css`: that pulls in every
  subset and bloats the precache.

- Updates use `registerType: 'prompt'` (spec §2): `dist/sw.js` may only call `skipWaiting` from the
  `SKIP_WAITING` message handler, never on install. `lib/update.ts` holds the state; `main.ts`
  feeds it, `App.svelte` shows `UpdateDialog` on `sets` and `setup` only.

## Stack

- Svelte 5 (runes) + TypeScript (strict) + Vite — no SvelteKit
- Inter (`@fontsource-variable/inter`, latin subset) and a light theme only: colours, shadows and
  sizes are tokens in `app.css`; no raw colour values in components (apart from `Logo.svelte`)
- `vite-plugin-pwa` (generateSW, full precache, works fully offline)
- Vitest for tests, `svelte-check` for type checking, Prettier for formatting
- Output is a static `dist/` folder; the user hosts it themselves

## Commands

```bash
npm install     # install dependencies
npm test        # run Vitest once
npm run check   # svelte-check (type check)
npm run build   # production build incl. service worker
npm run format  # Prettier, writes all files
npm run dev     # dev server (not pre-approved, ask first)
npm run preview # serve dist/ (not pre-approved, ask first)
```

## Command allowlist override (this project only)

The user's global allowlist (`~/.claude/rules/allowlist.md`) is extended **for this repository only**
with the commands below, so work can proceed autonomously. Authorised by the user on 2026-10-05.

- `npm install` (incl. adding packages)
- `npm test`
- `npm run check`, `npm run build` (authorised 2026-10-05, for autonomous verification)
- `npm run format` (Prettier, authorised 2026-10-06)
- `sed -n` (read-only printing only; `sed -i` and other write forms stay forbidden; authorised
  2026-10-06)
- `rm docs/superpowers/plans/<file>.md` (plan files only, named explicitly; no `-r`, no `-f`, no
  globs, no other paths; authorised 2026-10-25)
- `rm src/<path>/<file>` (files inside `src/` only, named explicitly; no `-r`, no `-f`, no globs,
  no directories, no paths outside `src/`; authorised 2026-10-25)
- `git init`
- `git add`
- `git commit`

Everything else from the global allowlist still applies (no `git push`, `git checkout`,
`git reset`, `npx`, `node`, etc.). Ask before running anything not listed here or globally.

## Language conventions

- Code, identifiers, comments, tests, commit messages, docs: **English**
- User-facing UI text and exercise prompts: **Dutch**
- Numbers in the UI use Dutch notation: decimal comma (`0,25`), thin-space thousands
  separator (`2 500 000`), `×` and `:` as operators, superscript powers

## Architecture

```
src/
  App.svelte            state machine: sets → setup → playing → results, plus lessonTopics and
                        lesson (lesstof)
  components/           SetOverview (shell: header + Oefenen/Lesstof tabs, a snippet per tab),
                        PracticeSetList, LessonSetList, SetRow (shared row), LessonTopicList,
                        LessonView (renders lesson blocks), SetupScreen, PlayScreen (question
                        queue incl. repeats, auto-advance timer), QuestionView (also the correct state),
                        KeypadAnswer (answer field + error + keypad, routes keys to the
                        kladblok), Keypad, Scratchpad (kladblok cells), Feedback (wrong-answer
                        panel), ResultScreen, MathText + Fraction (stacked fractions, the slot of
                        a prompt), Icon, Logo, SetGlyph, press.ts (act-on-press action)
  lib/
    types.ts            Question, Step, AnswerKind, CheckResult, Topic, PracticeSet
    random.ts           seedable RNG; every generator takes an rng argument; drawUntil redraws
                        until all rules of an exercise hold
    steps.ts            step factories (number, fraction, simplest fraction, boolean,
                        factorization, rewrite, scientific, text), answer checking, and parsing of
                        factorization and scientific input (number and fraction parsing is in
                        rational.ts)
    keypadInput.ts      pure key → input reducers per answer kind
    keys.ts             key catalogue (label, aria label) and keyDefs; keypads list key names
                        one grid row per line. A new key: widen KeypadKey (in keypadInput.ts),
                        add it to KEYS, handle it in the reducers that should accept it. A keypad
                        sets `span` on its own copy of a key; keyRows sizes the keys (spec §6)
    inputModels.ts      per answer kind: keys, columns, typing state, reducer, validate,
                        display, view
    scratchpad.ts       kladblok: cell count, keys, typing, when shown
    fractionText.ts     splits text into plain runs, slots and (mixed) fractions for display
    slot.ts             SLOT marker for the unknown of a prompt, hasSlot, plain
    feedback.ts         CORRECT_FEEDBACK_MS (auto-advance after a correct answer)
    units.ts            withUnits: an answer with its prefix and suffix
    promptSize.ts       prompt font size step from the displayed length
    primes.ts           gcd, lcm, isPrime, prime factorization
    results.ts          question records + session summary
    sets.ts             practice sets (config): topics + weights + tables share
    session.ts          quotas, shuffle, de-duplication, table choice (generatorsFor),
                        repeats (insertRepeat)
    backGuard.ts        keeps the system back inside the app (wired in App.svelte)
    wakeLock.ts         keeps the screen on while PlayScreen is mounted
    update.ts           update prompt state (waiting version, Later) and shouldPrompt (screens)
    tips.ts             Diagnose type, firstTip, moneyTip (cents-rounding exception),
                        powerOfTenShift, factor-of-ten tip (fallback of number, fraction and
                        scientific steps)
    format.ts           Dutch number/expression formatting
    rational.ts         exact bigint fractions (expressions, unit conversions, input parsing)
    expr/               tokenizer, parser, evaluate, format, reduce (evaluation steps), chains,
                        rewriteCheck (one property per step), misconceptions (for tips)
    topics/             one generator module per topic + index.ts (registry and labels)
    lessons/            lesstof: types, LESSONS registry + lessonFor, validate (structure,
                        notation, equality chains via expr), fixture (tests only)
```

- A topic generator is a pure function `(rng) => Question`. Each of its steps has a check:
  `Step.check(input)` returns `{ correct, expected, tip?, explanation? }`. Each generator passes
  a `diagnose` to its step for tips; a tip fires only when the answer equals exactly what that
  mistake produces.
- Keep `lib/` free of Svelte imports so it is unit-testable in plain Node.

## Domain rules (do not get these wrong)

- Order of operations (Dutch convention): parentheses → powers → `×` and `:` with **equal**
  priority, left to right → `+` and `−` with equal priority, left to right.
- Never use `eval`/`Function` for expressions; always go through `lib/expr`.
- Commutative and associative properties apply to `+` and `×` only, never to `−` or `:`.
- All arithmetic is exact; never compare floats. Use `lib/rational.ts`.
- Generated exercises must be solvable without a calculator: divisions are exact, numbers stay
  within the ranges in the spec.

## Testing

- TDD for everything in `lib/`. Generators are tested with a seeded RNG by generating many
  (≥1000) exercises and asserting invariants (ranges, exactness, `check(expected)` is correct).
- Rewrite checker: table-driven tests, including the accept/reject examples in the spec.

## Out of scope

Persistence of any kind (incl. localStorage), statistics, streaks, accounts, analytics,
adaptive difficulty (the user-chosen level of spec §12.2 is not adaptive), network requests. Do not add these without an explicit request.
