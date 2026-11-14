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
- per topic: its §5.x section, in `docs/superpowers/specs/topics/<set id>.md` (one file per set;
  spec §5 holds the index and the v3 rules that sets share), and its rows in the tips table
  (§3.4.1)
- expressions: §7; a new set: its entry in §12.1, open assumptions in §11
- lesstof (study material per set): its own spec, `docs/superpowers/specs/2026-10-25-lesstof-design.md`
  (framework §3–§6, content per set §7); the main spec only holds its entry points
- RWT scope (gaps in §12.3, check in §12.7): `docs/references/cito-rwt-handreiking.md`, an
  excerpt of the official Cito handreiking (toetsmatrijs in §3.3, eindtermen in ch. 6); the PDF
  next to it is leading
- LKT scope (year-3 kennistoets, not yet in the spec): `docs/references/lkt-kennisbasis-concept.md`,
  an excerpt of the concept kennisbasis of 10voordeleraar ("Qua eigen vaardigheid" items only); the
  version is unconfirmed; its gaps (check of 2026-11-02, §12.7) are provisional
- ideas (feature ideas that are not specced or planned): `docs/ideas.md`; add new ideas there,
  not to the spec

## Status

All eleven sets are done. Their topics and weights are in `lib/sets.ts` (`topics` is Opfrisser,
`deep` is Verdieping); their rules are in the topic file of the set.

| Set                     | Topic file (`specs/topics/`) | Verdieping |
| ----------------------- | ---------------------------- | ---------- |
| Tafels                  | `tafels.md`                  | no         |
| Meten                   | `meten.md`                   | yes        |
| Verhoudingen            | `verhoudingen.md`            | yes        |
| Getallen & delers       | `getallen.md`                | yes        |
| Bewerkingen             | `bewerkingen.md`             | yes        |
| Getalbegrip             | `getalbegrip.md`             | yes        |
| Breuken & kommagetallen | `breuken.md`                 | yes        |
| Meetkunde               | `meetkunde.md`               | yes        |
| Verbanden & statistiek  | `verbanden.md`               | yes        |
| Talstelsels             | `talstelsels.md`             | yes        |
| Heuristieken            | `heuristieken.md`            | yes        |

Done besides the sets:

- stacked fractions, the kladblok (§3.6), repeat until correct (§3.4), tips (§3.4.1), the table
  choice for Tafels (§3.2) and the Design V1 UI (violet palette, Inter, glyphs, correct state with
  auto-advance, wrong-answer panel)
- the levels framework (§12.2 step 2): Niveau on setup, `deep` topics plus a 20% Opfrisser share
  via `forLevel`; the fixture set `lib/setFixture.ts` still tests the framework
- the multiple-choice framework (§12.2 step 3, §6): answer kind `choice`, `choiceStep` with four
  options (its users: grep `choiceStep` in `lib/topics/`)
- the score per topic on the results screen (§3.5, §12.4: `topicScores` in `lib/results.ts`)
- Fouten oefenen (§3.5, §12.4: `mistakeSession` in `lib/session.ts`, three new exercises per
  wrong question)
- Gemengd (mixed categories, §12.5): the pseudo set `MIXED_SET` with a set choice on the setup
  screen; `countingSets` in `lib/sets.ts` and `buildMixedSession` in `lib/session.ts`, an equal
  share per set
- the error screen (§3): `ErrorScreen`, for a session that cannot be built or a screen that fails
  while rendering

Lesstof (lesstof spec): the framework is done (Oefenen/Lesstof tabs, topic list, lesson view,
content checks, back guard). Lessons done: every set except Tafels (`lib/lessons/<set>.ts`); its row is disabled. The
lesstof is developed separately from the practice sets and is not part of the roadmap below: no
fixed order, content only when the user asks for it (iterate its spec §7 first). Linking from
other screens is supported (`openLesson(set, lesson, returnTo)` in `App.svelte`) but not used
yet. The lesson link from a mistake is done (lesstof spec §3.1–§3.2): `Les:` buttons
(`LessonLinks`) in the wrong-answer panel open a `LessonSheet` over the session, via
`LESSON_LINKS` in `lib/lessons/links.ts` (practice topic → lesson topics; a new practice topic
needs no entry).

To add a lesson: write its topics in the lesstof spec §7 first, with a second method wherever
one exists (lesstof spec §1), then add `lib/lessons/<set>.ts`
(a `Lesson` with the set's id) and append it to `LESSONS` in `lib/lessons/index.ts`.
`validate.test.ts` checks structure,
notation and that every `worked` line is a true equality chain. Keep lesson code separate from
the practice code: lesson components get their own files, practice components get no lesson
props or branches; shared are only `SetRow`, the `SetOverview` shell and the `.set-list` class.
The one exception is the lesson link (lesstof spec §4): `Feedback` and `PlayScreen` only pass
lesson data through to `LessonLinks` and `LessonSheet`.

Next steps (spec §12), one at a time and only when the user says so. v3 is done (§12.2–§12.4);
the toetsmatrijs check of 2026-11-02 (§12.7) is done and its RWT gaps are closed; its LKT gaps wait for a confirmed kennisbasis; LKT 3.3 is out of scope (spec §12.8). Mixed categories (§12.5) are done. Order decided 2026-11-14.

| Step                                                                                    | New infrastructure |
| --------------------------------------------------------------------------------------- | ------------------ |
| v4: tablet support (§12.10); form in its own spec                                       | wide layout        |
| v5: practice test (§12.6), reuses `buildMixedSession` and `lib/play.ts`; own spec       | test session       |
| v6: persistent memory in IndexedDB; spec and "Out of scope" change when the work starts | IndexedDB          |
| v7: exercises marked "rekenmachine toegestaan", as Cito does (§12.11)                   | open               |
| v8: print button for the practice test (§12.12)                                         | print stylesheet   |
| v9: streak of practice days (§12.13), builds on v6                                      | none (uses v6)     |
| v10: visual improvements to the exercises (§12.14); decide the principle first          | open               |

Between versions: check the sets against the toetsmatrijs (§12.7).

Mental arithmetic only, at both levels: problems that need a calculator are out of scope (spec
§12.8) until v7 (§12.11).

To add a set: write its topics in a new `docs/superpowers/specs/topics/<set id>.md` and add them
to the index in spec §5, widen `Topic`/`AnswerKind` in `lib/types.ts`, register generators and
labels in `lib/topics/index.ts`, append the set to `PRACTICE_SETS` in `lib/sets.ts` and give it a glyph in
`SetGlyph.svelte` (multicolour, violet/amber/blue tokens; without one the list shows a letter).
Write the unknown of a prompt as `${SLOT}` (`lib/slot.ts`), never as a literal `?`: a literal `?`
is a question mark, and `slot.sweep.test.ts` checks every generator. A new keypad
`AnswerKind` also needs a `KeypadStates` entry and an `INPUT_MODELS` entry in
`lib/inputModels.ts`, and a reducer in `lib/keypadInput.ts`; the button kinds (`boolean`,
`choice`) have no keypad and are excluded from `KeypadKind`. A new set shows up greyed out on the Lesstof tab by itself; it
needs no lesson.

## Workflow

**New set or large infrastructure** (new session each time):

1. Read this file and the spec sections listed above.
2. Ask the user about open assumptions (list them in spec §11 while open). Update and commit the
   spec.
3. Write a light plan `docs/superpowers/plans/<date>-<set>.md`: per task the files, the
   signatures and types, the test cases as a table (input → expected, incl. edge cases) and the
   tips. No complete code. TDD, one commit per task. Commit the plan, then stop for the user's
   review.
4. After approval, execute inline in the same session (no subagents): per task tests first,
   then the code, `npm test` + `npm run check`, commit. At a checkpoint after each task bundle,
   reread its diff against the spec and the plan and give the user a short status. Finish with a
   final review that also checks `dist/sw.js`.
5. Update the Status above and delete the plan file with `git rm` (`rm` is denied; git keeps it).

**Small feature or fix:** no plan document and no review rounds. State assumptions briefly, ask
only the real choices, update and commit the spec, then implement directly with TDD and commit.

## Open follow-ups

- Focus falls back to `body` after a screen or question change, and when the kladblok's "Tik hier
  voor je antwoord" button is activated by keyboard (keyboard/screen-reader users only).

## Svelte pitfalls

- Inline markup with stacked fractions (`MathText`, `KeypadAnswer`) is whitespace-sensitive: a line
  break between tags renders as a space, and Svelte trims spaces at the edges of an element's
  content, so write a deliberate edge space as an expression (`{' en '}`). Tests assert exact
  `textContent` to catch this. Prettier may split such markup over lines; guard it with
  `<!-- prettier-ignore -->` (as the tip in `LessonView`).

## PWA pitfalls

`npm run build` ends with `scripts/check-dist.mjs`, which fails the build (and so the deploy) when
`dist/` breaks one of the `dist/sw.js` rules below or ships `screens.html`.

- Do not add `webmanifest` to `workbox.globPatterns`: vite-plugin-pwa already precaches the manifest,
  and a second entry with a different revision makes Workbox throw at SW startup (no offline mode).
  After `npm run build`, `dist/sw.js` must contain exactly one `manifest.webmanifest` entry.
- `woff2` is in `workbox.globPatterns` (the Inter font is precached; `dist/sw.js` must list it).
  Import only the latin file in `app.css`, not the package's `index.css`: that pulls in every
  subset and bloats the precache.

- Updates use `registerType: 'prompt'` (spec §2): `dist/sw.js` may only call `skipWaiting` from the
  `SKIP_WAITING` message handler, never on install. `lib/update.ts` holds the state; `main.ts`
  feeds it, `App.svelte` shows `UpdateDialog` on `sets` and `setup` only.
- `screens.html` is dev-only: never add it to `build.rollupOptions.input`, or the fixture page
  ships in `dist/` and gets precached.

## Stack

- Svelte 5 (runes) + TypeScript (strict) + Vite — no SvelteKit
- Inter (`@fontsource-variable/inter`, latin subset) and a light theme only: colours, shadows and
  sizes are tokens in `app.css`; no raw colour values in components (apart from `Logo.svelte`)
- `vite-plugin-pwa` (generateSW, full precache, works fully offline)
- Vitest for tests, `svelte-check` for type checking, Prettier for formatting
- Output is a static `dist/` folder, hosted on Vercel: every push to `main` deploys. `vercel.json`
  sets the build command (`npm test`, `npm run check`, `npm run build`), so a failing test or type
  error blocks the deploy
- Node 26 (the latest LTS): `engines` in `package.json` (Vercel reads it) and `.nvmrc`

## Commands

```bash
npm install     # install dependencies
npm test        # run Vitest once
npm run check   # svelte-check (type check)
npm run build   # production build incl. service worker, then checks dist/sw.js
npm run format  # Prettier, writes all files
npm run screenshots # PNG per screen state at 360×780 into screenshots/ (starts its own Vite)
npm run smoke   # builds, then plays a session offline against vite preview (Playwright, e2e/)
npm run dev     # dev server
npm run preview # serve dist/
```

`npm run smoke` is not part of the Vercel build (it needs Chromium); run it before a push that
touches the PWA config, the service worker or `main.ts`.

`npm run screenshots` and `npm run smoke` need a one-time Chromium install: `npx playwright install chromium`.

## Language conventions

- Code, identifiers, comments, tests, commit messages, docs: **English**
- User-facing UI text and exercise prompts: **Dutch**
- Numbers in the UI use Dutch notation: decimal comma (`0,25`), thin-space thousands
  separator (`2 500 000`), `×` and `:` as operators, superscript powers

## Architecture

```
src/
  App.svelte            state machine: sets → setup → playing → results, plus lessonTopics and
                        lesson (lesstof) and error (a session that cannot be built, or a
                        screen that fails while rendering: `svelte:boundary`)
  components/           SetOverview (shell: header + Oefenen/Lesstof tabs, a snippet per tab),
                        PracticeSetList, LessonSetList, SetRow (shared row), LessonTopicList,
                        LessonView, LessonBlocks (renders lesson blocks), LessonLinks +
                        LessonSheet (lesson link from a mistake), SetupScreen (topic list, table
                        choice or Gemengd set choice), PlayScreen (runs
                        lib/play.ts, auto-advance timer), QuestionView (also the correct state),
                        KeypadAnswer (answer field + error + keypad, routes keys to the
                        kladblok), Keypad, Scratchpad (kladblok cells), Feedback (wrong-answer
                        panel), ResultScreen, ErrorScreen, MathText + Fraction (stacked fractions, the slot of
                        a prompt), Icon, Logo, SetGlyph, press.ts (act-on-press action)
  lib/
    types.ts            Question, Step, AnswerKind, CheckResult, Topic, PracticeSet
    random.ts           seedable RNG; every generator takes an rng argument; drawUntil redraws
                        until all rules of an exercise hold
    steps.ts            step factories (number, fraction, simplest fraction, boolean, choice,
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
    sets.ts             practice sets (config): topics + weights + tables share, optional `deep`
                        (Verdieping); hasDeep, forLevel; Gemengd: MIXED_SET (pseudo set, not in
                        PRACTICE_SETS), isMixed, countingSets
    setFixture.ts       test-only set with a Verdieping
    play.ts             pure reducer of a running session: queue incl. repeats, position,
                        attempts, feedback, records (startPlay, answer, advance, stop);
                        PlayScreen keeps only timers, kladblok notes and the lesson sheet
    session.ts          quotas, shuffle, de-duplication, table choice (generatorsFor),
                        repeats (insertRepeat), Gemengd (buildMixedSession)
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
  screens/              dev-only fixture page for `npm run screenshots` (served by screens.html):
                        scenes.ts mounts each screen state with fixed props; questionOfKind
                        picks a seeded question per AnswerKind
screenshots/            screens.spec.ts (Playwright): the shot list, steps per shot; PNGs land
                        here (gitignored)
```

A new screen or screen state also needs a scene in `src/screens/scenes.ts` and a shot in
`screenshots/screens.spec.ts`; the "every scene has a shot" test only catches a scene without a
shot, not a missing scene.

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
